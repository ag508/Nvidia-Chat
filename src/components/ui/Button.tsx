"use client";

import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "subtle" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-[12px] rounded-[10px]",
  md: "h-10 px-4 text-[13px] rounded-[12px]",
  lg: "h-12 px-5 text-[14px] rounded-[14px]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  trailing?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", icon, trailing, children, className, style, ...rest },
  ref
) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium cursor-pointer nv-ring nv-press transition-all select-none";
  const styles: React.CSSProperties =
    variant === "primary"
      ? {
          background: "var(--text)",
          color: "var(--bg-base)",
          border: "1px solid transparent",
          boxShadow: "var(--shadow-panel)",
        }
      : variant === "ghost"
        ? {
            background: "transparent",
            color: "var(--text-dim)",
            border: "1px solid transparent",
          }
        : variant === "subtle"
          ? {
              background: "var(--glass)",
              color: "var(--text)",
              border: "1px solid var(--hairline)",
              backdropFilter: "blur(16px) saturate(1.3)",
            }
          : variant === "outline"
            ? {
                background: "transparent",
                color: "var(--text)",
                border: "1px solid var(--hairline-strong)",
              }
            : {
                background: "var(--danger)",
                color: "#fff",
                border: "1px solid transparent",
              };

  return (
    <button
      ref={ref}
      type="button"
      className={cn(base, SIZE[size], className)}
      style={{ ...styles, ...style }}
      onMouseEnter={e => {
        if (variant === "ghost") {
          e.currentTarget.style.background = "var(--glass)";
          e.currentTarget.style.color = "var(--text)";
        } else if (variant === "subtle") {
          e.currentTarget.style.background = "var(--glass-strong)";
        } else if (variant === "outline") {
          e.currentTarget.style.borderColor = "var(--text-dim)";
        }
      }}
      onMouseLeave={e => {
        if (variant === "ghost") {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-dim)";
        } else if (variant === "subtle") {
          e.currentTarget.style.background = "var(--glass)";
        } else if (variant === "outline") {
          e.currentTarget.style.borderColor = "var(--hairline-strong)";
        }
      }}
      {...rest}
    >
      {icon}
      {children}
      {trailing}
    </button>
  );
});
