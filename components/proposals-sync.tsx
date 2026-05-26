"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useProposalsQuery } from "@/lib/hooks/use-proposals-query";
import { applyRefreshPlan, getRefreshPlan } from "@/lib/state/refresh-policy";
import { useProposalsStore } from "@/stores/proposals-store";

const PROPOSAL_SCHEDULER_INTERVAL_MS = 5 * 60_000;

export function ProposalsSync() {
  const { proposals, loading, workspaceMultisigs } = useProposalsQuery();
  const queryClient = useQueryClient();
  const setData = useProposalsStore((state) => state.setData);
  const setLoading = useProposalsStore((state) => state.setLoading);

  useEffect(() => {
    setData(proposals, workspaceMultisigs);
  }, [proposals, workspaceMultisigs, setData]);

  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  useEffect(() => {
    if (workspaceMultisigs.length === 0) return;

    const refreshByChain = () => {
      const groups = new Set(
        workspaceMultisigs.map(
          (multisig) => `${multisig.provider}:${multisig.chainId}`
        )
      );

      for (const group of groups) {
        const [provider, chainId] = group.split(":");
        if (provider !== "squads" && provider !== "safe") continue;
        applyRefreshPlan(
          queryClient,
          getRefreshPlan({
            type: "manualRefresh",
            provider,
            chainId: chainId ?? "",
          })
        );
      }
    };

    const intervalId = window.setInterval(
      refreshByChain,
      PROPOSAL_SCHEDULER_INTERVAL_MS
    );
    return () => window.clearInterval(intervalId);
  }, [queryClient, workspaceMultisigs]);

  return null;
}
