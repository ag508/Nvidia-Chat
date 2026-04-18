"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, PanelLeftOpen, Sun, Moon } from "lucide-react";
import { Model } from "@/lib/types";
import { cn } from "@/lib/utils";

function modelTags(m: Model): string[] {
  const tags: string[] = [];
  const name = (m.name + " " + m.modelId).toLowerCase();
  if (/reason|r1|think|nemotron|o1|qwq/.test(name)) tags.push("reasoning");
  if (/vision|vlm|kosmos|llava|vl|image/.test(name)) tags.push("vision");
  return tags;
}

function shortCode(m: Model): string {
  const base = m.name.replace(/[^A-Za-z0-9]/g, "");
  return base.slice(0, 4).toUpperCase() || "NIM";
}

function contextLength(m: Model): string {
  const match = (m.modelId + " " + m.name).match(/(\d+)\s*[kK]/);
  if (match) return `${match[1]}k`;
  return "—";
}

export function Topbar({
  model,
  models,
  onPickModel,
  onToggleSidebar,
  sidebarOpen,
  theme,
  onToggleTheme,
}: {
  model: Model | null;
  models: Model[];
  onPickModel: (m: Model) => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div
      className="flex items-center gap-2.5 px-5 py-[14px]"
      style={{ borderBottom: "1px solid var(--border)", background: "var(--canvas)" }}
    >
      {!sidebarOpen && (
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg grid place-items-center cursor-pointer transition-colors"
          style={{ color: "var(--text-dim)", background: "none", border: "none" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-dim)"; }}
          aria-label="Open sidebar"
          title="Open sidebar"
        >
          <PanelLeftOpen size={18} />
        </button>
      )}

      <div
        ref={ref}
        className="relative flex items-center gap-2 px-2.5 py-1.5 rounded-[9px] cursor-pointer transition-colors"
        onClick={() => setOpen(v => !v)}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--card)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      >
        <span className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>NvTerminal</span>
        {model && (
          <span className="text-[11px] mono" style={{ color: "var(--text-mute)" }}>
            · {shortCode(model)}
          </span>
        )}
        <ChevronDown size={13} style={{ color: "var(--text-mute)" }} className={cn("transition-transform", open && "rotate-180")} />

        {open && (
          <div
            onClick={e => e.stopPropagation()}
            className="absolute top-[calc(100%+6px)] left-0 z-[100] p-1.5 rounded-xl"
            style={{
              minWidth: 360,
              background: "var(--panel)",
              border: "1px solid var(--border)",
              boxShadow: "0 18px 40px -16px rgba(0,0,0,.2)",
            }}
          >
            <div className="px-3 pt-2.5 pb-1.5 text-[10.5px] uppercase tracking-[0.1em] font-medium" style={{ color: "var(--text-mute)" }}>
              NIM endpoints
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {models.map(m => {
                const selected = model?.id === m.id;
                const tags = modelTags(m);
                return (
                  <div
                    key={m.id}
                    onClick={() => { onPickModel(m); setOpen(false); }}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors"
                    style={{ background: selected ? "var(--card)" : "transparent" }}
                    onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "var(--card)"; }}
                    onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[13.5px] font-medium" style={{ color: "var(--text)" }}>
                        <span className="truncate">{m.name}</span>
                        {tags.includes("reasoning") && <span className="nv-tag blue">Reasoning</span>}
                        {tags.includes("vision") && <span className="nv-tag amber">Vision</span>}
                      </div>
                      <div className="mt-0.5 text-[11px] mono truncate" style={{ color: "var(--text-mute)" }}>
                        {m.modelId} · {contextLength(m)} ctx
                      </div>
                    </div>
                    <Check size={14} style={{ color: "var(--accent)", opacity: selected ? 1 : 0 }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg grid place-items-center cursor-pointer transition-colors"
          style={{ color: "var(--text-dim)", background: "none", border: "none" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-dim)"; }}
          aria-label="Toggle theme"
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </div>
  );
}
