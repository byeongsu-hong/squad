// Cache configuration
export const CACHE_CONFIG = {
  TTL: 150_000,
} as const;

// RPC configuration
export const RPC_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second (base delay)
  COMMITMENT: "confirmed",
} as const;

// UI configuration
export const UI_CONFIG = {
  DEBOUNCE_DELAY: 300,
  SKELETON_COUNT: 5,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  CHAIN_NOT_FOUND: "Chain configuration not found",
  WALLET_NOT_CONNECTED: "Connect a wallet first",
  RPC_RATE_LIMIT: "RPC rate limit reached. Try again in a moment.",
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  PROPOSAL_APPROVED: "Proposal approved",
  PROPOSAL_REJECTED: "Proposal rejected",
  PROPOSAL_EXECUTED: "Proposal executed",
} as const;

// Transaction discriminators
export const TRANSACTION_DISCRIMINATORS = {
  CONFIG_TRANSACTION: [94, 8, 4, 35, 113, 139, 139, 112],
} as const;
