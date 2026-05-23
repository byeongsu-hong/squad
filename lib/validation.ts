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

const memberSchema = z.object({
  key: publicKeySchema,
  permissions: z.object({
    mask: z.number().int().min(0).max(255),
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
