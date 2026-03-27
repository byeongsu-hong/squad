"use client";

import { Suspense } from "react";

import { OperationsDashboard } from "@/components/operations-dashboard";

function HomeContent() {
  return (
    <div className="flex min-h-full flex-col">
      <OperationsDashboard />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex min-h-full flex-col" />}>
      <HomeContent />
    </Suspense>
  );
}
