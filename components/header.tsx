"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { ChainManagementDialog } from "./chain-management-dialog";
import { ExportImportDialog } from "./export-import-dialog";
import { ThemeToggle } from "./theme-toggle";
import { WalletButton } from "./wallet-button";

export function Header() {
  const [chainDialogOpen, setChainDialogOpen] = useState(false);

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 md:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold">
            Squad<sup>2</sup>
          </Link>
          <nav className="hidden gap-6 md:flex">
            <Link
              href="/"
              className="hover:text-primary text-sm font-medium transition-colors"
            >
              Multisigs
            </Link>
            <Link
              href="/proposals"
              className="hover:text-primary text-sm font-medium transition-colors"
            >
              Proposals
            </Link>
            <Link
              href="/monitoring"
              className="hover:text-primary text-sm font-medium transition-colors"
            >
              Monitoring
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ExportImportDialog />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setChainDialogOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <WalletButton />
        </div>
      </div>
      <ChainManagementDialog
        open={chainDialogOpen}
        onOpenChange={setChainDialogOpen}
      />
    </header>
  );
}
