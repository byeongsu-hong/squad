import { PublicKey } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";

import { exportMultisigsToCSV, exportProposalsToCSV } from "@/lib/export-csv";
import type { MultisigAccount, ProposalAccount } from "@/types/multisig";

// Mock URL and Blob APIs
global.URL.createObjectURL = vi.fn(() => "mock-url");
global.URL.revokeObjectURL = vi.fn();

describe("exportProposalsToCSV", () => {
  it("should create CSV with correct headers", () => {
    const proposals: ProposalAccount[] = [
      {
        multisig: new PublicKey("So11111111111111111111111111111111111111112"),
        transactionIndex: BigInt(1),
        creator: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        status: "Active",
        approvals: [],
        rejections: [],
        executed: false,
        cancelled: false,
      },
    ];

    const multisigMap = new Map<string, MultisigAccount>([
      [
        "So11111111111111111111111111111111111111112",
        {
          publicKey: new PublicKey(
            "So11111111111111111111111111111111111111112"
          ),
          threshold: 2,
          members: [],
          transactionIndex: BigInt(0),
          msChangeIndex: 0,
          programId: new PublicKey(
            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          ),
          chainId: "solana",
          label: "Test Multisig",
        },
      ],
    ]);

    // Mock DOM methods
    const clickSpy = vi.fn();
    const mockLink = document.createElement("a");
    mockLink.click = clickSpy;

    vi.spyOn(document, "createElement").mockReturnValue(mockLink);
    vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
    vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);

    exportProposalsToCSV(proposals, multisigMap);

    expect(document.createElement).toHaveBeenCalledWith("a");
    expect(clickSpy).toHaveBeenCalled();
  });
});

describe("exportMultisigsToCSV", () => {
  it("should export multisigs with correct data", () => {
    const multisigs: MultisigAccount[] = [
      {
        publicKey: new PublicKey("So11111111111111111111111111111111111111112"),
        threshold: 2,
        members: [
          {
            key: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
            permissions: { mask: 1 },
          },
          {
            key: new PublicKey("11111111111111111111111111111111"),
            permissions: { mask: 1 },
          },
        ],
        transactionIndex: BigInt(5),
        msChangeIndex: 0,
        programId: new PublicKey("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf"),
        chainId: "solana",
        label: "My Multisig",
        tags: ["treasury", "dao"],
      },
    ];

    const clickSpy = vi.fn();
    const mockLink = document.createElement("a");
    mockLink.click = clickSpy;

    vi.spyOn(document, "createElement").mockReturnValue(mockLink);
    vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
    vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);

    exportMultisigsToCSV(multisigs);

    expect(document.createElement).toHaveBeenCalledWith("a");
    expect(clickSpy).toHaveBeenCalled();
  });
});
