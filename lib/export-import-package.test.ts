import { describe, expect, it } from "vitest";

import type { ExportData } from "@/lib/export-import";
import {
  RAW_YAML_PREVIEW_LIMIT,
  buildRawYamlPreview,
  buildWorkspacePackageSummary,
} from "@/lib/export-import-package";

describe("workspace package summaries", () => {
  const packageData: ExportData = {
    version: "1.0",
    exportedAt: "2026-05-25T00:00:00.000Z",
    chains: [
      {
        id: "solana-mainnet",
        name: "Solana",
        rpcUrl: "https://solana.example.com",
        squadsV4ProgramId: "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf",
        vmFamily: "svm",
        multisigProvider: "squads",
      },
      {
        id: "ethereum-mainnet",
        name: "Ethereum",
        rpcUrl: "https://ethereum.example.com",
        vmFamily: "evm",
        multisigProvider: "safe",
      },
    ],
    multisigs: [
      {
        provider: "safe",
        publicKey: "0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7",
        chainId: "ethereum-mainnet",
        label: "Treasury",
        tags: [],
      },
    ],
    addressLabels: [
      {
        address: "0x1111111111111111111111111111111111111111",
        label: "Recipient",
        color: "#3b82f6",
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    providerAdapters: {
      evm: {
        safe: {
          transactionServiceUrl: "",
          singletonAddress: "",
          proxyFactoryAddress: "",
          customAbis: [
            {
              label: "ERC20",
              enabled: true,
              source: "transfer(address to, uint256 amount)",
            },
            {
              label: "Broken",
              enabled: false,
              source: "not valid abi source",
            },
          ],
        },
      },
    },
  };

  it("summarizes package counts and per-ABI parse status", () => {
    const summary = buildWorkspacePackageSummary(packageData, "yaml body");

    expect(summary.counts).toMatchObject({
      chains: 2,
      vaults: 1,
      labels: 1,
      safeChains: 1,
      customAbis: 2,
      enabledCustomAbis: 1,
      invalidCustomAbis: 1,
    });
    expect(summary.abiRows).toEqual([
      expect.objectContaining({
        label: "ERC20",
        enabled: true,
        functionCount: 1,
        parseStatus: "valid",
      }),
      expect.objectContaining({
        label: "Broken",
        enabled: false,
        functionCount: 0,
        parseStatus: "invalid",
      }),
    ]);
  });

  it("auto-collapses and caps raw YAML preview for ABI-heavy packages", () => {
    const content = "a".repeat(RAW_YAML_PREVIEW_LIMIT + 20);
    const preview = buildRawYamlPreview(content, { customAbiCount: 1 });

    expect(preview.defaultCollapsed).toBe(true);
    expect(preview.isTruncated).toBe(true);
    expect(preview.preview).toHaveLength(RAW_YAML_PREVIEW_LIMIT);
    expect(preview.omittedBytes).toBe(20);
  });

  it("keeps small packages expanded when they do not contain custom ABIs", () => {
    const preview = buildRawYamlPreview("version: '1.0'\n", {
      customAbiCount: 0,
    });

    expect(preview.defaultCollapsed).toBe(false);
    expect(preview.isTruncated).toBe(false);
  });
});
