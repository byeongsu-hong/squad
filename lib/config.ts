/**
 * Application configuration constants
 */

// Cache configuration
export const CACHE_CONFIG = {
  TTL: 30000, // 30 seconds
  PROPOSAL_CACHE_KEY: "proposals",
  MULTISIG_CACHE_KEY: "multisigs",
} as const;

// RPC configuration
export const RPC_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second (base delay)
  COMMITMENT: "confirmed",
} as const;

// UI configuration
export const UI_CONFIG = {
  DEBOUNCE_DELAY: 300, // milliseconds
  TOAST_DURATION: 3000,
  SKELETON_COUNT: 5,
} as const;

// Pagination configuration
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

// Transaction configuration
export const TX_CONFIG = {
  CONFIRMATION_TIMEOUT: 60000, // 60 seconds
} as const;

// Error messages
export const ERROR_MESSAGES = {
  CHAIN_NOT_FOUND: "Chain configuration not found",
  MULTISIG_NOT_FOUND: "Multisig not found",
  WALLET_NOT_CONNECTED: "Please connect your wallet",
  NOT_A_MEMBER: "You are not a member of this multisig",
  ALREADY_APPROVED: "You have already approved this proposal",
  ALREADY_REJECTED: "You have already rejected this proposal",
  LOAD_PROPOSALS_FAILED: "Failed to load proposals",
  APPROVE_FAILED: "Failed to approve proposal",
  REJECT_FAILED: "Failed to reject proposal",
  EXECUTE_FAILED: "Failed to execute proposal",
  CREATE_PROPOSAL_FAILED: "Failed to create proposal",
  INVALID_ADDRESS: "Invalid Solana address",
  INVALID_AMOUNT: "Invalid amount",
  INSUFFICIENT_BALANCE: "Insufficient balance",
  NETWORK_ERROR: "Network error. Please try again.",
  RPC_RATE_LIMIT: "RPC rate limit reached. Please wait and try again.",
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  PROPOSAL_APPROVED: "Proposal approved!",
  PROPOSAL_REJECTED: "Proposal rejected!",
  PROPOSAL_EXECUTED: "Proposal executed!",
  PROPOSAL_CREATED: "Proposal created successfully!",
  LABEL_UPDATED: "Label updated",
  ADDRESS_COPIED: "Address copied",
  DATA_EXPORTED: "Data exported successfully",
} as const;

// Transaction discriminators
export const TRANSACTION_DISCRIMINATORS = {
  CONFIG_TRANSACTION: [94, 8, 4, 35, 113, 139, 139, 112],
  VAULT_TRANSACTION: [168, 250, 162, 100, 81, 14, 162, 207],
} as const;
