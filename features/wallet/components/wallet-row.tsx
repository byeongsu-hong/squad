import { ChevronRight, Loader2, Wallet } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";

export function DetectedBadge() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Detected
    </span>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground/50 text-[11px] font-medium">
      {children}
    </p>
  );
}

export function WalletIcon({
  icon,
  name,
}: {
  icon?: string | null;
  name: string;
}) {
  const src = icon?.trim();
  if (!src) {
    return (
      <Wallet className="text-muted-foreground h-6 w-6" aria-hidden="true" />
    );
  }
  return (
    <Image
      src={src}
      alt={`${name} icon`}
      width={24}
      height={24}
      className="h-6 w-6 rounded-md object-contain"
      unoptimized
    />
  );
}

export interface WalletRowProps {
  icon: React.ReactNode;
  name: string;
  subtitle?: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function WalletRow({
  icon,
  name,
  subtitle,
  isLoading = false,
  disabled = false,
  onClick,
}: WalletRowProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className="group hover:border-primary/30 hover:bg-accent/50 h-auto w-full justify-start gap-3 rounded-xl px-4 py-3.5 transition-all"
    >
      <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium">{name}</p>
        {subtitle && (
          <p className="text-muted-foreground/60 text-xs font-normal">{subtitle}</p>
        )}
      </div>
      <div className="shrink-0">
        {isLoading ? (
          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        ) : (
          <ChevronRight className="text-muted-foreground/50 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        )}
      </div>
    </Button>
  );
}
