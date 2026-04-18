"use client";

import { useMemo, useState } from "react";
import {
  Plus, Search, MessageSquare, Trash2, Settings, PanelLeftClose,
} from "lucide-react";
import { Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Sidebar({
  conversations,
  activeId,
  onSelectConv,
  onNewChat,
  onDeleteConv,
  onCollapse,
  theme,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelectConv: (id: string) => void;
  onNewChat: () => void;
  onDeleteConv: (id: string) => void;
  onCollapse: () => void;
  theme: "light" | "dark";
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return conversations;
    const q = query.toLowerCase();
    return conversations.filter(c => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  return (
    <aside
      className="flex flex-col h-full min-h-0"
      style={{ background: "var(--sidebar)", borderRight: "1px solid var(--border)" }}
    >
      <div className="px-3.5 pt-4 pb-2.5 flex items-center gap-2">
        <button
          onClick={onNewChat}
          className="flex-1 flex items-center justify-center gap-2 px-3.5 py-3 rounded-[10px] text-[13.5px] font-medium cursor-pointer border-none transition-colors"
          style={{
            background: theme === "dark" ? "#ffffff" : "#0a0a0a",
            color: theme === "dark" ? "#0a0a0a" : "#ffffff",
          }}
        >
          <Plus size={14} />
          <span>New chat</span>
        </button>
        <button
          onClick={onCollapse}
          className="p-2 rounded-md cursor-pointer transition-colors"
          style={{ background: "none", border: "none", color: "var(--text-mute)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-mute)"; }}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      <div className="relative mx-3.5 mb-1.5">
        <Search
          size={14}
          className="absolute left-2.5 top-[9px]"
          style={{ color: "var(--text-mute)" }}
        />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search conversations…"
          className="w-full rounded-lg px-[10px] pl-[30px] py-[8px] text-[12.5px] outline-none nv-focus-ring transition-colors"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            fontFamily: "inherit",
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-2.5 min-h-0">
        <div className="px-2 py-2.5 text-[10.5px] uppercase tracking-[0.06em] font-medium" style={{ color: "var(--text-mute)" }}>
          Sessions
        </div>
        {filtered.length === 0 && (
          <div className="px-2 py-5 text-center text-[12px]" style={{ color: "var(--text-mute)" }}>
            {query ? "No matches." : "No active sessions"}
          </div>
        )}
        {filtered.map(c => {
          const active = c.id === activeId;
          return (
            <div
              key={c.id}
              onClick={() => onSelectConv(c.id)}
              className={cn(
                "group flex items-center gap-2.5 px-2.5 py-[9px] my-[1px] rounded-[9px] cursor-pointer text-[13px] relative"
              )}
              style={{
                background: active ? "var(--card)" : "transparent",
                color: "var(--text)",
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget.style.background = "var(--card)"); }}
              onMouseLeave={e => { if (!active) (e.currentTarget.style.background = "transparent"); }}
            >
              <div
                className="w-[22px] h-[22px] rounded-[5px] grid place-items-center flex-shrink-0"
                style={{
                  border: active ? "1px solid var(--accent)" : "1px dashed var(--border-strong)",
                  color: active ? "var(--accent)" : "var(--text-dim)",
                }}
              >
                <MessageSquare size={12} />
              </div>
              <span className="flex-1 min-w-0 truncate">{c.title}</span>
              <button
                onClick={e => { e.stopPropagation(); onDeleteConv(c.id); }}
                className="opacity-0 group-hover:opacity-100 p-[3px] rounded transition-opacity"
                style={{ color: "var(--text-mute)", background: "none", border: "none", cursor: "pointer" }}
                aria-label="Delete conversation"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>

      <div
        className="px-2.5 pt-2 pb-3.5"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <a
          href="/settings"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] cursor-pointer transition-colors w-full"
          style={{ background: "none", color: "var(--text)", fontFamily: "inherit" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--card)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          <div
            className="w-[22px] h-[22px] rounded-[5px] grid place-items-center flex-shrink-0"
            style={{ border: "1px dashed var(--border-strong)", color: "var(--text-dim)" }}
          >
            <Settings size={12} />
          </div>
          <span>Settings</span>
        </a>
      </div>
    </aside>
  );
}
