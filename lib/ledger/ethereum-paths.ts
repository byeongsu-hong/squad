import type { Hex } from "viem";

export const EVM_LEDGER_DERIVATION_PATH_PATTERN = "m/44'/60'/0'/0/n";

export interface EthereumLedgerSignatureParts {
  r: string;
  s: string;
  v: number;
}

export function getEvmLedgerDerivationPath(index: number) {
  return `44'/60'/0'/0/${index}`;
}

export function formatEvmLedgerDerivationPath(index: number) {
  return `m/${getEvmLedgerDerivationPath(index)}`;
}

function stripHexPrefix(value: string) {
  return value.startsWith("0x") ? value.slice(2) : value;
}

export function ledgerSignatureToHex(
  signature: EthereumLedgerSignatureParts
): Hex {
  const normalizedV = signature.v < 27 ? signature.v + 27 : signature.v;
  const v = normalizedV.toString(16).padStart(2, "0");
  const r = stripHexPrefix(signature.r).padStart(64, "0");
  const s = stripHexPrefix(signature.s).padStart(64, "0");
  return `0x${r}${s}${v}` as Hex;
}
