import type { PublicKey } from "@solana/web3.js";

export enum WalletType {
  LEDGER = "ledger",
  BROWSER = "browser",
  OKX = "okx",
}

export interface WalletState {
  connected: boolean;
  publicKey: PublicKey | null;
  walletType: WalletType | null;
  walletName?: string;
  derivationPath?: string;
  deviceModel?: string;
}

export interface LedgerAccount {
  publicKey: PublicKey;
  derivationPath: string;
  balance?: number;
}

export const ACCOUNTS_PER_PAGE = 5;

export enum DerivationPathType {
  BIP44_CHANGE = "bip44Change",
  LEDGER_LIVE = "ledgerLive",
  BIP44 = "bip44",
  LEGACY = "legacy",
}

export const DERIVATION_PATH_PATTERNS = {
  [DerivationPathType.BIP44_CHANGE]: {
    name: "Phantom / Solflare (Default)",
    description: "m/44'/501'/X'/0'",
    getPath: (index: number) => `44'/501'/${index}'/0'`,
  },
  [DerivationPathType.LEDGER_LIVE]: {
    name: "Ledger Live",
    description: "m/44'/501'/0'/X'",
    getPath: (index: number) => `44'/501'/0'/${index}'`,
  },
  [DerivationPathType.BIP44]: {
    name: "BIP44 Standard",
    description: "m/44'/501'/X'",
    getPath: (index: number) => `44'/501'/${index}'`,
  },
  [DerivationPathType.LEGACY]: {
    name: "Legacy",
    description: "m/501'/X'/0/0",
    getPath: (index: number) => `501'/${index}'/0/0`,
  },
};

export const getDerivationPath = (
  index: number,
  type: DerivationPathType = DerivationPathType.BIP44_CHANGE
): string => {
  return DERIVATION_PATH_PATTERNS[type].getPath(index);
};

export enum LedgerError {
  DEVICE_LOCKED = "Device is locked. Please unlock your Ledger.",
  WRONG_APP = "Wrong app opened. Please open the Solana app on your Ledger.",
  USER_REJECTED = "Transaction rejected by user.",
  TRANSPORT_ERROR = "Failed to connect to Ledger. Please reconnect your device.",
  TIMEOUT = "Connection timeout. Please try again.",
  UNKNOWN = "An unknown error occurred.",
}

function extractErrorMessage(error: unknown): string {
  if (!error) return "";

  // If it's an Error object with a message
  if (error instanceof Error) {
    return error.message;
  }

  // If it has a message property
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  // If it's a string
  if (typeof error === "string") {
    return error;
  }

  // Try to stringify the object
  try {
    const stringified = JSON.stringify(error);
    if (stringified !== "{}") {
      return stringified;
    }
  } catch {
    // JSON.stringify failed
  }

  // Last resort
  return String(error);
}

export function parseLedgerError(error: unknown): string {
  if (!error) return LedgerError.UNKNOWN;

  const originalMessage = extractErrorMessage(error);
  const errorMessage = originalMessage.toLowerCase();
  const errorString = String(error).toLowerCase();

  // Check for device locked
  if (errorMessage.includes("locked") || errorString.includes("locked")) {
    return LedgerError.DEVICE_LOCKED;
  }

  // Check for wrong app or app not open
  if (
    errorMessage.includes("app") ||
    errorMessage.includes("0x6511") ||
    errorMessage.includes("0x6e00") ||
    errorMessage.includes("0x6d00") ||
    errorString.includes("app") ||
    errorString.includes("open")
  ) {
    return LedgerError.WRONG_APP;
  }

  // Check for user rejection
  if (
    errorMessage.includes("rejected") ||
    errorMessage.includes("0x6985") ||
    errorMessage.includes("denied") ||
    errorMessage.includes("cancelled") ||
    errorString.includes("rejected") ||
    errorString.includes("denied") ||
    errorString.includes("cancelled")
  ) {
    return LedgerError.USER_REJECTED;
  }

  // Check for transport/connection errors
  if (
    errorMessage.includes("transport") ||
    errorMessage.includes("disconnected") ||
    errorMessage.includes("hid") ||
    errorMessage.includes("device not found") ||
    errorString.includes("transport") ||
    errorString.includes("disconnected") ||
    errorString.includes("hid")
  ) {
    return LedgerError.TRANSPORT_ERROR;
  }

  // Check for timeout
  if (errorMessage.includes("timeout") || errorString.includes("timeout")) {
    return LedgerError.TIMEOUT;
  }

  // Return original error message for unknown errors
  return originalMessage || LedgerError.UNKNOWN;
}
