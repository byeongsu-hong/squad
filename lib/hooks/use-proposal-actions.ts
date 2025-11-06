import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/lib/config";
import { SquadService } from "@/lib/squad";
import { transactionSignerService } from "@/lib/transaction-signer";
import { useChainStore } from "@/stores/chain-store";
import { useWalletStore } from "@/stores/wallet-store";
import { WalletType, parseLedgerError } from "@/types/wallet";

interface UseProposalActionsOptions {
  onSuccess?: () => void | Promise<void>;
  skipSuccessCallback?: boolean;
}

export function useProposalActions(options: UseProposalActionsOptions = {}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { publicKey, derivationPath, walletType } = useWalletStore();
  const { chains } = useChainStore();
  const { signTransaction, connected: walletAdapterConnected } = useWallet();

  const getSquadService = useCallback(
    (chainId: string) => {
      const chain = chains.find((c) => c.id === chainId);
      if (!chain) {
        throw new Error(ERROR_MESSAGES.CHAIN_NOT_FOUND);
      }
      return {
        service: new SquadService(chain.rpcUrl, chain.squadsV4ProgramId),
        chain,
      };
    },
    [chains]
  );

  const signAndSendTransaction = useCallback(
    async (transaction: Transaction, squadService: SquadService) => {
      if (!publicKey) {
        throw new Error(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
      }

      // For browser wallets, verify signTransaction is available
      if (walletType === WalletType.BROWSER) {
        if (!walletAdapterConnected) {
          throw new Error(
            "Browser wallet is not connected via wallet adapter. Please reconnect your wallet."
          );
        }
        if (!signTransaction) {
          throw new Error(
            "Wallet does not support transaction signing. Please use a different wallet."
          );
        }
      }

      const { blockhash } = await squadService
        .getConnection()
        .getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signedTransaction = await transactionSignerService.signTransaction(
        transaction,
        {
          walletType,
          derivationPath,
          walletAdapter: signTransaction ? { signTransaction } : undefined,
        }
      );

      const txid = await squadService
        .getConnection()
        .sendRawTransaction(signedTransaction.serialize());

      await squadService.getConnection().confirmTransaction(txid);

      return txid;
    },
    [
      publicKey,
      walletType,
      derivationPath,
      signTransaction,
      walletAdapterConnected,
    ]
  );

  const approve = useCallback(
    async (
      multisigPda: PublicKey,
      transactionIndex: bigint,
      chainId: string
    ) => {
      if (!publicKey) {
        toast.error(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
        return;
      }

      const actionKey = `approve-${multisigPda.toString()}-${transactionIndex}`;
      setActionLoading(actionKey);

      try {
        const { service: squadService } = getSquadService(chainId);

        const instruction = await squadService.approveProposal({
          multisigPda,
          transactionIndex,
          member: publicKey,
        });

        const transaction = new Transaction().add(instruction);
        await signAndSendTransaction(transaction, squadService);

        toast.success(SUCCESS_MESSAGES.PROPOSAL_APPROVED);
        squadService.invalidateProposalCache(multisigPda);
        if (!options.skipSuccessCallback) {
          await options.onSuccess?.();
        }
      } catch (error) {
        console.error("Failed to approve proposal:", error);
        const errorMessage = parseLedgerError(error);
        toast.error(errorMessage);
        throw error;
      } finally {
        setActionLoading(null);
      }
    },
    [publicKey, getSquadService, signAndSendTransaction, options]
  );

  const reject = useCallback(
    async (
      multisigPda: PublicKey,
      transactionIndex: bigint,
      chainId: string
    ) => {
      if (!publicKey) {
        toast.error(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
        return;
      }

      const actionKey = `reject-${multisigPda.toString()}-${transactionIndex}`;
      setActionLoading(actionKey);

      try {
        const { service: squadService } = getSquadService(chainId);

        const instruction = await squadService.rejectProposal({
          multisigPda,
          transactionIndex,
          member: publicKey,
        });

        const transaction = new Transaction().add(instruction);
        await signAndSendTransaction(transaction, squadService);

        toast.success(SUCCESS_MESSAGES.PROPOSAL_REJECTED);
        squadService.invalidateProposalCache(multisigPda);
        if (!options.skipSuccessCallback) {
          await options.onSuccess?.();
        }
      } catch (error) {
        console.error("Failed to reject proposal:", error);
        const errorMessage = parseLedgerError(error);
        toast.error(errorMessage);
        throw error;
      } finally {
        setActionLoading(null);
      }
    },
    [publicKey, getSquadService, signAndSendTransaction, options]
  );

  const execute = useCallback(
    async (
      multisigPda: PublicKey,
      transactionIndex: bigint,
      chainId: string
    ) => {
      if (!publicKey) {
        toast.error(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
        return;
      }

      const actionKey = `execute-${multisigPda.toString()}-${transactionIndex}`;
      setActionLoading(actionKey);

      try {
        const { service: squadService } = getSquadService(chainId);

        const result = await squadService.executeProposal({
          multisigPda,
          transactionIndex,
          member: publicKey,
        });

        const instruction =
          typeof result === "object" && "instruction" in result
            ? result.instruction
            : result;

        const transaction = new Transaction().add(instruction);
        await signAndSendTransaction(transaction, squadService);

        toast.success(SUCCESS_MESSAGES.PROPOSAL_EXECUTED);
        squadService.invalidateProposalCache(multisigPda);
        if (!options.skipSuccessCallback) {
          await options.onSuccess?.();
        }
      } catch (error) {
        console.error("Failed to execute proposal:", error);
        const errorMessage = parseLedgerError(error);
        toast.error(errorMessage);
        throw error;
      } finally {
        setActionLoading(null);
      }
    },
    [publicKey, getSquadService, signAndSendTransaction, options]
  );

  return {
    approve,
    reject,
    execute,
    actionLoading,
    isActionInProgress: actionLoading !== null,
  };
}
