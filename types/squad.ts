import type { PublicKey } from "@solana/web3.js";

export interface SquadMember {
  key: PublicKey;
  permissions: {
    mask: number;
  };
}
