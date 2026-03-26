import { useMemo } from "react";

import { useWorkspaceProposalRecords } from "@/lib/hooks/use-workspace-proposal-records";
import { buildWorkspaceQueueItem } from "@/lib/workspace/squads-adapter";
import type { ProposalAccount } from "@/types/multisig";
import type { WorkspaceMultisig, WorkspaceQueueItem } from "@/types/workspace";

interface UseWorkspaceQueueOptions {
  proposals: ProposalAccount[];
  multisigs: WorkspaceMultisig[];
  viewerAddress: string | null;
}

export function useWorkspaceQueue({
  proposals,
  multisigs,
  viewerAddress,
}: UseWorkspaceQueueOptions) {
  const { records } = useWorkspaceProposalRecords({
    proposals,
    multisigs,
  });

  return useMemo(
    () =>
      records
        .map((record) =>
          buildWorkspaceQueueItem(
            record.proposal,
            record.multisig,
            viewerAddress
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
    [records, viewerAddress]
  );
}
