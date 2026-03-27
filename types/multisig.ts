import type { PublicKey } from "@solana/web3.js";

export type MultisigProvider = "squads" | "safe";
export type MultisigAddress = PublicKey | string;

export interface MultisigAccount {
  provider: MultisigProvider;
  publicKey: MultisigAddress;
  threshold: number;
  members: MultisigMember[];
  transactionIndex: bigint;
  msChangeIndex: number;
  programId?: MultisigAddress;
  chainId: string;
  label?: string;
  tags?: string[];
  vaultPda?: MultisigAddress;
}

export interface MultisigMember {
  key: MultisigAddress;
  permissions: {
    mask: number;
  };
}

export interface SquadsMultisigAccount extends MultisigAccount {
  provider: "squads";
  publicKey: PublicKey;
  members: Array<{
    key: PublicKey;
    permissions: {
      mask: number;
    };
  }>;
  programId?: PublicKey;
  vaultPda?: PublicKey;
}

export interface SafeMultisigAccount extends MultisigAccount {
  provider: "safe";
  publicKey: string;
  members: Array<{
    key: string;
    permissions: {
      mask: number;
    };
  }>;
  programId?: string;
  vaultPda?: string;
}

export function isSquadsMultisig(
  multisig: MultisigAccount | null | undefined
): multisig is SquadsMultisigAccount {
  return Boolean(multisig && multisig.provider === "squads");
}

export function isSafeMultisig(
  multisig: MultisigAccount | null | undefined
): multisig is SafeMultisigAccount {
  return Boolean(multisig && multisig.provider === "safe");
}

export type ProposalStatus =
  | "Active"
  | "Approved"
  | "Rejected"
  | "Executed"
  | "Cancelled";

export interface ProposalAccount {
  multisig: PublicKey;
  transactionIndex: bigint;
  creator?: PublicKey;
  status: ProposalStatus;
  approvals: PublicKey[];
  rejections: PublicKey[];
  cancelled: boolean;
  executed: boolean;
}

/**
 * Safely converts a status string to ProposalStatus
 */
export function toProposalStatus(status: string): ProposalStatus {
  const validStatuses: ProposalStatus[] = [
    "Active",
    "Approved",
    "Rejected",
    "Executed",
    "Cancelled",
  ];

  if (validStatuses.includes(status as ProposalStatus)) {
    return status as ProposalStatus;
  }

  // Default to Active if unknown status
  console.warn(`Unknown proposal status: ${status}, defaulting to Active`);
  return "Active";
}
