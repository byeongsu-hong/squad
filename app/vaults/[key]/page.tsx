"use client";

import { use } from "react";

import { VaultDetail } from "@/components/vault-detail";

export default function VaultDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = use(params);
  const vaultKey = decodeURIComponent(key);

  return (
    <div className="min-h-full py-6">
      <VaultDetail vaultKey={vaultKey} />
    </div>
  );
}
