"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { WalletButton } from "@/components/wallet-button";
import { useProposalsQuery } from "@/lib/hooks/use-proposals-query";
import { useViewerAddressForMultisig } from "@/lib/hooks/use-viewer-address";
import { useWorkspaceQueue } from "@/lib/hooks/use-workspace-queue";
import { cn } from "@/lib/utils";
import { useWalletStore } from "@/stores/wallet-store";

function useNavCounts() {
  const { publicKey } = useWalletStore();
  const getViewerAddress = useViewerAddressForMultisig();
  const { proposals, workspaceMultisigs } = useProposalsQuery();

  const queueItems = useWorkspaceQueue({
    workspaceProposals: proposals,
    multisigs: workspaceMultisigs,
    viewerAddress: publicKey?.toString() ?? null,
    getViewerAddressForMultisig: (m) => getViewerAddress(m.provider),
  });

  return useMemo(() => ({
    attention: queueItems.filter(
      (i) => i.needsYourSignature || i.readyToExecute
    ).length,
  }), [queueItems]);
}

export function Header() {
  const pathname = usePathname();
  const { attention } = useNavCounts();

  return (
    <header className="border-border bg-card/90 sticky top-0 z-30 border-b backdrop-blur-md">
      <div className="flex h-[54px] w-full items-center justify-between gap-4 px-7">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-foreground text-base font-bold tracking-[-0.02em]"
          >
            Squad<sup className="text-[9px]">2</sup>
          </Link>

          <nav className="flex">
            {([
              { href: "/", label: "Operations", badge: attention },
              { href: "/vaults", label: "Vaults" },
              { href: "/settings", label: "Settings" },
            ] as const).map((item) => {
              const active =
                item.href === "/"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "-mb-px border-b-2 px-4 py-2 text-[13px] transition-colors inline-flex items-center gap-1.5",
                    active
                      ? "border-primary text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground border-transparent font-normal"
                  )}
                >
                  {item.label}
                  {"badge" in item && item.badge > 0 && (
                    <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-px text-[9px] font-semibold tabular-nums leading-none">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
