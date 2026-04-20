"use client";

import { useMemo, useState } from "react";
import {
  Plus, Search, Trash2, Settings, PanelLeftClose, Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Conversation } from "@/lib/types";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip, TooltipProvider } from "@/components/ui/Tooltip";

export function Sidebar({
  conversations,
  activeId,
  onSelectConv,
  onNewChat,
  onDeleteConv,
  onCollapse,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelectConv: (id: string) => void;
  onNewChat: () => void;
  onDeleteConv: (id: string) => void;
  onCollapse: () => void;
  theme?: "light" | "dark";
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return conversations;
    const q = query.toLowerCase();
    return conversations.filter(c => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  return (
    <TooltipProvider>
      <aside
        className="glass flex flex-col h-full w-full overflow-hidden"
        style={{
          borderRadius: "var(--r-lg)",
        }}
      >
        {/* ── Brand strip ── */}
        <div className="px-4 pt-4 pb-3 flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="w-8 h-8 grid place-items-center rounded-xl flex-shrink-0"
              style={{
                background: "var(--text)",
                color: "var(--bg-base)",
                boxShadow: "0 2px 10px -2px rgba(0,0,0,0.25)",
              }}
            >
              <Sparkles size={14} strokeWidth={2.2} />
            </div>
            <div className="flex flex-col min-w-0">
              <span
                className="font-display text-[18px] font-semibold tracking-[-0.02em] leading-none truncate"
                style={{ color: "var(--text)" }}
              >
                NvTerminal
              </span>
              <span
                className="mono text-[9.5px] mt-1 tracking-[0.18em] uppercase opacity-70"
                style={{ color: "var(--text-mute)" }}
              >
                atelier · nim
              </span>
            </div>
          </div>
          <IconButton
            size="sm"
            tooltip="Collapse"
            label="Collapse sidebar"
            onClick={onCollapse}
            icon={<PanelLeftClose size={14} />}
          />
        </div>

        {/* ── New chat ── */}
        <div className="px-3 mt-1">
          <button
            type="button"
            onClick={onNewChat}
            className="w-full flex items-center gap-2.5 px-3 py-[11px] rounded-[14px] text-[13px] font-medium cursor-pointer nv-ring nv-press transition-all"
            style={{
              background: "var(--text)",
              color: "var(--bg-base)",
              border: "1px solid transparent",
              boxShadow: "0 6px 20px -8px rgba(0,0,0,0.35)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 10px 26px -8px rgba(0,0,0,0.4)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 6px 20px -8px rgba(0,0,0,0.35)";
            }}
          >
            <Plus size={14} strokeWidth={2.2} />
            <span>New conversation</span>
          </button>
        </div>

        {/* ── Search ── */}
        <div className="px-3 mt-3 mb-2">
          <div
            className="relative rounded-[12px] transition-all"
            style={{
              background: "var(--glass-soft)",
              border: "1px solid var(--hairline)",
            }}
          >
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--text-mute)" }}
            />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search conversations"
              className="w-full bg-transparent border-none outline-none pl-9 pr-3 py-[9px] text-[12.5px]"
              style={{ color: "var(--text)", fontFamily: "inherit" }}
            />
          </div>
        </div>

        {/* ── List ── */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 w-full min-w-0 px-2 pb-2"
          style={{ maxWidth: "100%" }}
        >
            <div
              className="px-2 pt-3 pb-1.5 mono text-[9.5px] tracking-[0.18em] uppercase font-semibold"
              style={{ color: "var(--text-mute)" }}
            >
              Sessions · {filtered.length}
            </div>

            {filtered.length === 0 && (
              <div
                className="mx-2 my-3 px-3 py-6 text-center rounded-[14px] text-[12px]"
                style={{
                  color: "var(--text-mute)",
                  background: "var(--glass-soft)",
                  border: "1px dashed var(--hairline)",
                }}
              >
                {query ? "Nothing matches." : "Your first session will appear here."}
              </div>
            )}

            <AnimatePresence initial={false}>
              {filtered.map(c => {
                const active = c.id === activeId;
                return (
                  <motion.div
                    key={c.id}
                    layout="position"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.14 } }}
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    onClick={() => onSelectConv(c.id)}
                    className="group relative flex items-center gap-2 pl-2.5 pr-1.5 py-[10px] my-[2px] rounded-[12px] cursor-pointer text-[13px] w-full min-w-0 overflow-hidden"
                    style={{
                      background: active ? "var(--glass-strong)" : "transparent",
                      color: "var(--text)",
                      border: active ? "1px solid var(--hairline)" : "1px solid transparent",
                      boxShadow: active ? "var(--shadow-inset)" : "none",
                      boxSizing: "border-box",
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.background = "var(--glass)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {/* Active indicator dot */}
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all"
                      style={{
                        background: active ? "var(--accent)" : "var(--text-mute)",
                        opacity: active ? 1 : 0.4,
                        boxShadow: active ? "0 0 10px var(--accent-glow)" : "none",
                      }}
                    />
                    <span
                      className="flex-1 min-w-0 truncate"
                      style={{
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.title}
                    </span>
                    <Tooltip label="Delete">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteConv(c.id);
                        }}
                        className="flex-shrink-0 w-6 h-6 grid place-items-center opacity-0 group-hover:opacity-100 rounded-md transition-opacity cursor-pointer"
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-mute)",
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = "var(--danger)";
                          e.currentTarget.style.background = "var(--glass)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = "var(--text-mute)";
                          e.currentTarget.style.background = "none";
                        }}
                        aria-label="Delete conversation"
                      >
                        <Trash2 size={12} />
                      </button>
                    </Tooltip>
                  </motion.div>
                );
              })}
            </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <div
          className="px-3 py-3"
          style={{ borderTop: "1px solid var(--hairline)" }}
        >
          <a
            href="/settings"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-[12px] text-[12.5px] transition-all cursor-pointer"
            style={{
              color: "var(--text-dim)",
              background: "transparent",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "var(--glass)";
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-dim)";
            }}
          >
            <Settings size={13} />
            <span>Model endpoints</span>
            <span
              className="ml-auto mono text-[10px] opacity-60"
              style={{ color: "var(--text-mute)" }}
            >
              ⌘,
            </span>
          </a>
        </div>
      </aside>
    </TooltipProvider>
  );
}
