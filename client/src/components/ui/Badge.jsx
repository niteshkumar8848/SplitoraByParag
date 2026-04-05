import clsx from "clsx";
import { twMerge } from "tailwind-merge";

const VARIANT_MAP = {
  success: "bg-success-100 dark:bg-success-700/30 text-success-700 dark:text-success-400",
  warning: "bg-warning-100 dark:bg-warning-700/30 text-warning-700 dark:text-warning-400",
  danger: "bg-danger-100 dark:bg-danger-700/30 text-danger-700 dark:text-danger-400",
  info: "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300",
  default: "bg-surface-200 dark:bg-dark-50 text-surface-700 dark:text-slate-300",
};

const SIZE_MAP = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

export default function Badge({ variant = "default", size = "md", className, children }) {
  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center rounded-full font-medium",
          VARIANT_MAP[variant] || VARIANT_MAP.default,
          SIZE_MAP[size] || SIZE_MAP.md
        ),
        className
      )}
    >
      {children}
    </span>
  );
}
