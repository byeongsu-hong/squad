import { PublicKey } from "@solana/web3.js";
import { describe, expect, it } from "vitest";

import {
  exportAll,
  exportChains,
  exportMultisigs,
  importFromYaml,
  serializeMultisigAccount,
} from "@/lib/export-import";
import type { AddressLabel } from "@/types/address-label";
import type { ChainConfig } from "@/types/chain";
import type { MultisigAccount } from "@/types/multisig";

describe("export-import", () => {
  const mockChains: ChainConfig[] = [
    {
      id: "test-chain",
      name: "Test Chain",
      rpcUrl: "https://test.example.com",
      squadsV4ProgramId: "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf",
      explorerUrl: "https://explorer.test.example.com",
      vmFamily: "svm",
      multisigProvider: "squads",
      isDefault: true,
    },
  ];

  const mockMultisigs: MultisigAccount[] = [
    {
      provider: "squads",
      publicKey: new PublicKey("GjwcWFQYzemBtpUoN5fMAP2FZviTtMRWCmrppGuTthJS"),
      threshold: 2,
      members: [
        {
          key: new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"),
          permissions: { mask: 1 },
        },
      ],
      transactionIndex: BigInt(0),
      msChangeIndex: 0,
      programId: new PublicKey("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf"),
      chainId: "test-chain",
      label: "Test Multisig",
      tags: ["ops", "treasury"],
    },
  ];

  const mockAddressLabels: AddressLabel[] = [
    {
      address: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
      label: "Deployer",
      description: "Primary signer",
      color: "#3b82f6",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    },
  ];

  describe("serializeMultisigAccount", () => {
    it("should serialize a multisig account with minimal data", () => {
      const serialized = serializeMultisigAccount(mockMultisigs[0]);

      expect(serialized.publicKey).toBe(
        "GjwcWFQYzemBtpUoN5fMAP2FZviTtMRWCmrppGuTthJS"
      );
      expect(serialized.chainId).toBe("test-chain");
      expect(serialized.label).toBe("Test Multisig");
      expect(serialized.tags).toEqual(["ops", "treasury"]);
      expect(serialized).not.toHaveProperty("threshold");
      expect(serialized).not.toHaveProperty("members");
      expect(serialized).not.toHaveProperty("transactionIndex");
    });
  });

  describe("exportChains", () => {
    it("should export chains to YAML format", () => {
      const yaml = exportChains(mockChains);

      expect(yaml).toContain("version:");
      expect(yaml).toContain("exportedAt:");
      expect(yaml).toContain("chains:");
      expect(yaml).toContain("id: test-chain");
      expect(yaml).toContain("name: Test Chain");
      expect(yaml).toContain("rpcUrl: https://test.example.com");
    });
  });

  describe("exportMultisigs", () => {
    it("should export multisigs to YAML format", () => {
      const yaml = exportMultisigs(mockMultisigs);

      expect(yaml).toContain("version:");
      expect(yaml).toContain("exportedAt:");
      expect(yaml).toContain("multisigs:");
      expect(yaml).toContain(
        "publicKey: GjwcWFQYzemBtpUoN5fMAP2FZviTtMRWCmrppGuTthJS"
      );
      expect(yaml).toContain("chainId: test-chain");
      expect(yaml).toContain("label: Test Multisig");
      expect(yaml).toContain("tags:");
      expect(yaml).toContain("- ops");
      expect(yaml).toContain("- treasury");
    });
  });

  describe("exportAll", () => {
    it("should export both chains and multisigs", () => {
      const yaml = exportAll(mockChains, mockMultisigs, mockAddressLabels);

      expect(yaml).toContain("version:");
      expect(yaml).toContain("chains:");
      expect(yaml).toContain("multisigs:");
      expect(yaml).toContain("addressLabels:");
      expect(yaml).toContain("id: test-chain");
      expect(yaml).toContain(
        "publicKey: GjwcWFQYzemBtpUoN5fMAP2FZviTtMRWCmrppGuTthJS"
      );
      expect(yaml).toContain("label: Deployer");
    });
  });

  describe("importFromYaml", () => {
    it("should import chains from YAML", () => {
      const yaml = exportChains(mockChains);
      const imported = importFromYaml(yaml);

      expect(imported.version).toBe("1.0");
      expect(imported.chains).toHaveLength(1);
      expect(imported.chains?.[0].id).toBe("test-chain");
      expect(imported.chains?.[0].name).toBe("Test Chain");
      expect(imported.chains?.[0].vmFamily).toBe("svm");
      expect(imported.chains?.[0].multisigProvider).toBe("squads");
    });

    it("should import multisigs from YAML", () => {
      const yaml = exportMultisigs(mockMultisigs);
      const imported = importFromYaml(yaml);

      expect(imported.version).toBe("1.0");
      expect(imported.multisigs).toHaveLength(1);
      expect(imported.multisigs?.[0].publicKey).toBe(
        "GjwcWFQYzemBtpUoN5fMAP2FZviTtMRWCmrppGuTthJS"
      );
      expect(imported.multisigs?.[0].chainId).toBe("test-chain");
      expect(imported.multisigs?.[0].tags).toEqual(["ops", "treasury"]);
    });

    it("should import both chains and multisigs from YAML", () => {
      const yaml = exportAll(mockChains, mockMultisigs, mockAddressLabels);
      const imported = importFromYaml(yaml);

      expect(imported.version).toBe("1.0");
      expect(imported.chains).toHaveLength(1);
      expect(imported.multisigs).toHaveLength(1);
      expect(imported.addressLabels).toHaveLength(1);
      expect(imported.addressLabels?.[0].label).toBe("Deployer");
    });

    it("should throw error for invalid YAML", () => {
      expect(() => importFromYaml("invalid: yaml: content:")).toThrow();
    });

    it("should throw error for missing version", () => {
      const yaml = "chains:\n  - id: test";
      expect(() => importFromYaml(yaml)).toThrow("Missing version field");
    });

    it("should normalize legacy chains without provider metadata", () => {
      const yaml = `version: "1.0"
exportedAt: "2026-03-27T00:00:00.000Z"
chains:
  - id: legacy-chain
    name: Legacy Chain
    rpcUrl: https://legacy.example.com
    squadsV4ProgramId: SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf
`;
      const imported = importFromYaml(yaml);

      expect(imported.chains?.[0].vmFamily).toBe("svm");
      expect(imported.chains?.[0].multisigProvider).toBe("squads");
    });
  });

  describe("round-trip conversion", () => {
    it("should maintain data integrity for chains", () => {
      const exported = exportChains(mockChains);
      const imported = importFromYaml(exported);
      const chains = imported.chains!;

      expect(chains[0]).toEqual(mockChains[0]);
    });

    it("should maintain minimal multisig data", () => {
      const exported = exportMultisigs(mockMultisigs);
      const imported = importFromYaml(exported);
      const serializedMultisigs = imported.multisigs!;

      expect(serializedMultisigs[0].publicKey).toBe(
        mockMultisigs[0].publicKey.toString()
      );
      expect(serializedMultisigs[0].chainId).toBe(mockMultisigs[0].chainId);
      expect(serializedMultisigs[0].label).toBe(mockMultisigs[0].label);
      expect(serializedMultisigs[0].tags).toEqual(["ops", "treasury"]);
    });

    it("should handle export/import of all data", () => {
      const exported = exportAll(mockChains, mockMultisigs, mockAddressLabels);
      const imported = importFromYaml(exported);

      expect(imported.chains).toHaveLength(1);
      expect(imported.multisigs).toHaveLength(1);
      expect(imported.addressLabels).toHaveLength(1);
      expect(imported.chains![0]).toEqual(mockChains[0]);
      expect(imported.multisigs![0].publicKey).toBe(
        mockMultisigs[0].publicKey.toString()
      );
      expect(imported.addressLabels![0]).toEqual(mockAddressLabels[0]);
    });
  });
});
