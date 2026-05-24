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
    setSettingsActiveSection("multisigs");
    router.push("/settings?section=multisigs");
  };

  return (
    <Button
      variant={compact ? "ghost" : "outline"}
      size={compact ? "sm" : "default"}
      className={
        compact
          ? "border-border bg-card text-foreground hover:bg-muted h-8 rounded-md border"
          : "border-border text-foreground hover:bg-muted rounded-md bg-transparent"
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
