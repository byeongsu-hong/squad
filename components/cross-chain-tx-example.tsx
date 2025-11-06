"use client";

import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCrossChainTransaction } from "@/lib/hooks/use-cross-chain-tx";
import { useChainStore } from "@/stores/chain-store";
import { useWalletStore } from "@/stores/wallet-store";

export function CrossChainTransactionExample() {
  const { publicKey, connected } = useWalletStore();
  const { chains } = useChainStore();
  const { executeTransaction, confirmTransaction, loading, signature } =
    useCrossChainTransaction();

  const [selectedChainId, setSelectedChainId] = useState<string>("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");

  const handleSendTransaction = async () => {
    if (!publicKey || !recipientAddress || !amount || !selectedChainId) return;

    try {
      const targetChain = chains.find((c) => c.id === selectedChainId);
      if (!targetChain) {
        throw new Error("Chain not found");
      }

      // Create a simple SOL transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(recipientAddress),
          lamports: parseFloat(amount) * LAMPORTS_PER_SOL,
        })
      );

      // Execute on target chain (blockhash will be injected automatically)
      const sig = await executeTransaction(transaction, targetChain, {
        skipPreflight: false,
        storeBeforeSend: true,
        transactionId: `transfer-${Date.now()}`,
      });

      if (sig) {
        // Optionally confirm
        await confirmTransaction(sig, targetChain, "confirmed");
      }
    } catch (error) {
      console.error("Transaction error:", error);
    }
  };

  if (!connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cross-Chain Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Connect your wallet to send transactions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cross-Chain Transaction Example</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Target Chain</Label>
          <Select value={selectedChainId} onValueChange={setSelectedChainId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a chain" />
            </SelectTrigger>
            <SelectContent>
              {chains.map((chain) => (
                <SelectItem key={chain.id} value={chain.id}>
                  {chain.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            Transaction will be signed with your wallet and sent to this chain
          </p>
        </div>

        <div className="space-y-2">
          <Label>Recipient Address</Label>
          <Input
            placeholder="Solana address"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Amount (SOL)</Label>
          <Input
            type="number"
            placeholder="0.01"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <Button
          onClick={handleSendTransaction}
          disabled={loading || !recipientAddress || !amount || !selectedChainId}
          className="w-full"
        >
          {loading ? "Sending..." : "Send Transaction"}
        </Button>

        {signature && (
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm font-medium">Transaction Signature:</p>
            <p className="font-mono text-xs break-all">{signature}</p>
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="mb-2 text-sm font-semibold">How it works:</h4>
          <ol className="text-muted-foreground space-y-1 text-xs">
            <li>1. Gets recent blockhash from target chain</li>
            <li>2. Injects blockhash into transaction</li>
            <li>3. Your wallet signs the transaction</li>
            <li>4. Sends signed transaction to target chain RPC</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
