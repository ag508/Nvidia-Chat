"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown, Check, PanelLeftOpen, Sun, Moon, Cpu, Zap, Eye,
} from "lucide-react";
import { Command } from "cmdk";
import { motion, AnimatePresence } from "motion/react";
import { Model } from "@/lib/types";
import { IconButton } from "@/components/ui/IconButton";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover";
import { cn } from "@/lib/utils";

function modelTags(m: Model): string[] {
  const tags: string[] = [];
  const name = (m.name + " " + m.modelId).toLowerCase();
  if (/reason|r1|think|nemotron|o1|qwq/.test(name)) tags.push("reasoning");
  if (/vision|vlm|kosmos|llava|vl|image/.test(name)) tags.push("vision");
  return tags;
}

function contextLength(m: Model): string {
  const match = (m.modelId + " " + m.name).match(/(\d+)\s*[kK]/);
  return match ? `${match[1]}k` : "";
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

  // ⌘K opens the picker
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(v => !v);
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  return (
    <TooltipProvider>
      <div
        className="glass flex items-center gap-2 px-3 py-2"
        style={{
          borderRadius: "var(--r-lg)",
          height: 56,
        }}
      >
        {!sidebarOpen && (
          <IconButton
            size="md"
            tooltip="Open sidebar"
            label="Open sidebar"
            onClick={onToggleSidebar}
            icon={<PanelLeftOpen size={16} />}
          />
        )}

        {/* Brand (hidden when sidebar open — sidebar already shows it) */}
        {!sidebarOpen && (
          <div className="flex items-center gap-2 ml-1 mr-2">
            <span
              className="font-display text-[17px] font-semibold tracking-[-0.02em]"
              style={{ color: "var(--text)" }}
            >
              NvTerminal
            </span>
          </div>
        )}

        {/* Model picker */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2.5 px-3 py-2 rounded-[12px] cursor-pointer nv-ring nv-press transition-all"
              style={{
                background: open ? "var(--glass-strong)" : "var(--glass-soft)",
                border: `1px solid ${open ? "var(--hairline-strong)" : "var(--hairline)"}`,
                color: "var(--text)",
                minHeight: 40,
              }}
              onMouseEnter={e => {
                if (!open) e.currentTarget.style.background = "var(--glass)";
              }}
              onMouseLeave={e => {
                if (!open) e.currentTarget.style.background = "var(--glass-soft)";
              }}
            >
              <Cpu size={13} style={{ color: "var(--accent)" }} />
              <span className="text-[13px] font-medium truncate max-w-[180px] sm:max-w-[260px]">
                {model?.name ?? "Select model"}
              </span>
              {model && contextLength(model) && (
                <span
                  className="mono text-[10.5px] tracking-wide"
                  style={{ color: "var(--text-mute)" }}
                >
                  {contextLength(model)}
                </span>
              )}
              <ChevronDown
                size={13}
                style={{ color: "var(--text-mute)" }}
                className={cn("transition-transform duration-300", open && "rotate-180")}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={10}
            className="p-0 w-[min(420px,calc(100vw-32px))]"
          >
            <Command
              loop
              className="flex flex-col max-h-[440px]"
            >
              <div
                className="flex items-center gap-2 px-4 pt-3 pb-2"
                style={{ borderBottom: "1px solid var(--hairline)" }}
              >
                <Cpu size={13} style={{ color: "var(--text-mute)" }} />
                <Command.Input
                  placeholder="Filter endpoints…"
                  className="flex-1 bg-transparent border-none outline-none text-[13.5px] py-1"
                  style={{ color: "var(--text)" }}
                />
                <kbd
                  className="mono text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    background: "var(--glass-soft)",
                    color: "var(--text-mute)",
                    border: "1px solid var(--hairline)",
                  }}
                >
                  ⌘K
                </kbd>
              </div>
              <Command.List className="flex-1 overflow-y-auto p-2">
                <Command.Empty>No matching endpoint.</Command.Empty>
                <Command.Group
                  heading={`${models.length} endpoint${models.length === 1 ? "" : "s"}`}
                >
                  {models.map(m => {
                    const selected = model?.id === m.id;
                    const tags = modelTags(m);
                    return (
                      <Command.Item
                        key={m.id}
                        value={`${m.name} ${m.modelId} ${m.provider}`}
                        onSelect={() => {
                          onPickModel(m);
                          setOpen(false);
                        }}
                        className="flex items-center gap-3 p-2.5 rounded-[12px]"
                      >
                        <div
                          className="w-8 h-8 grid place-items-center rounded-[10px] flex-shrink-0"
                          style={{
                            background: selected ? "var(--accent-soft)" : "var(--glass)",
                            border: `1px solid ${selected ? "var(--accent)" : "var(--hairline)"}`,
                            color: selected ? "var(--accent)" : "var(--text-dim)",
                          }}
                        >
                          <Cpu size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className="flex items-center gap-1.5 text-[13px] font-medium truncate"
                            style={{ color: "var(--text)" }}
                          >
                            <span className="truncate">{m.name}</span>
                            {tags.includes("reasoning") && (
                              <span className="nv-tag blue">
                                <Zap size={8} /> reasoning
                              </span>
                            )}
                            {tags.includes("vision") && (
                              <span className="nv-tag amber">
                                <Eye size={8} /> vision
                              </span>
                            )}
                          </div>
                          <div
                            className="mt-0.5 text-[10.5px] mono truncate"
                            style={{ color: "var(--text-mute)" }}
                          >
                            {m.modelId}
                            {contextLength(m) && ` · ${contextLength(m)} ctx`}
                          </div>
                        </div>
                        <Check
                          size={14}
                          style={{
                            color: "var(--accent)",
                            opacity: selected ? 1 : 0,
                            transition: "opacity .15s",
                          }}
                        />
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              </Command.List>
              <div
                className="px-3 py-2 mono text-[10px] flex items-center justify-between"
                style={{
                  color: "var(--text-mute)",
                  borderTop: "1px solid var(--hairline)",
                }}
              >
                <span>↑↓ navigate · ↵ pick</span>
                <a
                  href="/settings"
                  className="hover:text-[var(--accent)] transition-colors"
                  style={{ textDecoration: "none" }}
                >
                  manage endpoints →
                </a>
              </div>
            </Command>
          </PopoverContent>
        </Popover>

        <div className="ml-auto flex items-center gap-1">
          <IconButton
            size="md"
            tooltip={theme === "dark" ? "Switch to light" : "Switch to dark"}
            label="Toggle theme"
            onClick={onToggleTheme}
            icon={
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ rotate: -60, opacity: 0, scale: 0.7 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 60, opacity: 0, scale: 0.7 }}
                  transition={{ type: "spring", stiffness: 360, damping: 24 }}
                  className="inline-flex"
                >
                  {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                </motion.span>
              </AnimatePresence>
            }
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
