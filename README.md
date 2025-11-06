# Squad Multisig Manager

A modern web application for managing Squads V4 multisig wallets across multiple SVM (Solana Virtual Machine) chains.

## Features

- 🔐 **Ledger Hardware Wallet Support** - Secure transaction signing with Ledger devices
- 🌐 **Multi-Chain Support** - Manage multisigs across Solana, Soon, Eclipse, SonicSVM, Solaxy, and more
- 📝 **Proposal Management** - Create, approve, reject, and execute multisig proposals
- 📊 **Monitoring Dashboard** - View and manage proposals across all multisigs in a single table view
- 🔍 **Transaction Details** - View detailed transaction data including instructions and account keys
- ⚡ **Smart Caching** - Intelligent RPC response caching to reduce network requests and improve performance
- ⚙️ **Custom RPC Configuration** - Configure custom RPC endpoints for each chain
- 💾 **Local Storage** - All data stored locally in your browser

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Ledger device (for signing transactions)

### Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Build

```bash
# Production build
pnpm build

# Start production server
pnpm start
```

## Usage

### 1. Connect Ledger

Click "Connect Wallet" and connect your Ledger device with the Solana app installed.

### 2. Create or Import Multisig

- **Create New**: Set up a new multisig with custom threshold and members
- **Import Existing**: Import an existing multisig by address

### 3. Manage Proposals

- **Per-Multisig View**: Select a multisig from the sidebar to view its proposals
- **Monitoring Dashboard**: Use the Monitoring tab to view all proposals across all multisigs
- Approve, reject, or execute proposals inline
- Filter proposals by status (Active, Executed, Rejected, Cancelled)
- View threshold status and approval/rejection counts
- See detailed transaction data before signing

### 4. Configure Chains

Click the Settings icon to:

- Edit RPC URLs
- Add custom chains
- Update program IDs
- Reset to defaults

## Performance Optimization

### Smart Caching

The app implements an intelligent caching layer to optimize RPC requests:

- **Automatic Caching**: RPC responses are cached for 30 seconds by default
- **Cache Invalidation**: Cache is automatically cleared when:
  - Manual refresh is triggered
  - Proposals are approved, rejected, or executed
- **Pattern-Based Invalidation**: Supports invalidating related cache entries
- **TTL Management**: Configurable time-to-live for different data types

This reduces unnecessary RPC calls when switching between multisigs or refreshing proposal lists, providing a smoother user experience and reducing load on RPC endpoints.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Blockchain**: @sqds/multisig, @solana/web3.js
- **Hardware Wallet**: @ledgerhq/device-management-kit
- **Testing**: Vitest

## Project Structure

```
squad-fe/
├── app/                    # Next.js app router pages
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Feature components
├── lib/                   # Utility functions
├── stores/               # Zustand stores
├── types/                # TypeScript types
└── __tests__/            # Test files
```

## Development

```bash
# Run tests
pnpm test

# Run linter
pnpm lint

# Format code
pnpm format
```

## License

MIT
