"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { WalletButton } from "@/components/wallet-button";

export function Header() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Operations" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/88 backdrop-blur-md">
      <div className="flex h-[4rem] w-full items-center justify-between gap-4 px-4 sm:px-6 md:px-8">
        <div className="flex min-w-0 items-center gap-4 md:gap-6">
          <Link
            href="/"
            className="shrink-0 text-lg font-semibold tracking-[-0.03em] text-zinc-100"
          >
            Squad<sup>2</sup>
          </Link>

          <div className="hidden min-w-0 items-center gap-5 lg:flex">
            <nav className="flex items-center gap-5">
              {navItems.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm font-medium transition-colors ${
                      active
                        ? "text-zinc-100"
                        : "text-zinc-500 hover:text-zinc-200"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <WalletButton />
        </div>
      </div>
      <div className="border-t border-zinc-800/80 px-4 py-2 lg:hidden">
        <nav className="flex items-center gap-2">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-[0.78rem] font-medium tracking-[0.14em] uppercase transition-colors ${
                  active
                    ? "bg-zinc-100 text-zinc-950"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
