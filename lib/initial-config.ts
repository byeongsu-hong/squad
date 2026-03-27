import { PublicKey } from "@solana/web3.js";
import * as multisigSdk from "@sqds/multisig";

import { SquadService } from "@/lib/squad";
import { getSquadsProgramId, normalizeChainConfig } from "@/types/chain";
import type { ChainConfig } from "@/types/chain";
import type { MultisigAccount } from "@/types/multisig";
import type { SquadMember } from "@/types/squad";

interface InitialMultisigSeed {
  provider?: "squads" | "safe";
  publicKey: string;
  chainId: string;
  label: string;
  tags?: string[];
}

function createSafeSeedPlaceholder(seed: InitialMultisigSeed): MultisigAccount {
  return {
    provider: "safe",
    publicKey: seed.publicKey,
    threshold: 0,
    members: [],
    transactionIndex: BigInt(0),
    msChangeIndex: 0,
    chainId: seed.chainId,
    label: seed.label,
    tags: seed.tags,
  };
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
  {
    provider: "safe",
    publicKey: "0x562Dfaac27A84be6C96273F5c9594DA1681C0DA7",
    chainId: "ethereum-mainnet",
    label: "Sample Safe",
    tags: ["sample", "safe"],
  },
  {
    provider: "safe",
    publicKey: "0x890ac177Fe3052B8676A65f32C1589Bc329f3d50",
    chainId: "base-mainnet",
    label: "Sample Safe",
    tags: ["sample", "safe"],
  },
  {
    provider: "safe",
    publicKey: "0x890ac177Fe3052B8676A65f32C1589Bc329f3d50",
    chainId: "optimism-mainnet",
    label: "Sample Safe",
    tags: ["sample", "safe"],
  },
  {
    provider: "safe",
    publicKey: "0x7379D7bB2ccA68982E467632B6554fD4e72e9431",
    chainId: "bnb-mainnet",
    label: "Sample Safe",
    tags: ["sample", "safe"],
  },
  {
    provider: "safe",
    publicKey: "0x7379D7bB2ccA68982E467632B6554fD4e72e9431",
    chainId: "arbitrum-mainnet",
    label: "Sample Safe",
    tags: ["sample", "safe"],
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

        const normalizedChain = normalizeChainConfig(chain);

        try {
          if (seed.provider === "safe") {
            const response = await fetch("/api/safe/import", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                chain: normalizedChain,
                addressInput: seed.publicKey,
                label: seed.label,
                tags: seed.tags,
              }),
            });

            const payload = (await response.json().catch(() => null)) as {
              error?: string;
              multisig?: Omit<MultisigAccount, "transactionIndex"> & {
                transactionIndex: string;
              };
            } | null;

            if (!response.ok || !payload?.multisig) {
              console.warn(
                payload?.error ?? `Failed to seed Safe ${seed.publicKey}`
              );
              return createSafeSeedPlaceholder(seed);
            }

            return {
              ...payload.multisig,
              transactionIndex: BigInt(payload.multisig.transactionIndex),
            };
          }

          const publicKey = new PublicKey(seed.publicKey);
          const programIdString = getSquadsProgramId(chain);
          const squadService = new SquadService(chain.rpcUrl, programIdString);
          const multisigAccount = await squadService.getMultisig(publicKey);
          const programId = new PublicKey(programIdString);
          const [vaultPda] = multisigSdk.getVaultPda({
            multisigPda: publicKey,
            index: 0,
            programId,
          });

          const multisig: MultisigAccount = {
            provider: "squads",
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
          if (seed.provider === "safe") {
            console.warn(
              `Falling back to placeholder seed for Safe ${seed.publicKey}:`,
              error
            );
            return createSafeSeedPlaceholder(seed);
          }

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
