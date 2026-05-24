"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { WalletButton } from "@/components/wallet-button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/vaults", label: "Vaults" },
  { href: "/settings", label: "Settings" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-border bg-card sticky top-0 z-30 border-b">
      <div className="flex h-[54px] w-full items-center justify-between gap-4 px-7">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-foreground text-base font-bold tracking-[-0.02em]"
          >
            Squad<sup className="text-[9px]">2</sup>
          </Link>

          <nav className="flex">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "-mb-px border-b-2 px-4 py-2 text-[13px] transition-colors",
                    active
                      ? "border-primary text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground border-transparent font-normal"
                  )}
                >
                  {item.label}
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
