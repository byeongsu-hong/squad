"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function ProposalsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    router.replace(query.length > 0 ? `/?${query}` : "/");
  }, [router, searchParams]);

  return null;
}

export default function ProposalsPage() {
  return (
    <Suspense fallback={null}>
      <ProposalsPageContent />
    </Suspense>
  );
}
