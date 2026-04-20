"use client";

import * as D from "@radix-ui/react-dialog";
import { ReactNode, CSSProperties } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  children: ReactNode;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </D.Root>
  );
}

export function DialogContent({
  children,
  className,
  style,
  showClose = true,
  onClose,
  title,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  showClose?: boolean;
  onClose?: () => void;
  title?: ReactNode;
}) {
  return (
    <D.Portal>
      <D.Overlay
        className="fixed inset-0 z-[110]"
        style={{
          background: "rgba(8, 8, 12, 0.55)",
          backdropFilter: "blur(14px) saturate(1.2)",
          WebkitBackdropFilter: "blur(14px) saturate(1.2)",
          animation: "nv-dialog-overlay 0.22s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
      />
      <D.Content
        className={cn(
          "fixed z-[111]",
          "glass-strong rounded-[var(--r-lg)] overflow-hidden",
          "w-[calc(100vw-32px)] max-w-[960px] h-[85vh] flex flex-col",
          className
        )}
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          animation: "nv-dialog-enter 0.32s cubic-bezier(0.16, 1, 0.3, 1) both",
          ...style,
        }}
      >
        {title !== undefined && (
          <div
            className="flex items-center gap-3 px-5 py-4"
            style={{ borderBottom: "1px solid var(--hairline)" }}
          >
            <D.Title asChild>
              <span
                className="text-[14px] font-semibold truncate flex-1"
                style={{ color: "var(--text)" }}
              >
                {title}
              </span>
            </D.Title>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 grid place-items-center rounded-lg cursor-pointer nv-ring nv-press"
                style={{
                  background: "var(--glass)",
                  border: "1px solid var(--hairline)",
                  color: "var(--text-dim)",
                }}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
        {children}
      </D.Content>
    </D.Portal>
  );
}

export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;
