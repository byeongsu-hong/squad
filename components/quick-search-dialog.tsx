"use client";

import { Command, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMultisigStore } from "@/stores/multisig-store";

interface QuickSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickSearchDialog({
  open,
  onOpenChange,
}: QuickSearchDialogProps) {
  const [query, setQuery] = useState("");
  const { multisigs, selectMultisig } = useMultisigStore();
  const router = useRouter();

  const filteredMultisigs = multisigs.filter((m) => {
    const lowerQuery = query.toLowerCase();
    return (
      m.label?.toLowerCase().includes(lowerQuery) ||
      m.publicKey.toString().toLowerCase().includes(lowerQuery) ||
      m.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  });

  const handleSelect = (multisigKey: string) => {
    selectMultisig(multisigKey);
    router.push("/proposals");
    onOpenChange(false);
    setQuery("");
  };

  const navigationOptions = [
    { label: "Home", path: "/", icon: "🏠" },
    { label: "Monitoring", path: "/monitoring", icon: "📊" },
    { label: "Proposals", path: "/proposals", icon: "📝" },
  ];

  const filteredNav = navigationOptions.filter((option) =>
    option.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Search className="text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search multisigs or navigate..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-none focus-visible:ring-0"
              autoFocus
            />
          </div>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto p-2">
          {query && (
            <>
              {filteredNav.length > 0 && (
                <div className="mb-2">
                  <p className="text-muted-foreground mb-1 px-2 text-xs font-medium">
                    Navigation
                  </p>
                  {filteredNav.map((option) => (
                    <button
                      key={option.path}
                      onClick={() => {
                        router.push(option.path);
                        onOpenChange(false);
                        setQuery("");
                      }}
                      className="hover:bg-muted flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors"
                    >
                      <span className="text-xl">{option.icon}</span>
                      <span className="text-sm font-medium">
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {filteredMultisigs.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1 px-2 text-xs font-medium">
                    Multisigs
                  </p>
                  {filteredMultisigs.map((multisig) => (
                    <button
                      key={multisig.publicKey.toString()}
                      onClick={() =>
                        handleSelect(multisig.publicKey.toString())
                      }
                      className="hover:bg-muted flex w-full flex-col gap-1 rounded-lg px-3 py-2 text-left transition-colors"
                    >
                      <span className="text-sm font-medium">
                        {multisig.label || "Unnamed"}
                      </span>
                      <div className="flex items-center gap-2">
                        <code className="text-muted-foreground text-xs">
                          {multisig.publicKey.toString().slice(0, 12)}...
                        </code>
                        {multisig.tags && multisig.tags.length > 0 && (
                          <span className="text-muted-foreground text-xs">
                            • {multisig.tags.join(", ")}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {filteredNav.length === 0 && filteredMultisigs.length === 0 && (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  No results found
                </div>
              )}
            </>
          )}

          {!query && (
            <div className="text-muted-foreground py-8 text-center text-sm">
              Start typing to search...
            </div>
          )}
        </div>

        <div className="border-t px-4 py-2">
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span>Navigate with ↑ ↓</span>
            <span>Select with ↵</span>
            <span>Close with Esc</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
