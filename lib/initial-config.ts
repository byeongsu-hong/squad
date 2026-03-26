import { PublicKey } from "@solana/web3.js";
import * as multisigSdk from "@sqds/multisig";

import { SquadService } from "@/lib/squad";
import type { ChainConfig } from "@/types/chain";
import type { MultisigAccount } from "@/types/multisig";
import type { SquadMember } from "@/types/squad";

interface InitialMultisigSeed {
  publicKey: string;
  chainId: string;
  label: string;
  tags?: string[];
}

export const INITIAL_MULTISIG_SEEDS: InitialMultisigSeed[] = [
  {
    publicKey: "3tQm2hkauvqoRsfJg6NmUA6eMEWqFdvbiJUZUBFHXD6A",
    chainId: "soon-mainnet",
    label: "Hyperlane",
    tags: [],
  },
  {
    publicKey: "CSnrKeqrrLm6v9NvChYKT58mfRGYnMk8MeLGWhKvBdbk",
    chainId: "eclipse-mainnet",
    label: "Hyperlane",
  },
  {
    publicKey: "BsdNMofu1a4ncHFJSNZWuTcZae9yt4ZGDuaneN5am5m6",
    chainId: "sonicsvm-mainnet",
    label: "Hyperlane",
  },
  {
    publicKey: "XgeE3uXEy5bKPbgYv3D9pWovhu3PWrxt3RR5bdp9RkW",
    chainId: "solaxy-mainnet",
    label: "Hyperlane",
  },
];

export async function resolveInitialMultisigs(
  chains: ChainConfig[]
): Promise<MultisigAccount[]> {
  const resolved: Array<MultisigAccount | null> = await Promise.all(
    INITIAL_MULTISIG_SEEDS.map(
      async (seed): Promise<MultisigAccount | null> => {
        const chain = chains.find((item) => item.id === seed.chainId);
        if (!chain) {
          console.warn(`Initial chain not found: ${seed.chainId}`);
          return null;
        }

        try {
          const publicKey = new PublicKey(seed.publicKey);
          const squadService = new SquadService(
            chain.rpcUrl,
            chain.squadsV4ProgramId
          );
          const multisigAccount = await squadService.getMultisig(publicKey);
          const programId = new PublicKey(chain.squadsV4ProgramId);
          const [vaultPda] = multisigSdk.getVaultPda({
            multisigPda: publicKey,
            index: 0,
            programId,
          });

          const multisig: MultisigAccount = {
            publicKey,
            threshold: multisigAccount.threshold,
            members: multisigAccount.members.map((member: SquadMember) => ({
              key: member.key,
              permissions: { mask: member.permissions.mask },
            })),
            transactionIndex: BigInt(
              multisigAccount.transactionIndex.toString()
            ),
            msChangeIndex: 0,
            programId,
            chainId: chain.id,
            label: seed.label,
            tags: seed.tags,
            vaultPda,
          };

          return multisig;
        } catch (error) {
          console.warn(
            `Failed to seed initial multisig ${seed.publicKey}:`,
            error
          );
          return null;
        }
      }
    )
  );

  return resolved.filter((item): item is MultisigAccount => item !== null);
}
