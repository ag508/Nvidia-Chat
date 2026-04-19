"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight, Brain, Copy, Check, RotateCcw, ThumbsUp, ThumbsDown,
  Pencil, Send, FileText, Globe, Download, FileSpreadsheet,
  Presentation, FileCode, File as FileIcon, X,
} from "lucide-react";
import { Message as Msg, MessageAttachment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "./MarkdownContent";

export function parseThinkTags(content: string): { thinking: string; cleaned: string } {
  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    const thinking = thinkMatch[1].trim();
    const cleaned = content.replace(/<think>[\s\S]*?<\/think>\s*/, "").trim();
    return { thinking, cleaned };
  }
  return { thinking: "", cleaned: content };
}

function Reasoning({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <div
      className="mb-3 rounded-[10px] overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "var(--card)" }}
    >
      <div
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer text-[12px]"
        style={{ color: "var(--text-dim)" }}
      >
        <ChevronRight
          size={11}
          style={{
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform .2s",
            color: "var(--text-mute)",
          }}
        />
        <Brain size={12} />
        <span>Reasoning</span>
        <span className="ml-auto" style={{ color: "var(--text-mute)" }}>{open ? "hide" : "show"}</span>
      </div>
      {open && (
        <div
          className="px-3.5 pb-3 text-[12.5px] leading-relaxed whitespace-pre-wrap break-words"
          style={{
            color: "var(--text-dim)",
            borderTop: "1px dashed var(--border)",
            paddingTop: 10,
            maxHeight: 400,
            overflowY: "auto",
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

function MessageActions({ content, onRegenerate }: { content: string; onRegenerate?: () => void }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  return (
    <div className="flex gap-[2px] mt-3 opacity-0 group-hover/msg:opacity-100 transition-opacity">
      <ActionBtn onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
        {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Copied" : "Copy"}
      </ActionBtn>
      {onRegenerate && (
        <ActionBtn onClick={onRegenerate}>
          <RotateCcw size={11} /> Regenerate
        </ActionBtn>
      )}
      <ActionBtn onClick={() => setFeedback(feedback === "up" ? null : "up")} active={feedback === "up"}>
        <ThumbsUp size={11} />
      </ActionBtn>
      <ActionBtn onClick={() => setFeedback(feedback === "down" ? null : "down")} active={feedback === "down"}>
        <ThumbsDown size={11} />
      </ActionBtn>
    </div>
  );
}

function ActionBtn({
  children, onClick, active,
}: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-[5px] px-2 py-[5px] rounded-md text-[11px] cursor-pointer transition-colors"
      style={{
        background: active ? "var(--card)" : "none",
        border: "1px solid transparent",
        color: active ? "var(--text)" : "var(--text-mute)",
        fontFamily: "inherit",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.color = "var(--text)"; }}
      onMouseLeave={e => {
        if (!active) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-mute)"; }
      }}
    >
      {children}
    </button>
  );
}

function Avatar({ role }: { role: "user" | "assistant" }) {
  if (role === "user") {
    return (
      <div
        className="w-[30px] h-[30px] rounded-lg grid place-items-center mono text-[11px] font-bold flex-shrink-0"
        style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }}
      >
        YOU
      </div>
    );
  }
  return (
    <div
      className="w-[30px] h-[30px] rounded-lg grid place-items-center mono text-[11px] font-bold flex-shrink-0"
      style={{
        background: "var(--text)",
        color: "var(--bg)",
      }}
    >
      NV
    </div>
  );
}

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

  const imageAttachments = (message.attachments || []).filter(a => a.type.startsWith("image/"));
  const fileAttachments = (message.attachments || []).filter(
    a => a.type !== "source" && !a.type.startsWith("image/")
  );
  const sourceAttachments = (message.attachments || []).filter(a => a.type === "source");

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
      <div className="flex justify-center py-3">
        <span
          className="mono text-[12px] px-3.5 py-1.5 rounded-full"
          style={{
            background: "var(--danger-soft)",
            color: "var(--danger)",
            border: "1px solid var(--danger)",
          }}
        >
          {message.content}
        </span>
      </div>
    );
  }

  const ts = new Date(message.createdAt).toTimeString().slice(0, 5);

  return (
    <div className="group/msg mb-[26px]">
      <div className="flex items-center gap-2.5 mb-2.5">
        <Avatar role={isUser ? "user" : "assistant"} />
        <span className="text-[13.5px] font-semibold" style={{ color: "var(--text)" }}>
          {isUser ? "You" : modelName}
        </span>
        <span className="ml-auto mono text-[11px]" style={{ color: "var(--text-mute)" }}>{ts}</span>
        {isUser && !isEditing && !isStreaming && (
          <button
            onClick={onEditStart}
            className="p-1.5 rounded-md cursor-pointer opacity-0 group-hover/msg:opacity-100 transition-all"
            style={{ background: "none", border: "none", color: "var(--text-mute)" }}
            title="Edit message"
            onMouseEnter={e => { e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-mute)"; }}
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
                className="relative rounded-xl overflow-hidden cursor-zoom-in"
                style={{ border: "1px solid var(--border)", background: "var(--card)" }}
                onClick={() => onImageClick?.(att.data)}
              >
                <img src={att.data} alt={att.name} className="max-h-[300px] max-w-full object-contain block" />
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
            <div className="space-y-2">
              <textarea
                value={editInput}
                onChange={e => onEditChange(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onEditSubmit(); } }}
                autoFocus
                rows={2}
                className="w-full rounded-lg px-3 py-2.5 text-[14px] resize-none nv-focus-ring"
                style={{
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  outline: "none",
                  fontFamily: "inherit",
                  minHeight: 60,
                  maxHeight: 200,
                }}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={onEditSubmit}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer flex items-center gap-1.5"
                  style={{ background: "var(--accent)", color: "var(--accent-ink)", border: "none" }}
                >
                  <Send size={12} /> Submit
                </button>
                <button
                  onClick={onEditCancel}
                  className="px-3 py-1.5 rounded-lg text-[12px] cursor-pointer"
                  style={{ background: "none", border: "none", color: "var(--text-dim)", fontFamily: "inherit" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            message.content ? (
              <p
                className="text-[14.5px] leading-relaxed whitespace-pre-wrap"
                style={{ color: "var(--text)" }}
              >
                {message.content.replace(/^\[Attached:.*?\]\n*/, "")}
              </p>
            ) : null
          )
        ) : (
          <div className="markdown-body">
            <MarkdownContent content={processContent(cleanedContent)} />
          </div>
        )}

        {sourceAttachments.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowSources(v => !v)}
              className="flex items-center gap-2 mono text-[12px] px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--text-mute)",
                fontFamily: "inherit",
              }}
            >
              <Globe size={12} />
              <span>{sourceAttachments.length} Source{sourceAttachments.length > 1 ? "s" : ""}</span>
              <ChevronRight size={11} style={{ transform: showSources ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .2s" }} />
            </button>
            {showSources && (
              <div className="flex flex-wrap gap-2 mt-2">
                {sourceAttachments.map((s, i) => (
                  <a
                    key={i}
                    href={s.data}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11.5px] transition-all"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      color: "var(--text-dim)",
                    }}
                  >
                    <span
                      className="flex items-center justify-center w-[18px] h-[18px] rounded mono text-[10px] font-bold"
                      style={{ background: "var(--bg)", color: "var(--accent)", border: "1px solid var(--border)" }}
                    >
                      {i + 1}
                    </span>
                    <span className="truncate max-w-[220px]">{s.name}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {!isUser && !isStreaming && <MessageActions content={cleanedContent} />}
      </div>
    </div>
  );
}

function iconForFile(att: MessageAttachment) {
  const t = att.type.toLowerCase();
  const ext = att.name.split(".").pop()?.toLowerCase() || "";
  if (t === "application/pdf" || ext === "pdf") return { Icon: FileText, tint: "#d8443b", label: "PDF" };
  if (ext === "docx" || ext === "doc" || t.includes("word")) return { Icon: FileText, tint: "#2b5bd8", label: "DOC" };
  if (ext === "xlsx" || ext === "xls" || ext === "csv" || ext === "tsv" || t.includes("spreadsheet") || t === "text/csv")
    return { Icon: FileSpreadsheet, tint: "#1f8a4c", label: ext.toUpperCase() || "XLS" };
  if (ext === "pptx" || ext === "ppt" || t.includes("presentation"))
    return { Icon: Presentation, tint: "#d97706", label: "PPT" };
  if (["json", "xml", "yaml", "yml", "html", "css", "js", "jsx", "ts", "tsx", "py", "go", "rs", "rb", "php", "java", "c", "cpp", "h", "hpp", "cs", "swift", "kt", "sh", "sql"].includes(ext))
    return { Icon: FileCode, tint: "#6b46c1", label: ext.toUpperCase() };
  if (t.startsWith("text/") || ["txt", "md", "markdown", "log", "toml", "ini", "conf", "env"].includes(ext))
    return { Icon: FileText, tint: "#4d4d52", label: ext.toUpperCase() || "TXT" };
  return { Icon: FileIcon, tint: "#4d4d52", label: ext.toUpperCase() || "FILE" };
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
    "txt", "md", "markdown", "json", "xml", "yaml", "yml", "log", "csv", "tsv",
    "html", "css", "js", "jsx", "ts", "tsx", "py", "go", "rs", "rb", "php",
    "java", "c", "cpp", "h", "hpp", "cs", "swift", "kt", "sh", "sql", "toml",
    "ini", "conf", "env",
  ];
  if (t.startsWith("text/") || t === "application/json" || t === "application/xml" || textExts.includes(ext)) return "text";
  const extractExts = ["docx", "xlsx", "xls", "pptx"];
  if (extractExts.includes(ext) || t.includes("word") || t.includes("spreadsheet") || t.includes("presentation")) return "extract";
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

function FilePreviewModal({ att, onClose }: { att: MessageAttachment; onClose: () => void }) {
  const kind = canPreviewInline(att);
  const [extracted, setExtracted] = useState<string>("");
  const [extractStatus, setExtractStatus] = useState<"idle" | "loading" | "error" | "done">(kind === "extract" ? "loading" : "idle");
  const textBody = kind === "text" ? decodeTextFromDataUri(att.data) : "";

  useEffect(() => {
    if (kind !== "extract") return;
    let cancelled = false;
    (async () => {
      try {
        const blob = dataUriToBlob(att.data);
        if (!blob) { if (!cancelled) setExtractStatus("error"); return; }
        const fd = new FormData();
        fd.append("file", new File([blob], att.name, { type: att.type }));
        const r = await fetch("/api/extract", { method: "POST", body: fd });
        if (!r.ok) { if (!cancelled) setExtractStatus("error"); return; }
        const j = await r.json();
        if (cancelled) return;
        setExtracted(j.text || "");
        setExtractStatus("done");
      } catch {
        if (!cancelled) setExtractStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [att, kind]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[960px] h-[85vh] rounded-xl overflow-hidden flex flex-col"
        style={{ background: "var(--panel)", border: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <span className="text-[13.5px] font-semibold truncate flex-1" style={{ color: "var(--text)" }}>{att.name}</span>
          <a
            href={att.data}
            download={att.name}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] cursor-pointer"
            style={{ background: "var(--card)", color: "var(--text-dim)", textDecoration: "none" }}
            title="Download"
          >
            <Download size={13} /> Download
          </a>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md cursor-pointer"
            style={{ background: "var(--card)", border: "none", color: "var(--text-dim)" }}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto" style={{ background: "var(--canvas)" }}>
          {kind === "pdf" ? (
            <iframe
              src={att.data}
              title={att.name}
              className="w-full h-full"
              style={{ border: "none", background: "#fff" }}
            />
          ) : kind === "text" ? (
            <pre
              className="p-4 text-[12.5px] mono whitespace-pre-wrap break-words"
              style={{ color: "var(--text)", margin: 0 }}
            >
              {textBody}
            </pre>
          ) : kind === "extract" ? (
            extractStatus === "loading" ? (
              <div className="h-full grid place-items-center">
                <div className="flex items-center gap-2 mono text-[13px]" style={{ color: "var(--text-dim)" }}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)", animation: "nv-blink 1s steps(1) infinite" }} />
                  Extracting preview…
                </div>
              </div>
            ) : extractStatus === "error" ? (
              <div className="h-full grid place-items-center p-8 text-center">
                <div>
                  <p className="text-[14px] mb-3" style={{ color: "var(--text-dim)" }}>Preview failed to load.</p>
                  <a href={att.data} download={att.name}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] font-medium"
                    style={{ background: "var(--accent)", color: "var(--accent-ink)", textDecoration: "none" }}>
                    <Download size={13} /> Download
                  </a>
                </div>
              </div>
            ) : (
              <pre
                className="p-4 text-[12.5px] mono whitespace-pre-wrap break-words"
                style={{ color: "var(--text)", margin: 0 }}
              >
                {extracted || "(no extractable content)"}
              </pre>
            )
          ) : (
            <div className="h-full grid place-items-center p-8 text-center">
              <div>
                <p className="text-[14px] mb-3" style={{ color: "var(--text-dim)" }}>
                  No inline preview available for this format.
                </p>
                <a
                  href={att.data}
                  download={att.name}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] font-medium"
                  style={{ background: "var(--accent)", color: "var(--accent-ink)", textDecoration: "none" }}
                >
                  <Download size={13} /> Download {att.name}
                </a>
              </div>
            </div>
          )}
        </div>
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
        className="group/chip flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          maxWidth: 280,
          fontFamily: "inherit",
          textAlign: "left",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--card-hover)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "var(--card)"; }}
        title={`Preview ${att.name}`}
      >
        <div
          className="grid place-items-center rounded-lg flex-shrink-0"
          style={{ width: 34, height: 34, background: tint + "22", color: tint }}
        >
          <Icon size={16} />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[12.5px] font-medium truncate" style={{ color: "var(--text)" }}>{att.name}</span>
          <span className="mono text-[10.5px]" style={{ color: "var(--text-mute)" }}>
            {label}{size ? ` · ${size}` : ""}
          </span>
        </div>
      </button>
      {preview && <FilePreviewModal att={att} onClose={() => setPreview(false)} />}
    </>
  );
}

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
    <div className="mb-[26px]">
      <div className="flex items-center gap-2.5 mb-2.5">
        <Avatar role="assistant" />
        <span className="text-[13.5px] font-semibold" style={{ color: "var(--text)" }}>{modelName}</span>
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
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px]"
                style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-dim)", maxWidth: 220 }}
              >
                <Globe size={11} />
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
          <div className="flex items-center gap-2 mono text-[13px]" style={{ color: "var(--text-dim)" }}>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--accent)", animation: "nv-blink 1s steps(1) infinite" }}
            />
            Processing…
          </div>
        ) : isSearching ? (
          <div className="flex items-center gap-2 mono text-[13px]" style={{ color: "var(--text-dim)" }}>
            <Globe size={13} style={{ color: "var(--accent)" }} className="animate-spin" />
            Searching…
          </div>
        ) : null}
      </div>
    </div>
  );
}
