import { useId } from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export default function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  type = "text",
  className,
  id,
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-surface-700"
        >
          {label}
        </label>
      ) : null}

      <div className="relative">
        {leftIcon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
            {leftIcon}
          </span>
        ) : null}

        <input
          id={inputId}
          type={type}
          className={twMerge(
            clsx(
              "w-full rounded-xl border bg-surface-50 text-surface-900 placeholder:text-surface-400 transition focus:outline-none focus:ring-2",
              "h-11 px-3",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error
                ? "border-danger-400 focus:border-danger-500 focus:ring-danger-200"
                : "border-surface-300 focus:border-primary-500 focus:ring-primary-200"
            ),
            className
          )}
          {...props}
        />

        {rightIcon ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
            {rightIcon}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-1.5 text-sm text-danger-600">{error}</p>
      ) : null}
      {!error && helperText ? (
        <p className="mt-1.5 text-sm text-surface-500">{helperText}</p>
      ) : null}
    </div>
  );
}