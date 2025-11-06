import { Activity, CheckCircle2, Clock, Users } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { MultisigAccount } from "@/types/multisig";

interface MultisigStatsCardProps {
  multisig: MultisigAccount;
  activeProposals: number;
  executedProposals: number;
}

export function MultisigStatsCard({
  multisig,
  activeProposals,
  executedProposals,
}: MultisigStatsCardProps) {
  return (
    <div className="space-y-3">
      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-sm font-medium">Members</span>
          <Badge variant="secondary" className="text-base">
            {multisig.members.length}
          </Badge>
        </AlertDescription>
      </Alert>

      <Alert>
        <Activity className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-sm font-medium">Threshold</span>
          <Badge variant="secondary" className="text-base">
            {multisig.threshold}/{multisig.members.length}
          </Badge>
        </AlertDescription>
      </Alert>

      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-sm font-medium">Active Proposals</span>
          <Badge variant="default" className="text-base">
            {activeProposals}
          </Badge>
        </AlertDescription>
      </Alert>

      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-sm font-medium">Executed</span>
          <Badge variant="outline" className="text-base">
            {executedProposals}
          </Badge>
        </AlertDescription>
      </Alert>
    </div>
  );
}
