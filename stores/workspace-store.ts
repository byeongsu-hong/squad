import { create } from "zustand";

import type {
  WorkspaceDetailTab,
  WorkspaceExplorerMode,
  WorkspaceQueueFilter,
  WorkspaceSettingsSection,
} from "@/types/workspace";

interface WorkspaceStore {
  operationsQueueFilter: WorkspaceQueueFilter;
  operationsDetailTab: WorkspaceDetailTab;
  operationsExplorerMode: WorkspaceExplorerMode;
  operationsFocusedProposalKey: string | null;
  operationsSelectedRegistryKeys: string[];
  operationsActiveViewKey: string;
  operationsExpandedViewKeys: string[];
  settingsActiveSection: WorkspaceSettingsSection;
  proposalDeskQueueFilter: WorkspaceQueueFilter;
  proposalDeskFocusedProposalKey: string | null;
  setOperationsQueueFilter: (filter: WorkspaceQueueFilter) => void;
  setOperationsDetailTab: (tab: WorkspaceDetailTab) => void;
  setOperationsExplorerMode: (mode: WorkspaceExplorerMode) => void;
  setOperationsFocusedProposalKey: (key: string | null) => void;
  setOperationsSelectedRegistryKeys: (
    keys: string[] | ((current: string[]) => string[])
  ) => void;
  setOperationsActiveViewKey: (key: string) => void;
  setOperationsExpandedViewKeys: (
    keys: string[] | ((current: string[]) => string[])
  ) => void;
  setSettingsActiveSection: (section: WorkspaceSettingsSection) => void;
  setProposalDeskQueueFilter: (filter: WorkspaceQueueFilter) => void;
  setProposalDeskFocusedProposalKey: (key: string | null) => void;
  resetAll: () => void;
}

function areStringArraysEqual(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  operationsQueueFilter: "all",
  operationsDetailTab: "overview",
  operationsExplorerMode: "views",
  operationsFocusedProposalKey: null,
  operationsSelectedRegistryKeys: [],
  operationsActiveViewKey: "",
  operationsExpandedViewKeys: ["all", "attention"],
  settingsActiveSection: "chains",
  proposalDeskQueueFilter: "all",
  proposalDeskFocusedProposalKey: null,
  setOperationsQueueFilter: (operationsQueueFilter) =>
    set((state) =>
      state.operationsQueueFilter === operationsQueueFilter
        ? state
        : { operationsQueueFilter }
    ),
  setOperationsDetailTab: (operationsDetailTab) =>
    set((state) =>
      state.operationsDetailTab === operationsDetailTab
        ? state
        : { operationsDetailTab }
    ),
  setOperationsExplorerMode: (operationsExplorerMode) =>
    set((state) =>
      state.operationsExplorerMode === operationsExplorerMode
        ? state
        : { operationsExplorerMode }
    ),
  setOperationsFocusedProposalKey: (operationsFocusedProposalKey) =>
    set((state) =>
      state.operationsFocusedProposalKey === operationsFocusedProposalKey
        ? state
        : { operationsFocusedProposalKey }
    ),
  setOperationsSelectedRegistryKeys: (keysOrUpdater) =>
    set((state) => {
      const nextSelectedRegistryKeys =
        typeof keysOrUpdater === "function"
          ? keysOrUpdater(state.operationsSelectedRegistryKeys)
          : keysOrUpdater;

      return areStringArraysEqual(
        state.operationsSelectedRegistryKeys,
        nextSelectedRegistryKeys
      )
        ? state
        : { operationsSelectedRegistryKeys: nextSelectedRegistryKeys };
    }),
  setOperationsActiveViewKey: (operationsActiveViewKey) =>
    set((state) =>
      state.operationsActiveViewKey === operationsActiveViewKey
        ? state
        : { operationsActiveViewKey }
    ),
  setOperationsExpandedViewKeys: (keysOrUpdater) =>
    set((state) => {
      const nextExpandedViewKeys =
        typeof keysOrUpdater === "function"
          ? keysOrUpdater(state.operationsExpandedViewKeys)
          : keysOrUpdater;

      return areStringArraysEqual(
        state.operationsExpandedViewKeys,
        nextExpandedViewKeys
      )
        ? state
        : { operationsExpandedViewKeys: nextExpandedViewKeys };
    }),
  setSettingsActiveSection: (settingsActiveSection) =>
    set((state) =>
      state.settingsActiveSection === settingsActiveSection
        ? state
        : { settingsActiveSection }
    ),
  setProposalDeskQueueFilter: (proposalDeskQueueFilter) =>
    set((state) =>
      state.proposalDeskQueueFilter === proposalDeskQueueFilter
        ? state
        : { proposalDeskQueueFilter }
    ),
  setProposalDeskFocusedProposalKey: (proposalDeskFocusedProposalKey) =>
    set((state) =>
      state.proposalDeskFocusedProposalKey === proposalDeskFocusedProposalKey
        ? state
        : { proposalDeskFocusedProposalKey }
    ),
  resetAll: () =>
    set({
      operationsQueueFilter: "all",
      operationsDetailTab: "overview",
      operationsExplorerMode: "views",
      operationsFocusedProposalKey: null,
      operationsSelectedRegistryKeys: [],
      operationsActiveViewKey: "",
      operationsExpandedViewKeys: ["all", "attention"],
      settingsActiveSection: "chains",
      proposalDeskQueueFilter: "all",
      proposalDeskFocusedProposalKey: null,
    }),
}));
