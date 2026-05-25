import { create } from "zustand";

import { multisigStorage } from "@/lib/storage";
import type { MultisigAccount } from "@/types/multisig";

interface MultisigStore {
  multisigs: MultisigAccount[];
  initialized: boolean;
  initializeMultisigs: () => void;
  setMultisigs: (
    multisigs:
      | MultisigAccount[]
      | ((prev: MultisigAccount[]) => MultisigAccount[])
  ) => void;
  addMultisig: (multisig: MultisigAccount) => void;
  deleteMultisig: (publicKey: string, chainId?: string) => void;
  updateMultisigLabel: (
    publicKey: string,
    label: string,
    chainId?: string
  ) => void;
  updateMultisigTags: (
    publicKey: string,
    tags: string[],
    chainId?: string
  ) => void;
  resetAll: () => void;
}

export const useMultisigStore = create<MultisigStore>((set) => ({
  multisigs: [],
  initialized: false,

  initializeMultisigs: () => {
    const storedMultisigs = multisigStorage.getMultisigs();
    set({
      multisigs: storedMultisigs,
      initialized: true,
    });
  },

  setMultisigs: (multisigsOrUpdater) => {
    set((state) => {
      const newMultisigs =
        typeof multisigsOrUpdater === "function"
          ? multisigsOrUpdater(state.multisigs)
          : multisigsOrUpdater;
      multisigStorage.saveMultisigs(newMultisigs);
      return { multisigs: newMultisigs };
    });
  },

  addMultisig: (multisig) => {
    set((state) => {
      const alreadyExists = state.multisigs.some(
        (m) =>
          m.chainId === multisig.chainId &&
          m.publicKey.toString() === multisig.publicKey.toString()
      );
      if (alreadyExists) return state;
      multisigStorage.addMultisig(multisig);
      return { multisigs: [...state.multisigs, multisig] };
    });
  },

  deleteMultisig: (publicKey, chainId) => {
    multisigStorage.deleteMultisig(publicKey, chainId);
    set((state) => {
      const multisigs = state.multisigs.filter(
        (m) =>
          !(
            m.publicKey.toString() === publicKey &&
            (chainId ? m.chainId === chainId : true)
          )
      );
      return { multisigs };
    });
  },

  updateMultisigLabel: (publicKey, label, chainId) => {
    set((state) => {
      const multisigs = state.multisigs.map((m) =>
        m.publicKey.toString() === publicKey &&
        (chainId ? m.chainId === chainId : true)
          ? { ...m, label }
          : m
      );
      multisigStorage.saveMultisigs(multisigs);
      return { multisigs };
    });
  },

  updateMultisigTags: (publicKey, tags, chainId) => {
    set((state) => {
      const multisigs = state.multisigs.map((m) =>
        m.publicKey.toString() === publicKey &&
        (chainId ? m.chainId === chainId : true)
          ? { ...m, tags }
          : m
      );
      multisigStorage.saveMultisigs(multisigs);
      return { multisigs };
    });
  },

  resetAll: () => {
    multisigStorage.saveMultisigs([]);
    set({
      multisigs: [],
      initialized: true,
    });
  },
}));
