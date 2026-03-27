import type {
  WorkspaceProviderAdapter,
  WorkspaceProviderCapability,
} from "@/lib/workspace/provider-contract";
import { squadsWorkspaceAdapter } from "@/lib/workspace/squads-adapter";
import type { WorkspaceProviderId } from "@/types/workspace";

function getSafeUnsupportedMessage(capability: WorkspaceProviderCapability) {
  if (capability === "payload") {
    return "Safe payload loading is not implemented yet.";
  }

  if (capability === "proposalActions") {
    return "Safe proposal actions are not implemented yet.";
  }

  if (capability === "proposalLoading") {
    return "Safe proposal loading is not implemented yet.";
  }

  if (capability === "creatorSync") {
    return "Safe creator sync is not implemented yet.";
  }

  return "This provider capability is not implemented yet.";
}

const unsupportedSafeAdapter: WorkspaceProviderAdapter = {
  id: "safe",
  label: "Safe",
  capabilities: {
    creatorSync: false,
    payload: false,
    proposalLoading: false,
    proposalActions: false,
  },
  getUnsupportedMessage: getSafeUnsupportedMessage,
  async loadPayload() {
    throw new Error(getSafeUnsupportedMessage("payload"));
  },
};

const adapters: Record<WorkspaceProviderId, WorkspaceProviderAdapter> = {
  squads: squadsWorkspaceAdapter,
  safe: unsupportedSafeAdapter,
};

export function getWorkspaceProviderAdapter(provider: WorkspaceProviderId) {
  return adapters[provider];
}

export function getUnsupportedProviderMessage(
  provider: WorkspaceProviderId,
  capability: WorkspaceProviderCapability
) {
  const adapter = getWorkspaceProviderAdapter(provider);
  return (
    adapter.getUnsupportedMessage?.(capability) ??
    `${adapter.label} ${capability} is not implemented yet.`
  );
}
