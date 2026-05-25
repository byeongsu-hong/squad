"use client";

import { useEffect } from "react";

import { useProposalsQuery } from "@/lib/hooks/use-proposals-query";
import { useProposalsStore } from "@/stores/proposals-store";

export function ProposalsSync() {
  const { proposals, loading, workspaceMultisigs } = useProposalsQuery();
  const setData = useProposalsStore((state) => state.setData);
  const setLoading = useProposalsStore((state) => state.setLoading);

  useEffect(() => {
    setData(proposals, workspaceMultisigs);
  }, [proposals, workspaceMultisigs, setData]);

  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  return null;
}
