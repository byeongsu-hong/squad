import { useMemo } from "react";

import { toWorkspaceProposalFromRaw } from "@/lib/workspace/squads-adapter";
import type { ProposalAccount } from "@/types/multisig";
import type { WorkspaceMultisig, WorkspaceProposal } from "@/types/workspace";

export interface WorkspaceProposalRecord {
  key: string;
  multisig: WorkspaceMultisig;
  proposal: WorkspaceProposal;
}

interface UseWorkspaceProposalRecordsOptions {
  proposals: ProposalAccount[];
  multisigs: WorkspaceMultisig[];
}

export function buildWorkspaceProposalRecords(
  proposals: ProposalAccount[],
  multisigs: WorkspaceMultisig[]
) {
  const multisigMap = new Map(
    multisigs.map((multisig) => [multisig.key, multisig] as const)
  );
  const multisigByAddress = new Map(
    multisigs.map((multisig) => [multisig.address, multisig] as const)
  );

  return proposals
    .map((rawProposal) => {
      const multisigAddress = rawProposal.multisig.toString();
      const multisig =
        multisigByAddress.get(multisigAddress) ??
        multisigMap.get(multisigAddress);
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
      } satisfies WorkspaceProposalRecord;
    })
    .filter((record): record is WorkspaceProposalRecord => record !== null);
}

export function useWorkspaceProposalRecords({
  proposals,
  multisigs,
}: UseWorkspaceProposalRecordsOptions) {
  const records = useMemo(
    () => buildWorkspaceProposalRecords(proposals, multisigs),
    [multisigs, proposals]
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
