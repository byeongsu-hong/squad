import { describe, expect, it } from "vitest";

import {
  getSafeChainAlias,
  getSafeTransactionServiceBaseUrl,
  matchesSafeChainAlias,
  parseSafeAddressInput,
  parseSafeReference,
  toWorkspaceProposalFromSafeTransaction,
} from "@/lib/safe";

describe("safe helpers", () => {
  it("parses raw Safe addresses and Safe URLs", () => {
    expect(
      parseSafeAddressInput("0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7")
    ).toBe("0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7");

    expect(
      parseSafeAddressInput(
        "https://app.safe.global/home?safe=eth:0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7"
      )
    ).toBe("0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7");
  });

  it("parses Safe references with chain aliases", () => {
    expect(
      parseSafeReference(
        "https://app.safe.global/home?safe=arb1:0x7379D7bB2ccA68982E467632B6554fD4e72e9431"
      )
    ).toEqual({
      chainAlias: "arb1",
      address: "0x7379D7bB2ccA68982E467632B6554fD4e72e9431",
    });
  });

  it("matches Safe chain aliases against configured chain metadata", () => {
    expect(matchesSafeChainAlias("ethereum-mainnet", "Ethereum", "eth")).toBe(
      true
    );
    expect(matchesSafeChainAlias("base-mainnet", "Base", "base")).toBe(true);
    expect(matchesSafeChainAlias("optimism-mainnet", "Optimism", "oeth")).toBe(
      true
    );
    expect(matchesSafeChainAlias("arbitrum-mainnet", "Arbitrum", "arb1")).toBe(
      true
    );
    expect(matchesSafeChainAlias("solana-mainnet", "Solana", "eth")).toBe(
      false
    );
  });

  it("resolves transaction service aliases and URLs", () => {
    expect(getSafeChainAlias("bnb-mainnet", "BNB Chain")).toBe("bnb");
    expect(
      getSafeTransactionServiceBaseUrl({
        id: "ethereum-mainnet",
        name: "Ethereum",
      })
    ).toBe("https://api.safe.global/tx-service/eth/api/v2");
  });

  it("converts Safe service transactions into workspace proposals", () => {
    const proposal = toWorkspaceProposalFromSafeTransaction(
      {
        safe: "0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7",
        nonce: "32",
        proposer: "0xa7ECcdb9Be08178f896c26b7BbD8C3D4E844d9Ba",
        isExecuted: true,
        confirmationsRequired: 6,
        confirmations: [
          {
            owner: "0xa7ECcdb9Be08178f896c26b7BbD8C3D4E844d9Ba",
          },
          {
            owner: "0x2f43Ac3cD6A22E4Ba20d3d18d116b1f9420eD84B",
          },
        ],
        txType: "MULTISIG_TRANSACTION",
      },
      "ethereum-mainnet",
      "0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7"
    );

    expect(proposal).toMatchObject({
      provider: "safe",
      multisigKey: "0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7",
      chainId: "ethereum-mainnet",
      creator: "0xa7ECcdb9Be08178f896c26b7BbD8C3D4E844d9Ba",
      status: "Executed",
      executed: true,
      cancelled: false,
    });
    expect(proposal?.transactionIndex).toBe(BigInt(32));
    expect(proposal?.approvals).toHaveLength(2);
  });
});
