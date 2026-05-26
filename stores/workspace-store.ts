import { create } from "zustand";

interface WorkspaceStore {
  resetAll: () => void;
}

export const useWorkspaceStore = create<WorkspaceStore>(() => ({
  resetAll: () => {},
}));
