import { PublicKey } from "@solana/web3.js";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { useDebounce } from "@/lib/hooks/use-debounce";
import { SquadService } from "@/lib/squad";
import {
  type TransactionSummary,
  formatConfigAction,
} from "@/lib/utils/transaction-formatter";
import {
  fromWorkspaceProposal,
  invalidateSquadsProposalCache,
  loadSquadsWorkspaceProposalsForMultisig,
} from "@/lib/workspace/squads-adapter";
import type { ChainConfig } from "@/types/chain";
import type { MultisigAccount, ProposalAccount } from "@/types/multisig";

export interface MonitoringProposal extends ProposalAccount {
  multisigAccount: MultisigAccount;
  timestamp?: number;
  transactionSummary?: TransactionSummary;
}

interface UseMonitoringProposalsOptions {
  multisigs: MultisigAccount[];
  chains: ChainConfig[];
}

export function useMonitoringProposals({
  multisigs,
  chains,
}: UseMonitoringProposalsOptions) {
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [chainFilter, setChainFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [statusFilters, setStatusFilters] = useState<Set<string>>(
    new Set(["active"])
  );
  const [proposals, setProposals] = useState<MonitoringProposal[]>([]);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const loadAllProposals = useCallback(async () => {
    if (multisigs.length === 0) {
      setProposals([]);
      return;
    }

    setLoading(true);
    setLoadingProgress(0);

    try {
      const totalMultisigs = multisigs.length;
      let completedCount = 0;

      const proposalPromises = multisigs.map(async (multisig) => {
        const chain = chains.find((item) => item.id === multisig.chainId);
        if (!chain) {
          completedCount += 1;
          setLoadingProgress((completedCount / totalMultisigs) * 100);
          return [];
        }

        try {
          const workspaceProposals =
            await loadSquadsWorkspaceProposalsForMultisig(multisig, chains);

          const squadService = new SquadService(
            chain.rpcUrl,
            chain.squadsV4ProgramId
          );

          const enriched = await Promise.all(
            workspaceProposals.map(async (proposal) => {
              let transactionSummary: TransactionSummary | undefined;

              try {
                const txType = await squadService.getTransactionType(
                  new PublicKey(proposal.multisigKey),
                  proposal.transactionIndex
                );

                if (txType === "vault") {
                  const vaultTx = await squadService.getVaultTransaction(
                    new PublicKey(proposal.multisigKey),
                    proposal.transactionIndex
                  );
                  const accountKeys = vaultTx.message.accountKeys.map((key) =>
                    key.toString()
                  );
                  const instructions = vaultTx.message.instructions;
                  const uniqueProgramIds = [
                    ...new Set(
                      instructions.map((ix) => accountKeys[ix.programIdIndex])
                    ),
                  ];

                  transactionSummary = {
                    type: "vault",
                    instructionCount: instructions.length,
                    accountCount: accountKeys.length,
                    programIds: uniqueProgramIds,
                  };
                } else {
                  const configTx = await squadService.getConfigTransaction(
                    new PublicKey(proposal.multisigKey),
                    proposal.transactionIndex
                  );
                  const configActions = configTx.actions.map((action) =>
                    formatConfigAction(
                      action as unknown as import("@/lib/utils/transaction-formatter").ConfigAction
                    )
                  );

                  transactionSummary = {
                    type: "config",
                    configActions: configActions.map((action) => ({
                      type: action.type,
                      summary: action.summary,
                    })),
                  };
                }
              } catch (error) {
                console.warn(
                  `Failed to load transaction data for proposal ${proposal.transactionIndex.toString()}:`,
                  error
                );
              }

              return {
                ...fromWorkspaceProposal(proposal),
                multisigAccount: multisig,
                ...(transactionSummary ? { transactionSummary } : {}),
              } satisfies MonitoringProposal;
            })
          );

          completedCount += 1;
          setLoadingProgress((completedCount / totalMultisigs) * 100);
          return enriched;
        } catch (error) {
          console.error(
            `Failed to load proposals for ${multisig.label}:`,
            error
          );
          completedCount += 1;
          setLoadingProgress((completedCount / totalMultisigs) * 100);
          return [];
        }
      });

      const results = await Promise.all(proposalPromises);
      const allProposals = results
        .flat()
        .sort((left, right) =>
          Number(right.transactionIndex - left.transactionIndex)
        );

      setProposals(allProposals);
    } catch (error) {
      console.error("Failed to load proposals:", error);
      toast.error("Failed to load proposals");
    } finally {
      setLoading(false);
      setLoadingProgress(0);
    }
  }, [chains, multisigs]);

  const handleRefresh = useCallback(async () => {
    multisigs.forEach((multisig) => {
      invalidateSquadsProposalCache(
        multisig.chainId,
        multisig.publicKey.toString(),
        chains
      );
    });

    await loadAllProposals();
  }, [chains, loadAllProposals, multisigs]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    multisigs.forEach((multisig) => {
      multisig.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [multisigs]);

  const filteredProposals = useMemo(
    () =>
      proposals.filter((proposal) => {
        if (statusFilters.size > 0 && !statusFilters.has("all")) {
          const status = proposal.status.toLowerCase();
          if (!statusFilters.has(status)) {
            return false;
          }
        }

        if (
          chainFilter !== "all" &&
          proposal.multisigAccount.chainId !== chainFilter
        ) {
          return false;
        }

        if (tagFilter !== "all") {
          const multisigTags = proposal.multisigAccount.tags || [];
          if (!multisigTags.includes(tagFilter)) {
            return false;
          }
        }

        if (debouncedSearchQuery.trim()) {
          const query = debouncedSearchQuery.toLowerCase();
          const name = (proposal.multisigAccount.label || "").toLowerCase();
          const address = proposal.multisig.toString().toLowerCase();
          if (!name.includes(query) && !address.includes(query)) {
            return false;
          }
        }

        return true;
      }),
    [chainFilter, debouncedSearchQuery, proposals, statusFilters, tagFilter]
  );

  return {
    loading,
    loadingProgress,
    searchQuery,
    setSearchQuery,
    chainFilter,
    setChainFilter,
    tagFilter,
    setTagFilter,
    statusFilters,
    setStatusFilters,
    proposals,
    filteredProposals,
    availableTags,
    loadAllProposals,
    handleRefresh,
  };
}
