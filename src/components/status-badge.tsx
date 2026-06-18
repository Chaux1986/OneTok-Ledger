interface StatusBadgeProps {
  status: string;
}

const colorMap: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending: "bg-amber-100 text-amber-700",
  pending_approval: "bg-amber-100 text-amber-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  paid: "bg-green-100 text-green-700",
  matched: "bg-green-100 text-green-700",
  accepted: "bg-green-100 text-green-700",
  received: "bg-green-100 text-green-700",
  partially_received: "bg-teal-100 text-teal-700",
  overdue: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
  unmatched: "bg-red-100 text-red-700",
  inspecting: "bg-blue-100 text-blue-700",
  finalized: "bg-green-100 text-green-700",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const cls = colorMap[status] || "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
