# Squad Multisig Workspace

<p align="center">
  Local-first multisig operations workspace for teams running across
  <strong>Squads on SVM</strong> and <strong>Safe on EVM</strong>.
</p>

<p align="center">
  Review proposals, manage registries, inspect payloads, export portable YAML snapshots,
  and operate mixed-provider multisig fleets from a single operator surface.
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-111111?style=flat-square" />
  <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?style=flat-square" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square" />
  <img alt="Providers" src="https://img.shields.io/badge/Providers-Squads%20%7C%20Safe-CB6D51?style=flat-square" />
  <img alt="Storage" src="https://img.shields.io/badge/Storage-Local--first-5A6B4D?style=flat-square" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-6E56CF?style=flat-square" />
</p>

---

## Why This Exists

Most multisig tools optimize for a single provider and a single workspace shape. This project is built for operators who need:

- one registry for many multisigs
- one queue for many proposal streams
- one review surface for payloads and signer context
- one settings area for chains, adapters, imports, labels, and registry state

The result is a dense operations app rather than a marketing dashboard.

## Highlights

### Unified operator workflow

- Registry explorer with chain, tag, and smart view grouping
- Proposal queue with focus workspace
- Cross-multisig monitoring table
- Quick search and keyboard-driven navigation

### Mixed-provider support

- `SVM / Squads` for full multisig proposal operations
- `EVM / Safe` for provider-aware registry, review, payload, and action flows
- Shared provider/runtime badges across explorer, queue, monitoring, and detail views

### Local-first configuration

- Chains, multisigs, address labels, and UI metadata live in browser storage
- YAML export/import for portable workspace snapshots
- No hosted app backend required for normal operation

### Operator-grade review

- Payload inspection and proposal detail views
- Address labels and copy-first address chips
- Created-at timestamps and queue ordering
- Provider-aware loading, empty, and degraded states

## Current Provider Support

| Provider | Status | Capabilities                                                                                                           |
| -------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| Squads   | Full   | Import, proposal loading, approve, reject, execute, member changes, threshold changes, payload review                  |
| Safe     | Active | Import, server-routed reads, payload review, summary loading, confirm, execute, provider-aware settings and monitoring |

### Safe Notes

- Safe reads go through Next.js server routes to avoid browser-side CORS and gateway restrictions.
- Safe availability still depends on external RPC and Safe transaction service health.
- The UI surfaces unavailable or delayed metadata instead of silently failing.

## Product Surfaces

### `Operations`

The primary operations workspace:

- registry explorer
- grouped multisig scopes
- queue filters for `All`, `Waiting`, and `Executable`
- focus workspace for proposal review and actioning

### `Proposals`

A proposal-centric review desk:

- per-multisig proposal list
- payload-focused review
- approval context and created-at visibility

### `Monitoring`

Cross-multisig oversight:

- mixed-provider proposal table
- batch review workflows
- CSV export
- provider-aware unsupported handling

### `Settings`

Admin surface for:

- chain configuration
- multisig registry management
- YAML import/export
- address labels
- adapter readiness

## Routes

| Route         | Purpose                           |
| ------------- | --------------------------------- |
| `/`           | Landing and primary entry         |
| `/operations` | Main operator workspace           |
| `/proposals`  | Proposal review desk              |
| `/monitoring` | Monitoring table                  |
| `/multisigs`  | Multisig-focused registry view    |
| `/settings`   | Admin and configuration workspace |

## Getting Started

### Prerequisites

- Node.js `18+`
- `pnpm`
- A Solana wallet and/or injected EVM wallet depending on the provider you operate

### Install

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

### Build

```bash
pnpm build
pnpm start
```

## Quick Start

### Add a Squads multisig

1. Open `Settings`
2. Go to `Multisig registry`
3. Select a Squads-capable chain
4. Import or create the multisig

### Add a Safe

1. Open `Settings`
2. Go to `Multisig registry`
3. Select a Safe-ready chain
4. Paste either a raw Safe address or a Safe app URL

Example:

```text
https://app.safe.global/home?safe=base:0x...
```

### Export a workspace snapshot

1. Open `Settings`
2. Go to `Export and import`
3. Switch to `Export to YAML`
4. Copy the generated document

### Import a workspace snapshot

1. Open `Settings`
2. Go to `Export and import`
3. Switch to `Import from YAML`
4. Paste the snapshot
5. Follow the inline import progress state while chains, multisigs, and labels are restored

## YAML Import / Export

Snapshots include:

- chains
- multisigs
- address labels

Import behavior:

- existing items are preserved
- new chains import before multisigs
- duplicate multisigs are skipped
- Safe multisigs restore through the Safe import path
- progress is shown inline during import

## Safe Server Routes

Safe-specific reads are proxied through app routes:

- `/api/safe/import`
- `/api/safe/count`
- `/api/safe/transactions`
- `/api/safe/transaction`
- `/api/safe/payload`

This keeps browser-side provider logic smaller and avoids direct reads against endpoints that may reject cross-origin traffic.

## Architecture

```text
app/
  operations/
  proposals/
  monitoring/
  multisigs/
  settings/

components/
  operations-dashboard.tsx
  proposal-list.tsx
  monitoring-view.tsx
  multisig-list.tsx
  export-import-dialog.tsx
  chain-management-dialog.tsx
  address-label-manager-dialog.tsx
  provider-adapters-panel.tsx

lib/
  workspace/
  hooks/
  export-import.ts
  safe.ts
  squad.ts
  storage.ts

stores/
  chain-store.ts
  multisig-store.ts
  wallet-store.ts
  workspace-store.ts
```

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui + Radix primitives
- Zustand
- `@sqds/multisig`
- `@solana/web3.js`
- `viem`
- `@safe-global/api-kit`
- `@safe-global/protocol-kit`
- Vitest + Testing Library

## Development

### Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm test
pnpm format
```

### Validation

```bash
pnpm exec eslint .
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

## Operational Notes

- The app ships without seeded demo multisigs.
- Shared Safe addresses on different chains are keyed by `chain + address` to avoid identity collisions.
- Safe explorer rows preload provider metadata and unlock once the proposal stream is ready.
- External RPC or Safe transaction-service instability can still degrade Safe reads, but those states are surfaced in the UI.

## Security

Please report vulnerabilities through GitHub Security Advisories:

- [Security Advisories](https://github.com/byeongsu-hong/squad/security/advisories/new)

See [SECURITY.md](./SECURITY.md) for reporting policy.

## License

MIT
