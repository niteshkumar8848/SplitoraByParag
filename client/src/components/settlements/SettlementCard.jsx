import { ArrowRight } from "lucide-react";
import Badge from "../ui/Badge";
import Card from "../ui/Card";
import Avatar from "../ui/Avatar";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

const formatDate = (value) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

export default function SettlementCard({ settlement }) {
  const status = (settlement?.status || "pending").toLowerCase();
  const badgeVariant = status === "completed" ? "success" : "warning";

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar user={settlement?.payer} size="sm" />
          <span className="truncate text-sm font-medium text-surface-900 dark:text-white">
            {settlement?.payer?.name || "Member"}
          </span>
          <ArrowRight size={14} className="text-surface-400 dark:text-slate-500" />
          <Avatar user={settlement?.receiver} size="sm" />
          <span className="truncate text-sm font-medium text-surface-900 dark:text-white">
            {settlement?.receiver?.name || "Member"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">{formatCurrency(settlement?.amount)}</span>
          <Badge variant={badgeVariant} size="sm">
            {status === "completed" ? "Completed" : "Pending"}
          </Badge>
          <span className="text-xs text-surface-500 dark:text-slate-400">{formatDate(settlement?.date || settlement?.createdAt)}</span>
        </div>
      </div>
    </Card>
  );
}
