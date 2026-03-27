import { useEffect, useMemo } from "react";

import {
  buildRegistryExplorerViews,
  buildRegistrySummaryRowsFromWorkspaceItems,
} from "@/lib/registry/registry-summary";
import { buildWorkspaceRegistryItems } from "@/lib/workspace/squads-adapter";
import type {
  WorkspaceExplorerMode,
  WorkspaceExplorerView,
  WorkspaceMultisig,
  WorkspaceQueueItem,
  WorkspaceRegistryItem,
} from "@/types/workspace";

interface UseOperationsRegistryOptions {
  multisigs: WorkspaceMultisig[];
  queueItems: WorkspaceQueueItem[];
  searchText: string;
  activeViewKey: string;
  explorerMode: WorkspaceExplorerMode;
  selectedRegistryKeys: string[];
  setExplorerMode: (mode: WorkspaceExplorerMode) => void;
  setExpandedViewKeys: (
    keys: string[] | ((current: string[]) => string[])
  ) => void;
}

interface ExplorerSection {
  id: WorkspaceExplorerMode;
  label: string;
  views: WorkspaceExplorerView[];
}

export function useOperationsRegistry({
  multisigs,
  queueItems,
  searchText,
  activeViewKey,
  explorerMode,
  selectedRegistryKeys,
  setExplorerMode,
  setExpandedViewKeys,
}: UseOperationsRegistryOptions) {
  const primarySelectedRegistryKey = selectedRegistryKeys[0] ?? null;
  const selectedRegistryKeySet = useMemo(
    () => new Set(selectedRegistryKeys),
    [selectedRegistryKeys]
  );
  const searchNeedle = searchText.trim().toLowerCase();

  const registryItems = useMemo<WorkspaceRegistryItem[]>(
    () => buildWorkspaceRegistryItems(multisigs, queueItems, searchNeedle),
    [multisigs, queueItems, searchNeedle]
  );

  const registryRows = useMemo(
    () =>
      buildRegistrySummaryRowsFromWorkspaceItems({
        registryItems,
        searchNeedle,
      }),
    [registryItems, searchNeedle]
  );

  const explorerViews = useMemo(
    () => buildRegistryExplorerViews(registryRows),
    [registryRows]
  );

  const activeView = activeViewKey
    ? (explorerViews.find((view) => view.id === activeViewKey) ?? null)
    : null;

  useEffect(() => {
    if (!activeViewKey) {
      return;
    }

    setExpandedViewKeys((current) =>
      current.includes(activeViewKey) ? current : [...current, activeViewKey]
    );
  }, [activeViewKey, setExpandedViewKeys]);

  useEffect(() => {
    if (activeViewKey.startsWith("chain:")) {
      setExplorerMode("chains");
      return;
    }
    if (activeViewKey.startsWith("tag:")) {
      setExplorerMode("tags");
      return;
    }
    setExplorerMode("views");
  }, [activeViewKey, setExplorerMode]);

  const explorerSections = useMemo<ExplorerSection[]>(
    () =>
      [
        {
          id: "views" as const,
          label: "Views",
          views: explorerViews.filter(
            (view) => view.id === "all" || view.id === "attention"
          ),
        },
        {
          id: "chains" as const,
          label: "Chains",
          views: explorerViews.filter((view) => view.id.startsWith("chain:")),
        },
        {
          id: "tags" as const,
          label: "Tags",
          views: explorerViews.filter((view) => view.id.startsWith("tag:")),
        },
      ].filter((section) => section.views.length > 0),
    [explorerViews]
  );

  const visibleExplorerSection =
    explorerSections.find((section) => section.id === explorerMode) ??
    explorerSections[0] ??
    null;

  return {
    primarySelectedRegistryKey,
    selectedRegistryKeySet,
    registryItems,
    registryRows,
    explorerViews,
    activeView,
    explorerSections,
    visibleExplorerSection,
  };
}
