"use client";

import { Suspense } from "react";

import { MultisigList } from "@/components/multisig-list";

function VaultsContent() {
  return (
    <div className="mx-auto max-w-[1200px]">
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
