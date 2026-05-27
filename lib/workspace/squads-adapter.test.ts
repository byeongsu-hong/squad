import { describe, expect, it } from "vitest";

import { buildWorkspaceQueueItem } from "@/lib/workspace/squads-adapter";
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
});
