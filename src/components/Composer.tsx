"use client";

import { useEffect, useRef, useState } from "react";
import {
  Paperclip, Image as ImageIcon, Globe, ArrowUp, Square, X, FileText, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { IconButton } from "@/components/ui/IconButton";
import { TooltipProvider, Tooltip } from "@/components/ui/Tooltip";

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
  leftOffset = 0,
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
  /**
   * Pixels of padding to apply on the left, so the centered pill lines
   * up with the message column when a sidebar is present. The outer
   * wrapper still spans edge-to-edge so the gradient / blur cover the
   * full width of the viewport.
   */
  leftOffset?: number;
}) {
  const [focused, setFocused] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    if (!value) {
      el.style.height = "44px";
      return;
    }
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
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
    <TooltipProvider>
      <div
        className="absolute left-0 right-0 bottom-0 px-3 pb-3 sm:px-6 sm:pb-6 pointer-events-none z-30 transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, var(--bg-base) 55%)",
          paddingLeft: leftOffset
            ? `calc(${leftOffset}px + 0.75rem)`
            : undefined,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32, delay: 0.08 }}
          className="mx-auto pointer-events-auto w-full"
          style={{ maxWidth: 780 }}
        >
          <div
            className="transition-all"
            style={{
              borderRadius: 24,
              padding: hasAtts ? 12 : "10px 10px 10px 12px",
              background: "var(--glass-solid)",
              backdropFilter: "blur(30px) saturate(1.6)",
              WebkitBackdropFilter: "blur(30px) saturate(1.6)",
              border: `1px solid ${focused ? "var(--hairline-strong)" : "var(--hairline)"}`,
              boxShadow: focused
                ? `0 0 0 4px var(--ring), 0 30px 80px -24px rgba(0,0,0,0.3)`
                : "0 24px 60px -22px rgba(0,0,0,0.22)",
            }}
          >
            <AnimatePresence>
              {hasAtts && (
                <motion.div
                  key="atts"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex flex-wrap gap-2 pb-3 mb-1 overflow-hidden"
                  style={{ borderBottom: "1px solid var(--hairline)" }}
                >
                  {attachments.map((f, i) => {
                    const isImg = f.type.startsWith("image/");
                    const empty = f.size === 0;
                    const sizeLabel =
                      f.size < 1024
                        ? `${f.size} B`
                        : f.size < 1024 * 1024
                          ? `${(f.size / 1024).toFixed(1)} KB`
                          : `${(f.size / 1024 / 1024).toFixed(1)} MB`;
                    return (
                      <motion.div
                        key={i}
                        layout
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.85, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 380, damping: 28 }}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-[12px] text-[12px]"
                        style={{
                          background: "var(--glass)",
                          border: `1px solid ${empty ? "var(--danger)" : "var(--hairline)"}`,
                          color: empty ? "var(--danger)" : "var(--text-dim)",
                        }}
                        title={
                          empty ? `${f.name} is 0 bytes — nothing to send` : f.name
                        }
                      >
                        {isImg ? <ImageIcon size={12} /> : <FileText size={12} />}
                        <span className="max-w-[160px] truncate">{f.name}</span>
                        <span
                          className="mono text-[10px]"
                          style={{
                            color: empty ? "var(--danger)" : "var(--text-mute)",
                          }}
                        >
                          {sizeLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveAttachment(i)}
                          className="p-0.5 rounded cursor-pointer nv-press"
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--text-mute)",
                          }}
                          aria-label="Remove attachment"
                        >
                          <X size={10} />
                        </button>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-end gap-1.5 w-full" style={{ minWidth: 0 }}>
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

              <div className="flex items-center gap-0.5 flex-shrink-0" style={{ height: 44 }}>
                <IconButton
                  size="md"
                  tooltip="Attach"
                  label="Attach files"
                  onClick={() => fileRef.current?.click()}
                  icon={<Paperclip size={15} />}
                />
                <IconButton
                  size="md"
                  tooltip={searchEnabled ? "Web search on" : "Web search"}
                  label="Toggle web search"
                  onClick={onToggleSearch}
                  active={searchEnabled}
                  tone={searchEnabled ? "accent" : "default"}
                  icon={<Globe size={15} />}
                />
              </div>

              <textarea
                ref={ta}
                value={value}
                onChange={e => onChange(e.target.value)}
                onKeyDown={onKey}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                rows={1}
                placeholder="Ask NvTerminal anything…"
                className="flex-1 bg-transparent border-none outline-none resize-none px-1"
                style={{
                  color: "var(--text)",
                  fontFamily: "inherit",
                  fontSize: 15.5,
                  lineHeight: "24px",
                  paddingTop: 10,
                  paddingBottom: 10,
                  minHeight: 44,
                  maxHeight: 200,
                  minWidth: 0,
                }}
              />

              <div className="flex items-center flex-shrink-0" style={{ height: 44 }}>
                {streaming ? (
                  <motion.button
                    key="stop"
                    type="button"
                    onClick={onStop}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 28 }}
                    className="grid place-items-center rounded-full cursor-pointer nv-ring relative"
                    style={{
                      width: 40,
                      height: 40,
                      background: "var(--danger)",
                      color: "#fff",
                      border: "none",
                      boxShadow:
                        "0 0 0 4px rgba(200,61,61,0.18), 0 10px 28px -8px rgba(200,61,61,0.4)",
                    }}
                    title="Stop"
                    aria-label="Stop generation"
                  >
                    <Square size={13} fill="currentColor" />
                  </motion.button>
                ) : (
                  <motion.button
                    key="send"
                    type="button"
                    onClick={onSubmit}
                    disabled={!canSend}
                    whileHover={canSend ? { scale: 1.05 } : {}}
                    whileTap={canSend ? { scale: 0.92 } : {}}
                    transition={{ type: "spring", stiffness: 440, damping: 20 }}
                    className="grid place-items-center rounded-full nv-ring"
                    style={{
                      width: 40,
                      height: 40,
                      background: canSend ? "var(--text)" : "var(--glass)",
                      color: canSend ? "var(--bg-base)" : "var(--text-mute)",
                      border: canSend ? "none" : "1px solid var(--hairline)",
                      cursor: canSend ? "pointer" : "not-allowed",
                      boxShadow: canSend
                        ? "0 10px 26px -8px rgba(0,0,0,0.4)"
                        : "none",
                    }}
                    title="Send"
                    aria-label="Send message"
                  >
                    <ArrowUp size={16} strokeWidth={2.3} />
                  </motion.button>
                )}
              </div>
            </div>
          </div>

          <div
            className="flex items-center justify-center gap-2 mt-3 mono text-[10.5px] tracking-[0.06em]"
            style={{ color: "var(--text-mute)" }}
          >
            <Sparkles size={10} style={{ color: "var(--accent)", opacity: 0.7 }} />
            <span>NvTerminal weaves responses from NIM · verify critical output</span>
          </div>
        </motion.div>
      </div>
    </TooltipProvider>
  );
}
