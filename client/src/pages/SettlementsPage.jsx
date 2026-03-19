import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyGroups } from "../api/groups.api";
import { getGroupSettlements } from "../api/settlements.api";
import useAuth from "../hooks/useAuth";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Avatar from "../components/ui/Avatar";
import { ArrowRight } from "lucide-react";

const FILTERS = ["all", "pending", "completed"];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

function SettlementItem({ settlement }) {
  const status = settlement?.status || "pending";
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-surface-200 bg-surface-50 p-3 text-sm">
      <div className="inline-flex items-center gap-2">
        <Avatar user={settlement.payer} size="sm" />
        <span className="font-medium text-surface-900">
          {settlement.payer?.name || "Unknown"}
        </span>
      </div>
      <ArrowRight size={14} className="text-surface-400" />
      <div className="inline-flex items-center gap-2">
        <Avatar user={settlement.receiver} size="sm" />
        <span className="font-medium text-surface-900">
          {settlement.receiver?.name || "Unknown"}
        </span>
      </div>
      <span className="font-bold text-primary-700">
        {formatCurrency(settlement.amount)}
      </span>
      <Badge
        variant={status === "completed" ? "success" : "warning"}
        size="sm"
        className="ml-auto"
      >
        {status[0].toUpperCase() + status.slice(1)}
      </Badge>
    </div>
  );
}

function GroupSettlements({ group, filter }) {
  const { data, isLoading } = useQuery({
    queryKey: ["settlements", group.id],
    queryFn: () => getGroupSettlements(group.id),
    enabled: Boolean(group.id),
  });

  const settlements = useMemo(() => {
    const all = data?.data?.settlements || data?.settlements || [];
    if (filter === "all") return all;
    return all.filter((s) => s.status === filter);
  }, [data, filter]);

  if (isLoading) {
    return <div className="h-12 animate-pulse rounded-xl bg-surface-200" />;
  }

  if (!settlements.length) return null;

  return (
    <Card>
      <h2 className="mb-3 text-base font-semibold text-surface-900">
        {group.name}
      </h2>
      <div className="space-y-2">
        {settlements.map((settlement) => (
          <SettlementItem key={settlement.id} settlement={settlement} />
        ))}
      </div>
    </Card>
  );
}

export default function SettlementsPage() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: getMyGroups,
    enabled: Boolean(user?.id),
  });

  const groups = useMemo(() => {
    return (
      groupsData?.data?.groups ||
      groupsData?.groups ||
      (Array.isArray(groupsData?.data) ? groupsData.data : []) ||
      []
    );
  }, [groupsData]);

  if (groupsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Settlements</h1>
        <p className="mt-1 text-sm text-surface-600">
          Track all your settlements across groups.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Button
            key={filter}
            size="sm"
            variant={activeFilter === filter ? "primary" : "outline"}
            onClick={() => setActiveFilter(filter)}
          >
            {filter[0].toUpperCase() + filter.slice(1)}
          </Button>
        ))}
      </div>

      {groups.length ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <GroupSettlements
              key={group.id}
              group={group}
              filter={activeFilter}
            />
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-sm text-surface-600">
            No groups found. Create a group to start tracking settlements.
          </p>
        </Card>
      )}
    </div>
  );
}