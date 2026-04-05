import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Avatar from "../ui/Avatar";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const CATEGORY_ICON_MAP = {
  food: "🍕",
  travel: "✈️",
  home: "🏠",
  event: "🎉",
  general: "🧾",
};

const getSplitBadge = (splitType) => {
  const normalized = (splitType || "equal").toLowerCase();
  if (normalized === "percentage") return "Percentage";
  if (normalized === "custom") return "Custom";
  return "Equal";
};

export default function ExpenseCard({ expense, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  const shares = useMemo(() => expense?.shares || [], [expense]);
  const categoryKey = (expense?.category || "general").toLowerCase();
  const categoryIcon = CATEGORY_ICON_MAP[categoryKey] || "🧾";

  return (
    <Card hover className="group">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">
                {categoryIcon}
              </span>
              <h3 className="truncate text-base font-semibold text-surface-900 dark:text-white">{expense?.title}</h3>
            </div>

            <p className="mt-1 text-sm text-surface-600 dark:text-slate-300">
              paid by <span className="font-medium">{expense?.paidBy?.name || "Unknown"}</span> •{" "}
              {format(new Date(expense?.date || expense?.createdAt), "dd MMM yyyy")}
            </p>
          </div>

          <div className="text-right">
            <p className="text-base font-bold text-surface-900 dark:text-white">{formatCurrency(expense?.amount)}</p>
            <div className="mt-1 flex items-center justify-end gap-2">
              <Badge variant="info" size="sm">
                {getSplitBadge(expense?.splitType)}
              </Badge>
              {expanded ? <ChevronUp size={16} className="text-surface-500 dark:text-slate-400" /> : <ChevronDown size={16} className="text-surface-500 dark:text-slate-400" />}
            </div>
          </div>
        </div>
      </button>

      <div className="mt-3 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onEdit?.(expense)}
          className="rounded-lg p-2 text-surface-500 dark:text-slate-400 hover:bg-surface-100 dark:hover:bg-dark-50 hover:text-primary-700 dark:hover:text-primary-300"
          aria-label="Edit expense"
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          onClick={() => onDelete?.(expense)}
          className="rounded-lg p-2 text-surface-500 dark:text-slate-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 hover:text-danger-700 dark:hover:text-danger-400"
          aria-label="Delete expense"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-2 border-t border-surface-200 dark:border-dark-50 pt-3">
          {shares.map((share) => (
            <div
              key={share.id || `${share.userId}-${share.amount}`}
              className="flex items-center justify-between rounded-xl bg-surface-100 dark:bg-dark-50 px-3 py-2"
            >
              <div className="inline-flex items-center gap-2">
                <Avatar user={share.user} size="sm" />
                <span className="text-sm text-surface-800 dark:text-slate-200">{share.user?.name || "Member"}</span>
              </div>
              <span className="text-sm font-semibold text-surface-900 dark:text-white">{formatCurrency(share.amount)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
