import { useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/lib/config";
import {
  confirmSafeTransaction,
  executeSafeTransaction,
} from "@/lib/safe-client";
import { SquadService } from "@/lib/squad";
import { transactionSignerService } from "@/lib/transaction-signer";
import {
  getUnsupportedProviderMessage,
  getWorkspaceProviderAdapter,
  supportsProviderAction,
} from "@/lib/workspace/provider-adapters";
import { useChainStore } from "@/stores/chain-store";
import { useWalletStore } from "@/stores/wallet-store";
import { isOperationalSquadsChain } from "@/types/chain";
import { WalletType, parseLedgerError } from "@/types/wallet";

interface UseProposalActionsOptions {
  onSuccess?: () => void | Promise<void>;
  skipSuccessCallback?: boolean;
}

type ProposalActionType = "approve" | "reject" | "execute";

function buildActionKey(
  action: ProposalActionType,
  multisigKey: string,
  transactionIndex: bigint
) {
  return `${action}-${multisigKey}-${transactionIndex.toString()}`;
}

export function useProposalActions(options: UseProposalActionsOptions = {}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { publicKey, derivationPath, walletType, evmAddress } =
    useWalletStore();
  const { chains } = useChainStore();
  const { signTransaction, connected: walletAdapterConnected } = useWallet();

  const getSquadService = useCallback(
    (chainId: string) => {
      const chain = chains.find((c) => c.id === chainId);
      if (!chain) {
        throw new Error(ERROR_MESSAGES.CHAIN_NOT_FOUND);
      }
      const adapter = getWorkspaceProviderAdapter(
        chain.multisigProvider ?? "squads"
      );
      if (!adapter.capabilities.proposalActions) {
        throw new Error(
          getUnsupportedProviderMessage(adapter.id, "proposalActions")
        );
      }
      if (!isOperationalSquadsChain(chain)) {
        throw new Error(
          "This chain is not configured for active Squads operations yet."
        );
      }
      return {
        service: new SquadService(chain.rpcUrl, chain.squadsV4ProgramId),
        chain,
      };
    },
    [chains]
  );

  const signAndSendTransaction = useCallback(
    async (
      transaction: Transaction,
      squadService: SquadService,
      chainId: string
    ) => {
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

      // Solaxy requires V0 versioned transactions
      const isSolaxy = chainId === "solaxy-mainnet";

      if (isSolaxy) {
        // Convert to V0 versioned transaction for Solaxy
        const messageV0 = new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash: blockhash,
          instructions: transaction.instructions,
        }).compileToV0Message();

        const versionedTx = new VersionedTransaction(messageV0);

        const signedVersionedTx =
          await transactionSignerService.signVersionedTransaction(versionedTx, {
            walletType,
            derivationPath,
            walletAdapter: signTransaction ? { signTransaction } : undefined,
          });

        const txid = await squadService
          .getConnection()
          .sendRawTransaction(signedVersionedTx.serialize());

        await squadService.getConnection().confirmTransaction(txid);

        return txid;
      }

      // Standard legacy transaction for other chains
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
        await signAndSendTransaction(transaction, squadService, chainId);

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
        await signAndSendTransaction(transaction, squadService, chainId);

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
        await signAndSendTransaction(transaction, squadService, chainId);

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
    approveByAddress: async (
      multisigKey: string,
      transactionIndex: bigint,
      chainId: string
    ) => {
      const chain = chains.find((item) => item.id === chainId);
      if (!chain) {
        throw new Error(ERROR_MESSAGES.CHAIN_NOT_FOUND);
      }

      const provider = chain.multisigProvider ?? "squads";
      if (!supportsProviderAction(provider, "approve")) {
        throw new Error(
          getUnsupportedProviderMessage(provider, "proposalActions")
        );
      }

      if (provider === "safe") {
        if (!evmAddress) {
          toast.error("Connect an EVM wallet first.");
          return;
        }

        const actionKey = buildActionKey(
          "approve",
          multisigKey,
          transactionIndex
        );
        setActionLoading(actionKey);

        try {
          await confirmSafeTransaction({
            chain,
            safeAddress: multisigKey,
            signer: evmAddress,
            nonce: transactionIndex,
          });
          toast.success("Safe transaction confirmed.");
          if (!options.skipSuccessCallback) {
            await options.onSuccess?.();
          }
        } catch (error) {
          console.error("Failed to confirm Safe transaction:", error);
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to confirm Safe transaction."
          );
          throw error;
        } finally {
          setActionLoading(null);
        }
        return;
      }

      return approve(new PublicKey(multisigKey), transactionIndex, chainId);
    },
    rejectByAddress: async (
      multisigKey: string,
      transactionIndex: bigint,
      chainId: string
    ) => {
      const chain = chains.find((item) => item.id === chainId);
      if (!chain) {
        throw new Error(ERROR_MESSAGES.CHAIN_NOT_FOUND);
      }

      const provider = chain.multisigProvider ?? "squads";
      if (!supportsProviderAction(provider, "reject")) {
        const message =
          provider === "safe"
            ? "Safe does not expose a direct reject action here."
            : getUnsupportedProviderMessage(provider, "proposalActions");
        toast.error(message);
        throw new Error(message);
      }

      return reject(new PublicKey(multisigKey), transactionIndex, chainId);
    },
    executeByAddress: async (
      multisigKey: string,
      transactionIndex: bigint,
      chainId: string
    ) => {
      const chain = chains.find((item) => item.id === chainId);
      if (!chain) {
        throw new Error(ERROR_MESSAGES.CHAIN_NOT_FOUND);
      }

      const provider = chain.multisigProvider ?? "squads";
      if (!supportsProviderAction(provider, "execute")) {
        throw new Error(
          getUnsupportedProviderMessage(provider, "proposalActions")
        );
      }

      if (provider === "safe") {
        if (!evmAddress) {
          toast.error("Connect an EVM wallet first.");
          return;
        }

        const actionKey = buildActionKey(
          "execute",
          multisigKey,
          transactionIndex
        );
        setActionLoading(actionKey);

        try {
          await executeSafeTransaction({
            chain,
            safeAddress: multisigKey,
            signer: evmAddress,
            nonce: transactionIndex,
          });
          toast.success("Safe transaction submitted.");
          if (!options.skipSuccessCallback) {
            await options.onSuccess?.();
          }
        } catch (error) {
          console.error("Failed to execute Safe transaction:", error);
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to execute Safe transaction."
          );
          throw error;
        } finally {
          setActionLoading(null);
        }
        return;
      }

      return execute(new PublicKey(multisigKey), transactionIndex, chainId);
    },
    buildActionKey,
    isActionLoading: (
      action: ProposalActionType,
      multisigKey: string,
      transactionIndex: bigint
    ) =>
      actionLoading === buildActionKey(action, multisigKey, transactionIndex),
    actionLoading,
    isActionInProgress: actionLoading !== null,
  };
}
