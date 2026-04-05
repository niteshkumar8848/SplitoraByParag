import Button from "../ui/Button";

const TABS = [
  { key: "equal", label: "Equal" },
  { key: "percentage", label: "Percentage" },
  { key: "custom", label: "Custom" },
];

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getMemberId = (member) => member?.user?.id || member?.userId || member?.id;
const getMemberName = (member) => member?.user?.name || member?.name || "Member";

export default function SplitTypeSelector({
  splitType,
  onChange,
  members = [],
  totalAmount = 0,
  splits = {},
  onSplitsChange,
}) {
  const selectedMembers = members.filter((member) => Boolean(getMemberId(member)));
  const amount = toNumber(totalAmount);
  const memberCount = selectedMembers.length;

  const equalShare = memberCount > 0 ? amount / memberCount : 0;

  const percentageTotal = selectedMembers.reduce((sum, member) => {
    const id = getMemberId(member);
    return sum + toNumber(splits[id]);
  }, 0);

  const customTotal = selectedMembers.reduce((sum, member) => {
    const id = getMemberId(member);
    return sum + toNumber(splits[id]);
  }, 0);

  const updateSplitValue = (userId, value) => {
    onSplitsChange?.({
      ...splits,
      [userId]: value,
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-surface-200 dark:border-dark-50 bg-surface-50 dark:bg-dark-100 p-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.key}
            type="button"
            size="sm"
            variant={splitType === tab.key ? "primary" : "outline"}
            onClick={() => onChange?.(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {splitType === "equal" ? (
        <div className="space-y-2">
          {selectedMembers.map((member) => {
            const id = getMemberId(member);
            return (
              <div key={id} className="flex items-center justify-between rounded-xl bg-surface-100 dark:bg-dark-50 px-3 py-2 text-sm">
                <span className="text-surface-700 dark:text-slate-200">{getMemberName(member)}</span>
                <span className="font-semibold text-surface-900 dark:text-white">₹{equalShare.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      ) : null}

      {splitType === "percentage" ? (
        <div className="space-y-2">
          {selectedMembers.map((member) => {
            const id = getMemberId(member);
            return (
              <div key={id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-100 dark:bg-dark-50 px-3 py-2 text-sm">
                <span className="text-surface-700 dark:text-slate-200">{getMemberName(member)}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className="h-9 w-24 rounded-lg border border-surface-300 dark:border-dark-50 bg-white dark:bg-dark-100 px-2 text-right text-surface-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    value={splits[id] ?? ""}
                    onChange={(e) => updateSplitValue(id, e.target.value)}
                  />
                  <span className="text-surface-500 dark:text-slate-400">%</span>
                </div>
              </div>
            );
          })}

          <p className={`text-sm font-medium ${Math.abs(percentageTotal - 100) < 0.001 ? "text-success-600" : "text-danger-600"}`}>
            Running total: {percentageTotal.toFixed(2)}%
          </p>
        </div>
      ) : null}

      {splitType === "custom" ? (
        <div className="space-y-2">
          {selectedMembers.map((member) => {
            const id = getMemberId(member);
            return (
              <div key={id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-100 dark:bg-dark-50 px-3 py-2 text-sm">
                <span className="text-surface-700 dark:text-slate-200">{getMemberName(member)}</span>
                <div className="flex items-center gap-1">
                  <span className="text-surface-500 dark:text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-9 w-28 rounded-lg border border-surface-300 dark:border-dark-50 bg-white dark:bg-dark-100 px-2 text-right text-surface-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    value={splits[id] ?? ""}
                    onChange={(e) => updateSplitValue(id, e.target.value)}
                  />
                </div>
              </div>
            );
          })}

          <p className={`text-sm font-medium ${Math.abs(customTotal - amount) < 0.001 ? "text-success-600" : "text-danger-600"}`}>
            Running total: ₹{customTotal.toFixed(2)} / ₹{amount.toFixed(2)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
