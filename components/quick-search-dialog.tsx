"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useWorkspaceMultisigs } from "@/lib/hooks/use-workspace-multisigs";
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
  const [activeIndex, setActiveIndex] = useState(0);
  const { selectMultisig } = useMultisigStore();
  const { workspaceMultisigs } = useWorkspaceMultisigs();
  const router = useRouter();

  const filteredMultisigs = workspaceMultisigs.filter((m) => {
    const lowerQuery = query.toLowerCase();
    return (
      m.label?.toLowerCase().includes(lowerQuery) ||
      m.address.toLowerCase().includes(lowerQuery) ||
      m.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  });

  const handleSelect = (multisigKey: string) => {
    selectMultisig(multisigKey);
    router.push(`/?multisig=${multisigKey}`);
    onOpenChange(false);
    setQuery("");
  };

  const navigationOptions = [{ label: "Operations", path: "/", icon: "◌" }];

  const filteredNav = navigationOptions.filter((option) =>
    option.label.toLowerCase().includes(query.toLowerCase())
  );

  const combinedResults = [
    ...filteredNav.map((option) => ({
      id: `nav-${option.path}`,
      kind: "nav" as const,
      label: option.label,
      sublabel: "Navigation",
      onSelect: () => {
        router.push(option.path);
        onOpenChange(false);
        setQuery("");
        setActiveIndex(0);
      },
    })),
    ...filteredMultisigs.map((multisig) => ({
      id: `multisig-${multisig.key}`,
      kind: "multisig" as const,
      label: multisig.label || "Unnamed",
      sublabel: [
        multisig.chainName,
        `${multisig.key.slice(0, 12)}...`,
        `${multisig.address.slice(0, 12)}...`,
        ...(multisig.tags.length > 0 ? [multisig.tags.join(", ")] : []),
      ].join(" • "),
      onSelect: () => handleSelect(multisig.key),
    })),
  ];

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (combinedResults.length === 0) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % combinedResults.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        current === 0 ? combinedResults.length - 1 : current - 1
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      combinedResults[activeIndex]?.onSelect();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onOpenChange(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (nextOpen) {
          setQuery("");
          setActiveIndex(0);
        }
      }}
    >
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Search className="text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search multisigs or navigate..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              className="border-none text-sm focus-visible:ring-2"
              autoFocus
              role="combobox"
              aria-label="Quick search"
              aria-expanded={combinedResults.length > 0}
              aria-controls="quick-search-results"
              aria-activedescendant={combinedResults[activeIndex]?.id}
            />
          </div>
        </DialogHeader>

        <div
          id="quick-search-results"
          className="max-h-[400px] overflow-y-auto p-2"
          role="listbox"
        >
          {query && (
            <>
              {filteredNav.length > 0 && (
                <div className="mb-2">
                  <p className="text-muted-foreground mb-1 px-2 text-[0.72rem] font-medium tracking-[0.14em] uppercase">
                    Navigation
                  </p>
                  {filteredNav.map((option) => (
                    <button
                      id={`nav-${option.path}`}
                      key={option.path}
                      onClick={() => {
                        router.push(option.path);
                        onOpenChange(false);
                        setQuery("");
                      }}
                      className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        combinedResults[activeIndex]?.id ===
                        `nav-${option.path}`
                          ? "bg-zinc-900 text-zinc-50"
                          : "hover:bg-muted"
                      }`}
                      role="option"
                      aria-selected={
                        combinedResults[activeIndex]?.id ===
                        `nav-${option.path}`
                      }
                    >
                      <span className="text-xl">{option.icon}</span>
                      <span className="text-sm font-medium tracking-[-0.01em]">
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {filteredMultisigs.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1 px-2 text-[0.72rem] font-medium tracking-[0.14em] uppercase">
                    Multisigs
                  </p>
                  {filteredMultisigs.map((multisig) => (
                    <button
                      id={`multisig-${multisig.key}`}
                      key={multisig.key}
                      onClick={() => handleSelect(multisig.key)}
                      className={`flex min-h-11 w-full flex-col gap-1 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        combinedResults[activeIndex]?.id ===
                        `multisig-${multisig.key}`
                          ? "bg-zinc-900 text-zinc-50"
                          : "hover:bg-muted"
                      }`}
                      role="option"
                      aria-selected={
                        combinedResults[activeIndex]?.id ===
                        `multisig-${multisig.key}`
                      }
                    >
                      <span className="text-sm font-medium tracking-[-0.01em]">
                        {multisig.label || "Unnamed"}
                      </span>
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <code className="text-muted-foreground max-w-full truncate font-mono text-xs tabular-nums">
                          {multisig.address.slice(0, 12)}...
                        </code>
                        <span className="text-muted-foreground text-xs">
                          • {multisig.chainName}
                        </span>
                        {multisig.tags.length > 0 && (
                          <span className="text-muted-foreground min-w-0 text-xs break-words">
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
          <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
            <span>Type to filter</span>
            <span>Move with ↑ ↓</span>
            <span>Open with Enter</span>
            <span>Close with Esc</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
