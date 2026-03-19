import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import { createGroup, getMyGroups } from "../api/groups.api";
import GroupCard from "../components/groups/GroupCard";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import EmptyState from "../components/ui/EmptyState";

const CATEGORIES = ["general", "travel", "food", "home", "event", "shopping", "entertainment"];

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "general" });

  const { data, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: getMyGroups,
  });

  const createGroupMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Group created!");
      setIsModalOpen(false);
      setForm({ name: "", description: "", category: "general" });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to create group");
    },
  });

  const groups =
    data?.data?.groups ||
    data?.groups ||
    (Array.isArray(data?.data) ? data.data : []) ||
    [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Group name is required");
      return;
    }
    createGroupMutation.mutate({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-surface-900">My Groups</h1>
        <Button leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
          New Group
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface-200" />
          ))}
        </div>
      ) : groups.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              id={group.id}
              name={group.name}
              memberCount={group._count?.members || group.memberCount || 0}
              category={group.category}
              description={group.description}
              members={group.members}
              recentActivity={`Updated ${new Date(group.updatedAt || group.createdAt).toLocaleDateString()}`}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No groups yet"
          description="Create your first group to start splitting expenses."
          action={{ label: "Create Group", onClick: () => setIsModalOpen(true) }}
        />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Group" size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Group name"
            placeholder="Goa Trip 2024"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            label="Description (optional)"
            placeholder="What is this group for?"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-700">Category</label>
            <select
              className="h-11 w-full rounded-xl border border-surface-300 bg-surface-50 px-3 text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-200"
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c[0].toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createGroupMutation.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}