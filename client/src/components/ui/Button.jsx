import { twMerge } from "tailwind-merge";
import clsx from "clsx";
import Spinner from "./Spinner";

const VARIANT_MAP = {
  primary:
    "bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-card hover:from-primary-700 hover:to-primary-600",
  secondary: "bg-transparent text-surface-700 hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-800",
  danger: "bg-danger-600 text-white hover:bg-danger-700",
  outline: "border border-surface-300 bg-surface-50 text-surface-700 hover:bg-surface-100 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-200 dark:hover:bg-surface-700",
};

const SIZE_MAP = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  type = "button",
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={twMerge(
        clsx(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
          VARIANT_MAP[variant] || VARIANT_MAP.primary,
          SIZE_MAP[size] || SIZE_MAP.md,
          fullWidth && "w-full"
        ),
        className
      )}
      {...props}
    >
      {loading ? <Spinner size="sm" color={variant === "primary" || variant === "danger" ? "white" : "primary"} /> : leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  );
}
