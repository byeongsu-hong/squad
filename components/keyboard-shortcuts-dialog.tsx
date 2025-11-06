import { Command, Keyboard } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  {
    category: "Navigation",
    items: [
      { keys: ["Cmd/Ctrl", "K"], description: "Quick search" },
      { keys: ["G", "H"], description: "Go to home" },
      { keys: ["G", "M"], description: "Go to monitoring" },
      { keys: ["G", "P"], description: "Go to proposals" },
    ],
  },
  {
    category: "Actions",
    items: [
      { keys: ["R"], description: "Refresh current view" },
      { keys: ["Cmd/Ctrl", "E"], description: "Export to CSV" },
      { keys: ["Escape"], description: "Close dialog/Clear selection" },
    ],
  },
  {
    category: "Proposals",
    items: [
      { keys: ["A"], description: "Approve selected" },
      { keys: ["X"], description: "Reject selected" },
      { keys: ["Cmd/Ctrl", "A"], description: "Select all" },
    ],
  },
];

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your workflow with keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="mb-3 text-sm font-semibold">{section.category}</h3>
              <div className="space-y-2">
                {section.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <span className="text-sm">{item.description}</span>
                    <div className="flex gap-1">
                      {item.keys.map((key, keyIndex) => (
                        <Badge
                          key={keyIndex}
                          variant="secondary"
                          className="font-mono text-xs"
                        >
                          {key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-muted-foreground text-xs">
            Press{" "}
            <kbd className="bg-background rounded border px-1.5 py-0.5">?</kbd>{" "}
            at any time to view these shortcuts
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
