export type WorkspaceProviderId = "squads" | "safe";

export type WorkspaceQueueFilter = "all" | "waiting" | "executable";
export type WorkspaceDetailTab = "overview" | "payload";
export type WorkspaceExplorerMode = "views" | "chains" | "tags";
export type WorkspaceSettingsSection =
  | "chains"
  | "multisigs"
  | "registry"
  | "labels";

export type WorkspaceProposalStatus =
  | "Active"
  | "Approved"
  | "Rejected"
  | "Executed"
  | "Cancelled";

export interface WorkspaceMember {
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

export interface WorkspaceProposalSummary {
  totalCount: number;
  unavailableReason?: string;
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

export interface WorkspaceExplorerView {
  id: string;
  label: string;
  multisigKeys: string[];
  description: string;
  meta: string;
}

export interface WorkspaceRegistryItem {
  multisig: WorkspaceMultisig;
  waiting: number;
  executable: number;
  active: number;
}

export interface WorkspacePayloadInstruction {
  programAddress: string;
  accountAddresses: string[];
  accountIndexes: number[];
  data: string;
}

export interface WorkspacePayloadConfigAction {
  type: "config";
  transactionPda: string;
  vaultAddress: string | null;
  actions: unknown[];
}

export interface WorkspacePayloadVaultAction {
  type: "vault";
  transactionPda: string;
  vaultAddress: string | null;
  instructions: WorkspacePayloadInstruction[];
}

export interface WorkspacePayloadSafeAction {
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
