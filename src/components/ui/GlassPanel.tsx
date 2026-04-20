"use client";

import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type GlassVariant = "default" | "strong" | "soft";

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  function GlassPanel({ variant = "default", className, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          variant === "strong" && "glass-strong",
          variant === "soft" && "glass-soft",
          variant === "default" && "glass",
          "rounded-[var(--r)]",
          className
        )}
        {...rest}
      />
    );
  }
);
