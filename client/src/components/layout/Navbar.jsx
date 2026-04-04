import { Bell, Menu } from "lucide-react";
import ThemeToggle from "../ui/ThemeToggle";

export default function Navbar({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-surface-200 bg-surface-50 px-4 md:hidden dark:border-surface-700 dark:bg-surface-900">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-white"
        aria-label="Open sidebar"
      >
        <Menu size={20} />
      </button>

      <h2 className="text-base font-semibold text-surface-900 dark:text-white">Splitora</h2>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <button
          type="button"
          className="rounded-lg p-2 text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-white"
          aria-label="Notifications"
        >
          <Bell size={20} />
        </button>
      </div>
    </header>
  );
}
