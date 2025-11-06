import { PublicKey } from "@solana/web3.js";
import { ReactNode } from "react";

export interface ConfigAction {
  __kind: string;
  [key: string]: unknown;
}

export interface FormattedConfigAction {
  type: string;
  summary: string;
  fields: { label: string; value: string | ReactNode }[];
}

export function formatConfigAction(
  action: ConfigAction
): FormattedConfigAction {
  const type = action.__kind || "Unknown";

  switch (type) {
    case "AddMember": {
      const member = action as unknown as {
        newMember: { key: unknown; permissions?: { mask: number } };
      };
      const memberKey = String(member.newMember?.key || "Unknown");
      const isValidAddress =
        memberKey.length >= 32 &&
        memberKey.length <= 44 &&
        memberKey !== "Unknown";

      return {
        type: "Add Member",
        summary: `Add member ${isValidAddress ? `${memberKey.slice(0, 8)}...` : memberKey}`,
        fields: [
          {
            label: "Member Address",
            value: memberKey,
          },
          {
            label: "Permissions",
            value: String(member.newMember?.permissions?.mask ?? "Default"),
          },
        ],
      };
    }

    case "RemoveMember": {
      const member = action as unknown as { oldMember: unknown };
      const memberKey = String(member.oldMember || "Unknown");
      const isValidAddress =
        memberKey.length >= 32 &&
        memberKey.length <= 44 &&
        memberKey !== "Unknown";

      return {
        type: "Remove Member",
        summary: `Remove member ${isValidAddress ? `${memberKey.slice(0, 8)}...` : memberKey}`,
        fields: [
          {
            label: "Member Address",
            value: memberKey,
          },
        ],
      };
    }

    case "ChangeThreshold": {
      const threshold = action as unknown as { newThreshold: number };
      return {
        type: "Change Threshold",
        summary: `Set threshold to ${threshold.newThreshold ?? "Unknown"}`,
        fields: [
          {
            label: "New Threshold",
            value: String(threshold.newThreshold ?? "Unknown"),
          },
        ],
      };
    }

    case "SetTimeLock": {
      const timeLock = action as unknown as { timeLock: number };
      return {
        type: "Set Time Lock",
        summary: `Set time lock to ${timeLock.timeLock ?? "Unknown"}s`,
        fields: [
          {
            label: "Time Lock (seconds)",
            value: String(timeLock.timeLock ?? "Unknown"),
          },
        ],
      };
    }

    case "AddSpendingLimit": {
      return {
        type: "Add Spending Limit",
        summary: "Add spending limit",
        fields: Object.entries(action)
          .filter(([key]) => key !== "__kind")
          .map(([key, value]) => ({
            label: key.replace(/([A-Z])/g, " $1").trim(),
            value:
              typeof value === "object"
                ? JSON.stringify(value, null, 2)
                : String(value),
          })),
      };
    }

    case "RemoveSpendingLimit": {
      return {
        type: "Remove Spending Limit",
        summary: "Remove spending limit",
        fields: Object.entries(action)
          .filter(([key]) => key !== "__kind")
          .map(([key, value]) => ({
            label: key.replace(/([A-Z])/g, " $1").trim(),
            value:
              typeof value === "object"
                ? JSON.stringify(value, null, 2)
                : String(value),
          })),
      };
    }

    case "SetRentCollector": {
      return {
        type: "Set Rent Collector",
        summary: "Set rent collector",
        fields: Object.entries(action)
          .filter(([key]) => key !== "__kind")
          .map(([key, value]) => ({
            label: key.replace(/([A-Z])/g, " $1").trim(),
            value:
              typeof value === "object"
                ? JSON.stringify(value, null, 2)
                : String(value),
          })),
      };
    }

    default: {
      // For unknown action types, show all fields
      const fields = Object.entries(action)
        .filter(([key]) => key !== "__kind")
        .map(([key, value]) => ({
          label: key.replace(/([A-Z])/g, " $1").trim(),
          value:
            typeof value === "object"
              ? JSON.stringify(value, null, 2)
              : String(value),
        }));

      return {
        type,
        summary: type,
        fields,
      };
    }
  }
}

export interface TransactionSummary {
  type: "config" | "vault";
  instructionCount?: number;
  accountCount?: number;
  programIds?: string[];
  configActions?: {
    type: string;
    summary: string;
  }[];
}

export function formatTransactionSummary(summary: TransactionSummary): string {
  if (summary.type === "config") {
    const actionCount = summary.configActions?.length || 0;
    const actions = summary.configActions || [];

    if (actions.length === 0) {
      return "Config transaction";
    }

    if (actions.length === 1) {
      return actions[0].summary;
    }

    return `${actionCount} config actions`;
  }

  return `${summary.instructionCount || 0} instruction${summary.instructionCount !== 1 ? "s" : ""}`;
}
