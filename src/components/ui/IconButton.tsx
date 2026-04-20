"use client";

import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";
import { Tooltip } from "./Tooltip";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  sm: "w-7 h-7",
  md: "w-9 h-9",
  lg: "w-11 h-11",
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  tooltip?: string;
  size?: Size;
  active?: boolean;
  tone?: "default" | "accent" | "danger";
  icon?: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, tooltip, size = "md", active, tone = "default", icon, children, className, ...rest },
    ref
  ) {
    const inner = (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        className={cn(
          "grid place-items-center rounded-[12px] cursor-pointer nv-ring nv-press transition-colors",
          "relative isolate",
          SIZE[size],
          className
        )}
        style={{
          background: active ? "var(--glass-strong)" : "transparent",
          color:
            tone === "accent"
              ? "var(--accent)"
              : tone === "danger"
                ? "var(--danger)"
                : active
                  ? "var(--text)"
                  : "var(--text-dim)",
          border: active ? "1px solid var(--hairline-strong)" : "1px solid transparent",
          boxShadow: active ? "var(--shadow-inset)" : "none",
        }}
        onMouseEnter={e => {
          if (active) return;
          e.currentTarget.style.background = "var(--glass)";
          e.currentTarget.style.color = "var(--text)";
        }}
        onMouseLeave={e => {
          if (active) return;
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color =
            tone === "accent" ? "var(--accent)" : tone === "danger" ? "var(--danger)" : "var(--text-dim)";
        }}
        {...rest}
      >
        {icon ?? children}
      </button>
    );
    return tooltip ? <Tooltip label={tooltip}>{inner}</Tooltip> : inner;
  }
);
