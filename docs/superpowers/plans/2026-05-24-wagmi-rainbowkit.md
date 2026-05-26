# wagmi + RainbowKit EVM Wallet Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace raw `window.ethereum` EVM wallet connection with wagmi v2 + RainbowKit v2, giving users a proper wallet picker modal (EIP-6963 injected wallets + WalletConnect) and removing EVM state from Zustand.

**Architecture:** `lib/wagmi-config.ts` defines the wagmi config with 5 EVM chains and two connectors (injected + WalletConnect). `WagmiProvider` + `RainbowKitProvider` wrap the app in `providers.tsx`, sharing the existing `QueryClient`. All components that previously read `evmConnected`/`evmAddress` from Zustand now use `useAccount()` from wagmi; EVM fields are fully removed from the Zustand store.

**Tech Stack:** `@rainbow-me/rainbowkit` v2, `wagmi` v2, `viem` v2 (already installed), `@tanstack/react-query` v5 (already installed)

---

## File Map

| Action | File |
|--------|------|
| Create | `lib/wagmi-config.ts` |
| Modify | `components/providers.tsx` |
| Modify | `components/wallet-sync.tsx` |
| Modify | `components/wallet-button.tsx` |
| Modify | `lib/hooks/use-wallet-disconnect.ts` |
| Modify | `lib/safe-client.ts` |
| Modify | `lib/hooks/use-proposal-actions.ts` |
| Modify | `components/landing-page.tsx` |
| Modify | `components/operations-dashboard.tsx` |
| Modify | `components/proposal-detail-modal.tsx` |
| Modify | `stores/wallet-store.ts` |
| Modify | `types/wallet.ts` |
| Modify | `lib/wallet-serialization.ts` |
| Delete | `lib/evm-wallet.ts` |

---

## Task 1: Install packages and set env var

**Files:**
- Run: `bun add @rainbow-me/rainbowkit wagmi`
- Create: `.env.local`

- [ ] **Step 1: Install wagmi and RainbowKit**

```bash
cd /Users/eddy/dev/private/squad
bun add @rainbow-me/rainbowkit wagmi
```

Expected: packages installed, `bun.lock` updated.

- [ ] **Step 2: Create .env.local with WalletConnect project ID placeholder**

```bash
echo "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=" >> .env.local
```

> Note: Get a real project ID from https://cloud.walletconnect.com. Without it WalletConnect connector is still registered but will fail at connection time. Browser-injected wallets (MetaMask, Rabby, etc.) work without a project ID.

- [ ] **Step 3: Commit**

```bash
git add bun.lock package.json .env.local
git commit -m "chore: install wagmi + rainbowkit"
```

---

## Task 2: Create wagmi config

**Files:**
- Create: `lib/wagmi-config.ts`

- [ ] **Step 1: Create `lib/wagmi-config.ts`**

