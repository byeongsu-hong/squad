import type { ChainConfig } from "@/types/chain";
import type {
  WorkspaceMultisig,
  WorkspacePayload,
  WorkspaceProposal,
  WorkspaceProviderId,
} from "@/types/workspace";

export interface WorkspacePayloadLoaderOptions {
  chains: ChainConfig[];
  multisig: WorkspaceMultisig;
  proposal: WorkspaceProposal;
}

export interface WorkspaceProposalLoaderOptions {
  chains: ChainConfig[];
  multisig: WorkspaceMultisig;
}

export interface WorkspaceProviderCapabilities {
  creatorSync: boolean;
  payload: boolean;
  proposalLoading: boolean;
  proposalActions: boolean;
}

export type WorkspaceProviderCapability = keyof WorkspaceProviderCapabilities;

export interface WorkspaceProviderAdapter {
  id: WorkspaceProviderId;
  label: string;
  capabilities: WorkspaceProviderCapabilities;
  getUnsupportedMessage?: (
    capability: WorkspaceProviderCapability
  ) => string | null;
  loadProposalsForMultisig(
    options: WorkspaceProposalLoaderOptions
  ): Promise<WorkspaceProposal[]>;
  loadPayload(
    options: WorkspacePayloadLoaderOptions
  ): Promise<WorkspacePayload>;
}
