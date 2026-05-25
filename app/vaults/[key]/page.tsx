"use client";

import { use } from "react";
import { useRouter } from "next/navigation";

import { MultisigList } from "@/components/multisig-list";
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
    <div className="mx-auto flex max-w-[1280px] items-start gap-0">
      {/* List pane — hidden on mobile */}
      <div className="min-w-0 flex-1 max-lg:hidden lg:pr-5">
        <MultisigList selectedKey={vaultKey} />
      </div>

      {/* Detail panel — full-screen on mobile, sticky side panel on desktop */}
      <div className="bg-background border-border flex-1 px-4 py-6 lg:flex-none lg:w-[480px] 2xl:w-[680px] lg:shrink-0 lg:border-l lg:sticky lg:top-[54px] lg:max-h-[calc(100svh-54px)] lg:overflow-y-auto">
        <VaultDetail
          vaultKey={vaultKey}
          onBack={() => router.push("/vaults")}
        />
      </div>
    </div>
  );
}
