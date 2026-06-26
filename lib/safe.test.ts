import { createPublicClient } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requestBroker } from "@/lib/rpc/request-broker";
import {
  fetchSafeTransactions,
  getSafeChainAlias,
  getSafeTransactionServiceBaseUrl,
  matchesSafeChainAlias,
  parseSafeAddressInput,
  parseSafeReference,
  toWorkspaceProposalFromSafeTransaction,
} from "@/lib/safe";
import type { ChainConfig } from "@/types/chain";

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createPublicClient: vi.fn(),
    http: vi.fn((url: string) => ({ url })),
  };
});

describe("safe helpers", () => {
  const safeChain: ChainConfig = {
    id: "ethereum-mainnet",
    name: "Ethereum",
    rpcUrl: "https://ethereum-rpc.publicnode.com",
    rpcUrls: [
      "https://ethereum-rpc.publicnode.com",
      "https://eth.llamarpc.com",
    ],
    vmFamily: "evm",
    multisigProvider: "safe",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    requestBroker.clear();
    delete process.env.SAFE_API_KEY;
  });

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

  it("sends the configured Safe API key to the transaction service", async () => {
    process.env.SAFE_API_KEY = " test-safe-api-key ";
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: vi.fn(async () => ({
        count: 0,
        next: null,
        previous: null,
        results: [],
      })),
    } as unknown as Response);

    await fetchSafeTransactions(
      { id: "ethereum-mainnet", name: "Ethereum" },
      "0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7"
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("https://api.safe.global/tx-service/eth/api/v2"),
      expect.objectContaining({
        headers: {
          accept: "application/json",
          authorization: "Bearer test-safe-api-key",
        },
      })
    );
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
      multisigKey:
        "ethereum-mainnet:0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7",
      chainId: "ethereum-mainnet",
      creator: "0xa7ECcdb9Be08178f896c26b7BbD8C3D4E844d9Ba",
      status: "Executed",
      executed: true,
      cancelled: false,
    });
    expect(proposal?.transactionIndex).toBe(BigInt(32));
    expect(proposal?.approvals).toHaveLength(2);
  });

  it("loads a full Safe import when owner and threshold reads succeed", async () => {
    const { loadSafeMultisig } = await import("@/lib/safe");
    vi.mocked(createPublicClient).mockReturnValue({
      readContract: vi.fn(async ({ functionName }) => {
        if (functionName === "getOwners") {
          return ["0xa7ECcdb9Be08178f896c26b7BbD8C3D4E844d9Ba"];
        }
        return 2n;
      }),
    } as unknown as ReturnType<typeof createPublicClient>);

    const multisig = await loadSafeMultisig(
      safeChain,
      "0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7",
      "Treasury",
      ["ops"],
      { allowDegraded: true }
    );

    expect(multisig).toMatchObject({
      provider: "safe",
      publicKey: "0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7",
      threshold: 2,
      label: "Treasury",
      tags: ["ops"],
      importStatus: "complete",
    });
    expect(multisig.members).toEqual([
      {
        key: "0xa7ECcdb9Be08178f896c26b7BbD8C3D4E844d9Ba",
        permissions: { mask: 0 },
      },
    ]);
  });

  it("keeps Safe import strict by default when owner reads fail", async () => {
    const { loadSafeMultisig } = await import("@/lib/safe");
    vi.mocked(createPublicClient).mockReturnValue({
      readContract: vi.fn(async () => {
        throw new Error("429 Too Many Requests");
      }),
    } as unknown as ReturnType<typeof createPublicClient>);

    await expect(
      loadSafeMultisig(safeChain, "0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7")
    ).rejects.toThrow("429 Too Many Requests");
  });

  it("creates a minimal degraded Safe import when enabled and owner reads fail", async () => {
    const { loadSafeMultisig } = await import("@/lib/safe");
    vi.mocked(createPublicClient).mockReturnValue({
      readContract: vi.fn(async () => {
        throw new Error("525 SSL handshake failed");
      }),
    } as unknown as ReturnType<typeof createPublicClient>);

    const multisig = await loadSafeMultisig(
      safeChain,
      "0x7379D7bB2ccA68982E467632B6554fD4e72e9431",
      "Treasury",
      ["ops"],
      { allowDegraded: true }
    );

    expect(multisig).toMatchObject({
      provider: "safe",
      publicKey: "0x7379D7bB2ccA68982E467632B6554fD4e72e9431",
      chainId: "ethereum-mainnet",
      threshold: 0,
      members: [],
      label: "Treasury",
      tags: ["ops"],
      importStatus: "degraded",
    });
    expect(multisig.importError).toContain("525 SSL handshake failed");
  });

  it("does not degrade semantic Safe import failures", async () => {
    const { loadSafeMultisig } = await import("@/lib/safe");
    vi.mocked(createPublicClient).mockReturnValue({
      readContract: vi.fn(async () => {
        throw new Error("execution reverted");
      }),
    } as unknown as ReturnType<typeof createPublicClient>);

    await expect(
      loadSafeMultisig(
        safeChain,
        "0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7",
        "Not a Safe",
        [],
        { allowDegraded: true }
      )
    ).rejects.toThrow("execution reverted");
  });
});
