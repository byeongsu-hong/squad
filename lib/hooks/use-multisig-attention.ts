import { useMemo } from "react";

import { useProposalsStore } from "@/stores/proposals-store";
import { type MultisigAccount, getMultisigAccountKey } from "@/types/multisig";

interface AttentionSummary {
  waiting: number;
  executable: number;
  active: number;
}

interface UseMultisigAttentionOptions {
  multisigs: MultisigAccount[];
  viewerAddress: string | null;
}

export function useMultisigAttention({
  multisigs,
  viewerAddress,
}: UseMultisigAttentionOptions) {
  const proposals = useProposalsStore((state) => state.proposals);
  const workspaceMultisigs = useProposalsStore(
    (state) => state.workspaceMultisigs
  );

  return useMemo(() => {
    const workspaceMultisigMap = new Map(
      workspaceMultisigs.map((m) => [m.address, m])
    );

    const attentionByMultisig: Record<string, AttentionSummary> = {};

    for (const multisig of multisigs) {
      const key = multisig.publicKey.toString();
      const workspaceMultisig = workspaceMultisigMap.get(key);

      let waiting = 0;
      let executable = 0;
      let active = 0;

      if (workspaceMultisig) {
        const multisigProposals = proposals.filter(
          (p) => p.multisigAddress === key && p.chainId === multisig.chainId
        );

        for (const proposal of multisigProposals) {
          const isActive = !proposal.executed && !proposal.cancelled;
          if (!isActive) continue;

          active += 1;

          if (proposal.approvals.length >= workspaceMultisig.threshold) {
            executable += 1;
          }

          const isMember = Boolean(
            viewerAddress &&
              workspaceMultisig.members.some(
                (member) => member.address === viewerAddress
              )
          );
          const needsSignature =
            isMember &&
            !proposal.approvals.includes(viewerAddress ?? "") &&
            !proposal.rejections.includes(viewerAddress ?? "");

          if (needsSignature) {
            waiting += 1;
          }
        }
      }

      attentionByMultisig[getMultisigAccountKey(multisig)] = {
        waiting,
        executable,
        active,
      };
    }

    return attentionByMultisig;
  }, [multisigs, proposals, workspaceMultisigs, viewerAddress]);
}
