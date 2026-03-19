import { ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { useSettlementSuggestions, useConfirmSettlement } from "../../hooks/useSettlements";
import Card from "../ui/Card";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

export default function SettlementSuggestions({ groupId }) {
  const { data, isLoading, refetch } = useSettlementSuggestions(groupId);
  const confirmMutation = useConfirmSettlement(groupId);

  const suggestions = data?.data?.suggestions || data?.suggestions || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-200" />
        ))}
      </div>
    );
  }

  if (!suggestions.length) {
    return (
      <div className="rounded-xl border border-dashed border-surface-300 py-8 text-center">
        <p className="text-2xl">🎉</p>
        <p className="mt-2 text-sm font-medium text-surface-700">All settled up!</p>
        <p className="text-xs text-surface-500">No pending settlements in this group.</p>
      </div>
    );
  }

  const handleConfirm = async (suggestion) => {
    const isConfirmed = window.confirm(
      `Mark settlement: ${suggestion.fromUser?.name} pays ${suggestion.toUser?.name} ${formatCurrency(suggestion.amount)}?`
    );
    if (!isConfirmed) return;

    try {
      if (suggestion.settlementId) {
        await confirmMutation.mutateAsync(suggestion.settlementId);
      } else {
        const { createSettlement } = await import("../../api/settlements.api");
        const res = await createSettlement({
          groupId,
          payerId: suggestion.from,
          receiverId: suggestion.to,
          amount: suggestion.amount,
        });
        const newId = res?.data?.settlement?.id || res?.settlement?.id;
        if (newId) {
          await confirmMutation.mutateAsync(newId);
        }
      }
      toast.success("Settlement recorded successfully!");
      refetch();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to confirm settlement");
    }
  };

  return (
    <div className="space-y-3">
      {suggestions.map((item, index) => (
        <Card key={`${item.from}-${item.to}-${index}`}>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="inline-flex items-center gap-2">
              <Avatar user={item.fromUser} size="sm" />
              <span className="font-medium text-surface-900">
                {item.fromUser?.name || "Member"}
              </span>
            </div>
            <ArrowRight size={14} className="text-surface-400" />
            <div className="inline-flex items-center gap-2">
              <Avatar user={item.toUser} size="sm" />
              <span className="font-medium text-surface-900">
                {item.toUser?.name || "Member"}
              </span>
            </div>
            <span className="text-surface-500">pays</span>
            <span className="font-bold text-primary-700">{formatCurrency(item.amount)}</span>
            <Button
              size="sm"
              className="ml-auto"
              loading={confirmMutation.isPending}
              onClick={() => handleConfirm(item)}
            >
              Mark as Settled
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}