```ts
import { http, createConfig } from "wagmi";
import { mainnet, base, optimism, bsc, arbitrum } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

export const wagmiConfig = createConfig({
  chains: [mainnet, base, optimism, bsc, arbitrum],
  ssr: true,
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [mainnet.id]: http("https://eth.llamarpc.com"),
    [base.id]: http("https://base.llamarpc.com"),
    [optimism.id]: http("https://mainnet.optimism.io"),
    [bsc.id]: http("https://bsc-dataseed.bnbchain.org"),
    [arbitrum.id]: http("https://arb1.arbitrum.io/rpc"),
  },
});
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/eddy/dev/private/squad
bunx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in `lib/wagmi-config.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/wagmi-config.ts
git commit -m "feat: add wagmi config with 5 EVM chains and injected+WalletConnect connectors"
```

---

## Task 3: Add WagmiProvider and RainbowKitProvider to providers.tsx

**Files:**
- Modify: `components/providers.tsx`

Current structure: `QueryClientProvider > ThemeProvider > WalletAdapterProvider`.
New structure: `QueryClientProvider > WagmiProvider > RainbowKitProvider > ThemeProvider > WalletAdapterProvider`.

- [ ] **Step 1: Update `components/providers.tsx`**

Replace the entire file with:

```tsx
"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { ThemeProvider } from "next-themes";
import { useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";

import { Toaster } from "@/components/ui/sonner";
import { resolveInitialMultisigs } from "@/lib/initial-config";
import { wagmiConfig } from "@/lib/wagmi-config";
import { useChainStore } from "@/stores/chain-store";
import { useMultisigStore } from "@/stores/multisig-store";
import { useProviderAdapterStore } from "@/stores/provider-adapter-store";
import { getMultisigAccountKey } from "@/types/multisig";

import { WalletAdapterProvider } from "./wallet-adapter-provider";
import { WalletSync } from "./wallet-sync";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const didInitRef = useRef(false);
  const initializeChains = useChainStore((state) => state.initializeChains);
  const initializeMultisigs = useMultisigStore(
    (state) => state.initializeMultisigs
  );
  const initializeProviderAdapterSettings = useProviderAdapterStore(
    (state) => state.initializeSettings
  );
  const setMultisigs = useMultisigStore((state) => state.setMultisigs);
  const selectMultisig = useMultisigStore((state) => state.selectMultisig);

  useEffect(() => {
    if (didInitRef.current) {
      return;
    }

    didInitRef.current = true;

    const run = async () => {
      initializeChains();
      initializeMultisigs();
      initializeProviderAdapterSettings();

      const { multisigs, selectedMultisigKey } = useMultisigStore.getState();
      const seededMultisigs = await resolveInitialMultisigs();
      if (seededMultisigs.length === 0) {
        return;
      }

      const existingKeys = new Set(
        multisigs.map(
          (multisig) => `${multisig.chainId}:${multisig.publicKey.toString()}`
        )
      );
      const missingSeeds = seededMultisigs.filter(
        (multisig) =>
          !existingKeys.has(
            `${multisig.chainId}:${multisig.publicKey.toString()}`
          )
      );

      if (missingSeeds.length === 0) {
        return;
      }

      setMultisigs([...multisigs, ...missingSeeds]);

      if (!selectedMultisigKey) {
        selectMultisig(getMultisigAccountKey(multisigs[0] ?? missingSeeds[0]));
      }
    };

    void run();
  }, [
    initializeChains,
    initializeMultisigs,
    initializeProviderAdapterSettings,
    selectMultisig,
    setMultisigs,
  ]);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <RainbowKitProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
            <WalletAdapterProvider>
              <WalletSync />
              {children}
              <Toaster />
            </WalletAdapterProvider>
          </ThemeProvider>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
bunx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/providers.tsx
git commit -m "feat: wrap app with WagmiProvider and RainbowKitProvider"
```

---

## Task 4: Remove EVM sync logic from wallet-sync.tsx

**Files:**
- Modify: `components/wallet-sync.tsx`

wagmi handles reconnection and account-change events for EVM wallets. The two EVM-related `useEffect`s in `WalletSync` are now redundant.

- [ ] **Step 1: Replace `components/wallet-sync.tsx`**

```tsx
"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect } from "react";

import { useWalletStore } from "@/stores/wallet-store";
import { WalletType } from "@/types/wallet";

export function WalletSync() {
  const { connected: storeConnected, walletName, walletType } = useWalletStore();
  const { connected: adapterConnected, wallets, select, connect } = useWallet();

  useEffect(() => {
    if (
      storeConnected &&
      walletType === WalletType.BROWSER &&
      walletName &&
      !adapterConnected
    ) {
      const walletToReconnect = wallets.find(
        (w) => w.adapter.name === walletName
      );
      if (walletToReconnect) {
        select(walletToReconnect.adapter.name);
        setTimeout(() => {
          connect().catch((error) => {
            console.error("Failed to auto-reconnect wallet:", error);
          });
        }, 100);
      }
    }
  }, [storeConnected, walletType, walletName, adapterConnected, wallets, select, connect]);

  return null;
}
```

- [ ] **Step 2: TypeScript check**

```bash
bunx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add components/wallet-sync.tsx
git commit -m "refactor: remove EVM sync logic from WalletSync (wagmi handles it)"
```

---

## Task 5: Update wallet-button.tsx to use wagmi hooks

**Files:**
- Modify: `components/wallet-button.tsx`

Replace `evmWalletService.connect()` with `openConnectModal()` from RainbowKit. Replace Zustand EVM state (`evmConnected`, `evmAddress`, `evmWalletName`) with `useAccount()` from wagmi. Use `useDisconnect()` for EVM disconnect.

- [ ] **Step 1: Replace `components/wallet-button.tsx`**

```tsx
"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Copy, Globe, LogOut, PlugZap, Usb, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWalletDisconnect } from "@/lib/hooks/use-wallet-disconnect";
import { formatAddress } from "@/lib/utils/format-address";
import { useWalletStore } from "@/stores/wallet-store";

import { BrowserWalletDialog } from "./browser-wallet-dialog";
import { OkxWalletDialog } from "./okx-wallet-dialog";
import { WalletConnectDialog } from "./wallet-connect-dialog";

type DialogType = "ledger" | "browser" | "okx" | null;

export function WalletButton() {
  const [dialogOpen, setDialogOpen] = useState<DialogType>(null);
  const { connected, publicKey, walletName } = useWalletStore();
  const { address: evmAddress, isConnected: evmConnected, connector } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useWalletDisconnect();

  const evmWalletName = connector?.name;

  const hasSolanaWallet = connected && publicKey;
  const hasEvmWallet = evmConnected && evmAddress;
  const hasAnyWallet = Boolean(hasSolanaWallet || hasEvmWallet);

  const primaryLabel = hasSolanaWallet
    ? formatAddress(publicKey.toString(), 4, 4)
    : hasEvmWallet
      ? formatAddress(evmAddress, 6, 4)
      : null;

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
      toast.success("Address copied to clipboard");
    }
  };

  const handleDisconnectAll = async () => {
    await disconnect();
  };

  const dialogs = (
    <>
      <WalletConnectDialog
        open={dialogOpen === "ledger"}
        onOpenChange={(open) => setDialogOpen(open ? "ledger" : null)}
      />
      <BrowserWalletDialog
        open={dialogOpen === "browser"}
        onOpenChange={(open) => setDialogOpen(open ? "browser" : null)}
      />
      <OkxWalletDialog
        open={dialogOpen === "okx"}
        onOpenChange={(open) => setDialogOpen(open ? "okx" : null)}
      />
    </>
  );

  if (!hasAnyWallet) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Select Wallet Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDialogOpen("browser")}>
              <Globe className="mr-2 h-4 w-4" />
              Solana Browser Wallet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openConnectModal?.()}>
              <PlugZap className="mr-2 h-4 w-4" />
              EVM Browser Wallet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialogOpen("okx")}>
              <Wallet className="mr-2 h-4 w-4" />
              OKX Wallet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialogOpen("ledger")}>
              <Usb className="mr-2 h-4 w-4" />
              Ledger Device
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {dialogs}
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 font-mono text-[12px] text-muted-foreground shadow-sm transition-colors hover:bg-muted">
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
            {primaryLabel}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Connected</DropdownMenuLabel>

          {hasSolanaWallet && (
            <DropdownMenuItem onClick={handleCopyAddress}>
              <Copy className="mr-2 h-4 w-4" />
              <span className="flex-1 truncate">
                {walletName ?? "Solana"}{" "}
                <span className="font-mono text-muted-foreground/70">
                  {formatAddress(publicKey.toString(), 4, 4)}
                </span>
              </span>
            </DropdownMenuItem>
          )}

          {hasEvmWallet && (
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(evmAddress);
                toast.success("EVM address copied to clipboard");
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              <span className="flex-1 truncate">
                {evmWalletName ?? "EVM"}{" "}
                <span className="font-mono text-muted-foreground/70">
                  {formatAddress(evmAddress, 4, 4)}
                </span>
              </span>
            </DropdownMenuItem>
          )}

          {(!hasSolanaWallet || !hasEvmWallet) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Add wallet</DropdownMenuLabel>
              {!hasSolanaWallet && (
                <>
                  <DropdownMenuItem onClick={() => setDialogOpen("browser")}>
                    <Globe className="mr-2 h-4 w-4" />
                    Solana Browser Wallet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDialogOpen("okx")}>
                    <Wallet className="mr-2 h-4 w-4" />
                    OKX Wallet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDialogOpen("ledger")}>
                    <Usb className="mr-2 h-4 w-4" />
                    Ledger Device
                  </DropdownMenuItem>
                </>
              )}
              {!hasEvmWallet && (
                <DropdownMenuItem onClick={() => openConnectModal?.()}>
                  <PlugZap className="mr-2 h-4 w-4" />
                  EVM Browser Wallet
                </DropdownMenuItem>
              )}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void handleDisconnectAll()}>
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect All
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {dialogs}
    </>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
