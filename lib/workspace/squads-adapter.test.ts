import { describe, expect, it } from "vitest";

import {
  buildWorkspaceQueueItem,
  getOperationalSquadsChain,
} from "@/lib/workspace/squads-adapter";
import type { WorkspaceMultisig, WorkspaceProposal } from "@/types/workspace";

describe("Squads workspace adapter", () => {
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
});
