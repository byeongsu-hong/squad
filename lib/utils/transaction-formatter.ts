import { ReactNode } from "react";

import { formatAddress, isValidAddress } from "@/lib/utils/format-address";

export interface ConfigAction {
  __kind: string;
  [key: string]: unknown;
}

interface FormattedConfigAction {
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
      const newMember = action.newMember as
        | { key: unknown; permissions?: { mask: number } }
        | undefined;
      const memberKey = String(newMember?.key || "Unknown");
      return {
        type: "Add Member",
        summary: `Add member ${isValidAddress(memberKey) ? formatAddress(memberKey, 8, 4) : memberKey}`,
        fields: [
          {
            label: "Member Address",
            value: memberKey,
          },
          {
            label: "Permissions",
            value: String(newMember?.permissions?.mask ?? "Default"),
          },
        ],
      };
    }

    case "RemoveMember": {
      const memberKey = String(action.oldMember || "Unknown");
      return {
        type: "Remove Member",
        summary: `Remove member ${isValidAddress(memberKey) ? formatAddress(memberKey, 8, 4) : memberKey}`,
        fields: [
          {
            label: "Member Address",
            value: memberKey,
          },
        ],
      };
    }

    case "ChangeThreshold": {
      const newThreshold = action.newThreshold as number | undefined;
      return {
        type: "Change Threshold",
        summary: `Set threshold to ${newThreshold ?? "Unknown"}`,
        fields: [
          { label: "New Threshold", value: String(newThreshold ?? "Unknown") },
        ],
      };
    }

    case "SetTimeLock": {
      const timeLock = action.timeLock as number | undefined;
      return {
        type: "Set Time Lock",
        summary: `Set time lock to ${timeLock ?? "Unknown"}s`,
        fields: [
          {
            label: "Time Lock (seconds)",
            value: String(timeLock ?? "Unknown"),
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