bunx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add components/wallet-button.tsx
git commit -m "feat: replace evmWalletService with wagmi useAccount + RainbowKit openConnectModal"
```

---

## Task 6: Update use-wallet-disconnect.ts

**Files:**
- Modify: `lib/hooks/use-wallet-disconnect.ts`

Add wagmi's `useDisconnect` so "Disconnect All" also ends the EVM wagmi session.

- [ ] **Step 1: Replace `lib/hooks/use-wallet-disconnect.ts`**

```ts
import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback } from "react";
import { toast } from "sonner";
import { useDisconnect } from "wagmi";

import { ledgerService } from "@/lib/ledger";
import { okxWalletService } from "@/lib/okx-wallet";
import { useWalletStore } from "@/stores/wallet-store";
import { WalletType } from "@/types/wallet";

export function useWalletDisconnect() {
  const { walletType, disconnect: disconnectStore } = useWalletStore();
  const { disconnect: disconnectAdapter } = useWallet();
  const { disconnect: disconnectEvm } = useDisconnect();

  const disconnect = useCallback(async () => {
    try {
      if (walletType === WalletType.LEDGER) {
        await ledgerService.disconnect();
      } else if (walletType === WalletType.BROWSER) {
        await disconnectAdapter();
      } else if (walletType === WalletType.OKX) {
        await okxWalletService.disconnect();
      }

      disconnectEvm();
      disconnectStore();
      toast.success("Wallet disconnected");
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
      toast.error("Failed to disconnect wallet");
    }
  }, [walletType, disconnectStore, disconnectAdapter, disconnectEvm]);

  return { disconnect };
}
```

- [ ] **Step 2: TypeScript check**

```bash
bunx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/use-wallet-disconnect.ts
git commit -m "feat: add wagmi disconnect to useWalletDisconnect"
```

---

## Task 7: Update safe-client.ts to use wagmi/actions

**Files:**
- Modify: `lib/safe-client.ts`

Replace `evmWalletService.switchToChain()` + `window.ethereum` with wagmi's `switchChain` and connector `getProvider()`. `getSafeChainNumericId` returns `bigint`; pass `Number(chainId)` to wagmi.

- [ ] **Step 1: Replace `lib/safe-client.ts`**

```ts
"use client";

