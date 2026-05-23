/**
 * Application configuration constants
 */

// Cache configuration
export const CACHE_CONFIG = {
  TTL: 30000,
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

// Pagination configuration
// Error messages
export const ERROR_MESSAGES = {
  CHAIN_NOT_FOUND: "Chain configuration not found",
  WALLET_NOT_CONNECTED: "Please connect your wallet",
  RPC_RATE_LIMIT: "RPC rate limit reached. Please wait and try again.",
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  PROPOSAL_APPROVED: "Proposal approved!",
  PROPOSAL_REJECTED: "Proposal rejected!",
  PROPOSAL_EXECUTED: "Proposal executed!",
} as const;

// Transaction discriminators
export const TRANSACTION_DISCRIMINATORS = {
  CONFIG_TRANSACTION: [94, 8, 4, 35, 113, 139, 139, 112],
  VAULT_TRANSACTION: [168, 250, 162, 100, 81, 14, 162, 207],
} as const;
