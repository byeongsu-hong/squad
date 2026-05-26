"use client";

import { Suspense } from "react";

import { MultisigList } from "@/components/multisig-list";
import { PageStage } from "@/components/page-stage";

function VaultsContent() {
  return (
    <PageStage>
      <MultisigList />
    </PageStage>
  );
}

export default function VaultsPage() {
  return (
    <Suspense fallback={<div className="min-h-full" />}>
      <VaultsContent />
    </Suspense>
  );
}
