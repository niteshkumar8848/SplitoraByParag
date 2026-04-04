import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export default function Card({ className, hover = false, children, ...props }) {
  return (
    <div
      className={twMerge(
        clsx(
          "rounded-2xl border border-surface-200 bg-surface-50 p-5 shadow-card transition-all dark:border-surface-700 dark:bg-surface-800",
          hover && "hover:-translate-y-0.5 hover:shadow-modal"
        ),
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
