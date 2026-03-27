import type {
  WorkspaceProposalLoaderOptions,
  WorkspaceProviderAdapter,
} from "@/lib/workspace/provider-contract";
import type { WorkspaceProposal } from "@/types/workspace";

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

function getSafeUnsupportedMessage() {
  return "Safe payload loading is not implemented yet.";
}

export const safeWorkspaceAdapter: WorkspaceProviderAdapter = {
  id: "safe",
  label: "Safe",
  capabilities: {
    creatorSync: false,
    payload: false,
    proposalLoading: true,
    proposalActions: false,
  },
  getUnsupportedMessage(capability) {
    if (capability === "proposalActions") {
      return "Safe proposal actions are not implemented yet.";
    }

    if (capability === "payload") {
      return getSafeUnsupportedMessage();
    }

    if (capability === "creatorSync") {
      return "Safe creator sync is not implemented yet.";
    }

    return null;
  },
  loadProposalsForMultisig(options) {
    return loadSafeWorkspaceProposalsForMultisig(options);
  },
  async loadPayload() {
    throw new Error(getSafeUnsupportedMessage());
  },
};
