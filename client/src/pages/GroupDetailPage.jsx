import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import { addMember, getGroupById } from "../api/groups.api";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import ExpenseCard from "../components/expenses/ExpenseCard";
import AddExpenseModal from "../components/expenses/AddExpenseModal";
import SettlementSuggestions from "../components/settlements/SettlementSuggestions";
import AddMemberModal from "../components/groups/AddMemberModal";

const TABS = ["expenses", "balances", "settlements"];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

export default function GroupDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("expenses");
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["group", id],
    queryFn: () => getGroupById(id),
    enabled: Boolean(id),
  });

  const addMemberMutation = useMutation({
    mutationFn: (email) => addMember(id, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", id] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Member added successfully");
      setIsAddMemberOpen(false);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to add member");
    },
  });

  const group = data?.data?.group || data?.group;
  const balances = useMemo(() => group?.balances || [], [group]);
  const expenses = useMemo(() => group?.expenses || [], [group]);
  const members = useMemo(() => group?.members || [], [group]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-2xl bg-surface-200" />
        <div className="h-64 animate-pulse rounded-2xl bg-surface-200" />
      </div>
    );
  }

  if (!group) {
    return (
      <Card>
        <p className="text-sm text-surface-600">Group not found.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-surface-900">{group.name}</h1>
              <Badge variant="info">{group.category}</Badge>
            </div>
            {group.description ? (
              <p className="mt-2 text-sm text-surface-600">{group.description}</p>
            ) : null}
            <div className="mt-4 flex items-center gap-2">
              {members.map((member) => (
                <Avatar key={member.userId || member.id} user={member.user || member} size="sm" />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              leftIcon={<Plus size={16} />}
              onClick={() => setIsAddMemberOpen(true)}
            >
              Add Member
            </Button>
            <Button
              leftIcon={<Plus size={16} />}
              onClick={() => setIsAddExpenseOpen(true)}
            >
              Add Expense
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab)}
          >
            {tab[0].toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      {activeTab === "expenses" && (
        <div className="space-y-3">
          {expenses.length ? (
            expenses.map((expense) => (
              <ExpenseCard key={expense.id} expense={expense} />
            ))
          ) : (
            <Card>
              <div className="py-8 text-center">
                <p className="text-sm text-surface-600">No expenses added yet.</p>
                <Button
                  className="mt-3"
                  leftIcon={<Plus size={16} />}
                  onClick={() => setIsAddExpenseOpen(true)}
                >
                  Add First Expense
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === "balances" && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-surface-900">Member balances</h2>
          <div className="space-y-2">
            {balances.length ? (
              balances.map((entry) => (
                <div
                  key={entry.userId}
                  className="flex items-center justify-between rounded-xl border border-surface-200 bg-surface-50 px-3 py-2"
                >
                  <div className="inline-flex items-center gap-2">
                    <Avatar user={{ name: entry.name, avatar: entry.avatar }} size="sm" />
                    <span className="text-sm font-medium text-surface-900">{entry.name}</span>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      entry.balance >= 0 ? "text-success-600" : "text-danger-600"
                    }`}
                  >
                    {entry.balance >= 0 ? "+" : ""}
                    {formatCurrency(entry.balance)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-surface-600">No balances yet. Add some expenses first.</p>
            )}
          </div>
        </Card>
      )}

      {activeTab === "settlements" && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-surface-900">Settlement suggestions</h2>
          <SettlementSuggestions groupId={id} />
        </Card>
      )}

      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSubmit={(email) => addMemberMutation.mutateAsync(email)}
        loading={addMemberMutation.isPending}
      />

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        groupId={id}
        members={members}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["group", id] });
          queryClient.invalidateQueries({ queryKey: ["groups"] });
          setIsAddExpenseOpen(false);
        }}
      />
    </div>
  );
}