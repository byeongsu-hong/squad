# Squad Multisig Manager

A modern web application for managing Squads V4 multisig wallets across multiple SVM (Solana Virtual Machine) chains.

## Features

### Core Functionality

- 🔐 **Ledger Hardware Wallet Support** - Secure transaction signing with Ledger devices
- 🌐 **Multi-Chain Support** - Manage multisigs across Solana, Soon, Eclipse, SonicSVM, Solaxy, and more
- 📝 **Proposal Management** - Create, approve, reject, and execute multisig proposals
- 📊 **Monitoring Dashboard** - View and manage proposals across all multisigs in a single table view
- 🔍 **Transaction Details** - View detailed transaction data including instructions and account keys
- ⚙️ **Custom RPC Configuration** - Configure custom RPC endpoints for each chain
- 💾 **Local Storage** - All data stored locally in your browser

### Performance & UX

- ⚡ **Smart Caching** - Intelligent RPC response caching (30s TTL) to reduce network requests
- 🔍 **Debounced Search** - Optimized search with 300ms debounce for smooth filtering
- 📄 **Pagination** - Handle large proposal lists with 20 items per page
- 💪 **Optimistic Updates** - Instant UI feedback during proposal actions
- 🎨 **Loading Skeletons** - Beautiful loading states instead of spinners
- 📈 **Proposal Statistics** - Real-time stats showing active, executed, and rejected proposals

### Advanced Features

- ✅ **Batch Operations** - Approve or reject multiple proposals at once
- 🏷️ **Tagging System** - Organize multisigs with custom tags
- 📤 **CSV Export** - Export proposals and multisig data to CSV
- 🎯 **Smart Filtering** - Filter by status (🟢 Active, ✅ Executed, ❌ Rejected, 🚫 Cancelled), chain, and tags
- 🔄 **Transaction History** - View executed and cancelled proposals with default active filter
- 📦 **Import/Export** - Backup and restore multisig configurations
- 👥 **Member Management** - Propose changes to members and threshold via UI
- ✈️ **Pre-flight Checks** - Transaction validation before execution
- 👤 **User Highlighting** - See your address highlighted in transaction details
- ⌨️ **Keyboard Shortcuts** - Quick access with Cmd+K for search, Shift+? for shortcuts
- 🔎 **Quick Search** - Global search across multisigs and proposals

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

#### Per-Multisig View

- Select a multisig from the sidebar to view its proposals
- Approve, reject, or execute proposals inline
- View threshold status and approval/rejection counts
- **Sidebar Metrics**: See Members, Threshold, Active, and Executed counts in Alert badges
- View your connected wallet highlighted with "You" badge

#### Monitoring Dashboard

- View all proposals across all multisigs in a single table
- **Batch Operations**: Select multiple proposals to approve/reject at once
- **Smart Filtering**: Filter by status with emoji indicators (🟢 Active, ✅ Executed, ❌ Rejected, 🚫 Cancelled)
- **Search**: Find proposals by multisig name or address with debounced search
- **Pagination**: Navigate through large proposal lists (20 items per page)
- **Statistics**: See real-time proposal counts and success rates
- **Export**: Download proposal data to CSV for external analysis
- **Pre-flight Checks**: Transactions are validated before execution
- View detailed transaction data with your wallet highlighted

### 4. Member Management

- Open member management dialog from multisig options
- Add new members by entering their Solana address
- Remove existing members
- Update the approval threshold
- Preview changes before creating a configuration proposal

### 5. Keyboard Shortcuts

- `Cmd+K` (or `Ctrl+K`): Open quick search
- `Shift+?`: View all keyboard shortcuts
- Navigate search results with arrow keys
- Press `Enter` to select

### 6. Configure Chains

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

### UI/UX Optimizations

- **Debounced Search**: Search inputs wait 300ms before filtering to reduce unnecessary re-renders
- **Pagination**: Large lists are paginated (20 items/page) to maintain smooth scrolling
- **Loading Skeletons**: Skeleton loaders provide visual feedback during data fetching
- **Optimistic Updates**: UI updates immediately during actions, reverting only on error

These optimizations reduce unnecessary RPC calls, provide instant feedback, and ensure smooth performance even with 100+ proposals.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Blockchain**: @sqds/multisig, @solana/web3.js
- **Hardware Wallet**: @ledgerhq/device-management-kit
- **Testing**: Vitest + @testing-library/react
- **Form Validation**: Zod + React Hook Form
- **Icons**: Lucide React

## Project Structure

```
squad/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Home page (multisig list)
│   ├── monitoring/        # Monitoring dashboard
│   └── proposals/         # Proposals page
├── components/            # React components
│   ├── ui/               # shadcn/ui components (Button, Card, Alert, Badge, etc.)
│   ├── skeletons.tsx     # Loading skeleton components
│   ├── monitoring-view.tsx           # Main monitoring dashboard
│   ├── proposal-list.tsx             # Per-multisig proposal view
│   ├── proposal-stats.tsx            # Proposal statistics cards
│   ├── multisig-stats-card.tsx       # Alert/Badge based metrics
│   ├── member-management-dialog.tsx  # Member & threshold management
│   ├── keyboard-shortcuts-dialog.tsx # Shortcuts reference
│   ├── quick-search-dialog.tsx       # Global search
│   └── ...               # Feature components
├── lib/                   # Utility functions
│   ├── hooks/            # Custom React hooks
│   │   ├── use-proposal-actions.ts    # Shared proposal actions
│   │   ├── use-debounce.ts            # Debounce hook
│   │   ├── use-pagination.ts          # Pagination hook
│   │   ├── use-local-storage.ts       # localStorage hook
│   │   ├── use-clipboard.ts           # Clipboard operations
│   │   └── use-keyboard-shortcuts.ts  # Keyboard shortcut manager
│   ├── squad.ts              # SquadService (blockchain interaction)
│   ├── cache.ts              # Smart caching layer
│   ├── config.ts             # Centralized configuration
│   ├── export-csv.ts         # CSV export utilities
│   ├── transaction-simulator.ts  # Pre-flight checks
│   └── validation.ts         # Zod schemas & validators
├── stores/               # Zustand stores
│   ├── chain-store.ts    # Chain configuration
│   ├── multisig-store.ts # Multisig management
│   └── wallet-store.ts   # Wallet state
├── types/                # TypeScript types
│   ├── multisig.ts       # Multisig & Proposal types
│   ├── chain.ts          # Chain types
│   └── wallet.ts         # Wallet types
└── __tests__/            # Test files (58 tests)
    └── lib/              # Library tests
        ├── hooks/        # Hook tests
        ├── cache.test.ts
        ├── export-csv.test.ts
        └── validation.test.ts
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
