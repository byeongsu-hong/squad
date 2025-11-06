import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

/**
 * Zod schemas for form validation and input sanitization
 */

// Label validation
export const labelSchema = z
  .string()
  .min(1, "Label cannot be empty")
  .max(100, "Label must be less than 100 characters")
  .regex(
    /^[a-zA-Z0-9\s\-_\.]+$/,
    "Label can only contain letters, numbers, spaces, hyphens, underscores, and periods"
  )
  .transform((val) => val.trim().replace(/\s+/g, " ")); // Sanitize: trim and collapse spaces

// Public key validation
export const publicKeySchema = z
  .string()
  .min(1, "Public key is required")
  .refine(
    (val) => {
      try {
        new PublicKey(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Invalid Solana public key format" }
  );

// RPC URL validation
export const rpcUrlSchema = z
  .string()
  .min(1, "RPC URL is required")
  .url("Invalid URL format")
  .refine(
    (val) => {
      try {
        const url = new URL(val);
        // Must be HTTPS or WSS for security (except localhost for development)
        if (url.protocol !== "https:" && url.protocol !== "wss:") {
          if (
            url.hostname === "localhost" ||
            url.hostname === "127.0.0.1" ||
            url.hostname.endsWith(".local")
          ) {
            return true; // Allow HTTP for localhost in development
          }
          return false;
        }
        return true;
      } catch {
        return false;
      }
    },
    { message: "RPC URL must use HTTPS or WSS protocol for security" }
  )
  .transform((val) => val.trim());

// Chain ID validation
export const chainIdSchema = z
  .string()
  .min(1, "Chain ID is required")
  .regex(
    /^[a-z0-9-]+$/,
    "Chain ID can only contain lowercase letters, numbers, and hyphens"
  );

// Chain name validation
export const chainNameSchema = z
  .string()
  .min(1, "Chain name is required")
  .max(50, "Chain name must be less than 50 characters")
  .transform((val) => val.trim());

// Program ID validation (same as public key)
export const programIdSchema = publicKeySchema;

// Threshold validation (contextual - needs member count)
export const createThresholdSchema = (memberCount: number) =>
  z
    .number()
    .int("Threshold must be an integer")
    .min(1, "Threshold must be at least 1")
    .max(memberCount, "Threshold cannot exceed number of members");

// Member validation for multisig
export const memberSchema = z.object({
  key: publicKeySchema,
  permissions: z.object({
    mask: z
      .number()
      .int()
      .min(0)
      .max(255, "Permission mask must be between 0 and 255"),
  }),
});

// Create multisig form schema
export const createMultisigSchema = z
  .object({
    label: labelSchema.optional(),
    threshold: z.number().int().min(1),
    members: z.array(memberSchema).min(1, "At least one member is required"),
    timeLock: z.number().int().min(0).optional(),
    chainId: chainIdSchema,
  })
  .refine((data) => data.threshold <= data.members.length, {
    message: "Threshold cannot exceed number of members",
    path: ["threshold"],
  });

// Import multisig form schema
export const importMultisigSchema = z.object({
  address: publicKeySchema,
  label: labelSchema.optional(),
});

// Chain configuration schema
export const chainConfigSchema = z.object({
  id: chainIdSchema,
  name: chainNameSchema,
  rpcUrl: rpcUrlSchema,
  programId: programIdSchema,
  isCustom: z.boolean().optional(),
});

// Update chain schema
export const updateChainSchema = chainConfigSchema.partial().required({
  id: true,
});

// Multisig label update schema
export const updateMultisigLabelSchema = z.object({
  publicKey: publicKeySchema,
  label: labelSchema,
});

/**
 * Helper function to safely parse and validate data
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const firstError = result.error.issues[0];
      return {
        success: false,
        error: firstError?.message || "Validation failed",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Validation failed",
    };
  }
}

/**
 * Rate limiter for client-side operations (XSS/DoS protection)
 */
export class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly timeWindow: number;

  constructor(maxRequests: number, timeWindowMs: number) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindowMs;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(
      (timestamp) => now - timestamp < this.timeWindow
    );

    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }

    return false;
  }

  getTimeUntilNextRequest(): number {
    if (this.requests.length < this.maxRequests) {
      return 0;
    }

    const oldestRequest = this.requests[0];
    const timeElapsed = Date.now() - oldestRequest;
    return Math.max(0, this.timeWindow - timeElapsed);
  }

  reset(): void {
    this.requests = [];
  }
}

/**
 * Sanitize text content to prevent XSS
 * React escapes by default, but this provides extra safety for edge cases
 */
export function sanitizeText(text: string): string {
  // Remove any control characters
  return text.replace(/[\x00-\x1F\x7F]/g, "");
}

/**
 * Validate and sanitize a derivation path
 */
export const derivationPathSchema = z
  .string()
  .regex(
    /^[0-9'\/]+$/,
    "Derivation path can only contain numbers, apostrophes, and slashes"
  )
  .refine(
    (path) => {
      // Basic BIP44 path validation
      const parts = path.split("/");
      return parts.length >= 3 && parts.length <= 6;
    },
    { message: "Invalid derivation path format" }
  );

/**
 * Validate a public key address
 */
export function validatePublicKey(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate SOL amount
 */
export function validateSolAmount(amount: string): boolean {
  try {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && num < 1_000_000_000; // Max 1 billion SOL
  } catch {
    return false;
  }
}
