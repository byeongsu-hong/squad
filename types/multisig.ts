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
}

export interface MultisigMember {
  key: PublicKey;
  permissions: {
    mask: number;
  };
}

export interface ProposalAccount {
  multisig: PublicKey;
  transactionIndex: bigint;
  creator: PublicKey;
  status: ProposalStatus;
  approvals: PublicKey[];
  rejections: PublicKey[];
  cancelled: boolean;
  executed: boolean;
}

export enum ProposalStatus {
  Active = "Active",
  Approved = "Approved",
  Rejected = "Rejected",
  Executed = "Executed",
  Cancelled = "Cancelled",
}
