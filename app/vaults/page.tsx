"use client";

import { Suspense } from "react";

import { AddMultisigActions } from "@/components/add-multisig-actions";
import { MultisigList } from "@/components/multisig-list";

function VaultsContent() {
  return (
    <div className="min-h-full space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-[-0.02em]">
            Vaults
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Your multisig registry
          </p>
        </div>
        <AddMultisigActions />
      </div>
      <MultisigList />
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
