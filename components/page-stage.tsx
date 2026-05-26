import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type PageStageWidth = "default" | "settings" | "wide";

interface PageStageProps extends ComponentPropsWithoutRef<"div"> {
  width?: PageStageWidth;
}

const widthClassName: Record<PageStageWidth, string> = {
  default: "max-w-3xl",
  settings: "max-w-5xl",
  wide: "max-w-[1280px]",
};

export function PageStage({
  children,
  className,
  width = "default",
  ...props
}: PageStageProps) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-[calc(100svh-7.5rem)] w-full flex-col justify-center pb-[10svh]",
        widthClassName[width],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
