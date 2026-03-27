import { useMemo } from "react";

import { useWorkspaceProposalRecords } from "@/lib/hooks/use-workspace-proposal-records";
import { buildWorkspaceQueueItem } from "@/lib/workspace/squads-adapter";
import type { ProposalAccount } from "@/types/multisig";
import type {
  WorkspaceMultisig,
  WorkspaceProposal,
  WorkspaceQueueItem,
} from "@/types/workspace";

interface UseWorkspaceQueueOptions {
  proposals: ProposalAccount[];
  multisigs: WorkspaceMultisig[];
  viewerAddress: string | null;
  workspaceProposals?: WorkspaceProposal[];
  getViewerAddressForMultisig?: (multisig: WorkspaceMultisig) => string | null;
}

export function useWorkspaceQueue({
  proposals,
  multisigs,
  viewerAddress,
  workspaceProposals = [],
  getViewerAddressForMultisig,
}: UseWorkspaceQueueOptions) {
  const { records } = useWorkspaceProposalRecords({
    proposals,
    multisigs,
  });
  const workspaceProposalRecords = useMemo(() => {
    const multisigMap = new Map(
      multisigs.map((multisig) => [multisig.key, multisig] as const)
    );

    return workspaceProposals
      .map((proposal) => {
        const multisig = multisigMap.get(proposal.multisigKey);
        if (!multisig) {
          return null;
        }

        return {
          key: `${proposal.multisigKey}-${proposal.transactionIndex.toString()}`,
          multisig,
          proposal,
        };
      })
      .filter((record) => record !== null);
  }, [multisigs, workspaceProposals]);
  const allRecords = useMemo(
    () => [...records, ...workspaceProposalRecords],
    [records, workspaceProposalRecords]
  );

  return useMemo(
    () =>
      allRecords
        .map((record) =>
          buildWorkspaceQueueItem(
            record.proposal,
            record.multisig,
            getViewerAddressForMultisig?.(record.multisig) ?? viewerAddress
          )
        )
        .filter((item): item is WorkspaceQueueItem => item !== null)
        .sort((left, right) => {
          if (left.priority !== right.priority) {
            return left.priority - right.priority;
          }

          return Number(
            right.proposal.transactionIndex - left.proposal.transactionIndex
          );
        }),
    [allRecords, getViewerAddressForMultisig, viewerAddress]
  );
}
