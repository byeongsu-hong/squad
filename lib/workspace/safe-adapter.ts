import {
  SAFE_PROPOSALS_TTL,
  cache,
  safeProposalsCacheKey,
} from "@/lib/cache";
import type {
  WorkspaceProposalLoaderOptions,
  WorkspaceProposalSummaryLoaderOptions,
  WorkspaceProviderAdapter,
} from "@/lib/workspace/provider-contract";
import type {
  WorkspacePayload,
  WorkspaceProposal,
  WorkspaceProposalSummary,
} from "@/types/workspace";

async function fetchSafeProposals(
  chain: { id: string; name: string },
  multisig: WorkspaceProposalLoaderOptions["multisig"]
): Promise<WorkspaceProposal[]> {
  const params = new URLSearchParams({
    chainId: chain.id,
    chainName: chain.name,
    safeAddress: multisig.address,
    limit: "100",
  });

  const response = await fetch(`/api/safe/transactions?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? "Failed to load Safe proposals.");
  }

  const body = (await response.json()) as {
    proposals?: Array<
      Omit<WorkspaceProposal, "transactionIndex"> & {
        transactionIndex: string;
      }
    >;
  };

  return (body.proposals ?? []).map((proposal) => ({
    ...proposal,
    multisigKey: multisig.key,
    multisigAddress: multisig.address,
    transactionIndex: BigInt(proposal.transactionIndex),
  }));
}

export async function loadSafeWorkspaceProposalsForMultisig({
  chains,
  multisig,
  force = false,
}: WorkspaceProposalLoaderOptions & { force?: boolean }): Promise<WorkspaceProposal[]> {
  const chain = chains.find((item) => item.id === multisig.chainId);
  if (!chain) return [];

  const cacheKey = safeProposalsCacheKey(chain.id, multisig.address);

  if (!force) {
    const cached = cache.getStale<WorkspaceProposal[]>(cacheKey);
    if (cached && !cached.stale) {
      return cached.data;
    }

    // Stale-while-revalidate: return stale data immediately and refresh in background.
    if (cached?.stale) {
      fetchSafeProposals(chain, multisig)
        .then((fresh) => cache.set(cacheKey, fresh, SAFE_PROPOSALS_TTL))
        .catch(() => undefined);
      return cached.data;
    }
  }

  const proposals = await fetchSafeProposals(chain, multisig);
  cache.set(cacheKey, proposals, SAFE_PROPOSALS_TTL);
  return proposals;
}

export function invalidateSafeProposalCache(
  chainId: string,
  safeAddress: string
) {
  cache.invalidate(safeProposalsCacheKey(chainId, safeAddress));
}

export async function loadSafeWorkspacePayload({
  chains,
  multisig,
  proposal,
}: {
  chains: WorkspaceProposalLoaderOptions["chains"];
  multisig: WorkspaceProposalLoaderOptions["multisig"];
  proposal: WorkspaceProposal;
}): Promise<WorkspacePayload> {
  const chain = chains.find((item) => item.id === multisig.chainId);
  if (!chain) {
    throw new Error("Chain configuration not found for Safe payload loading.");
  }

  const params = new URLSearchParams({
    chainId: chain.id,
    chainName: chain.name,
    safeAddress: multisig.address,
    nonce: proposal.transactionIndex.toString(),
  });

  const response = await fetch(`/api/safe/payload?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Failed to load Safe payload.");
  }

  const payload = (await response.json()) as {
    payload?: WorkspacePayload;
  };

  if (!payload.payload) {
    throw new Error("Safe payload response was empty.");
  }

  return payload.payload;
}

export async function loadSafeWorkspaceProposalSummary({
  chains,
  multisig,
}: WorkspaceProposalSummaryLoaderOptions): Promise<WorkspaceProposalSummary> {
  const chain = chains.find((item) => item.id === multisig.chainId);
  if (!chain) {
    throw new Error("Chain configuration not found for Safe proposal summary.");
  }

  const params = new URLSearchParams({
    chainId: chain.id,
    chainName: chain.name,
    safeAddress: multisig.address,
  });

  const response = await fetch(`/api/safe/count?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Failed to load Safe proposal summary.");
  }

  const payload = (await response.json()) as {
    totalCount?: number;
    unavailableReason?: string;
  };

  return {
    totalCount: payload.totalCount ?? 0,
    unavailableReason: payload.unavailableReason,
  };
}

export const safeWorkspaceAdapter: WorkspaceProviderAdapter = {
  id: "safe",
  label: "Safe",
  capabilities: {
    creatorSync: false,
    payload: true,
    proposalLoading: true,
    proposalSummary: true,
    proposalActions: true,
  },
  getUnsupportedMessage(capability) {
    if (capability === "creatorSync") {
      return "Safe creator sync is not implemented yet.";
    }

    return null;
  },
  loadProposalsForMultisig(options) {
    return loadSafeWorkspaceProposalsForMultisig(options);
  },
  loadProposalSummary(options) {
    return loadSafeWorkspaceProposalSummary(options);
  },
  loadPayload({ chains, multisig, proposal }) {
    return loadSafeWorkspacePayload({ chains, multisig, proposal });
  },
};
