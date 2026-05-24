import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { proposalsQueryOptions } from "@/lib/query/proposal-queries";
import { toWorkspaceMultisig } from "@/lib/workspace/multisig-conversion";
import type { ChainConfig } from "@/types/chain";
import { type MultisigAccount, getMultisigAccountKey } from "@/types/multisig";

interface AttentionSummary {
  waiting: number;
  executable: number;
  active: number;
}

interface UseMultisigAttentionOptions {
  chains: ChainConfig[];
  multisigs: MultisigAccount[];
  viewerAddress: string | null;
}

export function useMultisigAttention({
  chains,
  multisigs,
  viewerAddress,
}: UseMultisigAttentionOptions) {
  const workspaceMultisigs = useMemo(
    () => multisigs.map((m) => toWorkspaceMultisig(m, chains)),
    [chains, multisigs]
  );

  const results = useQueries({
    queries: workspaceMultisigs.map((m) => proposalsQueryOptions(m, chains)),
  });

  return useMemo(() => {
    const attentionByMultisig: Record<string, AttentionSummary> = {};

    for (let i = 0; i < multisigs.length; i++) {
      const multisig = multisigs[i]!;
      const workspaceMultisig = workspaceMultisigs[i]!;
      const proposals = results[i]?.data ?? [];

      let waiting = 0;
      let executable = 0;
      let active = 0;

      for (const proposal of proposals) {
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

      attentionByMultisig[getMultisigAccountKey(multisig)] = {
        waiting,
        executable,
        active,
      };
    }

    return attentionByMultisig;
  }, [multisigs, workspaceMultisigs, results, viewerAddress]);
}
