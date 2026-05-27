import type { PublicKey } from "@solana/web3.js";

type MultisigProvider = "squads" | "safe";
export type SquadsMultisigVersion = "v3" | "v4";

export interface MultisigAccount {
  provider: MultisigProvider;
  squadsVersion?: SquadsMultisigVersion;
  publicKey: PublicKey | string;
  threshold: number;
  members: MultisigMember[];
  transactionIndex: bigint;
  msChangeIndex: number;
  programId?: PublicKey | string;
  chainId: string;
  label?: string;
  tags?: string[];
  vaultPda?: PublicKey | string;
  importStatus?: "complete" | "degraded";
  importError?: string;
}

interface MultisigMember {
  key: PublicKey | string;
  permissions: {
    mask: number;
  };
}

interface SquadsMultisigAccount extends MultisigAccount {
  provider: "squads";
  squadsVersion?: SquadsMultisigVersion;
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

export function isSquadsMultisig(
  multisig: MultisigAccount | null | undefined
): multisig is SquadsMultisigAccount {
  return Boolean(multisig && multisig.provider === "squads");
}

export function getMultisigAccountKey(
  multisig: Pick<MultisigAccount, "chainId" | "publicKey">
) {
  return `${multisig.chainId}:${multisig.publicKey.toString()}`;
}

export function matchesMultisigSelectionKey(
  multisig: Pick<MultisigAccount, "chainId" | "publicKey">,
  selectionKey: string | null | undefined
) {
  if (!selectionKey) {
    return false;
  }

  return (
    getMultisigAccountKey(multisig) === selectionKey ||
    multisig.publicKey.toString() === selectionKey
  );
}

export function resolveMultisigSelectionKey(
  multisigs: Pick<MultisigAccount, "chainId" | "publicKey">[],
  selectionKey: string | null | undefined
) {
  if (!selectionKey) {
    return null;
  }

  const exactMatch = multisigs.find(
    (multisig) => getMultisigAccountKey(multisig) === selectionKey
  );
  if (exactMatch) {
    return getMultisigAccountKey(exactMatch);
  }

  const legacyMatches = multisigs.filter(
    (multisig) => multisig.publicKey.toString() === selectionKey
  );
  if (legacyMatches.length > 0) {
    return getMultisigAccountKey(legacyMatches[0]!);
  }

  return null;
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
