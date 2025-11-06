import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProposalAccount } from "@/types/multisig";

interface ProposalStatsProps {
  proposals: ProposalAccount[];
}

export function ProposalStats({ proposals }: ProposalStatsProps) {
  const stats = {
    total: proposals.length,
    active: proposals.filter((p) => p.status === "Active").length,
    executed: proposals.filter((p) => p.executed).length,
    rejected: proposals.filter((p) => p.status === "Rejected" || p.cancelled)
      .length,
  };

  const activeRate =
    stats.total > 0 ? ((stats.executed / stats.total) * 100).toFixed(1) : "0";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.active}</div>
          <Badge variant="secondary" className="mt-1">
            Pending Votes
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Executed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.executed}</div>
          <p className="text-muted-foreground text-xs">
            {activeRate}% success rate
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Rejected/Cancelled
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.rejected}</div>
        </CardContent>
      </Card>
    </div>
  );
}
