import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const queueItems = [
  {
    title: "Treasury rotation",
    meta: "Safe / Ethereum",
    status: "2 of 3 signed",
    tone: "bg-lime-300",
  },
  {
    title: "Bridge limit update",
    meta: "Squads / Solana",
    status: "Waiting on reviewer",
    tone: "bg-amber-300",
  },
  {
    title: "Payroll batch",
    meta: "Safe / Base",
    status: "Ready to execute",
    tone: "bg-zinc-100",
  },
];

const points = [
  "Aggregate Squads, Safe, Solana, SVM, and EVM workflows.",
  "See what is blocked, ready, or waiting in one queue.",
  "Open the next proposal without digging through tabs.",
];

export function LandingPage() {
  return (
    <div className="relative isolate -mx-4 -my-4 min-h-[calc(100svh-4.5rem)] sm:-mx-5 md:-mx-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top_left,oklch(0.28_0.02_110/.28),transparent_32%),linear-gradient(180deg,oklch(0.18_0.012_285),transparent_72%)]" />

      <section className="mx-auto grid min-h-[calc(100svh-4.5rem)] w-full max-w-[82rem] gap-12 px-4 py-10 sm:px-5 sm:py-14 md:px-6 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-start lg:gap-16 lg:py-18">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1.5 text-[0.68rem] font-medium tracking-[0.18em] text-zinc-400 uppercase">
            <span className="h-2 w-2 rounded-full bg-lime-300" />
            Multisig Aggregator
          </div>

          <h1 className="mt-8 max-w-4xl text-[clamp(3rem,8vw,6.2rem)] font-semibold tracking-[-0.065em] text-zinc-50">
            All your multisigs, in one place.
          </h1>

          <p className="mt-5 max-w-2xl text-[1.02rem] leading-7 text-zinc-300 sm:text-[1.1rem]">
            Squad<sup>2</sup> brings Safe and Squads activity into a single
            queue so your team can review, sign, and execute without bouncing
            between dashboards.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="group rounded-full bg-zinc-100 px-6 text-zinc-950 hover:bg-white"
            >
              <Link href="/operations">
                Open Operations
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-zinc-800 bg-transparent px-6 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
            >
              <Link href="/settings">Configure Workspace</Link>
            </Button>
          </div>

          <div className="mt-10 space-y-3 border-t border-zinc-800 pt-6">
            {points.map((point) => (
              <p key={point} className="text-sm leading-6 text-zinc-400">
                {point}
              </p>
            ))}
          </div>
        </div>

        <div className="landing-panel rounded-[1.75rem] border border-zinc-800 bg-zinc-950/55 p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <p className="text-[0.68rem] font-medium tracking-[0.18em] text-zinc-500 uppercase">
                Queue Preview
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                Work surfaced across providers and chains.
              </p>
            </div>
            <span className="rounded-full border border-zinc-800 px-2.5 py-1 text-[0.68rem] text-zinc-400 uppercase">
              Live
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {queueItems.map((item) => (
              <div
                key={item.title}
                className="rounded-[1.25rem] border border-zinc-800 bg-zinc-950 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs tracking-[0.12em] text-zinc-500 uppercase">
                      {item.meta}
                    </p>
                  </div>
                  <span
                    className={`mt-1 h-2.5 w-2.5 rounded-full ${item.tone}`}
                  />
                </div>
                <p className="mt-3 text-sm text-zinc-400">{item.status}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
