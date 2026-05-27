import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import {
  buildWorkspaceQueueItem,
  getOperationalSquadsChain,
  parseSquadsAddressReference,
  resolveSquadsV4ImportedMultisig,
} from "@/lib/workspace/squads-adapter";
import type { WorkspaceMultisig, WorkspaceProposal } from "@/types/workspace";

describe("Squads workspace adapter", () => {
  const vaultAddress = new PublicKey(
    "3oocunLfAgATEqoRyW7A5zirsQuHJh6YjD4kReiVVKLa"
  );
  const multisigAddress = new PublicKey(
    "EvptYJrjGUB3FXDoW8w8LTpwg1TTS4W1f628c1BnscB4"
  );

  const proposal: WorkspaceProposal = {
    provider: "squads",
    multisigKey: "solana-mainnet:multisig",
    multisigAddress: "multisig",
    chainId: "solana-mainnet",
    transactionIndex: 3n,
    status: "Active",
    approvals: [],
    rejections: [],
    executed: false,
    cancelled: false,
  };

  const multisig: WorkspaceMultisig = {
    provider: "squads",
    key: "solana-mainnet:multisig",
    address: "multisig",
    chainId: "solana-mainnet",
    chainName: "Solana",
    threshold: 1,
    tags: [],
    members: [{ address: "member", permissionsMask: 7 }],
  };

  it("keeps V4 Squads proposals actionable for members", () => {
    const item = buildWorkspaceQueueItem(
      proposal,
      { ...multisig, squadsVersion: "v4" },
      "member"
    );

    expect(item.needsYourSignature).toBe(true);
    expect(item.readyToExecute).toBe(false);
  });

  it("keeps V3 Squads proposals actionable for members", () => {
    const item = buildWorkspaceQueueItem(
      proposal,
      { ...multisig, squadsVersion: "v3" },
      "member"
    );

    expect(item.needsYourSignature).toBe(true);
    expect(item.readyToExecute).toBe(false);
    expect(item.lineLabel).toBe("Waiting on you");
  });

  it("does not mark rejected proposals as actionable", () => {
    const item = buildWorkspaceQueueItem(
      { ...proposal, status: "Rejected", rejections: [] },
      { ...multisig, squadsVersion: "v3" },
      "member"
    );

    expect(item.needsYourSignature).toBe(false);
    expect(item.readyToExecute).toBe(false);
    expect(item.lineLabel).toBe("Rejected");
  });

  it("normalizes legacy Solana chain configs before checking V3 fallback support", () => {
    const chain = getOperationalSquadsChain(
      [
        {
          id: "solana-mainnet",
          name: "Solana",
          rpcUrl: "https://api.mainnet-beta.solana.com",
          squadsV4ProgramId: "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf",
          vmFamily: "svm",
          multisigProvider: "squads",
        },
      ],
      "solana-mainnet"
    );

    expect(chain?.squadsV3ProgramId).toBe(
      "SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu"
    );
  });

  it("extracts Squads route addresses from app URLs", () => {
    expect(
      parseSquadsAddressReference(
        "https://app.squads.so/squads/3oocunLfAgATEqoRyW7A5zirsQuHJh6YjD4kReiVVKLa"
      )
    ).toBe(vaultAddress.toBase58());
  });

  it("resolves Squads V4 vault addresses before falling back to V3 import", async () => {
    const account = { threshold: 1 };
    const getMultisigCalls: string[] = [];
    const service = {
      async getMultisig(address: PublicKey) {
        getMultisigCalls.push(address.toBase58());
        if (address.equals(vaultAddress)) {
          throw new Error(
            "This is a Squads V3 multisig. This app only supports Squads V4."
          );
        }
        return account;
      },
      async resolveVaultMultisigPda(address: PublicKey) {
        return address.equals(vaultAddress) ? multisigAddress : null;
      },
    };

    const result = await resolveSquadsV4ImportedMultisig(service, vaultAddress);

    expect(getMultisigCalls).toEqual([
      vaultAddress.toBase58(),
      multisigAddress.toBase58(),
    ]);
    expect(result.multisigPda).toEqual(multisigAddress);
    expect(result.vaultPda).toEqual(vaultAddress);
    expect(result.account).toBe(account);
  });
});
