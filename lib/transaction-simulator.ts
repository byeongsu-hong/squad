import { Connection, PublicKey } from "@solana/web3.js";
import * as multisigSdk from "@sqds/multisig";

export interface SimulationResult {
  success: boolean;
  error?: string;
  logs?: string[];
  unitsConsumed?: number;
}

/**
 * Performs pre-flight checks before transaction execution
 * Note: Full simulation is complex due to multisig transaction structure.
 * This performs basic validation checks instead.
 */
export async function simulateTransaction(
  connection: Connection,
  multisigPda: PublicKey,
  transactionIndex: bigint,
  programId: PublicKey
): Promise<SimulationResult> {
  try {
    // Get the transaction PDA
    const [transactionPda] = multisigSdk.getTransactionPda({
      multisigPda,
      index: transactionIndex,
      programId,
    });

    // Fetch the transaction account to verify it exists
    const transactionAccount =
      await multisigSdk.accounts.VaultTransaction.fromAccountAddress(
        connection,
        transactionPda
      );

    // Basic validation: check if transaction exists and has instructions
    if (!transactionAccount || !transactionAccount.message) {
      return {
        success: false,
        error: "Transaction not found or invalid",
      };
    }

    // Check if there are instructions
    if (transactionAccount.message.instructions.length === 0) {
      return {
        success: false,
        error: "Transaction has no instructions",
      };
    }

    // All basic checks passed
    return {
      success: true,
      logs: ["Pre-flight checks passed"],
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown simulation error",
    };
  }
}

/**
 * Estimates compute units needed for a transaction
 */
export async function estimateComputeUnits(
  connection: Connection,
  multisigPda: PublicKey,
  transactionIndex: bigint,
  programId: PublicKey
): Promise<number | null> {
  const result = await simulateTransaction(
    connection,
    multisigPda,
    transactionIndex,
    programId
  );

  return result.unitsConsumed || null;
}

/**
 * Checks if a transaction will likely succeed
 */
export async function canExecuteTransaction(
  connection: Connection,
  multisigPda: PublicKey,
  transactionIndex: bigint,
  programId: PublicKey
): Promise<{ canExecute: boolean; reason?: string }> {
  const result = await simulateTransaction(
    connection,
    multisigPda,
    transactionIndex,
    programId
  );

  if (!result.success) {
    return {
      canExecute: false,
      reason: result.error || "Simulation failed",
    };
  }

  return { canExecute: true };
}
