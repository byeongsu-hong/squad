import { create } from "zustand";

import { multisigStorage } from "@/lib/storage";
import {
  type MultisigAccount,
  type ProposalAccount,
  getMultisigAccountKey,
  resolveMultisigSelectionKey,
} from "@/types/multisig";

interface MultisigStore {
  multisigs: MultisigAccount[];
  proposals: ProposalAccount[];
  selectedMultisigKey: string | null;
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
  setProposals: (proposals: ProposalAccount[]) => void;
  addProposal: (proposal: ProposalAccount) => void;
  updateProposal: (
    transactionIndex: bigint,
    updates: Partial<ProposalAccount>
  ) => void;
  selectMultisig: (publicKey: string | null) => void;
  getMultisigByKey: (publicKey: string | null) => MultisigAccount | undefined;
  getSelectedMultisig: () => MultisigAccount | undefined;
}

export const useMultisigStore = create<MultisigStore>((set, get) => ({
  multisigs: [],
  proposals: [],
  selectedMultisigKey: null,
  initialized: false,

  initializeMultisigs: () => {
    const storedMultisigs = multisigStorage.getMultisigs();
    const selectedKey = resolveMultisigSelectionKey(
      storedMultisigs,
      multisigStorage.getSelectedMultisigKey()
    );

    set({
      multisigs: storedMultisigs,
      selectedMultisigKey: selectedKey,
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
    multisigStorage.addMultisig(multisig);
    set((state) => ({ multisigs: [...state.multisigs, multisig] }));
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
      const deletedSelectionKey = chainId
        ? `${chainId}:${publicKey}`
        : publicKey;
      const selectedMultisigKey =
        state.selectedMultisigKey === deletedSelectionKey ||
        state.selectedMultisigKey === publicKey
          ? multisigs[0]
            ? getMultisigAccountKey(multisigs[0])
            : null
          : state.selectedMultisigKey;

      if (selectedMultisigKey) {
        multisigStorage.setSelectedMultisigKey(selectedMultisigKey);
      }

      return { multisigs, selectedMultisigKey };
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

  setProposals: (proposals) => set({ proposals }),

  addProposal: (proposal) =>
    set((state) => ({ proposals: [...state.proposals, proposal] })),

  updateProposal: (transactionIndex, updates) =>
    set((state) => ({
      proposals: state.proposals.map((proposal) =>
        proposal.transactionIndex === transactionIndex
          ? { ...proposal, ...updates }
          : proposal
      ),
    })),

  selectMultisig: (selectionKey) => {
    const resolvedSelectionKey = selectionKey
      ? (resolveMultisigSelectionKey(get().multisigs, selectionKey) ??
        selectionKey)
      : null;

    if (resolvedSelectionKey) {
      multisigStorage.setSelectedMultisigKey(resolvedSelectionKey);
    }
    set({ selectedMultisigKey: resolvedSelectionKey });
  },

  getMultisigByKey: (selectionKey) => {
    if (!selectionKey) {
      return undefined;
    }

    const { multisigs } = get();
    const resolvedSelectionKey = resolveMultisigSelectionKey(
      multisigs,
      selectionKey
    );

    return multisigs.find(
      (multisig) =>
        getMultisigAccountKey(multisig) === resolvedSelectionKey ||
        multisig.publicKey.toString() === selectionKey
    );
  },

  getSelectedMultisig: () => {
    const { getMultisigByKey, selectedMultisigKey } = get();
    return getMultisigByKey(selectedMultisigKey);
  },
}));
