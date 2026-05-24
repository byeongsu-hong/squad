"use client";

import { Suspense } from "react";

import { MultisigList } from "@/components/multisig-list";
import { VaultDetail } from "@/components/vault-detail";
import { cn } from "@/lib/utils";
import { useMultisigStore } from "@/stores/multisig-store";

function VaultsContent() {
  const { selectedMultisigKey, selectMultisig } = useMultisigStore();

  return (
    <div className="flex items-start gap-0">
      {/* List pane — hidden on mobile when detail is open */}
      <div className={cn("min-w-0 flex-1", selectedMultisigKey && "max-lg:hidden")}>
        <div className="mx-auto max-w-[1200px]">
          <MultisigList splitPane />
        </div>
      </div>

      {/* Detail panel — full-screen on mobile, sticky side panel on desktop */}
      {selectedMultisigKey && (
        <div className="bg-card border-border flex-1 px-4 py-6 lg:flex-none lg:w-[44%] lg:min-w-[400px] lg:border-l lg:sticky lg:top-[54px] lg:max-h-[calc(100svh-54px)] lg:overflow-y-auto">
          <VaultDetail
            vaultKey={selectedMultisigKey}
            onBack={() => selectMultisig(null)}
          />
        </div>
      )}
    </div>
  );
}

export default function VaultsPage() {
  return (
    <Suspense fallback={<div className="min-h-full" />}>
      <VaultsContent />
    </Suspense>
  );
}
