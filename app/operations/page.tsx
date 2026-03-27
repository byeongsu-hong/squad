"use client";

import { Suspense } from "react";

import { OperationsDashboard } from "@/components/operations-dashboard";

function OperationsContent() {
  return (
    <div className="flex min-h-full flex-col">
      <OperationsDashboard />
    </div>
  );
}

export default function OperationsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-full flex-col" />}>
      <OperationsContent />
    </Suspense>
  );
}
