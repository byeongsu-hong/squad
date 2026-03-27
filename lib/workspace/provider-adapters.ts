import type { WorkspaceProviderAdapter } from "@/lib/workspace/provider-contract";
import { squadsWorkspaceAdapter } from "@/lib/workspace/squads-adapter";
import type { WorkspaceProviderId } from "@/types/workspace";

const unsupportedSafeAdapter: WorkspaceProviderAdapter = {
  id: "safe",
  label: "Safe",
  capabilities: {
    creatorSync: false,
    payload: false,
    proposalLoading: false,
    proposalActions: false,
  },
  async loadPayload() {
    throw new Error("Safe payload loading is not implemented yet.");
  },
};

const adapters: Record<WorkspaceProviderId, WorkspaceProviderAdapter> = {
  squads: squadsWorkspaceAdapter,
  safe: unsupportedSafeAdapter,
};

export function getWorkspaceProviderAdapter(provider: WorkspaceProviderId) {
  return adapters[provider];
}
