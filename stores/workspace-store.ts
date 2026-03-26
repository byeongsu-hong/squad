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
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  operationsQueueFilter: "all",
  operationsDetailTab: "overview",
  operationsExplorerMode: "views",
  operationsFocusedProposalKey: null,
  operationsSelectedRegistryKeys: [],
  operationsActiveViewKey: "all",
  operationsExpandedViewKeys: ["all", "attention"],
  settingsActiveSection: "chains",
  proposalDeskQueueFilter: "all",
  proposalDeskFocusedProposalKey: null,
  setOperationsQueueFilter: (operationsQueueFilter) =>
    set({ operationsQueueFilter }),
  setOperationsDetailTab: (operationsDetailTab) => set({ operationsDetailTab }),
  setOperationsExplorerMode: (operationsExplorerMode) =>
    set({ operationsExplorerMode }),
  setOperationsFocusedProposalKey: (operationsFocusedProposalKey) =>
    set({ operationsFocusedProposalKey }),
  setOperationsSelectedRegistryKeys: (keysOrUpdater) =>
    set((state) => ({
      operationsSelectedRegistryKeys:
        typeof keysOrUpdater === "function"
          ? keysOrUpdater(state.operationsSelectedRegistryKeys)
          : keysOrUpdater,
    })),
  setOperationsActiveViewKey: (operationsActiveViewKey) =>
    set({ operationsActiveViewKey }),
  setOperationsExpandedViewKeys: (keysOrUpdater) =>
    set((state) => ({
      operationsExpandedViewKeys:
        typeof keysOrUpdater === "function"
          ? keysOrUpdater(state.operationsExpandedViewKeys)
          : keysOrUpdater,
    })),
  setSettingsActiveSection: (settingsActiveSection) =>
    set({ settingsActiveSection }),
  setProposalDeskQueueFilter: (proposalDeskQueueFilter) =>
    set({ proposalDeskQueueFilter }),
  setProposalDeskFocusedProposalKey: (proposalDeskFocusedProposalKey) =>
    set({ proposalDeskFocusedProposalKey }),
}));
