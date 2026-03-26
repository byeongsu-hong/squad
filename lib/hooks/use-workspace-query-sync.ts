import type { ReadonlyURLSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

interface OperationsQuerySyncOptions {
  searchParams: URLSearchParams | ReadonlyURLSearchParams;
  pathname: string;
  replace: (href: string) => void;
  availableMultisigKeys: string[];
  queueFilter: "all" | "waiting" | "executable";
  focusedProposalKey: string | null;
  selectedRegistryKeys: string[];
  activeViewKey: string;
  setQueueFilter: (filter: "all" | "waiting" | "executable") => void;
  setFocusedProposalKey: (key: string | null) => void;
  setSelectedRegistryKeys: (
    keys: string[] | ((current: string[]) => string[])
  ) => void;
  setActiveViewKey: (key: string) => void;
}

interface ProposalDeskQuerySyncOptions {
  searchParams: URLSearchParams | ReadonlyURLSearchParams;
  pathname: string;
  replace: (href: string) => void;
  availableMultisigKeys: string[];
  selectedMultisigKey: string | null;
  queueFilter: "all" | "waiting" | "executable";
  focusedProposalKey: string | null;
  selectMultisig: (key: string | null) => void;
  setQueueFilter: (filter: "all" | "waiting" | "executable") => void;
  setFocusedProposalKey: (key: string | null) => void;
}

function isQueueFilter(
  value: string | null
): value is "all" | "waiting" | "executable" {
  return value === "all" || value === "waiting" || value === "executable";
}

function getProposalMultisigKey(proposalKey: string) {
  const separatorIndex = proposalKey.lastIndexOf("-");
  if (separatorIndex === -1) {
    return null;
  }

  return proposalKey.slice(0, separatorIndex);
}

function replaceQuery(
  pathname: string,
  replace: (href: string) => void,
  nextParams: URLSearchParams,
  currentParams: URLSearchParams | ReadonlyURLSearchParams
) {
  const nextQuery = nextParams.toString();
  const currentQuery = currentParams.toString();

  if (nextQuery === currentQuery) {
    return;
  }

  replace(nextQuery.length > 0 ? `${pathname}?${nextQuery}` : pathname);
}

export function useOperationsWorkspaceQuerySync({
  searchParams,
  pathname,
  replace,
  availableMultisigKeys,
  queueFilter,
  focusedProposalKey,
  selectedRegistryKeys,
  activeViewKey,
  setQueueFilter,
  setFocusedProposalKey,
  setSelectedRegistryKeys,
  setActiveViewKey,
}: OperationsQuerySyncOptions) {
  const lastWrittenQueryRef = useRef<string | null>(null);
  const hasHydratedQueryRef = useRef(false);

  useEffect(() => {
    const currentQuery = searchParams.toString();
    if (lastWrittenQueryRef.current === currentQuery) {
      lastWrittenQueryRef.current = null;
      return;
    }

    if (hasHydratedQueryRef.current) {
      return;
    }

    const requestedFilter = searchParams.get("filter");
    if (isQueueFilter(requestedFilter)) {
      setQueueFilter(requestedFilter);
    }

    const hasRequestedMultisigs =
      searchParams.has("multisigs") || searchParams.has("multisig");
    const requestedMultisigs = searchParams.get("multisigs");
    const requestedMultisig = searchParams.get("multisig");
    const nextSelectedRegistryKeys = requestedMultisigs
      ? requestedMultisigs
          .split(",")
          .map((value) => value.trim())
          .filter(
            (value, index, array) =>
              value.length > 0 &&
              array.indexOf(value) === index &&
              availableMultisigKeys.includes(value)
          )
      : requestedMultisig && availableMultisigKeys.includes(requestedMultisig)
        ? [requestedMultisig]
        : [];

    if (hasRequestedMultisigs) {
      setSelectedRegistryKeys((current) =>
        current.length === nextSelectedRegistryKeys.length &&
        current.every(
          (value, index) => value === nextSelectedRegistryKeys[index]
        )
          ? current
          : nextSelectedRegistryKeys
      );
    }

    const requestedView =
      searchParams.get("view") ?? searchParams.get("folder");
    setActiveViewKey(requestedView || "all");

    const hasRequestedProposal = searchParams.has("proposal");
    const requestedProposal = searchParams.get("proposal");
    const requestedProposalMultisigKey = requestedProposal
      ? getProposalMultisigKey(requestedProposal)
      : null;
    const proposalMatchesSelectedScope =
      !hasRequestedMultisigs ||
      !requestedProposalMultisigKey ||
      nextSelectedRegistryKeys.length === 0 ||
      nextSelectedRegistryKeys.includes(requestedProposalMultisigKey);

    if (
      hasRequestedProposal &&
      requestedProposal &&
      proposalMatchesSelectedScope
    ) {
      setFocusedProposalKey(requestedProposal);
      return;
    }

    if (hasRequestedProposal && !proposalMatchesSelectedScope) {
      setFocusedProposalKey(null);
    }

    hasHydratedQueryRef.current = true;
  }, [
    availableMultisigKeys,
    searchParams,
    setActiveViewKey,
    setFocusedProposalKey,
    setQueueFilter,
    setSelectedRegistryKeys,
  ]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (selectedRegistryKeys.length > 1) {
      nextParams.set("multisigs", selectedRegistryKeys.join(","));
      nextParams.delete("multisig");
    } else if (selectedRegistryKeys.length === 1) {
      nextParams.set("multisig", selectedRegistryKeys[0]);
      nextParams.delete("multisigs");
    } else {
      nextParams.delete("multisig");
      nextParams.delete("multisigs");
    }

    if (activeViewKey !== "all") {
      nextParams.set("view", activeViewKey);
    } else {
      nextParams.delete("view");
    }

    nextParams.delete("folder");
    nextParams.set("filter", queueFilter);

    if (focusedProposalKey) {
      nextParams.set("proposal", focusedProposalKey);
    } else {
      nextParams.delete("proposal");
    }

    const nextQuery = nextParams.toString();
    if (nextQuery !== searchParams.toString()) {
      lastWrittenQueryRef.current = nextQuery;
    }
    replaceQuery(pathname, replace, nextParams, searchParams);
  }, [
    activeViewKey,
    focusedProposalKey,
    pathname,
    queueFilter,
    replace,
    searchParams,
    selectedRegistryKeys,
  ]);
}

