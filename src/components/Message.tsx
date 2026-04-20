"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight, Brain, Copy, Check, RotateCcw, ThumbsUp, ThumbsDown,
  Pencil, ArrowUp, FileText, Globe, Download, FileSpreadsheet,
  Presentation, FileCode, File as FileIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Message as Msg, MessageAttachment } from "@/lib/types";
import { MarkdownContent } from "./MarkdownContent";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { TooltipProvider } from "@/components/ui/Tooltip";

export function parseThinkTags(content: string): { thinking: string; cleaned: string } {
  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    const thinking = thinkMatch[1].trim();
    const cleaned = content.replace(/<think>[\s\S]*?<\/think>\s*/, "").trim();
    return { thinking, cleaned };
  }
  return { thinking: "", cleaned: content };
}

/* ══════════════════════════════════════════════════════════════
   Reasoning · collapsible glass panel
   ══════════════════════════════════════════════════════════════ */
function Reasoning({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <div
      className="mb-3 overflow-hidden"
      style={{
        borderRadius: 14,
        background: "var(--glass-soft)",
        border: "1px solid var(--hairline)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 cursor-pointer text-[12px] nv-ring"
        style={{ color: "var(--text-dim)", background: "none", border: "none", fontFamily: "inherit" }}
      >
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className="inline-flex"
          style={{ color: "var(--text-mute)" }}
        >
          <ChevronRight size={11} />
        </motion.span>
        <Brain size={12} style={{ color: "var(--accent)", opacity: 0.8 }} />
        <span className="font-medium tracking-[0.02em]">Reasoning</span>
        <span
          className="ml-auto mono text-[10px] tracking-wide"
          style={{ color: "var(--text-mute)" }}
        >
          {open ? "hide" : "show"}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 32 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-3.5 pt-2 text-[12.5px] leading-relaxed whitespace-pre-wrap break-words"
              style={{
                color: "var(--text-dim)",
                borderTop: "1px dashed var(--hairline)",
                paddingTop: 10,
                maxHeight: 400,
                overflowY: "auto",
              }}
            >
              {text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Action bar under assistant messages
   ══════════════════════════════════════════════════════════════ */
function MessageActions({
  content,
  onRegenerate,
}: {
  content: string;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  return (
    <div className="flex gap-1 mt-3 opacity-0 group-hover/msg:opacity-100 transition-opacity">
      <ActionBtn
        onClick={() => {
          navigator.clipboard.writeText(content);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}{" "}
        {copied ? "copied" : "copy"}
      </ActionBtn>
      {onRegenerate && (
        <ActionBtn onClick={onRegenerate}>
          <RotateCcw size={11} /> regenerate
        </ActionBtn>
      )}
      <ActionBtn
        onClick={() => setFeedback(feedback === "up" ? null : "up")}
        active={feedback === "up"}
      >
        <ThumbsUp size={11} />
      </ActionBtn>
      <ActionBtn
        onClick={() => setFeedback(feedback === "down" ? null : "down")}
        active={feedback === "down"}
      >
        <ThumbsDown size={11} />
      </ActionBtn>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-[5px] px-2 py-[5px] rounded-[8px] text-[11px] font-semibold cursor-pointer transition-all nv-press"
      style={{
        background: active ? "var(--glass-strong)" : "transparent",
        border: `1px solid ${active ? "var(--hairline-strong)" : "transparent"}`,
        color: active ? "var(--text)" : "var(--text-dim)",
        fontFamily: "inherit",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "var(--glass)";
        e.currentTarget.style.color = "var(--text)";
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-dim)";
        }
      }}
    >
      {children}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════
   Avatar · quiet geometric mark
   ══════════════════════════════════════════════════════════════ */
function Avatar({ role }: { role: "user" | "assistant" }) {
  if (role === "user") {
    return (
      <div
        className="w-[30px] h-[30px] rounded-[10px] grid place-items-center flex-shrink-0 mono text-[10px] font-bold tracking-wider"
        style={{
          background: "var(--glass)",
          border: "1px solid var(--hairline)",
          color: "var(--text-dim)",
        }}
      >
        YOU
      </div>
    );
  }
  return (
    <div
      className="w-[30px] h-[30px] rounded-[10px] grid place-items-center flex-shrink-0 font-display font-semibold text-[14px] relative overflow-hidden"
      style={{
        background: "var(--text)",
        color: "var(--bg-base)",
        boxShadow: "0 2px 10px -2px rgba(0,0,0,0.3)",
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, var(--accent-glow) 0%, transparent 60%)",
        }}
      />
      <span className="relative" style={{ lineHeight: 1 }}>Ｎ</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main MessageView
   ══════════════════════════════════════════════════════════════ */
export function MessageView({
  message,
  modelName,
  onImageClick,
  isEditing,
  editInput,
  onEditStart,
  onEditChange,
  onEditSubmit,
  onEditCancel,
  isStreaming,
}: {
  message: Msg;
  modelName: string;
  onImageClick?: (src: string) => void;
  isEditing: boolean;
  editInput: string;
  onEditStart: () => void;
  onEditChange: (v: string) => void;
  onEditSubmit: () => void;
  onEditCancel: () => void;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const [showSources, setShowSources] = useState(false);

  const imageAttachments = (message.attachments || []).filter(a =>
    a.type.startsWith("image/")
  );
  const fileAttachments = (message.attachments || []).filter(
    a => a.type !== "source" && !a.type.startsWith("image/")
  );
  const sourceAttachments = (message.attachments || []).filter(
    a => a.type === "source"
  );

  const { thinking: contentThinking, cleaned: cleanedContent } = useMemo(
    () => parseThinkTags(message.content),
    [message.content]
  );
  const fullReasoning = useMemo(
    () => [message.reasoning, contentThinking].filter(Boolean).join("\n\n"),
    [message.reasoning, contentThinking]
  );

  function processContent(content: string): string {
    if (sourceAttachments.length === 0) return content;
    return content.replace(/\[(\d+)\]/g, (match, num) => {
      const idx = parseInt(num) - 1;
      if (idx >= 0 && idx < sourceAttachments.length) {
        return `[\\[${num}\\]](${sourceAttachments[idx].data})`;
      }
      return match;
    });
  }

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex justify-center py-3"
      >
        <span
          className="mono text-[11.5px] px-3 py-1.5 rounded-full"
          style={{
            background: "var(--danger-soft)",
            color: "var(--danger)",
            border: "1px solid var(--danger)",
            backdropFilter: "blur(10px)",
          }}
        >
          {message.content}
        </span>
      </motion.div>
    );
  }

  const ts = new Date(message.createdAt).toTimeString().slice(0, 5);

  return (
    <TooltipProvider>
      <motion.div
        layout="position"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="group/msg mb-7"
      >
        <div className="flex items-center gap-2.5 mb-2.5">
          <Avatar role={isUser ? "user" : "assistant"} />
          <span
            className="text-[13.5px] font-semibold tracking-[-0.01em]"
            style={{ color: "var(--text)" }}
          >
            {isUser ? "You" : modelName}
          </span>
          <span
            className="ml-auto mono text-[10.5px] tracking-wide font-semibold"
            style={{ color: "var(--text-dim)" }}
          >
            {ts}
          </span>
          {isUser && !isEditing && !isStreaming && (
            <button
              type="button"
              onClick={onEditStart}
              className="w-7 h-7 grid place-items-center rounded-lg cursor-pointer opacity-0 group-hover/msg:opacity-100 transition-all nv-press"
              style={{ background: "none", border: "none", color: "var(--text-dim)" }}
              title="Edit message"
              onMouseEnter={e => {
                e.currentTarget.style.background = "var(--glass)";
                e.currentTarget.style.color = "var(--text)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.color = "var(--text-dim)";
              }}
            >
              <Pencil size={12} />
            </button>
          )}
        </div>

        <div className="pl-10">
          {!isUser && <Reasoning text={fullReasoning} />}

          {imageAttachments.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-3">
              {imageAttachments.map((att, i) => (
                <div
                  key={i}
                  className="relative rounded-[16px] overflow-hidden cursor-zoom-in nv-hover-lift"
                  style={{
                    border: "1px solid var(--hairline)",
                    background: "var(--glass)",
                    boxShadow: "var(--shadow-panel)",
                  }}
                  onClick={() => onImageClick?.(att.data)}
                >
                  <img
                    src={att.data}
                    alt={att.name}
                    className="max-h-[320px] max-w-full object-contain block"
                  />
                </div>
              ))}
            </div>
          )}

          {fileAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {fileAttachments.map((att, i) => (
                <FileChip key={i} att={att} />
              ))}
            </div>
          )}

          {isUser ? (
            isEditing ? (
              <div
                className="glass-strong p-2 space-y-2"
                style={{ borderRadius: 16 }}
              >
                <textarea
                  value={editInput}
                  onChange={e => onEditChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onEditSubmit();
                    }
                  }}
                  autoFocus
                  rows={2}
                  className="w-full rounded-[10px] px-3 py-2.5 text-[14px] resize-none bg-transparent border-none outline-none"
                  style={{
                    color: "var(--text)",
                    fontFamily: "inherit",
                    minHeight: 60,
                    maxHeight: 200,
                  }}
                />
                <div className="flex items-center gap-2 px-1">
                  <button
                    type="button"
                    onClick={onEditSubmit}
                    className="px-3 py-1.5 rounded-[10px] text-[12px] font-semibold cursor-pointer flex items-center gap-1.5 nv-press"
                    style={{
                      background: "var(--text)",
                      color: "var(--bg-base)",
                      border: "none",
                    }}
                  >
                    <ArrowUp size={12} /> Resend
                  </button>
                  <button
                    type="button"
                    onClick={onEditCancel}
                    className="px-3 py-1.5 rounded-[10px] text-[12px] cursor-pointer"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-dim)",
                      fontFamily: "inherit",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : message.content ? (
              <div
                className="inline-block max-w-full px-[14px] py-[10px]"
                style={{
                  background: "var(--glass-strong)",
                  border: "1px solid var(--hairline)",
                  borderRadius: 18,
                  backdropFilter: "blur(18px) saturate(1.4)",
                  WebkitBackdropFilter: "blur(18px) saturate(1.4)",
                  boxShadow: "var(--shadow-inset)",
                }}
              >
                <p
                  className="text-[14.5px] leading-relaxed whitespace-pre-wrap"
                  style={{ color: "var(--text)", margin: 0 }}
                >
                  {message.content.replace(/^\[Attached:.*?\]\n*/, "")}
                </p>
              </div>
            ) : null
          ) : (
            <div className="markdown-body">
              <MarkdownContent content={processContent(cleanedContent)} />
            </div>
          )}

          {sourceAttachments.length > 0 && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowSources(v => !v)}
                className="flex items-center gap-2 mono text-[11px] px-3 py-1.5 rounded-[10px] cursor-pointer transition-all nv-press"
                style={{
                  background: "var(--glass-soft)",
                  border: "1px solid var(--hairline)",
                  color: "var(--text-dim)",
                  fontFamily: "inherit",
                }}
              >
                <Globe size={11} style={{ color: "var(--accent)" }} />
                <span>
                  {sourceAttachments.length} source
                  {sourceAttachments.length > 1 ? "s" : ""}
                </span>
                <motion.span
                  animate={{ rotate: showSources ? 90 : 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className="inline-flex"
                >
                  <ChevronRight size={10} />
                </motion.span>
              </button>
              <AnimatePresence>
                {showSources && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-2 mt-2">
                      {sourceAttachments.map((s, i) => (
                        <a
                          key={i}
                          href={s.data}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-[10px] text-[11.5px] nv-hover-lift"
                          style={{
                            background: "var(--glass)",
                            border: "1px solid var(--hairline)",
                            color: "var(--text-dim)",
                          }}
                        >
                          <span
                            className="flex items-center justify-center w-[18px] h-[18px] rounded-md mono text-[10px] font-bold"
                            style={{
                              background: "var(--accent-soft)",
                              color: "var(--accent)",
                            }}
                          >
                            {i + 1}
                          </span>
                          <span className="truncate max-w-[220px]">{s.name}</span>
                        </a>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {!isUser && !isStreaming && <MessageActions content={cleanedContent} />}
        </div>
      </motion.div>
    </TooltipProvider>
  );
}

/* ══════════════════════════════════════════════════════════════
   File chip + preview dialog
   ══════════════════════════════════════════════════════════════ */
function iconForFile(att: MessageAttachment) {
  const t = att.type.toLowerCase();
  const ext = att.name.split(".").pop()?.toLowerCase() || "";
  if (t === "application/pdf" || ext === "pdf")
    return { Icon: FileText, tint: "#c83d3d", label: "PDF" };
  if (ext === "docx" || ext === "doc" || t.includes("word"))
    return { Icon: FileText, tint: "#2b5bd8", label: "DOC" };
  if (
    ext === "xlsx" ||
    ext === "xls" ||
    ext === "csv" ||
    ext === "tsv" ||
    t.includes("spreadsheet") ||
    t === "text/csv"
  )
    return {
      Icon: FileSpreadsheet,
      tint: "#1f8a4c",
      label: ext.toUpperCase() || "XLS",
    };
  if (ext === "pptx" || ext === "ppt" || t.includes("presentation"))
    return { Icon: Presentation, tint: "#d97706", label: "PPT" };
  if (
    [
      "json","xml","yaml","yml","html","css","js","jsx","ts","tsx","py","go","rs","rb","php","java","c","cpp","h","hpp","cs","swift","kt","sh","sql",
    ].includes(ext)
  )
    return { Icon: FileCode, tint: "#7552c4", label: ext.toUpperCase() };
  if (
    t.startsWith("text/") ||
    ["txt", "md", "markdown", "log", "toml", "ini", "conf", "env"].includes(ext)
  )
    return { Icon: FileText, tint: "#5d5d65", label: ext.toUpperCase() || "TXT" };
  return { Icon: FileIcon, tint: "#5d5d65", label: ext.toUpperCase() || "FILE" };
}

function humanSize(dataUri: string): string {
  const comma = dataUri.indexOf(",");
  if (comma < 0) return "";
  const b64 = dataUri.slice(comma + 1);
  const bytes = Math.floor((b64.length * 3) / 4);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function decodeTextFromDataUri(dataUri: string): string {
  const comma = dataUri.indexOf(",");
  if (comma < 0) return "";
  try {
    return atob(dataUri.slice(comma + 1));
  } catch {
    return "";
  }
}

function canPreviewInline(att: MessageAttachment): "pdf" | "text" | "extract" | "none" {
  const t = att.type.toLowerCase();
  const ext = att.name.split(".").pop()?.toLowerCase() || "";
  if (t === "application/pdf" || ext === "pdf") return "pdf";
  const textExts = [
    "txt","md","markdown","json","xml","yaml","yml","log","csv","tsv",
    "html","css","js","jsx","ts","tsx","py","go","rs","rb","php",
    "java","c","cpp","h","hpp","cs","swift","kt","sh","sql","toml",
    "ini","conf","env",
  ];
  if (
    t.startsWith("text/") ||
    t === "application/json" ||
    t === "application/xml" ||
    textExts.includes(ext)
  )
    return "text";
  const extractExts = ["docx", "xlsx", "xls", "pptx"];
  if (
    extractExts.includes(ext) ||
    t.includes("word") ||
    t.includes("spreadsheet") ||
    t.includes("presentation")
  )
    return "extract";
  return "none";
}

function dataUriToBlob(dataUri: string): Blob | null {
  const m = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(dataUri);
  if (!m) return null;
  const mime = m[1] || "application/octet-stream";
  const isB64 = !!m[2];
  const body = m[3] || "";
  try {
    if (isB64) {
      const bin = atob(body);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: mime });
    }
    return new Blob([decodeURIComponent(body)], { type: mime });
  } catch {
    return null;
  }
}

function FilePreviewModal({
  att,
  open,
  onClose,
}: {
  att: MessageAttachment;
  open: boolean;
  onClose: () => void;
}) {
  const kind = canPreviewInline(att);
  const [extracted, setExtracted] = useState<string>("");
  const [extractStatus, setExtractStatus] = useState<"idle" | "loading" | "error" | "done">(
    kind === "extract" ? "loading" : "idle"
  );
  const [pdfImages, setPdfImages] = useState<string[] | null>(null);
  const [pdfImagesStatus, setPdfImagesStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [isMobile, setIsMobile] = useState(false);
  const textBody = kind === "text" ? decodeTextFromDataUri(att.data) : "";

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 820px)");
    setIsMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => {
    if (!open || kind !== "extract") return;
    let cancelled = false;
    (async () => {
      try {
        const blob = dataUriToBlob(att.data);
        if (!blob) {
          if (!cancelled) setExtractStatus("error");
          return;
        }
        const fd = new FormData();
        fd.append("file", new File([blob], att.name, { type: att.type }));
        const r = await fetch("/api/extract", { method: "POST", body: fd });
        if (!r.ok) {
          if (!cancelled) setExtractStatus("error");
          return;
        }
        const j = await r.json();
        if (cancelled) return;
        setExtracted(j.text || "");
        setExtractStatus("done");
      } catch {
        if (!cancelled) setExtractStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [att, kind, open]);

  useEffect(() => {
    if (!open || kind !== "pdf" || !isMobile) return;
    let cancelled = false;
    setPdfImagesStatus("loading");
    (async () => {
      try {
        const blob = dataUriToBlob(att.data);
        if (!blob) {
          if (!cancelled) setPdfImagesStatus("error");
          return;
        }
        const fd = new FormData();
        fd.append(
          "file",
          new File([blob], att.name, {
            type: att.type || "application/pdf",
          })
        );
        const r = await fetch("/api/extract?preview=1", {
          method: "POST",
          body: fd,
        });
        if (!r.ok) {
          if (!cancelled) setPdfImagesStatus("error");
          return;
        }
        const j = await r.json();
        if (cancelled) return;
        setPdfImages(Array.isArray(j.images) ? j.images : []);
        setPdfImagesStatus("done");
      } catch {
        if (!cancelled) setPdfImagesStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, isMobile, att, open]);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent
        title={att.name}
        onClose={onClose}
      >
        <div
          className="flex items-center gap-2 px-5 py-3"
          style={{ borderBottom: "1px solid var(--hairline)" }}
        >
          <a
            href={att.data}
            download={att.name}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-[12px] cursor-pointer nv-press"
            style={{
              background: "var(--glass)",
              border: "1px solid var(--hairline)",
              color: "var(--text-dim)",
              textDecoration: "none",
            }}
            title="Download"
          >
            <Download size={12} /> Download
          </a>
        </div>
        <div
          className="flex-1 min-h-0 overflow-auto"
          style={{ background: "var(--bg-tone)" }}
        >
          {kind === "pdf" ? (
            isMobile ? (
              pdfImagesStatus === "loading" || pdfImagesStatus === "idle" ? (
                <LoadingRow label="Rendering PDF…" />
              ) : pdfImagesStatus === "error" || !pdfImages?.length ? (
                <ErrorRow att={att} message="Could not render preview." />
              ) : (
                <div className="flex flex-col gap-3 p-3" style={{ background: "#2a2a2a" }}>
                  {pdfImages.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Page ${i + 1}`}
                      className="w-full h-auto rounded-md"
                      style={{ background: "#fff", display: "block" }}
                    />
                  ))}
                </div>
              )
            ) : (
              <iframe
                src={att.data}
                title={att.name}
                className="w-full h-full"
                style={{ border: "none", background: "#fff" }}
              />
            )
          ) : kind === "text" ? (
            <pre
              className="p-5 text-[12.5px] mono whitespace-pre-wrap break-words"
              style={{ color: "var(--text)", margin: 0 }}
            >
              {textBody}
            </pre>
          ) : kind === "extract" ? (
            extractStatus === "loading" ? (
              <LoadingRow label="Extracting preview…" />
            ) : extractStatus === "error" ? (
              <ErrorRow att={att} message="Preview failed to load." />
            ) : (
              <pre
                className="p-5 text-[12.5px] mono whitespace-pre-wrap break-words"
                style={{ color: "var(--text)", margin: 0 }}
              >
                {extracted || "(no extractable content)"}
              </pre>
            )
          ) : (
            <ErrorRow att={att} message="No inline preview available for this format." />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="h-full grid place-items-center">
      <div
        className="flex items-center gap-2 mono text-[13px]"
        style={{ color: "var(--text-dim)" }}
      >
        <span className="nv-dot" />
        {label}
      </div>
    </div>
  );
}

function ErrorRow({
  att,
  message,
}: {
  att: MessageAttachment;
  message: string;
}) {
  return (
    <div className="h-full grid place-items-center p-8 text-center">
      <div>
        <p className="text-[14px] mb-3" style={{ color: "var(--text-dim)" }}>
          {message}
        </p>
        <a
          href={att.data}
          download={att.name}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-[10px] text-[12.5px] font-medium"
          style={{
            background: "var(--text)",
            color: "var(--bg-base)",
            textDecoration: "none",
          }}
        >
          <Download size={13} /> Download {att.name}
        </a>
      </div>
    </div>
  );
}

function FileChip({ att }: { att: MessageAttachment }) {
  const { Icon, tint, label } = iconForFile(att);
  const size = humanSize(att.data);
  const [preview, setPreview] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setPreview(true)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-[14px] transition-all cursor-pointer nv-hover-lift"
        style={{
          background: "var(--glass)",
          border: "1px solid var(--hairline)",
          color: "var(--text)",
          maxWidth: 280,
          fontFamily: "inherit",
          textAlign: "left",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "var(--glass-strong)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "var(--glass)";
        }}
        title={`Preview ${att.name}`}
      >
        <div
          className="grid place-items-center rounded-[10px] flex-shrink-0"
          style={{ width: 34, height: 34, background: tint + "1f", color: tint }}
        >
          <Icon size={15} />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span
            className="text-[12.5px] font-medium truncate"
            style={{ color: "var(--text)" }}
          >
            {att.name}
          </span>
          <span
            className="mono text-[10px] tracking-wide"
            style={{ color: "var(--text-mute)" }}
          >
            {label}
            {size ? ` · ${size}` : ""}
          </span>
        </div>
      </button>
      {preview && (
        <FilePreviewModal att={att} open={preview} onClose={() => setPreview(false)} />
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   StreamingView
   ══════════════════════════════════════════════════════════════ */
export function StreamingView({
  modelName,
  streamContent,
  streamReasoning,
  searchSources,
  isSearching,
}: {
  modelName: string;
  streamContent: string;
  streamReasoning: string;
  searchSources: Array<{ title: string; url: string }>;
  isSearching: boolean;
}) {
  const parsed = useMemo(() => parseThinkTags(streamContent), [streamContent]);
  const reasoning = streamReasoning || parsed.thinking;

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 34 }}
      className="mb-7"
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <Avatar role="assistant" />
        <span
          className="text-[13.5px] font-semibold tracking-[-0.01em]"
          style={{ color: "var(--text)" }}
        >
          {modelName}
        </span>
        <span
          className="ml-3 flex items-center gap-1.5 mono text-[10px] tracking-[0.1em] uppercase"
          style={{ color: "var(--accent)" }}
        >
          <span className="nv-dot" />
          thinking
        </span>
      </div>
      <div className="pl-10">
        {searchSources.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {searchSources.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-[11px]"
                style={{
                  background: "var(--glass)",
                  border: "1px solid var(--hairline)",
                  color: "var(--text-dim)",
                  maxWidth: 220,
                }}
              >
                <Globe size={11} style={{ color: "var(--accent)" }} />
                <span className="truncate">{s.title}</span>
              </a>
            ))}
          </div>
        )}

        <Reasoning text={reasoning} />

        {streamContent ? (
          <div className="markdown-body">
            <MarkdownContent content={parsed.cleaned || streamContent} />
            <span className="nv-cursor" />
          </div>
        ) : !reasoning && !isSearching ? (
          <div
            className="flex items-center gap-2.5 mono text-[12.5px]"
            style={{ color: "var(--text-dim)" }}
          >
            <span className="nv-dot" />
            <span className="nv-text-gradient">weaving response</span>
          </div>
        ) : isSearching ? (
          <div
            className="flex items-center gap-2.5 mono text-[12.5px]"
            style={{ color: "var(--text-dim)" }}
          >
            <Globe
              size={13}
              style={{ color: "var(--accent)" }}
              className="animate-spin"
            />
            scanning the web…
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
