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

export interface WorkspaceProviderCapabilities {
  creatorSync: boolean;
  payload: boolean;
  proposalLoading: boolean;
  proposalActions: boolean;
}

export interface WorkspaceProviderAdapter {
  id: WorkspaceProviderId;
  label: string;
  capabilities: WorkspaceProviderCapabilities;
  loadPayload(
    options: WorkspacePayloadLoaderOptions
  ): Promise<WorkspacePayload>;
}
