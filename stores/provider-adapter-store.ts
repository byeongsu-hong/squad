import { create } from "zustand";

import { providerAdapterStorage } from "@/lib/storage";
import type { ProviderAdapterSettings } from "@/types/provider-adapter";
import {
  DEFAULT_PROVIDER_ADAPTER_SETTINGS,
  normalizeProviderAdapterSettings,
} from "@/types/provider-adapter";

interface ProviderAdapterStore {
  settings: ProviderAdapterSettings;
  initializeSettings: () => void;
  updateSettings: (updates: Partial<ProviderAdapterSettings>) => void;
  resetSettings: () => void;
}

export const useProviderAdapterStore = create<ProviderAdapterStore>((set) => ({
  settings: DEFAULT_PROVIDER_ADAPTER_SETTINGS,
  initializeSettings: () => {
    set({
      settings: normalizeProviderAdapterSettings(
        providerAdapterStorage.getSettings()
      ),
    });
  },
  updateSettings: (updates) =>
    set((state) => {
      const settings = normalizeProviderAdapterSettings({
        ...state.settings,
        ...updates,
      });
      providerAdapterStorage.saveSettings(settings);
      return { settings };
    }),
  resetSettings: () => {
    providerAdapterStorage.resetSettings();
    set({ settings: DEFAULT_PROVIDER_ADAPTER_SETTINGS });
  },
}));
