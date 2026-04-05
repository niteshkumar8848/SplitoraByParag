import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";

export default function GroupCard({ id, name, memberCount, recentActivity, category }) {
  return (
    <Link to={`/groups/${id}`} className="block">
      <Card hover className="h-full">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-surface-900 dark:text-white">{name}</h3>
            {recentActivity ? <p className="mt-1 text-sm text-surface-600 dark:text-slate-300">{recentActivity}</p> : null}
          </div>
          <Badge variant="info">{category || "general"}</Badge>
        </div>

        <div className="mt-4 inline-flex items-center gap-2 text-sm text-surface-600 dark:text-slate-300">
          <Users size={16} />
          <span>{memberCount || 0} members</span>
        </div>
      </Card>
    </Link>
  );
}
