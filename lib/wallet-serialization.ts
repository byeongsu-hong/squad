import { PublicKey } from "@solana/web3.js";

import type { WalletType } from "@/types/wallet";

export interface SerializedWalletState {
  connected: boolean;
  publicKey: string | null;
  walletType: WalletType | null;
  walletName?: string;
  derivationPath?: string;
  deviceModel?: string;
  evmConnected: boolean;
  evmAddress: string | null;
  evmWalletName?: string;
}

export function serializePublicKey(publicKey: PublicKey | null): string | null {
  return publicKey ? publicKey.toString() : null;
}

export function deserializePublicKey(
  publicKey: string | null
): PublicKey | null {
  if (!publicKey) return null;
  try {
    return new PublicKey(publicKey);
  } catch {
    return null;
  }
}

export function serializeWalletState(state: {
  connected: boolean;
  publicKey: PublicKey | null;
  walletType: WalletType | null;
  walletName?: string;
  derivationPath?: string;
  deviceModel?: string;
  evmConnected: boolean;
  evmAddress: string | null;
  evmWalletName?: string;
}): SerializedWalletState {
  return {
    connected: state.connected,
    publicKey: serializePublicKey(state.publicKey),
    walletType: state.walletType,
    walletName: state.walletName,
    derivationPath: state.derivationPath,
    deviceModel: state.deviceModel,
    evmConnected: state.evmConnected,
    evmAddress: state.evmAddress,
    evmWalletName: state.evmWalletName,
  };
}

export function deserializeWalletState(serialized: SerializedWalletState) {
  return {
    connected: serialized.connected,
    publicKey: deserializePublicKey(serialized.publicKey),
    walletType: serialized.walletType,
    walletName: serialized.walletName,
    derivationPath: serialized.derivationPath,
    deviceModel: serialized.deviceModel,
    evmConnected: serialized.evmConnected ?? false,
    evmAddress: serialized.evmAddress ?? null,
    evmWalletName: serialized.evmWalletName,
  };
}
