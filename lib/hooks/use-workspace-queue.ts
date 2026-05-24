import { useMemo } from "react";

import { buildWorkspaceQueueItem } from "@/lib/workspace/squads-adapter";
import type {
  WorkspaceMultisig,
  WorkspaceProposal,
  WorkspaceQueueItem,
} from "@/types/workspace";

interface UseWorkspaceQueueOptions {
  workspaceProposals: WorkspaceProposal[];
  multisigs: WorkspaceMultisig[];
  viewerAddress: string | null;
  getViewerAddressForMultisig?: (multisig: WorkspaceMultisig) => string | null;
}

export function useWorkspaceQueue({
  workspaceProposals,
  multisigs,
  viewerAddress,
  getViewerAddressForMultisig,
}: UseWorkspaceQueueOptions) {
  const getCreatedAtValue = (createdAt?: string) => {
    if (!createdAt) {
      return null;
    }

    const timestamp = Date.parse(createdAt);
    return Number.isNaN(timestamp) ? null : timestamp;
  };

  const records = useMemo(() => {
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

  return useMemo(
    () =>
      records
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

          const leftCreatedAt = getCreatedAtValue(left.proposal.createdAt);
          const rightCreatedAt = getCreatedAtValue(right.proposal.createdAt);

          if (leftCreatedAt !== null || rightCreatedAt !== null) {
            if (leftCreatedAt === null) {
              return 1;
            }

            if (rightCreatedAt === null) {
              return -1;
            }

            if (leftCreatedAt !== rightCreatedAt) {
              return rightCreatedAt - leftCreatedAt;
            }
          }

          return Number(
            right.proposal.transactionIndex - left.proposal.transactionIndex
          );
        }),
    [records, getViewerAddressForMultisig, viewerAddress]
  );
}
