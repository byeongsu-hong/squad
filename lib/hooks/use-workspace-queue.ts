import { useMemo } from "react";

import { buildWorkspaceQueueItem, toWorkspaceProposalFromRaw } from "@/lib/workspace/squads-adapter";
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
  const getCreatedAtValue = (createdAt?: string) => {
    if (!createdAt) {
      return null;
    }

    const timestamp = Date.parse(createdAt);
    return Number.isNaN(timestamp) ? null : timestamp;
  };

  const records = useMemo(() => {
    const multisigMap = new Map(multisigs.map((m) => [m.key, m] as const));
    const multisigByAddress = new Map(multisigs.map((m) => [m.address, m] as const));
    return proposals
      .map((rawProposal) => {
        const addr = rawProposal.multisig.toString();
        const multisig = multisigByAddress.get(addr) ?? multisigMap.get(addr);
        if (!multisig) return null;
        const proposal = toWorkspaceProposalFromRaw(rawProposal, multisig.chainId);
        return {
          key: `${proposal.multisigKey}-${proposal.transactionIndex.toString()}`,
          multisig,
          proposal,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }, [multisigs, proposals]);
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
    [allRecords, getViewerAddressForMultisig, viewerAddress]
  );
}
