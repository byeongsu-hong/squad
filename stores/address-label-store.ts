import { create } from "zustand";

import { addressLabelStorage } from "@/lib/storage";
import type { AddressLabel } from "@/types/address-label";

interface AddressLabelStore {
  labels: Map<string, AddressLabel>;
  initialized: boolean;
  initializeLabels: () => void;
  getLabel: (address: string) => AddressLabel | undefined;
  addLabel: (label: Omit<AddressLabel, "createdAt" | "updatedAt">) => void;
  updateLabel: (
    address: string,
    updates: Partial<Omit<AddressLabel, "address" | "createdAt">>
  ) => void;
  deleteLabel: (address: string) => void;
}

export const useAddressLabelStore = create<AddressLabelStore>((set, get) => ({
  labels: new Map(),
  initialized: false,

  initializeLabels: () => {
    const storedLabels = addressLabelStorage.getLabels();
    const labelMap = new Map<string, AddressLabel>();

    storedLabels.forEach((label) => {
      labelMap.set(label.address, label);
    });

    set({
      labels: labelMap,
      initialized: true,
    });
  },

  getLabel: (address) => {
    return get().labels.get(address);
  },

  addLabel: (labelData) => {
    const now = Date.now();
    const label: AddressLabel = {
      ...labelData,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => {
      const newLabels = new Map(state.labels);
      newLabels.set(label.address, label);
      addressLabelStorage.saveLabels(Array.from(newLabels.values()));
      return { labels: newLabels };
    });
  },

  updateLabel: (address, updates) => {
    set((state) => {
      const existingLabel = state.labels.get(address);
      if (!existingLabel) return state;

      const updatedLabel: AddressLabel = {
        ...existingLabel,
        ...updates,
        updatedAt: Date.now(),
      };

      const newLabels = new Map(state.labels);
      newLabels.set(address, updatedLabel);
      addressLabelStorage.saveLabels(Array.from(newLabels.values()));
      return { labels: newLabels };
    });
  },

  deleteLabel: (address) => {
    set((state) => {
      const newLabels = new Map(state.labels);
      newLabels.delete(address);
      addressLabelStorage.saveLabels(Array.from(newLabels.values()));
      return { labels: newLabels };
    });
  },
}));
