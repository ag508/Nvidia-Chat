"use client";

import * as T from "@radix-ui/react-tooltip";
import { ReactNode } from "react";

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <T.Provider delayDuration={250}>{children}</T.Provider>;
}

export function Tooltip({
  label,
  children,
  side = "bottom",
  align = "center",
}: {
  label: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}) {
  if (!label) return <>{children}</>;
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          align={align}
          sideOffset={6}
          className="z-[120] px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium glass-strong"
          style={{
            color: "var(--text)",
            animation: "nv-reveal 0.18s cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
        >
          {label}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
