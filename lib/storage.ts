import { PublicKey } from "@solana/web3.js";

import { createListStorage, createStorage } from "@/lib/storage-base";
import type { ChainConfig } from "@/types/chain";
import type { MultisigAccount } from "@/types/multisig";

const STORAGE_KEYS = {
  CHAINS: "squad-chains",
  SELECTED_CHAIN: "squad-selected-chain",
  MULTISIGS: "squad-multisigs",
  SELECTED_MULTISIG: "squad-selected-multisig",
} as const;

const chainListStorage = createListStorage<ChainConfig>(STORAGE_KEYS.CHAINS);
const selectedChainStorage = createStorage<string>(STORAGE_KEYS.SELECTED_CHAIN);

export const chainStorage = {
  getChains(): ChainConfig[] {
    return chainListStorage.getAll();
  },

  saveChains(chains: ChainConfig[]): void {
    chainListStorage.save(chains);
  },

  addChain(chain: ChainConfig): void {
    chainListStorage.add(chain);
  },

  updateChain(id: string, updates: Partial<ChainConfig>): void {
    chainListStorage.update((chain) => chain.id === id, updates);
  },

  deleteChain(id: string): void {
    chainListStorage.remove((chain) => chain.id === id);
  },

  getChainById(id: string): ChainConfig | undefined {
    return chainListStorage.find((chain) => chain.id === id);
  },

  getSelectedChainId(): string | null {
    return selectedChainStorage.get();
  },

  setSelectedChainId(id: string): void {
    selectedChainStorage.set(id);
  },
};

interface StoredMultisig {
  publicKey: string;
  threshold: number;
  members: Array<{
    key: string;
    permissions: { mask: number };
  }>;
  transactionIndex: string;
  msChangeIndex: number;
  programId: string;
  chainId: string;
  label?: string;
  tags?: string[];
}

const multisigListStorage = createListStorage<MultisigAccount, StoredMultisig>(
  STORAGE_KEYS.MULTISIGS,
  {
    serialize: (m) => ({
      publicKey: m.publicKey.toString(),
      threshold: m.threshold,
      members: m.members.map((member) => ({
        key: member.key.toString(),
        permissions: { mask: member.permissions.mask },
      })),
      transactionIndex: m.transactionIndex.toString(),
      msChangeIndex: m.msChangeIndex,
      programId: m.programId.toString(),
      chainId: m.chainId,
      label: m.label,
      tags: m.tags,
    }),
    deserialize: (m) => ({
      publicKey: new PublicKey(m.publicKey),
      threshold: m.threshold,
      members: m.members.map((member) => ({
        key: new PublicKey(member.key),
        permissions: { mask: member.permissions.mask },
      })),
      transactionIndex: BigInt(m.transactionIndex),
      msChangeIndex: m.msChangeIndex,
      programId: new PublicKey(m.programId),
      chainId: m.chainId,
      label: m.label,
      tags: m.tags,
    }),
  }
);

const selectedMultisigStorage = createStorage<string>(
  STORAGE_KEYS.SELECTED_MULTISIG
);

export const multisigStorage = {
  getMultisigs(): MultisigAccount[] {
    return multisigListStorage.getAll();
  },

  saveMultisigs(multisigs: MultisigAccount[]): void {
    multisigListStorage.save(multisigs);
  },

  addMultisig(multisig: MultisigAccount): void {
    const exists = multisigListStorage.find(
      (m) => m.publicKey.toString() === multisig.publicKey.toString()
    );
    if (!exists) {
      multisigListStorage.add(multisig);
    }
  },

  deleteMultisig(publicKey: string): void {
    multisigListStorage.remove((m) => m.publicKey.toString() === publicKey);
  },

  getSelectedMultisigKey(): string | null {
    return selectedMultisigStorage.get();
  },

  setSelectedMultisigKey(key: string): void {
    selectedMultisigStorage.set(key);
  },
};