import Safe from "@safe-global/protocol-kit";
import { getAccount, switchChain } from "wagmi/actions";

import { wagmiConfig } from "@/lib/wagmi-config";
import type { SafeServiceMultisigTransaction } from "@/lib/safe";
import { getSafeChainNumericId } from "@/lib/safe";
import type { ChainConfig } from "@/types/chain";

async function getSafeSdk(
  chain: ChainConfig,
  safeAddress: string,
  signer: string
) {
  const chainId = getSafeChainNumericId(chain);
  if (!chainId) {
    throw new Error(`Safe actions are not configured for ${chain.name}.`);
  }

  await switchChain(wagmiConfig, { chainId: Number(chainId) });

  const { connector } = getAccount(wagmiConfig);
  if (!connector) {
    throw new Error("No EVM wallet connected.");
  }

  const provider = await connector.getProvider();

  return Safe.init({
    provider: provider as never,
    signer,
    safeAddress,
  });
}

async function loadSafeTransactionForAction(
  chain: Pick<ChainConfig, "id" | "name">,
  safeAddress: string,
  nonce: bigint
) {
  const params = new URLSearchParams({
    chainId: chain.id,
    chainName: chain.name,
    safeAddress,
    nonce: nonce.toString(),
  });

  const response = await fetch(`/api/safe/transaction?${params.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Failed to load Safe transaction.");
  }

  const payload = (await response.json()) as {
    transaction?: SafeServiceMultisigTransaction;
  };

  if (!payload.transaction) {
    throw new Error("Safe transaction response was empty.");
  }

  return payload.transaction;
}

export async function confirmSafeTransaction(options: {
  chain: ChainConfig;
  safeAddress: string;
  signer: string;
  nonce: bigint;
}) {
  const transaction = await loadSafeTransactionForAction(
    options.chain,
    options.safeAddress,
    options.nonce
  );

  if (!transaction.safeTxHash) {
    throw new Error(
      "This Safe transaction is missing a Safe transaction hash."
    );
  }

  const safeSdk = await getSafeSdk(
    options.chain,
    options.safeAddress,
    options.signer
  );
  const signedTransaction = await safeSdk.signTransaction(transaction as never);
  const signature = signedTransaction.getSignature(options.signer)?.data;

  if (!signature) {
    throw new Error("The connected wallet did not return a Safe signature.");
  }

  const response = await fetch("/api/safe/confirm", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chainId: options.chain.id,
      chainName: options.chain.name,
      safeTxHash: transaction.safeTxHash,
      signature,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Failed to confirm Safe transaction.");
  }

  return transaction.safeTxHash;
}

export async function executeSafeTransaction(options: {
  chain: ChainConfig;
  safeAddress: string;
  signer: string;
  nonce: bigint;
}) {
  const transaction = await loadSafeTransactionForAction(
    options.chain,
    options.safeAddress,
    options.nonce
  );

  const safeSdk = await getSafeSdk(
    options.chain,
    options.safeAddress,
    options.signer
  );

  return safeSdk.executeTransaction(transaction as never);
}
```

- [ ] **Step 2: TypeScript check**

```bash
bunx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add lib/safe-client.ts
git commit -m "feat: replace window.ethereum in safe-client with wagmi getAccount + connector.getProvider"
```

---

## Task 8: Update use-proposal-actions.ts

**Files:**
- Modify: `lib/hooks/use-proposal-actions.ts`

Remove `evmAddress` from `useWalletStore()` and replace with `useAccount().address` from wagmi.

- [ ] **Step 1: Add wagmi import and replace evmAddress source**

In `lib/hooks/use-proposal-actions.ts`:

1. Add to imports:
```ts
import { useAccount } from "wagmi";
```

2. Replace this line:
```ts
const { publicKey, derivationPath, walletType, evmAddress } =
  useWalletStore();
```
With:
```ts
const { publicKey, derivationPath, walletType } = useWalletStore();
const { address: evmAddress } = useAccount();
```

- [ ] **Step 2: TypeScript check**

```bash
bunx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `evmAddress`.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/use-proposal-actions.ts
git commit -m "refactor: read evmAddress from wagmi useAccount instead of Zustand"
```

---

## Task 9: Update consumer components

**Files:**
- Modify: `components/landing-page.tsx`
- Modify: `components/operations-dashboard.tsx`
- Modify: `components/proposal-detail-modal.tsx`

Remove `evmConnected` and `getWalletAddressForProvider` from Zustand usage. Use `useAccount()` directly.

- [ ] **Step 1: Update `components/landing-page.tsx`**

Add import:
```ts
import { useAccount } from "wagmi";
```

Replace:
```ts
const { publicKey, connected, evmConnected, getWalletAddressForProvider } =
  useWalletStore();
```
With:
```ts
const { publicKey, connected } = useWalletStore();
const { isConnected: evmConnected, address: evmAddress } = useAccount();
```

Replace the `getViewerAddressForMultisig` callback:
```ts
getViewerAddressForMultisig: (multisig) =>
  getWalletAddressForProvider(multisig.provider),
```
With:
```ts
getViewerAddressForMultisig: (multisig) =>
  multisig.provider === "safe"
    ? (evmAddress ?? null)
    : (publicKey?.toString() ?? null),
```

- [ ] **Step 2: Update `components/operations-dashboard.tsx`**

Add import:
```ts
import { useAccount } from "wagmi";
```

Replace:
```ts
const { publicKey, connected, evmConnected, getWalletAddressForProvider } = useWalletStore();
```
With:
```ts
const { publicKey, connected } = useWalletStore();
const { isConnected: evmConnected, address: evmAddress } = useAccount();
```

Replace the `getViewerAddressForMultisig` callback:
```ts
getViewerAddressForMultisig: (multisig) =>
  getWalletAddressForProvider(multisig.provider),
```
With:
```ts
getViewerAddressForMultisig: (multisig) =>
  multisig.provider === "safe"
    ? (evmAddress ?? null)
    : (publicKey?.toString() ?? null),
```

- [ ] **Step 3: Update `components/proposal-detail-modal.tsx`**

Add import:
```ts
import { useAccount } from "wagmi";
```

Replace:
```ts
const { publicKey, getWalletAddressForProvider } = useWalletStore();
```
With:
```ts
const { publicKey } = useWalletStore();
const { address: evmAddress } = useAccount();
```

Replace:
```ts
const currentUserAddress = getWalletAddressForProvider(multisig.provider) ?? publicKey?.toString() ?? null;
```
With:
```ts
const currentUserAddress =
  (multisig.provider === "safe" ? evmAddress : publicKey?.toString()) ?? null;
```

- [ ] **Step 4: TypeScript check**

```bash
bunx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add components/landing-page.tsx components/operations-dashboard.tsx components/proposal-detail-modal.tsx
git commit -m "refactor: replace Zustand evmConnected/getWalletAddressForProvider with wagmi useAccount"
```

---

## Task 10: Remove EVM state from Zustand, types, and serialization

**Files:**
- Modify: `types/wallet.ts`
- Modify: `lib/wallet-serialization.ts`
- Modify: `stores/wallet-store.ts`

All consumers have been migrated. Now remove the dead EVM state.

- [ ] **Step 1: Update `types/wallet.ts`**

Remove `evmConnected`, `evmAddress`, `evmWalletName` from the `WalletState` interface:

```ts
export interface WalletState {
  connected: boolean;
  publicKey: PublicKey | null;
  walletType: WalletType | null;
  walletName?: string;
  derivationPath?: string;
  deviceModel?: string;
}
```

(Keep everything else in the file unchanged.)

- [ ] **Step 2: Update `lib/wallet-serialization.ts`**

Replace the entire file:

```ts
import { PublicKey } from "@solana/web3.js";

import type { WalletType } from "@/types/wallet";

export interface SerializedWalletState {
  connected: boolean;
  publicKey: string | null;
  walletType: WalletType | null;
  walletName?: string;
  derivationPath?: string;
  deviceModel?: string;
}

function serializePublicKey(publicKey: PublicKey | null): string | null {
  return publicKey ? publicKey.toString() : null;
}

function deserializePublicKey(
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
}): SerializedWalletState {
  return {
    connected: state.connected,
    publicKey: serializePublicKey(state.publicKey),
    walletType: state.walletType,
    walletName: state.walletName,
    derivationPath: state.derivationPath,
    deviceModel: state.deviceModel,
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
  };
}
```

- [ ] **Step 3: Update `stores/wallet-store.ts`**

Replace the entire file:

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  type SerializedWalletState,
  deserializeWalletState,
  serializeWalletState,
} from "@/lib/wallet-serialization";
import type { WalletState } from "@/types/wallet";
import { WalletType } from "@/types/wallet";

interface WalletStore extends WalletState {
  connectLedger: (
    publicKey: WalletState["publicKey"],
    derivationPath: string,
    deviceModel?: string
  ) => void;
  connectBrowser: (
    publicKey: WalletState["publicKey"],
    walletName: string
  ) => void;
  connectOkx: (publicKey: WalletState["publicKey"]) => void;
  disconnect: () => void;
}

const initialState: WalletState = {
  connected: false,
  publicKey: null,
  walletType: null,
  walletName: undefined,
  derivationPath: undefined,
  deviceModel: undefined,
};

export const useWalletStore = create<WalletStore>()(
  persist(
    (set) => ({
      ...initialState,

      connectLedger: (publicKey, derivationPath, deviceModel) => {
        set({
          connected: true,
          publicKey,
          walletType: WalletType.LEDGER,
          walletName: "Ledger",
          derivationPath,
          deviceModel,
        });
      },

      connectBrowser: (publicKey, walletName) => {
        set({
          connected: true,
          publicKey,
          walletType: WalletType.BROWSER,
          walletName,
          derivationPath: undefined,
          deviceModel: undefined,
        });
      },

      connectOkx: (publicKey) => {
        set({
          connected: true,
          publicKey,
          walletType: WalletType.OKX,
          walletName: "OKX Wallet",
          derivationPath: undefined,
          deviceModel: undefined,
        });
      },

      disconnect: () => {
        set(initialState);
      },
    }),
    {
      name: "squad-wallet",
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;

          try {
            const { state, version } = JSON.parse(str);
            const deserialized = deserializeWalletState(
              state as SerializedWalletState
            );
            return { state: deserialized, version };
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          const serialized = serializeWalletState(value.state);
          localStorage.setItem(
            name,
            JSON.stringify({
              state: serialized,
              version: value.version,
            })
          );
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
```

- [ ] **Step 4: TypeScript check**

```bash
bunx tsc --noEmit 2>&1 | head -30
```

Expected: clean (no references to removed fields remain).

- [ ] **Step 5: Commit**

```bash
git add types/wallet.ts lib/wallet-serialization.ts stores/wallet-store.ts
git commit -m "refactor: remove EVM state from Zustand wallet store (wagmi is now source of truth)"
```

---

## Task 11: Delete evm-wallet.ts and final TypeScript check

**Files:**
- Delete: `lib/evm-wallet.ts`

- [ ] **Step 1: Verify no remaining imports of evm-wallet**

```bash
grep -r "evm-wallet" /Users/eddy/dev/private/squad --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next"
```

Expected: no output.

- [ ] **Step 2: Delete the file**

```bash
rm /Users/eddy/dev/private/squad/lib/evm-wallet.ts
```

- [ ] **Step 3: Full TypeScript check**

```bash
bunx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 4: Run existing tests**

```bash
bun test
```

Expected: all tests pass (existing tests don't cover EVM wallet code).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: delete lib/evm-wallet.ts (replaced by wagmi)"
```

---

## Post-implementation verification

After all tasks complete:

1. Start dev server: `bun dev`
2. Open the app in a browser with MetaMask **and** Rabby (or another injected wallet) installed
3. Click "Connect Wallet → EVM Browser Wallet" — RainbowKit modal should open showing all detected injected wallets
4. Connect a non-MetaMask wallet — verify the connected address shows correctly in the header
5. Disconnect All — verify EVM state clears
6. Refresh the page — verify wagmi auto-reconnects the EVM wallet (wagmi persists to localStorage)
