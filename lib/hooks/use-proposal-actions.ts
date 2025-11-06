import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/lib/config";
import { SquadService } from "@/lib/squad";
import { transactionSignerService } from "@/lib/transaction-signer";
import { useChainStore } from "@/stores/chain-store";
import { useWalletStore } from "@/stores/wallet-store";
import { parseLedgerError } from "@/types/wallet";

interface UseProposalActionsOptions {
  onSuccess?: () => void | Promise<void>;
}

export function useProposalActions(options: UseProposalActionsOptions = {}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { publicKey, derivationPath, walletType } = useWalletStore();
  const { chains } = useChainStore();
  const wallet = useWallet();

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
          walletAdapter: wallet.signTransaction
            ? { signTransaction: wallet.signTransaction.bind(wallet) }
            : undefined,
        }
      );

      const txid = await squadService
        .getConnection()
        .sendRawTransaction(signedTransaction.serialize());

      await squadService.getConnection().confirmTransaction(txid);

      return txid;
    },
    [publicKey, walletType, derivationPath, wallet]
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
        await options.onSuccess?.();
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
        await options.onSuccess?.();
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
        await options.onSuccess?.();
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
