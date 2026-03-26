import { useMemo } from "react";

import { toWorkspaceMultisigs } from "@/lib/workspace/squads-adapter";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";

export function useWorkspaceMultisigs() {
  const chains = useChainStore((state) => state.chains);
  const multisigs = useMultisigStore((state) => state.multisigs);
  const selectedMultisigKey = useMultisigStore(
    (state) => state.selectedMultisigKey
  );

  const rawMultisigMap = useMemo(
    () =>
      new Map(
        multisigs.map((multisig) => [multisig.publicKey.toString(), multisig])
      ),
    [multisigs]
  );
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
  const selectedMultisig = selectedMultisigKey
    ? (rawMultisigMap.get(selectedMultisigKey) ?? null)
    : null;
  const selectedWorkspaceMultisig = selectedMultisigKey
    ? (workspaceMultisigMap.get(selectedMultisigKey) ?? null)
    : null;

  return {
    chains,
    multisigs,
    workspaceMultisigs,
    availableMultisigKeys: workspaceMultisigs.map((multisig) => multisig.key),
    rawMultisigMap,
    workspaceMultisigMap,
    selectedMultisigKey,
    selectedMultisig,
    selectedWorkspaceMultisig,
  };
}
