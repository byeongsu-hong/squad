import {
  DeviceActionStatus,
  type DeviceManagementKit,
  DeviceManagementKitBuilder,
} from "@ledgerhq/device-management-kit";
import type { SignerSolana } from "@ledgerhq/device-signer-kit-solana";
import { SignerSolanaBuilder } from "@ledgerhq/device-signer-kit-solana";
import { webHidTransportFactory } from "@ledgerhq/device-transport-kit-web-hid";
import { Connection, PublicKey } from "@solana/web3.js";
import { firstValueFrom, lastValueFrom, timeout } from "rxjs";

import type { LedgerAccount } from "@/types/wallet";

class LedgerService {
  private sdk: DeviceManagementKit | null = null;
  private sessionId: string | null = null;
  private signer: SignerSolana | null = null;

  async connect(): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("Ledger can only be used in browser environment");
    }

    if (!("hid" in navigator)) {
      throw new Error("WebHID is not supported in this browser");
    }

    this.sdk = new DeviceManagementKitBuilder()
      .addTransport(webHidTransportFactory)
      .build();

    // Start discovering devices
    const devices$ = this.sdk.startDiscovering({});

    // Get the first discovered device with timeout
    const device = await firstValueFrom(devices$.pipe(timeout(30000)));

    // Connect to the device
    this.sessionId = await this.sdk.connect({ device });

    this.signer = new SignerSolanaBuilder({
      dmk: this.sdk,
      sessionId: this.sessionId,
      originToken: "squad-multisig-app",
    }).build();

    // Stop discovering after connection
    this.sdk.stopDiscovering();
  }

  async disconnect(): Promise<void> {
    if (this.sdk && this.sessionId) {
      await this.sdk.disconnect({ sessionId: this.sessionId });
      this.sdk = null;
      this.sessionId = null;
      this.signer = null;
    }
  }

  async getAccounts(
    paths: readonly string[],
    rpcUrl: string
  ): Promise<LedgerAccount[]> {
    if (!this.signer) {
      throw new Error("Ledger not connected");
    }

    const connection = new Connection(rpcUrl, "confirmed");
    const accounts: LedgerAccount[] = [];

    for (const path of paths) {
      try {
        const { observable } = this.signer.getAddress(path);

        const state = await lastValueFrom(observable.pipe(timeout(30000)));

        if (state.status === DeviceActionStatus.Completed && state.output) {
          const pubkey = new PublicKey(state.output);

          let balance: number | undefined;
          try {
            const lamports = await connection.getBalance(pubkey);
            balance = lamports / 1e9;
          } catch {
            balance = undefined;
          }

          accounts.push({
            publicKey: pubkey,
            derivationPath: path,
            balance,
          });
        }
      } catch {
        // Skip accounts that fail to load
      }
    }

    return accounts;
  }

  async signTransaction(
    transaction: Buffer,
    derivationPath: string
  ): Promise<Buffer> {
    if (!this.signer) {
      throw new Error("Signer not initialized");
    }

    const { observable } = this.signer.signTransaction(
      derivationPath,
      new Uint8Array(transaction)
    );

    const state = await lastValueFrom(observable.pipe(timeout(60000)));

    if (state.status === DeviceActionStatus.Completed && state.output) {
      return Buffer.from(state.output);
    }

    throw new Error("Failed to sign transaction");
  }

  async signMessage(message: Buffer, derivationPath: string): Promise<Buffer> {
    if (!this.signer) {
      throw new Error("Signer not initialized");
    }

    const { observable } = this.signer.signMessage(
      derivationPath,
      message.toString()
    );

    const state = await lastValueFrom(observable.pipe(timeout(60000)));

    if (state.status === DeviceActionStatus.Completed && state.output) {
      return Buffer.from(state.output.signature, "hex");
    }

    throw new Error("Failed to sign message");
  }

}

export const ledgerService = new LedgerService();
