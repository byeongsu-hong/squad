import { useMemo } from "react";

import { buildWorkspaceProposalRecords } from "@/lib/hooks/use-workspace-proposal-records";
import { toWorkspaceMultisigs } from "@/lib/workspace/multisig-conversion";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import { getMultisigAccountKey } from "@/types/multisig";

export function useWorkspaceMultisigs() {
  const chains = useChainStore((state) => state.chains);
  const multisigs = useMultisigStore((state) => state.multisigs);
  const proposals = useMultisigStore((state) => state.proposals);
  const selectedMultisigKey = useMultisigStore(
    (state) => state.selectedMultisigKey
  );

  const rawMultisigMap = useMemo(() => {
    const entries = multisigs.flatMap((multisig) => [
      [multisig.publicKey.toString(), multisig] as const,
      [getMultisigAccountKey(multisig), multisig] as const,
    ]);

    return new Map(entries);
  }, [multisigs]);
  const workspaceMultisigs = useMemo(
    () => toWorkspaceMultisigs(multisigs, chains),
    [chains, multisigs]
  );
  const workspaceMultisigMap = useMemo(
    () =>
      new Map(
        workspaceMultisigs.map((multisig) => [multisig.key, multisig] as const)
      ),
    [workspaceMultisigs]
  );
  const workspaceProposalRecords = useMemo(
    () => buildWorkspaceProposalRecords(proposals, workspaceMultisigs),
    [proposals, workspaceMultisigs]
  );
  const workspaceProposalRecordMap = useMemo(
    () =>
      new Map(
        workspaceProposalRecords.map((record) => [record.key, record] as const)
      ),
    [workspaceProposalRecords]
  );
  const selectedMultisig = selectedMultisigKey
    ? (rawMultisigMap.get(selectedMultisigKey) ?? null)
    : null;
  const selectedWorkspaceMultisig = selectedMultisigKey
    ? (workspaceMultisigMap.get(selectedMultisigKey) ?? null)
    : null;

  return {
    chains,
    multisigs,
    proposals,
    workspaceMultisigs,
    workspaceProposalRecords,
    workspaceProposalRecordMap,
    availableMultisigKeys: workspaceMultisigs.map((multisig) => multisig.key),
    rawMultisigMap,
    workspaceMultisigMap,
    selectedMultisigKey,
    selectedMultisig,
    selectedWorkspaceMultisig,
  };
}
