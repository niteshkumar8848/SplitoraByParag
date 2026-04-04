import { useEffect } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

const SIZE_MAP = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
};

export default function Modal({ isOpen, onClose, title, size = "md", children }) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const onBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200 dark:bg-black/60"
      onClick={onBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={clsx(
          "relative w-full rounded-2xl bg-surface-50 p-6 shadow-modal animate-in zoom-in-95 duration-200 dark:bg-surface-800",
          SIZE_MAP[size] || SIZE_MAP.md
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-surface-200"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {title ? <h3 className="mb-4 pr-8 text-lg font-semibold text-surface-900 dark:text-white">{title}</h3> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}
