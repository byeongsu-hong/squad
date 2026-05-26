import {
  DeviceActionStatus,
  type DeviceManagementKit,
  DeviceManagementKitBuilder,
} from "@ledgerhq/device-management-kit";
import type {
  SignerEth,
  TypedData,
} from "@ledgerhq/device-signer-kit-ethereum";
import { SignerEthBuilder } from "@ledgerhq/device-signer-kit-ethereum";
import { webHidTransportFactory } from "@ledgerhq/device-transport-kit-web-hid";
import { firstValueFrom, lastValueFrom, timeout } from "rxjs";
import { type Address, type Hex, getAddress } from "viem";

import {
  formatEvmLedgerDerivationPath,
  getEvmLedgerDerivationPath,
  ledgerSignatureToHex,
} from "./ethereum-paths";

export {
  EVM_LEDGER_DERIVATION_PATH_PATTERN,
  formatEvmLedgerDerivationPath,
  getEvmLedgerDerivationPath,
  ledgerSignatureToHex,
} from "./ethereum-paths";

const LEDGER_ACTION_TIMEOUT_MS = 60000;
const LEDGER_DISCOVERY_TIMEOUT_MS = 30000;

export interface EthereumLedgerAccount {
  address: Address;
  derivationPath: string;
  displayPath: string;
  index: number;
}

export interface EthereumLedgerSignerService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getAccount(index: number): Promise<EthereumLedgerAccount>;
  getAccounts(indexes: readonly number[]): Promise<EthereumLedgerAccount[]>;
  signMessage(
    derivationPath: string,
    message: string | Uint8Array
  ): Promise<Hex>;
  signTypedData(derivationPath: string, typedData: TypedData): Promise<Hex>;
}

export function parseEthereumLedgerError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error ?? "");
  const lower = message.toLowerCase();

  if (lower.includes("locked")) {
    return "Device is locked. Please unlock your Ledger.";
  }
  if (
    lower.includes("0x6511") ||
    lower.includes("0x6e00") ||
    lower.includes("0x6d00") ||
    lower.includes("app")
  ) {
    return "Wrong app opened. Please open the Ethereum app on your Ledger.";
  }
  if (
    lower.includes("rejected") ||
    lower.includes("0x6985") ||
    lower.includes("denied") ||
    lower.includes("cancelled")
  ) {
    return "Request rejected on Ledger.";
  }
  if (
    lower.includes("transport") ||
    lower.includes("disconnected") ||
    lower.includes("hid") ||
    lower.includes("device not found")
  ) {
    return "Failed to connect to Ledger. Please reconnect your device.";
  }
  if (lower.includes("timeout")) {
    return "Connection timeout. Please try again.";
  }

  return message || "An unknown Ledger error occurred.";
}

class EthereumLedgerService implements EthereumLedgerSignerService {
  private sdk: DeviceManagementKit | null = null;
  private sessionId: string | null = null;
  private signer: SignerEth | null = null;

  async connect() {
    if (this.signer) return;

    if (typeof window === "undefined") {
      throw new Error("Ledger can only be used in browser environment");
    }

    if (!("hid" in navigator)) {
      throw new Error("WebHID is not supported in this browser");
    }

    this.sdk = new DeviceManagementKitBuilder()
      .addTransport(webHidTransportFactory)
      .build();

    const devices$ = this.sdk.startDiscovering({});

    try {
      const device = await firstValueFrom(
        devices$.pipe(timeout(LEDGER_DISCOVERY_TIMEOUT_MS))
      );
      this.sessionId = await this.sdk.connect({ device });
      this.signer = new SignerEthBuilder({
        dmk: this.sdk,
        sessionId: this.sessionId,
        originToken: "squad-multisig-app",
      }).build();
    } finally {
      this.sdk.stopDiscovering();
    }
  }

  async disconnect() {
    if (this.sdk && this.sessionId) {
      await this.sdk.disconnect({ sessionId: this.sessionId });
    }

    this.sdk = null;
    this.sessionId = null;
    this.signer = null;
  }

  async getAccount(index: number) {
    const [account] = await this.getAccounts([index]);
    if (!account) {
      throw new Error("Failed to load Ledger account.");
    }
    return account;
  }

  async getAccounts(indexes: readonly number[]) {
    await this.connect();
    if (!this.signer) {
      throw new Error("Ledger signer is not initialized.");
    }

    const accounts: EthereumLedgerAccount[] = [];
    for (const index of indexes) {
      const derivationPath = getEvmLedgerDerivationPath(index);
      try {
        const { observable } = this.signer.getAddress(derivationPath, {
          checkOnDevice: false,
        });
        const state = await lastValueFrom(
          observable.pipe(timeout(LEDGER_ACTION_TIMEOUT_MS))
        );

        if (state.status === DeviceActionStatus.Completed && state.output) {
          accounts.push({
            address: getAddress(state.output.address),
            derivationPath,
            displayPath: formatEvmLedgerDerivationPath(index),
            index,
          });
        }
      } catch {
        // Keep the account picker usable even if one path fails.
      }
    }
    return accounts;
  }

  async signMessage(derivationPath: string, message: string | Uint8Array) {
    await this.connect();
    if (!this.signer) {
      throw new Error("Ledger signer is not initialized.");
    }

    const { observable } = this.signer.signMessage(derivationPath, message);
    const state = await lastValueFrom(
      observable.pipe(timeout(LEDGER_ACTION_TIMEOUT_MS))
    );

    if (state.status === DeviceActionStatus.Completed && state.output) {
      return ledgerSignatureToHex(state.output);
    }

    throw new Error("Failed to sign message with Ledger.");
  }

  async signTypedData(derivationPath: string, typedData: TypedData) {
    await this.connect();
    if (!this.signer) {
      throw new Error("Ledger signer is not initialized.");
    }

    const { observable } = this.signer.signTypedData(derivationPath, typedData);
    const state = await lastValueFrom(
      observable.pipe(timeout(LEDGER_ACTION_TIMEOUT_MS))
    );

    if (state.status === DeviceActionStatus.Completed && state.output) {
      return ledgerSignatureToHex(state.output);
    }

    throw new Error("Failed to sign typed data with Ledger.");
  }
}

export const ethereumLedgerService = new EthereumLedgerService();
