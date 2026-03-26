import { useEffect, useState } from "react";

import {
  loadSquadsWorkspaceProposalsForMultisig,
  toWorkspaceMultisig,
} from "@/lib/workspace/squads-adapter";
import type { ChainConfig } from "@/types/chain";
import type { MultisigAccount } from "@/types/multisig";

export interface AttentionSummary {
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
  const [attentionByMultisig, setAttentionByMultisig] = useState<
    Record<string, AttentionSummary>
  >({});

  useEffect(() => {
    let cancelled = false;

    async function loadAttention() {
      if (multisigs.length === 0) {
        setAttentionByMultisig({});
        return;
      }

      const summaries = await Promise.all(
        multisigs.map(async (multisig) => {
          try {
            const workspaceMultisig = toWorkspaceMultisig(multisig, chains);
            const proposals = await loadSquadsWorkspaceProposalsForMultisig(
              multisig,
              chains
            );

            let waiting = 0;
            let executable = 0;
            let active = 0;

            for (const proposal of proposals) {
              const isActive = !proposal.executed && !proposal.cancelled;
              if (!isActive) {
                continue;
              }

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
                isActive &&
                isMember &&
                !proposal.approvals.includes(viewerAddress ?? "") &&
                !proposal.rejections.includes(viewerAddress ?? "");

              if (needsSignature) {
                waiting += 1;
              }
            }

            return [
              multisig.publicKey.toString(),
              { waiting, executable, active },
            ] as const;
          } catch (error) {
            console.warn(
              `Failed to load proposal attention for ${multisig.publicKey.toString()}:`,
              error
            );
            return [multisig.publicKey.toString(), null] as const;
          }
        })
      );

      if (cancelled) {
        return;
      }

      setAttentionByMultisig(
        Object.fromEntries(
          summaries.filter(
            (entry): entry is [string, AttentionSummary] => entry[1] !== null
          )
        )
      );
    }

    void loadAttention();

    return () => {
      cancelled = true;
    };
  }, [chains, multisigs, viewerAddress]);

  return attentionByMultisig;
}
