import { useMemo } from "react";

import {
  buildWorkspaceQueueItem,
  toWorkspaceProposalFromRaw,
} from "@/lib/workspace/squads-adapter";
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
  const multisigMap = useMemo(
    () => new Map(multisigs.map((multisig) => [multisig.key, multisig])),
    [multisigs]
  );

  return useMemo(
    () =>
      proposals
        .map((proposal) => {
          const multisigKey = proposal.multisig.toString();
          const multisig = multisigMap.get(multisigKey);
          if (!multisig) {
            return null;
          }

          return buildWorkspaceQueueItem(
            toWorkspaceProposalFromRaw(proposal, multisig.chainId),
            multisig,
            viewerAddress
          );
        })
        .filter((item): item is WorkspaceQueueItem => item !== null)
        .sort((left, right) => {
          if (left.priority !== right.priority) {
            return left.priority - right.priority;
          }

          return Number(
            right.proposal.transactionIndex - left.proposal.transactionIndex
          );
        }),
    [multisigMap, proposals, viewerAddress]
  );
}
