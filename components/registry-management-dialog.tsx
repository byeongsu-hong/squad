"use client";

import { LayoutPanelLeft, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspace-store";

interface RegistryManagementDialogProps {
  compact?: boolean;
}

export function RegistryManagementDialog({
  compact = false,
}: RegistryManagementDialogProps) {
  const router = useRouter();
  const setSettingsActiveSection = useWorkspaceStore(
    (state) => state.setSettingsActiveSection
  );

  const handleOpenSettings = () => {
    setSettingsActiveSection("registry");
    router.push("/settings?section=registry");
  };

  return (
    <button
      type="button"
      onClick={handleOpenSettings}
      className={cn(
        "inline-flex items-center gap-2 rounded-md transition-colors",
        compact
          ? "border-border bg-card text-foreground hover:bg-muted h-8 border px-3 text-sm"
          : "border-border text-foreground hover:bg-muted h-9 border bg-transparent px-4 text-sm"
      )}
    >
      {compact ? (
        <LayoutPanelLeft className="h-4 w-4" />
      ) : (
        <Settings2 className="h-4 w-4" />
      )}
      {compact ? "Manage" : "Open Registry Settings"}
    </button>
  );
}
