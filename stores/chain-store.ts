import { create } from "zustand";

import { chainStorage } from "@/lib/storage";
import type { ChainConfig } from "@/types/chain";
import { DEFAULT_CHAINS, normalizeChainConfig } from "@/types/chain";

interface ChainStore {
  chains: ChainConfig[];
  selectedChainId: string | null;
  initializeChains: () => void;
  addChain: (chain: ChainConfig) => void;
  updateChain: (id: string, updates: Partial<ChainConfig>) => void;
  deleteChain: (id: string) => void;
  selectChain: (id: string) => void;
  getSelectedChain: () => ChainConfig | undefined;
  resetToDefaults: () => void;
}

export const useChainStore = create<ChainStore>((set, get) => ({
  chains: [],
  selectedChainId: null,

  initializeChains: () => {
    const storedChains = chainStorage.getChains().map(normalizeChainConfig);
    const selectedId = chainStorage.getSelectedChainId();
    const storedChainIds = new Set(storedChains.map((chain) => chain.id));
    const missingDefaults = DEFAULT_CHAINS.filter(
      (chain) => !storedChainIds.has(chain.id)
    );
    const chains =
      storedChains.length > 0
        ? [...storedChains, ...missingDefaults]
        : DEFAULT_CHAINS;

    if (storedChains.length === 0 || missingDefaults.length > 0) {
      chainStorage.saveChains(chains);
    }

    const selectedChainId =
      selectedId || chains.find((c) => c.isDefault)?.id || chains[0]?.id;

    if (selectedChainId) {
      chainStorage.setSelectedChainId(selectedChainId);
    }

    set({ chains, selectedChainId });
  },

  addChain: (chain) => {
    const normalizedChain = normalizeChainConfig(chain);
    chainStorage.addChain(normalizedChain);
    set((state) => ({ chains: [...state.chains, normalizedChain] }));
  },

  updateChain: (id, updates) => {
    const existingChain = get().chains.find((chain) => chain.id === id);
    if (!existingChain) {
      return;
    }

    const normalizedChain = normalizeChainConfig({
      ...existingChain,
      ...updates,
    });
    chainStorage.updateChain(id, normalizedChain);
    const newChains = get().chains.map((chain) =>
      chain.id === id ? normalizedChain : chain
    );
    set({ chains: newChains });
  },

  deleteChain: (id) => {
    chainStorage.deleteChain(id);
    set((state) => {
      const chains = state.chains.filter((chain) => chain.id !== id);
      const selectedChainId =
        state.selectedChainId === id
          ? chains[0]?.id || null
          : state.selectedChainId;

      if (selectedChainId) {
        chainStorage.setSelectedChainId(selectedChainId);
      }

      return { chains, selectedChainId };
    });
  },

  selectChain: (id) => {
    chainStorage.setSelectedChainId(id);
    set({ selectedChainId: id });
  },

  getSelectedChain: () => {
    const { chains, selectedChainId } = get();
    return chains.find((chain) => chain.id === selectedChainId);
  },

  resetToDefaults: () => {
    chainStorage.saveChains(DEFAULT_CHAINS);
    const selectedChainId =
      DEFAULT_CHAINS.find((c) => c.isDefault)?.id || DEFAULT_CHAINS[0]?.id;
    if (selectedChainId) {
      chainStorage.setSelectedChainId(selectedChainId);
    }
    set({ chains: DEFAULT_CHAINS, selectedChainId });
  },
}));
