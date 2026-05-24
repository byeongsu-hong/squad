"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { WalletButton } from "@/components/wallet-button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/operations", label: "Operations" },
  { href: "/settings", label: "Settings" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card">
      <div className="flex h-[54px] w-full items-center justify-between gap-4 px-7">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-base font-bold tracking-[-0.02em] text-foreground"
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
                      ? "border-primary font-semibold text-foreground"
                      : "border-transparent font-normal text-muted-foreground hover:text-foreground"
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
