"use client";

import { useRouter } from "next/navigation";
import { use } from "react";

import { MultisigList } from "@/components/multisig-list";
import { PageStage } from "@/components/page-stage";
import { VaultDetail } from "@/components/vault-detail";

export default function VaultDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = use(params);
  const vaultKey = decodeURIComponent(key);
  const router = useRouter();

  return (
    <PageStage
      width="wide"
      className="lg:min-h-[calc(100svh-7.5rem)] lg:pb-[8svh]"
    >
      <div className="flex w-full items-start gap-0">
        {/* List pane — hidden on mobile */}
        <div className="min-w-0 flex-1 max-lg:hidden lg:pr-5">
          <MultisigList selectedKey={vaultKey} />
        </div>

        {/* Detail panel — full-screen on mobile, sticky side panel on desktop */}
        <div
          key={vaultKey}
          className="animate-in fade-in-0 slide-in-from-right-4 bg-background border-border flex-1 px-4 py-6 duration-300 ease-out motion-reduce:animate-none lg:sticky lg:top-[54px] lg:max-h-[calc(100svh-54px)] lg:w-[480px] lg:flex-none lg:shrink-0 lg:overflow-y-auto lg:border-l 2xl:w-[680px]"
        >
          <VaultDetail
            vaultKey={vaultKey}
            onBack={() => router.push("/vaults")}
          />
        </div>
      </div>
    </PageStage>
  );
}
