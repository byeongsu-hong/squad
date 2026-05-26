import { describe, expect, it } from "vitest";

import { proposalsQueryOptions } from "@/lib/query/proposal-queries";
import type { ChainConfig } from "@/types/chain";
import type { WorkspaceMultisig } from "@/types/workspace";

describe("proposal query options", () => {
  it("does not create per-vault polling timers", () => {
    const multisig: WorkspaceMultisig = {
      provider: "safe",
      key: "ethereum-mainnet:0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7",
      address: "0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7",
      chainId: "ethereum-mainnet",
      chainName: "Ethereum",
      threshold: 1,
      members: [],
      tags: [],
    };
    const chains: ChainConfig[] = [
      {
        id: "ethereum-mainnet",
        name: "Ethereum",
        rpcUrl: "https://ethereum-rpc.publicnode.com",
        vmFamily: "evm",
        multisigProvider: "safe",
      },
    ];

    expect(proposalsQueryOptions(multisig, chains)).not.toHaveProperty(
      "refetchInterval"
    );
  });
});
