"use client";

import { useEffect, useRef, useState } from "react";
import {
  Paperclip, Image as ImageIcon, Globe, Send, Square, X, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  streaming,
  attachments,
  onAttach,
  onRemoveAttachment,
  searchEnabled,
  onToggleSearch,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  streaming: boolean;
  attachments: File[];
  onAttach: (files: File[]) => void;
  onRemoveAttachment: (i: number) => void;
  searchEnabled: boolean;
  onToggleSearch: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ta.current) return;
    ta.current.style.height = "auto";
    ta.current.style.height = Math.min(ta.current.scrollHeight, 180) + "px";
  }, [value]);

  const hasAtts = attachments.length > 0;
  const canSend = value.trim().length > 0 || attachments.length > 0;

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend && !streaming) onSubmit();
    }
  };

  return (
    <div
      className="absolute left-0 right-0 bottom-0 px-4 pb-4 sm:px-7 sm:pb-7 pointer-events-none"
      style={{
        background: "linear-gradient(180deg, transparent 0%, var(--canvas) 50%)",
      }}
    >
      <div
        className="mx-auto pointer-events-auto transition-all w-full"
        style={{
          maxWidth: 780,
          background: "var(--panel)",
          border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`,
          borderRadius: 14,
          padding: hasAtts ? 8 : "6px 8px 6px 6px",
          boxShadow: focused ? "0 0 0 3px var(--accent-soft)" : "0 8px 30px -12px rgba(0,0,0,.1)",
          display: "flex",
          flexDirection: hasAtts ? "column" : "row",
          alignItems: hasAtts ? "stretch" : "center",
          gap: 6,
          minWidth: 0,
        }}
      >
        {hasAtts && (
          <div
            className="flex flex-wrap gap-1.5 px-1 pb-2 mb-1"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            {attachments.map((f, i) => {
              const isImg = f.type.startsWith("image/");
              const empty = f.size === 0;
              const sizeLabel = f.size < 1024
                ? `${f.size} B`
                : f.size < 1024 * 1024
                  ? `${(f.size / 1024).toFixed(1)} KB`
                  : `${(f.size / 1024 / 1024).toFixed(1)} MB`;
              return (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[12px]"
                  style={{
                    background: "var(--card)",
                    border: `1px solid ${empty ? "var(--danger)" : "var(--border)"}`,
                    color: empty ? "var(--danger)" : "var(--text-dim)",
                  }}
                  title={empty ? `${f.name} is 0 bytes — nothing to send` : f.name}
                >
                  {isImg ? <ImageIcon size={12} /> : <FileText size={12} />}
                  <span className="max-w-[140px] truncate">{f.name}</span>
                  <span className="mono text-[10px]" style={{ color: empty ? "var(--danger)" : "var(--text-mute)" }}>
                    {sizeLabel}
                  </span>
                  <button
                    onClick={() => onRemoveAttachment(i)}
                    className="p-0.5 rounded cursor-pointer transition-colors"
                    style={{ background: "none", border: "none", color: "var(--text-mute)" }}
                    aria-label="Remove attachment"
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-1.5 w-full" style={{ minWidth: 0 }}>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,.pdf,.docx,.xlsx,.xls,.csv,.tsv,.pptx,.txt,.md,.markdown,.json,.xml,.yaml,.yml,.log,.html,.css,.js,.jsx,.ts,.tsx,.py,.go,.rs,.rb,.php,.java,.c,.cpp,.h,.hpp,.cs,.swift,.kt,.sh,.sql,.toml,.ini,.conf,.env"
            style={{ display: "none" }}
            onChange={e => {
              if (e.target.files) onAttach(Array.from(e.target.files));
              e.target.value = "";
            }}
          />
          <IcButton title="Attach" onClick={() => fileRef.current?.click()}>
            <Paperclip size={16} />
          </IcButton>
          <IcButton title="Web search" onClick={onToggleSearch} active={searchEnabled}>
            <Globe size={16} />
          </IcButton>

          <textarea
            ref={ta}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={onKey}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            rows={1}
            placeholder="Type message"
            className="flex-1 bg-transparent border-none outline-none resize-none"
            style={{
              color: "var(--text)",
              fontFamily: "inherit",
              fontSize: 16, // 16px prevents iOS zoom-on-focus
              padding: "10px 4px",
              lineHeight: 1.5,
              minHeight: 24,
              maxHeight: 180,
              minWidth: 0,
              width: "100%",
            }}
          />

          {streaming ? (
            <button
              onClick={onStop}
              className="grid place-items-center rounded-[10px] cursor-pointer"
              style={{
                width: 34, height: 34, flexShrink: 0,
                background: "var(--danger)", color: "#fff", border: "none",
              }}
              title="Stop"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={!canSend}
              className="grid place-items-center rounded-[10px] transition-all"
              style={{
                width: 34, height: 34, flexShrink: 0,
                background: canSend ? "var(--accent)" : "var(--card)",
                color: canSend ? "var(--accent-ink)" : "var(--text-mute)",
                border: "none",
                cursor: canSend ? "pointer" : "not-allowed",
              }}
              title="Send"
            >
              <Send size={14} />
            </button>
          )}
        </div>
      </div>

      <div
        className="mx-auto mt-2 text-center text-[11px] mono pointer-events-auto"
        style={{ maxWidth: 780, color: "var(--text-mute)" }}
      >
        NvTerminal can make mistakes · verify critical output
      </div>
    </div>
  );
}

function IcButton({
  children, onClick, title, active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-2 grid place-items-center rounded-lg cursor-pointer flex-shrink-0 transition-colors"
      style={{
        background: active ? "var(--accent-soft)" : "none",
        border: "none",
        color: active ? "var(--accent)" : "var(--text-dim)",
      }}
      onMouseEnter={e => {
        if (!active) { e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.color = "var(--text)"; }
      }}
      onMouseLeave={e => {
        if (!active) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-dim)"; }
      }}
    >
      {children}
    </button>
  );
}