export function useProposalDeskQuerySync({
  searchParams,
  pathname,
  replace,
  availableMultisigKeys,
  selectedMultisigKey,
  queueFilter,
  focusedProposalKey,
  selectMultisig,
  setQueueFilter,
  setFocusedProposalKey,
}: ProposalDeskQuerySyncOptions) {
  const lastWrittenQueryRef = useRef<string | null>(null);
  const hasHydratedQueryRef = useRef(false);

  useEffect(() => {
    const currentQuery = searchParams.toString();
    if (lastWrittenQueryRef.current === currentQuery) {
      lastWrittenQueryRef.current = null;
      return;
    }

    if (hasHydratedQueryRef.current) {
      return;
    }

    const requestedMultisig = searchParams.get("multisig");
    if (
      requestedMultisig &&
      requestedMultisig !== selectedMultisigKey &&
      availableMultisigKeys.includes(requestedMultisig)
    ) {
      selectMultisig(requestedMultisig);
    }
  }, [
    availableMultisigKeys,
    searchParams,
    selectMultisig,
    selectedMultisigKey,
  ]);

  useEffect(() => {
    const currentQuery = searchParams.toString();
    if (lastWrittenQueryRef.current === currentQuery) {
      lastWrittenQueryRef.current = null;
      return;
    }

    if (hasHydratedQueryRef.current) {
      return;
    }

    const requestedFilter = searchParams.get("filter");
    if (isQueueFilter(requestedFilter)) {
      setQueueFilter(requestedFilter);
    }
  }, [searchParams, setQueueFilter]);

  useEffect(() => {
    const currentQuery = searchParams.toString();
    if (lastWrittenQueryRef.current === currentQuery) {
      lastWrittenQueryRef.current = null;
      return;
    }

    const hasRequestedProposal = searchParams.has("proposal");
    const requestedProposal = searchParams.get("proposal");
    if (hasRequestedProposal && requestedProposal) {
      setFocusedProposalKey(requestedProposal);
    }

    hasHydratedQueryRef.current = true;
  }, [searchParams, setFocusedProposalKey]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (selectedMultisigKey) {
      nextParams.set("multisig", selectedMultisigKey);
    } else {
      nextParams.delete("multisig");
    }

    nextParams.set("filter", queueFilter);

    if (focusedProposalKey) {
      nextParams.set("proposal", focusedProposalKey);
    } else {
      nextParams.delete("proposal");
    }

    const nextQuery = nextParams.toString();
    if (nextQuery !== searchParams.toString()) {
      lastWrittenQueryRef.current = nextQuery;
    }
    replaceQuery(pathname, replace, nextParams, searchParams);
  }, [
    focusedProposalKey,
    pathname,
    queueFilter,
    replace,
    searchParams,
    selectedMultisigKey,
  ]);
}
