import { useEffect, useMemo, useRef, useState } from "react";

import { getWorkspaceProviderAdapter } from "@/lib/workspace/provider-adapters";
import type { ChainConfig } from "@/types/chain";
import type {
  WorkspaceMultisig,
  WorkspaceProposalSummary,
} from "@/types/workspace";

interface UseWorkspaceProposalSummaryOptions {
  chains: ChainConfig[];
  multisigs: WorkspaceMultisig[];
}

type SummaryMap = Record<string, WorkspaceProposalSummary | undefined>;
type LoadingMap = Record<string, boolean | undefined>;
type ErrorMap = Record<string, string | undefined>;

export function useWorkspaceProposalSummary({
  chains,
  multisigs,
}: UseWorkspaceProposalSummaryOptions) {
  const inFlightKeysRef = useRef<Set<string>>(new Set());
  const [summariesByMultisigKey, setSummariesByMultisigKey] =
    useState<SummaryMap>({});
  const [loadingByMultisigKey, setLoadingByMultisigKey] = useState<LoadingMap>(
    {}
  );
  const [errorsByMultisigKey, setErrorsByMultisigKey] = useState<ErrorMap>({});

  const summaryMultisigs = useMemo(
    () =>
      multisigs.filter(
        (multisig) =>
          getWorkspaceProviderAdapter(multisig.provider).capabilities
            .proposalSummary
      ),
    [multisigs]
  );

  useEffect(() => {
    const missingSummaries = summaryMultisigs.filter(
      (multisig) =>
        summariesByMultisigKey[multisig.key] === undefined &&
        !inFlightKeysRef.current.has(multisig.key) &&
        !errorsByMultisigKey[multisig.key]
    );

    if (missingSummaries.length === 0) {
      return;
    }

    void (async () => {
      missingSummaries.forEach((multisig) => {
        inFlightKeysRef.current.add(multisig.key);
      });

      setLoadingByMultisigKey((current) => {
        const next = { ...current };
        for (const multisig of missingSummaries) {
          next[multisig.key] = true;
        }
        return next;
      });

      const results = await Promise.allSettled(
        missingSummaries.map(async (multisig) => {
          const adapter = getWorkspaceProviderAdapter(multisig.provider);
          const summary = await adapter.loadProposalSummary?.({
            chains,
            multisig,
          });

          return {
            multisigKey: multisig.key,
            summary,
          };
        })
      );

      const nextSummaries: SummaryMap = {};
      const nextErrors: ErrorMap = {};
      const nextLoading: LoadingMap = {};

      results.forEach((result, index) => {
        const multisigKey = missingSummaries[index]?.key;
        if (!multisigKey) {
          return;
        }

        inFlightKeysRef.current.delete(multisigKey);
        nextLoading[multisigKey] = false;

        if (result.status === "fulfilled") {
          nextSummaries[multisigKey] = result.value.summary;
          nextErrors[multisigKey] = undefined;
          return;
        }

        nextErrors[multisigKey] =
          result.reason instanceof Error
            ? result.reason.message
            : "Failed to load proposal summary.";
      });

      setSummariesByMultisigKey((current) => ({
        ...current,
        ...nextSummaries,
      }));
      setErrorsByMultisigKey((current) => ({
        ...current,
        ...nextErrors,
      }));
      setLoadingByMultisigKey((current) => ({
        ...current,
        ...nextLoading,
      }));
    })();
  }, [chains, errorsByMultisigKey, summariesByMultisigKey, summaryMultisigs]);

  return {
    summariesByMultisigKey,
    loadingByMultisigKey,
    errorsByMultisigKey,
  };
}
