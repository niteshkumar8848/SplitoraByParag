import Badge from "../ui/Badge";
import Avatar from "../ui/Avatar";

export default function GroupMemberList({ members = [] }) {
  if (!members.length) {
    return (
      <p className="text-sm text-surface-600">No members yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      {members.map((member) => {
        const user = member.user || member;
        const role = member.role || "member";
        return (
          <div
            key={member.userId || member.id}
            className="flex items-center justify-between rounded-xl border border-surface-200 bg-surface-50 px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <Avatar user={user} size="sm" />
              <div>
                <p className="text-sm font-medium text-surface-900">
                  {user?.name || "Unknown"}
                </p>
                <p className="text-xs text-surface-500">
                  {user?.email || ""}
                </p>
              </div>
            </div>
            <Badge variant={role === "admin" ? "info" : "default"} size="sm">
              {role[0].toUpperCase() + role.slice(1)}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}