"use client";

import { Suspense } from "react";

import { MultisigList } from "@/components/multisig-list";

function VaultsContent() {
  return (
    <div className="flex min-h-[calc(100svh-54px)] flex-col justify-center py-6">
      <div className="mx-auto w-full max-w-3xl">
        <MultisigList />
      </div>
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
