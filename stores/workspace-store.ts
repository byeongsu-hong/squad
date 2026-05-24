import { create } from "zustand";

import type { WorkspaceSettingsSection } from "@/types/workspace";

interface WorkspaceStore {
  settingsActiveSection: WorkspaceSettingsSection;
  setSettingsActiveSection: (section: WorkspaceSettingsSection) => void;
  resetAll: () => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  settingsActiveSection: "chains",

  setSettingsActiveSection: (settingsActiveSection) =>
    set((state) =>
      state.settingsActiveSection === settingsActiveSection
        ? state
        : { settingsActiveSection }
    ),

  resetAll: () => set({ settingsActiveSection: "chains" }),
}));
