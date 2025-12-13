"use client";

import { Copy, Globe, LogOut, Usb, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWalletDisconnect } from "@/lib/hooks/use-wallet-disconnect";
import { useWalletStore } from "@/stores/wallet-store";

import { BrowserWalletDialog } from "./browser-wallet-dialog";
import { OkxWalletDialog } from "./okx-wallet-dialog";
import { WalletConnectDialog } from "./wallet-connect-dialog";

type DialogType = "ledger" | "browser" | "okx" | null;

export function WalletButton() {
  const [dialogOpen, setDialogOpen] = useState<DialogType>(null);
  const { connected, publicKey, walletName } = useWalletStore();
  const { disconnect } = useWalletDisconnect();

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
      toast.success("Address copied to clipboard");
    }
  };

  if (!connected || !publicKey) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default">
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Select Wallet Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDialogOpen("browser")}>
              <Globe className="mr-2 h-4 w-4" />
              Browser Wallet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialogOpen("okx")}>
              <Wallet className="mr-2 h-4 w-4" />
              OKX Wallet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialogOpen("ledger")}>
              <Usb className="mr-2 h-4 w-4" />
              Ledger Device
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <WalletConnectDialog
          open={dialogOpen === "ledger"}
          onOpenChange={(open) => setDialogOpen(open ? "ledger" : null)}
        />
        <BrowserWalletDialog
          open={dialogOpen === "browser"}
          onOpenChange={(open) => setDialogOpen(open ? "browser" : null)}
        />
        <OkxWalletDialog
          open={dialogOpen === "okx"}
          onOpenChange={(open) => setDialogOpen(open ? "okx" : null)}
        />
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Wallet className="mr-2 h-4 w-4" />
          {publicKey.toString().slice(0, 4)}...
          {publicKey.toString().slice(-4)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          {walletName ? `Connected: ${walletName}` : "Connected Wallet"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopyAddress}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnect}>
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
