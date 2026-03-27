import type {
  WorkspaceProviderAdapter,
  WorkspaceProviderCapability,
} from "@/lib/workspace/provider-contract";
import { safeWorkspaceAdapter } from "@/lib/workspace/safe-adapter";
import { squadsWorkspaceAdapter } from "@/lib/workspace/squads-adapter";
import type { WorkspaceProviderId } from "@/types/workspace";

const adapters: Record<WorkspaceProviderId, WorkspaceProviderAdapter> = {
  squads: squadsWorkspaceAdapter,
  safe: safeWorkspaceAdapter,
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

export function supportsProviderCapability(
  provider: WorkspaceProviderId,
  capability: WorkspaceProviderCapability
) {
  return getWorkspaceProviderAdapter(provider).capabilities[capability];
}
