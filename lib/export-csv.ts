import type { MultisigAccount, ProposalAccount } from "@/types/multisig";

/**
 * Converts an array of objects to CSV format
 */
function convertToCSV<T extends Record<string, unknown>>(
  data: T[],
  headers: { key: keyof T; label: string }[]
): string {
  // Create header row
  const headerRow = headers.map((h) => h.label).join(",");

  // Create data rows
  const dataRows = data.map((item) => {
    return headers
      .map((h) => {
        const value = item[h.key];
        // Escape quotes and wrap in quotes if contains comma or quotes
        if (value === null || value === undefined) return "";
        const stringValue = String(value);
        if (stringValue.includes(",") || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(",");
  });

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Downloads a string as a CSV file
 */
function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Exports proposals to CSV
 */
export function exportProposalsToCSV(
  proposals: ProposalAccount[],
  multisigs?: Map<string, MultisigAccount>
): void {
  type ProposalExportRow = {
    multisig: string;
    multisigLabel: string;
    transactionIndex: string;
    status: string;
    approvalCount: number;
    rejectionCount: number;
    executed: string;
    cancelled: string;
    creator: string;
  };

  const headers: { key: keyof ProposalExportRow; label: string }[] = [
    { key: "multisig", label: "Multisig Address" },
    { key: "multisigLabel", label: "Multisig Name" },
    { key: "transactionIndex", label: "Proposal #" },
    { key: "status", label: "Status" },
    { key: "approvalCount", label: "Approvals" },
    { key: "rejectionCount", label: "Rejections" },
    { key: "executed", label: "Executed" },
    { key: "cancelled", label: "Cancelled" },
    { key: "creator", label: "Creator" },
  ];

  const data = proposals.map((p) => {
    const multisig = multisigs?.get(p.multisig.toString());
    return {
      multisig: p.multisig.toString(),
      multisigLabel: multisig?.label || "Unnamed",
      transactionIndex: p.transactionIndex.toString(),
      status: p.status,
      approvalCount: p.approvals.length,
      rejectionCount: p.rejections.length,
      executed: p.executed ? "Yes" : "No",
      cancelled: p.cancelled ? "Yes" : "No",
      creator: p.creator?.toString() || "Unknown",
    };
  });

  const csv = convertToCSV(data, headers);
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `squad-proposals-${timestamp}.csv`;

  downloadCSV(csv, filename);
}

/**
 * Exports multisigs to CSV
 */
export function exportMultisigsToCSV(multisigs: MultisigAccount[]): void {
  type MultisigExportRow = {
    publicKey: string;
    label: string;
    chainId: string;
    threshold: number;
    memberCount: number;
    transactionIndex: string;
    tags: string;
  };

  const headers: { key: keyof MultisigExportRow; label: string }[] = [
    { key: "publicKey", label: "Address" },
    { key: "label", label: "Name" },
    { key: "chainId", label: "Chain" },
    { key: "threshold", label: "Threshold" },
    { key: "memberCount", label: "Members" },
    { key: "transactionIndex", label: "Transaction Index" },
    { key: "tags", label: "Tags" },
  ];

  const data = multisigs.map((m) => ({
    publicKey: m.publicKey.toString(),
    label: m.label || "Unnamed",
    chainId: m.chainId,
    threshold: m.threshold,
    memberCount: m.members.length,
    transactionIndex: m.transactionIndex.toString(),
    tags: m.tags?.join("; ") || "",
  }));

  const csv = convertToCSV(data, headers);
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `squad-multisigs-${timestamp}.csv`;

  downloadCSV(csv, filename);
}

/**
 * Exports proposal details with member approval/rejection status
 */
export function exportProposalDetailsToCSV(
  proposal: ProposalAccount,
  multisig: MultisigAccount
): void {
  type ProposalDetailRow = {
    member: string;
    status: string;
  };

  const headers: { key: keyof ProposalDetailRow; label: string }[] = [
    { key: "member", label: "Member Address" },
    { key: "status", label: "Vote Status" },
  ];

  const data = multisig.members.map((member) => {
    const memberKey = member.key.toString();
    const approved = proposal.approvals.some((a) => a.toString() === memberKey);
    const rejected = proposal.rejections.some(
      (r) => r.toString() === memberKey
    );

    let status = "Not Voted";
    if (approved) status = "Approved";
    if (rejected) status = "Rejected";

    return {
      member: memberKey,
      status,
    };
  });

  const csv = convertToCSV(data, headers);
  const filename = `proposal-${proposal.transactionIndex}-details.csv`;

  downloadCSV(csv, filename);
}
