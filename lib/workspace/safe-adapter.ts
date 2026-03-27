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

export async function loadSafeWorkspaceProposalsForMultisig({
  chains,
  multisig,
}: WorkspaceProposalLoaderOptions): Promise<WorkspaceProposal[]> {
  const chain = chains.find((item) => item.id === multisig.chainId);
  if (!chain) {
    return [];
  }

  const params = new URLSearchParams({
    chainId: chain.id,
    chainName: chain.name,
    safeAddress: multisig.key,
    limit: "100",
  });

  const response = await fetch(`/api/safe/transactions?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Failed to load Safe proposals.");
  }

  const payload = (await response.json()) as {
    proposals?: Array<
      Omit<WorkspaceProposal, "transactionIndex"> & {
        transactionIndex: string;
      }
    >;
  };

  return (payload.proposals ?? []).map((proposal) => ({
    ...proposal,
    transactionIndex: BigInt(proposal.transactionIndex),
  }));
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
    safeAddress: multisig.key,
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
    safeAddress: multisig.key,
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
  };

  return {
    totalCount: payload.totalCount ?? 0,
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
