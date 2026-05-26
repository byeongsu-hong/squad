import { describe, expect, it } from "vitest";

import {
  EVM_LEDGER_DERIVATION_PATH_PATTERN,
  formatEvmLedgerDerivationPath,
  getEvmLedgerDerivationPath,
  ledgerSignatureToHex,
} from "./ethereum";

describe("ethereum ledger helpers", () => {
  it("uses Ethereum BIP44 paths, not Solana paths", () => {
    expect(EVM_LEDGER_DERIVATION_PATH_PATTERN).toBe("m/44'/60'/0'/0/n");
    expect(getEvmLedgerDerivationPath(0)).toBe("44'/60'/0'/0/0");
    expect(formatEvmLedgerDerivationPath(3)).toBe("m/44'/60'/0'/0/3");
  });

  it("serializes Ledger signatures as EVM 65-byte hex signatures", () => {
    const r = `0x${"11".repeat(32)}` as const;
    const s = `0x${"22".repeat(32)}` as const;

    expect(ledgerSignatureToHex({ r, s, v: 1 })).toBe(
      `0x${"11".repeat(32)}${"22".repeat(32)}1c`
    );
    expect(ledgerSignatureToHex({ r, s, v: 27 })).toBe(
      `0x${"11".repeat(32)}${"22".repeat(32)}1b`
    );
  });
});
