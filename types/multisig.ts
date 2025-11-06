import type { PublicKey } from "@solana/web3.js";

export interface MultisigAccount {
  publicKey: PublicKey;
  threshold: number;
  members: MultisigMember[];
  transactionIndex: bigint;
  msChangeIndex: number;
  programId: PublicKey;
  chainId: string;
  label?: string;
  tags?: string[];
  vaultPda?: PublicKey;
}

export interface MultisigMember {
  key: PublicKey;
  permissions: {
    mask: number;
  };
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
