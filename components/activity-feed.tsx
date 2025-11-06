import { Check, Clock, X } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMultisigStore } from "@/stores/multisig-store";
import type { ProposalAccount } from "@/types/multisig";

interface Activity {
  id: string;
  type: "approval" | "rejection" | "execution" | "created";
  proposalIndex: string;
  multisigName: string;
  timestamp: Date;
  status: string;
}

interface ActivityFeedProps {
  proposals: ProposalAccount[];
}

export function ActivityFeed({ proposals }: ActivityFeedProps) {
  const { multisigs } = useMultisigStore();

  const activities = useMemo(() => {
    const acts: Activity[] = [];

    proposals.forEach((proposal) => {
      const multisig = multisigs.find(
        (m) => m.publicKey.toString() === proposal.multisig.toString()
      );

      if (proposal.executed) {
        acts.push({
          id: `${proposal.multisig.toString()}-${proposal.transactionIndex}-executed`,
          type: "execution",
          proposalIndex: proposal.transactionIndex.toString(),
          multisigName: multisig?.label || "Unnamed",
          timestamp: new Date(),
          status: "Executed",
        });
      }

      if (proposal.approvals.length > 0) {
        acts.push({
          id: `${proposal.multisig.toString()}-${proposal.transactionIndex}-approved`,
          type: "approval",
          proposalIndex: proposal.transactionIndex.toString(),
          multisigName: multisig?.label || "Unnamed",
          timestamp: new Date(),
          status: "Approved",
        });
      }

      if (proposal.rejections.length > 0) {
        acts.push({
          id: `${proposal.multisig.toString()}-${proposal.transactionIndex}-rejected`,
          type: "rejection",
          proposalIndex: proposal.transactionIndex.toString(),
          multisigName: multisig?.label || "Unnamed",
          timestamp: new Date(),
          status: "Rejected",
        });
      }
    });

    return acts.slice(0, 10);
  }, [proposals, multisigs]);

  if (activities.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <div className="mt-0.5">
                  {activity.type === "approval" && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                      <Check className="h-4 w-4 text-green-500" />
                    </div>
                  )}
                  {activity.type === "rejection" && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10">
                      <X className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                  {activity.type === "execution" && (
                    <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                      <Check className="text-primary h-4 w-4" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Proposal #{activity.proposalIndex}
                    </p>
                    <Badge
                      variant={
                        activity.type === "execution"
                          ? "default"
                          : activity.type === "approval"
                            ? "secondary"
                            : "destructive"
                      }
                      className="text-xs"
                    >
                      {activity.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {activity.multisigName}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {activity.timestamp.toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
