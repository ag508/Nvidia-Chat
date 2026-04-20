"use client";

import * as P from "@radix-ui/react-popover";
import { ReactNode, CSSProperties } from "react";
import { cn } from "@/lib/utils";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverAnchor = P.Anchor;

export function PopoverContent({
  children,
  className,
  style,
  sideOffset = 8,
  align = "start",
  side = "bottom",
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  sideOffset?: number;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <P.Portal>
      <P.Content
        sideOffset={sideOffset}
        align={align}
        side={side}
        className={cn(
          "glass-strong rounded-[var(--r)] overflow-hidden",
          className
        )}
        style={{
          animation: "nv-reveal 0.24s cubic-bezier(0.16, 1, 0.3, 1) both",
          transformOrigin: "var(--radix-popover-content-transform-origin)",
          ...style,
        }}
      >
        {children}
      </P.Content>
    </P.Portal>
  );
}
