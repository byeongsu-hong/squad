import { describe, expect, it } from "vitest";

import {
  DEFAULT_CHAINS,
  getChainRpcUrls,
  normalizeChainConfig,
} from "@/types/chain";

describe("chain config RPC endpoints", () => {
  it("normalizes rpcUrl as the primary endpoint and de-duplicates fallbacks", () => {
    const chain = normalizeChainConfig({
      id: "custom-ethereum",
      name: "Ethereum",
      rpcUrl: "https://primary.example",
      rpcUrls: [
        "https://primary.example",
        "https://fallback.example",
        "https://fallback.example",
      ],
      vmFamily: "evm",
      multisigProvider: "safe",
    });

    expect(chain.rpcUrl).toBe("https://primary.example");
    expect(chain.rpcUrls).toEqual([
      "https://primary.example",
      "https://fallback.example",
    ]);
    expect(getChainRpcUrls(chain)).toEqual([
      "https://primary.example",
      "https://fallback.example",
    ]);
  });

  it("uses PublicNode as an Ethereum/Base default endpoint", () => {
    const ethereum = DEFAULT_CHAINS.find(
      (chain) => chain.id === "ethereum-mainnet"
    );
    const base = DEFAULT_CHAINS.find((chain) => chain.id === "base-mainnet");
    const solana = DEFAULT_CHAINS.find(
      (chain) => chain.id === "solana-mainnet"
    );

    expect(ethereum?.rpcUrl).toBe("https://ethereum-rpc.publicnode.com");
    expect(ethereum?.rpcUrls).toContain("https://eth.llamarpc.com");
    expect(base?.rpcUrl).toBe("https://base-rpc.publicnode.com");
    expect(base?.rpcUrls).toContain("https://base.llamarpc.com");
    expect(solana?.rpcUrls).toContain("https://solana-rpc.publicnode.com");
  });

  it("migrates stored default chain RPC settings to the fallback policy", () => {
    expect(
      normalizeChainConfig({
        id: "ethereum-mainnet",
        name: "Ethereum",
        rpcUrl: "https://eth.llamarpc.com",
        vmFamily: "evm",
        multisigProvider: "safe",
      })
    ).toMatchObject({
      rpcUrl: "https://ethereum-rpc.publicnode.com",
      rpcUrls: [
        "https://ethereum-rpc.publicnode.com",
        "https://eth.llamarpc.com",
      ],
    });

    expect(
      normalizeChainConfig({
        id: "solana-mainnet",
        name: "Solana",
        rpcUrl: "https://api.mainnet-beta.solana.com",
        squadsV4ProgramId: "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf",
      }).rpcUrls
    ).toContain("https://solana-rpc.publicnode.com");
  });
});
