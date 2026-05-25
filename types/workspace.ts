export type WorkspaceProviderId = "squads" | "safe";

export type WorkspaceSettingsSection =
  | "chains"
  | "adapters"
  | "abis"
  | "registry"
  | "labels";

export type WorkspaceProposalStatus =
  | "Active"
  | "Approved"
  | "Rejected"
  | "Executed"
  | "Cancelled";

interface WorkspaceMember {
  address: string;
  permissionsMask: number;
}

export interface WorkspaceMultisig {
  provider: WorkspaceProviderId;
  key: string;
  address: string;
  chainId: string;
  chainName: string;
  label?: string;
  tags: string[];
  threshold: number;
  members: WorkspaceMember[];
  vaultAddress?: string;
}

export interface WorkspaceProposal {
  provider: WorkspaceProviderId;
  multisigKey: string;
  multisigAddress: string;
  chainId: string;
  transactionIndex: bigint;
  creator?: string;
  createdAt?: string;
  status: WorkspaceProposalStatus;
  approvals: string[];
  rejections: string[];
  executed: boolean;
  cancelled: boolean;
}

export function getWorkspaceMultisigKey(chainId: string, address: string) {
  return `${chainId}:${address}`;
}

export interface WorkspaceQueueItem {
  focusKey: string;
  provider: WorkspaceProviderId;
  proposal: WorkspaceProposal;
  multisig: WorkspaceMultisig;
  approvalCount: number;
  currentUserApproved: boolean;
  currentUserRejected: boolean;
  isMember: boolean;
  needsYourSignature: boolean;
  readyToExecute: boolean;
  missingApprovals: number;
  priority: number;
  lineLabel: string;
}

interface WorkspacePayloadInstruction {
  programAddress: string;
  accountAddresses: string[];
  accountIndexes: number[];
  data: string;
}

interface WorkspacePayloadConfigAction {
  type: "config";
  transactionPda: string;
  vaultAddress: string | null;
  actions: unknown[];
}

interface WorkspacePayloadVaultAction {
  type: "vault";
  transactionPda: string;
  vaultAddress: string | null;
  instructions: WorkspacePayloadInstruction[];
}

interface WorkspacePayloadSafeAction {
  type: "safe";
  safeTxHash: string | null;
  nonce: string;
  toAddress: string | null;
  value: string | null;
  operation: number | null;
  data: string | null;
  dataDecoded: unknown;
}

export type WorkspacePayload =
  | WorkspacePayloadConfigAction
  | WorkspacePayloadVaultAction
  | WorkspacePayloadSafeAction;
