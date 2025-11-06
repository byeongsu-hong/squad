import { Filter, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChainConfig } from "@/types/chain";

interface ProposalFiltersProps {
  statusFilter: string;
  chainFilter: string;
  tagFilter: string;
  onStatusChange: (value: string) => void;
  onChainChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onClearFilters: () => void;
  chains: ChainConfig[];
  availableTags: string[];
  activeFilterCount: number;
}

export function ProposalFilters({
  statusFilter,
  chainFilter,
  tagFilter,
  onStatusChange,
  onChainChange,
  onTagChange,
  onClearFilters,
  chains,
  availableTags,
  activeFilterCount,
}: ProposalFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Filter className="h-4 w-4" />
        <span>Filters:</span>
      </div>

      <Select value={chainFilter} onValueChange={onChainChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Chains" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Chains</SelectItem>
          {chains.map((chain) => (
            <SelectItem key={chain.id} value={chain.id}>
              {chain.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status Filter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">🟢 Active</SelectItem>
          <SelectItem value="executed">✅ Executed</SelectItem>
          <SelectItem value="rejected">❌ Rejected</SelectItem>
          <SelectItem value="cancelled">🚫 Cancelled</SelectItem>
        </SelectContent>
      </Select>

      {availableTags.length > 0 && (
        <Select value={tagFilter} onValueChange={onTagChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {availableTags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="gap-1"
        >
          <X className="h-3 w-3" />
          Clear
          <Badge variant="secondary" className="ml-1 h-5 w-5 p-0">
            {activeFilterCount}
          </Badge>
        </Button>
      )}
    </div>
  );
}
