import { useMemo } from "react";

import { toWorkspaceProposalFromRaw } from "@/lib/workspace/squads-adapter";
import type { ProposalAccount } from "@/types/multisig";
import type { WorkspaceMultisig, WorkspaceProposal } from "@/types/workspace";

export interface WorkspaceProposalRecord {
  key: string;
  multisig: WorkspaceMultisig;
  proposal: WorkspaceProposal;
  rawProposal: ProposalAccount;
}

interface UseWorkspaceProposalRecordsOptions {
  proposals: ProposalAccount[];
  multisigs: WorkspaceMultisig[];
}

export function useWorkspaceProposalRecords({
  proposals,
  multisigs,
}: UseWorkspaceProposalRecordsOptions) {
  const multisigMap = useMemo(
    () =>
      new Map(multisigs.map((multisig) => [multisig.key, multisig] as const)),
    [multisigs]
  );

  const records = useMemo(
    () =>
      proposals
        .map((rawProposal) => {
          const multisigKey = rawProposal.multisig.toString();
          const multisig = multisigMap.get(multisigKey);
          if (!multisig) {
            return null;
          }

          const proposal = toWorkspaceProposalFromRaw(
            rawProposal,
            multisig.chainId
          );

          return {
            key: `${proposal.multisigKey}-${proposal.transactionIndex.toString()}`,
            multisig,
            proposal,
            rawProposal,
          } satisfies WorkspaceProposalRecord;
        })
        .filter((record): record is WorkspaceProposalRecord => record !== null),
    [multisigMap, proposals]
  );

  const recordMap = useMemo(
    () => new Map(records.map((record) => [record.key, record] as const)),
    [records]
  );

  return {
    records,
    recordMap,
  };
}
