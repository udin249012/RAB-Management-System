import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiquidGlass } from "@/components/ui/glass-sidebar-utils/liquid-glass";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  maxWidthClassName?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidthClassName = "max-w-xl",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <LiquidGlass
        variant="frosted"
        className={cn(
          "w-full rounded-[26px] text-[var(--glass-foreground)] my-8",
          maxWidthClassName,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/40 px-6 py-4">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold leading-tight">
              {title}
            </h2>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-[var(--glass-highlight-hover)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </LiquidGlass>
    </div>
  );
}
