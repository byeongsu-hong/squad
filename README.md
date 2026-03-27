# Squad Multisig Workspace

Local-first multisig operations workspace for mixed-provider teams.

The app currently supports:

- `SVM / Squads` multisigs for full proposal operations
- `EVM / Safe` multisigs for registry management, proposal review, and provider-aware actions
- Dense operator workflows across `Operations`, `Proposals`, `Monitoring`, and `Settings`

Everything user-defined is stored in the browser. Chain definitions, registry entries, address labels, and YAML snapshots live in local storage unless you export them.

## What The App Does

### Operations Workspace

- Registry explorer with chain, tag, and view-based grouping
- Focused proposal review workspace
- Queue filtering for `All`, `Waiting`, and `Executable`
- Mixed-provider proposal rows with provider/runtime badges
- Safe-aware loading states and unsupported-state handling

### Proposal Review

- Per-multisig proposal desk
- Payload/detail review surface
- Address labels and copyable address chips
- Created-at timestamps and queue ordering
- Keyboard-driven navigation and global search

### Monitoring

- Cross-multisig proposal table
- Batch review and action flows
- CSV export
- Mixed-provider summaries with provider-aware gating

### Settings

- Chain configuration management
- Multisig registry management
- YAML export/import
- Address label management
- Provider adapter readiness for Safe infrastructure

## Provider Support

### Squads

Current Squads support includes:

- multisig import
- proposal loading
- approve / reject / execute
- member and threshold change flows
- proposal payload review

### Safe

Current Safe support includes:

- Safe address import from raw address or `app.safe.global` URL
- provider-aware registry rows and settings management
- proposal loading through server-side routes
- payload/detail review
- proposal summary loading in explorer and operations queue
- provider-aware confirm / execute flow

Notes:

- Safe reads are routed through Next.js server endpoints to avoid browser-side CORS problems.
- Safe proposal availability still depends on external RPC and Safe transaction service health.

## Key Product Behavior

### Local-first storage

The app stores the following locally:

- chain definitions
- multisig registry entries
- address labels
- wallet metadata used by the UI

No hosted backend is required for basic usage.

### YAML import/export

YAML snapshots include chains, multisigs, and address labels.

Import behavior:

- existing items are preserved
- new chains import before multisigs
- duplicate multisigs are skipped
- Safe multisigs restore through the Safe import API path
- import progress is shown inline during restore

### Safe infrastructure

Safe-specific reads are proxied through app routes such as:

- `/api/safe/import`
- `/api/safe/count`
- `/api/safe/transactions`
- `/api/safe/transaction`
- `/api/safe/payload`

This keeps provider integration on the server boundary and avoids direct browser calls to RPC or transaction-service endpoints when that would fail due to network policy.

## Routes

- `/` landing and primary entry
- `/operations` operations workspace
- `/proposals` proposal review desk
- `/monitoring` monitoring table
- `/multisigs` multisig-focused workspace
- `/settings` admin and registry configuration

## Getting Started

### Prerequisites

- Node.js 18+
- `pnpm`
- A Solana wallet and/or browser-injected EVM wallet depending on the provider you operate

### Install

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

### Production build

```bash
pnpm build
pnpm start
```

## Common Workflows

### Add a Squads multisig

1. Open `Settings`
2. Go to `Multisig registry`
3. Choose the target Squads chain
4. Import or create the multisig

### Add a Safe

1. Open `Settings`
2. Go to `Multisig registry`
3. Choose a Safe-ready chain
4. Paste a Safe address or a Safe app URL such as:
   - `https://app.safe.global/home?safe=base:0x...`
5. Save the imported multisig

### Review proposals

1. Open `Operations`
2. Select a multisig or grouped scope from the registry explorer
3. Filter the queue if needed
4. Inspect the proposal in the focus workspace
5. Execute provider-supported actions from the action rail

### Export a workspace snapshot

1. Open `Settings`
2. Go to `Export and import`
3. Switch to `Export to YAML`
4. Copy the generated YAML or store it externally

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

Typical validation flow:

```bash
pnpm exec eslint .
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

## Tech Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS
- shadcn/ui + Radix primitives
- Zustand
- `@sqds/multisig`
- `@solana/web3.js`
- `viem`
- `@safe-global/api-kit`
- `@safe-global/protocol-kit`
- Vitest + Testing Library

## Project Structure

```text
app/
  layout.tsx
  page.tsx
  operations/page.tsx
  proposals/page.tsx
  monitoring/page.tsx
  multisigs/page.tsx
  settings/page.tsx

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
  hooks/
  workspace/
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

## Operational Notes

- The app ships without seeded demo multisigs.
- Safe explorer rows preload proposal metadata and become actionable once provider data is ready.
- Shared Safe addresses on different chains are keyed by chain plus address to avoid collisions.
- External RPC and Safe transaction service instability can still degrade Safe loading, but the UI now surfaces those states explicitly.

## Security

Please report vulnerabilities through GitHub Security Advisories:

- [Security Advisories](https://github.com/byeongsu-hong/squad/security/advisories/new)

See [SECURITY.md](./SECURITY.md) for reporting policy.

## License

MIT
