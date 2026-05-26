import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  startIndex: number;
  endIndex: number;
  totalItems: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  canGoNext,
  canGoPrevious,
  startIndex,
  endIndex,
  totalItems,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showEllipsisStart = currentPage > 3;
    const showEllipsisEnd = currentPage < totalPages - 2;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (showEllipsisStart) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (showEllipsisEnd) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-muted-foreground/60 text-[11px]">
        Showing {startIndex + 1}–{endIndex} of {totalItems}
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          className="h-9 w-9 text-foreground/80"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex min-w-max items-center gap-1 whitespace-nowrap">
            {renderPageNumbers().map((page, index) => {
              if (page === "...") {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="text-muted-foreground/60 px-2 text-[13px]"
                  >
                    …
                  </span>
                );
              }
              const isActive = currentPage === page;
              return (
                <Button
                  key={page}
                  type="button"
                  variant="outline"
                  onClick={() => onPageChange(page as number)}
                  className={cn(
                    "h-9 w-9 text-foreground/80",
                    isActive && "bg-foreground text-background pointer-events-none border-foreground hover:bg-foreground hover:text-background"
                  )}
                >
                  {page}
                </Button>
              );
            })}
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="h-9 w-9 text-foreground/80"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
