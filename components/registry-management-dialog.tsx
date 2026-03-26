"use client";

import { LayoutPanelLeft, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
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
    <Button
      variant={compact ? "ghost" : "outline"}
      size={compact ? "sm" : "default"}
      className={
        compact
          ? "h-8 rounded-md border border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
          : "rounded-md border-zinc-800 bg-transparent text-zinc-200 hover:bg-zinc-900"
      }
      onClick={handleOpenSettings}
    >
      {compact ? (
        <LayoutPanelLeft className="h-4 w-4" />
      ) : (
        <Settings2 className="h-4 w-4" />
      )}
      {compact ? "Manage" : "Open Registry Settings"}
    </Button>
  );
}
