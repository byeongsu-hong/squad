"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

import { useMultisigStore } from "@/stores/multisig-store";

export default function VaultDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = use(params);
  const vaultKey = decodeURIComponent(key);
  const router = useRouter();
  const selectMultisig = useMultisigStore((s) => s.selectMultisig);

  useEffect(() => {
    selectMultisig(vaultKey);
    router.replace("/vaults");
  }, [vaultKey, selectMultisig, router]);

  return null;
}
