# wagmi + RainbowKit EVM Wallet Integration

**Date:** 2026-05-24  
**Status:** Approved

## Problem

`lib/evm-wallet.ts` grabs `window.ethereum` directly, which always picks the first injected wallet (typically MetaMask) with no selection UI. Users with multiple wallets have no way to choose.

## Goal

Replace the raw `window.ethereum` approach with wagmi + RainbowKit to provide:
- Wallet picker modal (EIP-6963 injected wallets + WalletConnect)
- wagmi as single source of truth for EVM state (remove from Zustand)
- Clean wagmi/actions integration in `safe-client.ts`

---

## Architecture

### New file

**`lib/wagmi-config.ts`**  
Exports a wagmi `Config` with:
- Chains: `mainnet`, `base`, `optimism`, `bsc`, `arbitrum`
- Connectors: `injected()` (EIP-6963), `walletConnect({ projectId })`
- Transport: `http()` per chain using existing RPC URLs from `DEFAULT_CHAINS`

### Provider changes (`components/providers.tsx`)

Wrap the tree with `WagmiProvider` (using the exported config) and `RainbowKitProvider`. The existing `QueryClient` is passed to both `QueryClientProvider` and `WagmiProvider` so no duplicate client is created.

```
<QueryClientProvider client={queryClient}>
  <WagmiProvider config={wagmiConfig}>
    <RainbowKitProvider>
      <ThemeProvider>
        <WalletAdapterProvider>   ← Solana, unchanged
          ...
```

### Wallet button (`components/wallet-button.tsx`)

- `handleConnectEvm` replaced with `openConnectModal()` from `useConnectModal()`
- `evmConnected / evmAddress / evmWalletName` from Zustand replaced with `useAccount()` from wagmi
- EVM disconnect: `useDisconnect()` from wagmi

### Safe client (`lib/safe-client.ts`)

Replace `evmWalletService.switchToChain()` + `window.ethereum` with:
```ts
import { getWalletClient, switchChain } from 'wagmi/actions'
import { wagmiConfig } from '@/lib/wagmi-config'

await switchChain(wagmiConfig, { chainId: Number(chainId) })
const walletClient = await getWalletClient(wagmiConfig)
return Safe.init({ provider: walletClient, signer, safeAddress })
```
`@safe-global/protocol-kit` v6 accepts a viem WalletClient as `provider`.

### Wallet disconnect (`lib/hooks/use-wallet-disconnect.ts`)

Add `useDisconnect()` from wagmi; call `disconnect()` alongside existing Solana disconnect.

---

## Deletions

| File / symbol | Action |
|---|---|
| `lib/evm-wallet.ts` | Delete entirely |
| `WalletState.evmConnected/evmAddress/evmWalletName` | Remove from `types/wallet.ts` |
| `connectEvm / disconnectEvm` | Remove from `stores/wallet-store.ts` |
| EVM serialization fields | Remove from `lib/wallet-serialization.ts` |

---

## WalletConnect / Solana conflict

WalletConnect v2 uses chain namespaces (`eip155:*` vs `solana:*`). The Solana adapter's WC session and wagmi's WC connector run as separate sessions with the same projectId — no direct conflict. Bundle-level version conflicts between WC packages should be checked after install (`bun why @walletconnect/core`).

---

## Environment variable

`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — required at build time for WalletConnect. Fall back to empty string in dev to allow injected-only mode.
