"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Plus, Send, Settings, Trash2, MessageSquare, ChevronDown, Loader2,
  Menu, X, Cpu, Brain, Paperclip, Copy, Check, FileText,
  Globe, StopCircle, TerminalSquare, Pencil, User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Model, Conversation, Message, MessageAttachment } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Helpers: parse <think> tags from content ─── */
function parseThinkTags(content: string): { thinking: string; cleaned: string } {
  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    const thinking = thinkMatch[1].trim();
    const cleaned = content.replace(/<think>[\s\S]*?<\/think>\s*/, "").trim();
    return { thinking, cleaned };
  }
  return { thinking: "", cleaned: content };
}

/* ─── Code Block (memoized) ─── */
const CodeBlock = React.memo(function CodeBlock({ node, inline, className, children, ...props }: any) {
  const lang = /language-(\w+)/.exec(className || "")?.[1];
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, "");

  if (!inline && lang) {
    return (
      <div className="my-4 rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#0c0c0c] shadow-lg">
        <div className="flex items-center justify-between px-4 py-2 bg-[#141414] border-b border-[#2a2a2a]">
          <span className="text-[12px] font-mono text-[#888]">{lang}</span>
          <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="flex items-center gap-1.5 text-[11px] text-[#888] hover:text-[#eee] transition-colors bg-[#222] hover:bg-[#333] px-2 py-1 rounded-md">
            {copied ? <Check size={12} className="text-[#14F195]" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <SyntaxHighlighter style={vscDarkPlus} language={lang} PreTag="div"
          customStyle={{ margin: 0, padding: "1rem", background: "transparent", fontSize: "13px", lineHeight: "1.6", fontFamily: "'JetBrains Mono', monospace" }}
          {...props}>
          {code}
        </SyntaxHighlighter>
      </div>
    );
  }
  return <code className={className} {...props}>{children}</code>;
});

/* ─── Memoized Markdown Renderer ─── */
const MarkdownContent = React.memo(function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        code: CodeBlock,
        a: ({ href, children, ...props }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
        ),
      }}
      remarkPlugins={[remarkGfm]}
    >
      {content}
    </ReactMarkdown>
  );
});

/* ─── Main Page ─── */
export default function ChatPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [streamContent, setStreamContent] = useState("");
  const [streamReasoning, setStreamReasoning] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSources, setSearchSources] = useState<Array<{ title: string; url: string }>>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  // Ref to accumulate stream content in between renders to avoid lag
  const streamContentRef = useRef("");
  const streamReasoningRef = useRef("");
  const rafIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  /* Stop generation */
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /* ─ data fetching ─ */
  useEffect(() => { fetchModels(); fetchConversations(); }, []);

  /* ─ detect mobile ─ */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    setSidebarOpen(!mq.matches);
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (e.matches) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) setShowModelPicker(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  /* smooth scroll */
  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 350;
    if (isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => scrollToBottom());
  }, [messages, streamContent, streamReasoning, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  async function fetchModels() {
    const data = await fetch("/api/models").then(r => r.json());
    setModels(data);
    const def = data.find((m: Model) => m.isDefault) || data[0];
    if (def) setSelectedModelId(def.id);
  }

  async function fetchConversations() {
    setConversations(await fetch("/api/conversations").then(r => r.json()));
  }

  async function loadMessages(id: string) {
    const msgs = await fetch(`/api/messages?conversationId=${id}`).then(r => r.json());
    setMessages(msgs);
    setActiveConversation(id);
    if (isMobile) setSidebarOpen(false);
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "auto" });
      }
    }, 50);
  }

  async function createConversation() {
    const conv = await fetch("/api/conversations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: selectedModelId }),
    }).then(r => r.json());
    setConversations(p => [conv, ...p]);
    setActiveConversation(conv.id);
    setMessages([]);
    return conv.id;
  }

  async function deleteConversation(id: string) {
    await fetch(`/api/conversations?id=${id}`, { method: "DELETE" });
    setConversations(p => p.filter(c => c.id !== id));
    if (activeConversation === id) { setActiveConversation(null); setMessages([]); }
  }

  /* file attach */
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    e.target.value = "";
  }

  function removeAttachment(i: number) {
    setAttachments(prev => prev.filter((_, idx) => idx !== i));
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ─── Edit & Resend ─── */
  async function handleEditSubmit(messageId: string) {
    if (!editInput.trim() || isStreaming || !activeConversation) return;

    // Delete the target message and all subsequent ones
    await fetch(`/api/messages?id=${messageId}&conversationId=${activeConversation}`, { method: "DELETE" });

    // Remove them from local state too
    const targetMsg = messages.find(m => m.id === messageId);
    if (targetMsg) {
      setMessages(prev => prev.filter(m => new Date(m.createdAt) < new Date(targetMsg.createdAt)));
    }

    setEditingMessageId(null);
    // Put the edited text in main input and send
    setInput(editInput);
    setEditInput("");
    // Wait for state to settle, then trigger send
    setTimeout(() => {
      // We manually trigger send after the state updates
      sendMessageDirect(editInput.trim());
    }, 50);
  }

  /* ─── Core send function (can be called directly with text) ─── */
  const sendMessageDirect = useCallback(async (textContent: string) => {
    if (!textContent || isStreaming) return;

    let convId = activeConversation || await createConversation();

    // Save user message
    const userMsg = await fetch("/api/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: convId, role: "user", content: textContent }),
    }).then(r => r.json());

    setMessages(p => [...p, userMsg]);
    setInput("");
    fetchConversations();
    setIsStreaming(true);
    streamContentRef.current = "";
    streamReasoningRef.current = "";
    setStreamContent("");
    setStreamReasoning("");

    // Build message history
    const currentMsgs = await fetch(`/api/messages?conversationId=${convId}`).then(r => r.json());
    const chatMsgs: Array<{ role: string; content: any }> = currentMsgs.map((m: any) => ({ role: m.role, content: m.content }));

    // Web search
    let sources: Array<{ title: string; url: string }> = [];
    if (searchEnabled && textContent) {
      setIsSearching(true);
      try {
        const searchRes = await fetch("/api/search", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: textContent, maxResults: 5 }),
        });
        if (searchRes.ok) {
          const { results } = await searchRes.json();
          if (results?.length) {
            sources = results.map((r: any) => ({ title: r.title, url: r.url }));
            setSearchSources(sources);
            const searchContext = results.map((r: any, i: number) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`).join("\n\n");
            chatMsgs.unshift({ role: "system", content: `You have access to the following real-time web search results. Cite sources using [1], [2], etc.\n\n---\nSEARCH RESULTS:\n${searchContext}\n---` });
          }
        }
      } catch (e) { console.error("Search failed:", e); }
      finally { setIsSearching(false); }
    }

    try {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatMsgs, modelId: selectedModelId, conversationId: convId }),
        signal: abortController.signal,
      });
      if (!res.ok) throw new Error((await res.json()).error || "Request failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      // Batched state update using rAF to avoid jank
      const flushStream = () => {
        setStreamContent(streamContentRef.current);
        setStreamReasoning(streamReasoningRef.current);
        rafIdRef.current = 0;
      };
      const scheduleFlush = () => {
        if (!rafIdRef.current) {
          rafIdRef.current = requestAnimationFrame(flushStream);
        }
      };

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
            const d = line.slice(6);
            if (d === "[DONE]") continue;
            try {
              const p = JSON.parse(d);
              if (p.type === "error") throw new Error(p.content);
              if (p.type === "reasoning") { streamReasoningRef.current += p.content; scheduleFlush(); }
              if (p.type === "content") { streamContentRef.current += p.content; scheduleFlush(); }
            } catch {}
          }
        }
      }

      // Final flush
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      const finalContent = streamContentRef.current;
      const finalReasoning = streamReasoningRef.current;

      // Parse <think> tags from final content
      const { thinking: parsedThinking, cleaned: cleanedContent } = parseThinkTags(finalContent);
      const combinedReasoning = [finalReasoning, parsedThinking].filter(Boolean).join("\n\n");

      const sourceAttachments = sources.length > 0
        ? sources.map(s => ({ name: s.title, type: "source", data: s.url }))
        : undefined;

      const am = await fetch("/api/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, role: "assistant", content: cleanedContent, reasoning: combinedReasoning || undefined, attachments: sourceAttachments, modelName: selectedModel?.name || "Assistant" }),
      }).then(r => r.json());
      setMessages(p => [...p, am]);
    } catch (err: any) {
      if (err.name === "AbortError") {
        const partial = streamContentRef.current;
        if (partial) {
          const { thinking: pt, cleaned: pc } = parseThinkTags(partial);
          const pr = [streamReasoningRef.current, pt].filter(Boolean).join("\n\n");
          const am = await fetch("/api/messages", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId: convId, role: "assistant", content: pc || partial, reasoning: pr || undefined, modelName: selectedModel?.name || "Assistant" }),
          }).then(r => r.json());
          setMessages(p => [...p, am]);
        }
      } else {
        setMessages(p => [...p, { id: "err-" + Date.now(), conversationId: convId, role: "system", content: `Error: ${err.message}`, createdAt: new Date().toISOString() }]);
      }
    } finally {
      abortControllerRef.current = null;
      setIsStreaming(false);
      setStreamContent("");
      setStreamReasoning("");
      setSearchSources([]);
      streamContentRef.current = "";
      streamReasoningRef.current = "";
    }
  }, [isStreaming, activeConversation, selectedModelId, searchEnabled]);

  /* send from input */
  const sendMessage = useCallback(async () => {
    if ((!input.trim() && !attachments.length) || isStreaming) return;

    const textContent = input.trim();
    const currentAttachments = [...attachments];

    let displayContent = textContent;
    if (currentAttachments.length) {
      const names = currentAttachments.map(f => f.name).join(", ");
      displayContent = textContent ? `[Attached: ${names}]\n\n${textContent}` : `[Attached: ${names}]`;
    }
    setInput("");
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    let convId = activeConversation || await createConversation();

    const imageFiles = currentAttachments.filter(f => f.type.startsWith("image/"));
    let savedAttachments: MessageAttachment[] | undefined;
    if (imageFiles.length > 0) {
      savedAttachments = [];
      for (const imgFile of imageFiles) {
        const dataUri = await fileToBase64(imgFile);
        savedAttachments.push({ name: imgFile.name, type: imgFile.type, data: dataUri });
      }
    }

    const userMsg = await fetch("/api/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: convId, role: "user", content: displayContent, attachments: savedAttachments }),
    }).then(r => r.json());

    setMessages(p => [...p, userMsg]);
    fetchConversations();
    setIsStreaming(true);
    streamContentRef.current = "";
    streamReasoningRef.current = "";
    setStreamContent("");
    setStreamReasoning("");

    let apiContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }> = textContent;
    const imageAttachments = currentAttachments.filter(f => f.type.startsWith("image/"));
    const nonImageAttachments = currentAttachments.filter(f => !f.type.startsWith("image/"));

    if (imageAttachments.length > 0) {
      const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
      let fullText = textContent;
      if (nonImageAttachments.length) {
        const names = nonImageAttachments.map(f => f.name).join(", ");
        fullText = fullText ? `[Attached files: ${names}]\n\n${fullText}` : `[Attached files: ${names}]`;
      }
      if (fullText) contentParts.push({ type: "text", text: fullText });
      for (const imgFile of imageAttachments) {
        const dataUri = await fileToBase64(imgFile);
        contentParts.push({ type: "image_url", image_url: { url: dataUri } });
      }
      apiContent = contentParts;
    } else if (nonImageAttachments.length) {
      const names = nonImageAttachments.map(f => f.name).join(", ");
      apiContent = textContent ? `[Attached files: ${names}]\n\n${textContent}` : `[Attached files: ${names}]`;
    }

    const chatMsgs: Array<{ role: string; content: any }> = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    let sources: Array<{ title: string; url: string }> = [];
    if (searchEnabled && textContent) {
      setIsSearching(true);
      try {
        const searchRes = await fetch("/api/search", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: textContent, maxResults: 5 }),
        });
        if (searchRes.ok) {
          const { results } = await searchRes.json();
          if (results?.length) {
            sources = results.map((r: any) => ({ title: r.title, url: r.url }));
            setSearchSources(sources);
            const searchContext = results.map((r: any, i: number) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`).join("\n\n");
            chatMsgs.unshift({ role: "system", content: `You have access to the following real-time web search results. Cite sources using [1], [2], etc.\n\n---\nSEARCH RESULTS:\n${searchContext}\n---` });
          }
        }
      } catch (e) { console.error("Search failed:", e); }
      finally { setIsSearching(false); }
    }

    chatMsgs.push({ role: "user", content: apiContent });

    try {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatMsgs, modelId: selectedModelId, conversationId: convId }),
        signal: abortController.signal,
      });
      if (!res.ok) throw new Error((await res.json()).error || "Request failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      const flushStream = () => {
        setStreamContent(streamContentRef.current);
        setStreamReasoning(streamReasoningRef.current);
        rafIdRef.current = 0;
      };
      const scheduleFlush = () => {
        if (!rafIdRef.current) {
          rafIdRef.current = requestAnimationFrame(flushStream);
        }
      };

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
            const d = line.slice(6);
            if (d === "[DONE]") continue;
            try {
              const p = JSON.parse(d);
              if (p.type === "error") throw new Error(p.content);
              if (p.type === "reasoning") { streamReasoningRef.current += p.content; scheduleFlush(); }
              if (p.type === "content") { streamContentRef.current += p.content; scheduleFlush(); }
            } catch {}
          }
        }
      }

      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      const finalContent = streamContentRef.current;
      const finalReasoning = streamReasoningRef.current;

      const { thinking: parsedThinking, cleaned: cleanedContent } = parseThinkTags(finalContent);
      const combinedReasoning = [finalReasoning, parsedThinking].filter(Boolean).join("\n\n");

      const sourceAttachments = sources.length > 0
        ? sources.map(s => ({ name: s.title, type: "source", data: s.url }))
        : undefined;

      const am = await fetch("/api/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, role: "assistant", content: cleanedContent, reasoning: combinedReasoning || undefined, attachments: sourceAttachments, modelName: selectedModel?.name || "Assistant" }),
      }).then(r => r.json());
      setMessages(p => [...p, am]);
    } catch (err: any) {
      if (err.name === "AbortError") {
        const partial = streamContentRef.current;
        if (partial) {
          const { thinking: pt, cleaned: pc } = parseThinkTags(partial);
          const pr = [streamReasoningRef.current, pt].filter(Boolean).join("\n\n");
          const am = await fetch("/api/messages", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId: convId, role: "assistant", content: pc || partial, reasoning: pr || undefined, modelName: selectedModel?.name || "Assistant" }),
          }).then(r => r.json());
          setMessages(p => [...p, am]);
        }
      } else {
        setMessages(p => [...p, { id: "err-" + Date.now(), conversationId: convId, role: "system", content: `Error: ${err.message}`, createdAt: new Date().toISOString() }]);
      }
    } finally {
      abortControllerRef.current = null;
      setIsStreaming(false);
      setStreamContent("");
      setStreamReasoning("");
      setSearchSources([]);
      streamContentRef.current = "";
      streamReasoningRef.current = "";
    }
  }, [input, isStreaming, activeConversation, messages, selectedModelId, attachments, searchEnabled]);

  const selectedModel = models.find(m => m.id === selectedModelId);

  // Memoize the parsed stream content to avoid re-parsing <think> on every render
  const parsedStreamContent = useMemo(() => {
    return parseThinkTags(streamContent);
  }, [streamContent]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[var(--bg)] text-[var(--text)] font-sans antialiased">
      
      {/* ── Mobile backdrop ── */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: sidebarOpen ? (isMobile ? "300px" : "260px") : "0px",
          x: isMobile ? (sidebarOpen ? 0 : -300) : 0,
        }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "h-full flex-shrink-0 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col overflow-hidden z-50",
          isMobile && "fixed top-0 left-0 bottom-0 shadow-2xl shadow-black/80"
        )}
      >
        <div className="flex flex-col h-full min-w-[260px] w-full">
          <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)] bg-[var(--surface-2)]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center shadow-[0_0_12px_var(--accent-glow)]">
                <TerminalSquare size={16} className="text-black" />
              </div>
              <span className="font-semibold text-[14px] text-white tracking-wide">NvTerminal<span className="text-[var(--accent)]">_</span></span>
            </div>
            {isMobile && (
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-[var(--surface-3)] rounded-md text-[var(--text-dim)] hover:text-white transition-colors">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="px-3 py-3">
            <button onClick={() => { setActiveConversation(null); setMessages([]); if (isMobile) setSidebarOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-medium text-white hover:bg-[var(--surface-3)] border border-[var(--border)] transition-all shadow-sm">
              <Plus size={16} className="text-[var(--accent)]" /> New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4 hide-scrollbar">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] px-3 py-2">Sessions</p>
            {conversations.map(c => (
              <div key={c.id} onClick={() => loadMessages(c.id)}
                className={cn("group flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors text-[13px] mb-1",
                  activeConversation === c.id ? "bg-[var(--surface-3)] text-white border border-[var(--border-hover)] shadow-sm" : "text-[var(--text-dim)] hover:text-white hover:bg-[var(--surface-2)] border border-transparent"
                )}>
                <MessageSquare size={14} className={activeConversation === c.id ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
                <span className="truncate flex-1 font-medium">{c.title}</span>
                <button onClick={e => { e.stopPropagation(); deleteConversation(c.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {!conversations.length && <p className="text-[12px] text-[var(--text-muted)] text-center py-8">No active sessions</p>}
          </div>

          <div className="p-3 border-t border-[var(--border)] bg-[var(--surface-2)]">
            <a href="/settings" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-[var(--text-dim)] hover:text-white hover:bg-[var(--surface-3)] transition-colors">
              <Settings size={15} className="text-[var(--text-muted)]" /> Settings & Config
            </a>
          </div>
        </div>
      </motion.aside>

      {/* ── Main Area ── */}
      <main className="flex-1 flex flex-col min-w-0 relative">

        <div className="absolute top-4 left-4 z-30">
          <AnimatePresence>
            {!sidebarOpen && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setSidebarOpen(true)} 
                className="p-2 glass-panel rounded-lg transition-colors text-[var(--text-dim)] hover:text-white flex items-center gap-2"
              >
                <Menu size={18} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* message area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 pt-16 pb-8 hide-scrollbar">
          <div className="max-w-4xl mx-auto h-full flex flex-col">
            {!messages.length && !isStreaming ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="m-auto text-center max-w-lg">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full terminal-panel border border-[var(--border)] text-[12px] font-mono text-[var(--accent)] mb-8 glow-pulse">
                  <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse" />
                  {selectedModel?.name || "System Offline"}
                </div>
                <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">How can I assist you?</h1>
                <p className="text-[var(--text-dim)] text-[14px] leading-relaxed">
                  Initializing secure channel to <span className="text-[var(--accent)] font-mono">{selectedModel?.provider || "N/A"}</span>. <br/> Send a message or paste code to begin computing.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-6 pb-52">
                <AnimatePresence initial={false}>
                  {messages.map(msg => (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                      <MessageBubble
                        message={msg}
                        modelName={msg.modelName || selectedModel?.name || "Assistant"}
                        onImageClick={setLightboxSrc}
                        isEditing={editingMessageId === msg.id}
                        editInput={editInput}
                        onEditStart={() => {
                          const cleanContent = msg.content.replace(/^\[Attached:.*?\]\n*/, "");
                          setEditingMessageId(msg.id);
                          setEditInput(cleanContent);
                        }}
                        onEditChange={setEditInput}
                        onEditSubmit={() => handleEditSubmit(msg.id)}
                        onEditCancel={() => { setEditingMessageId(null); setEditInput(""); }}
                        isStreaming={isStreaming}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* searching indicator */}
                {isSearching && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2">
                    <div className="pl-14 flex items-center gap-2 text-[var(--text-dim)] text-[13px] font-mono">
                      <Globe size={14} className="animate-spin text-[var(--accent)]" /> Scanning network...
                    </div>
                  </motion.div>
                )}

                {/* streaming */}
                {(isStreaming || streamContent || streamReasoning) && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2">
                    {searchSources.length > 0 && (
                      <div className="pl-14 mb-4">
                        <div className="flex flex-wrap gap-2">
                          {searchSources.map((s, i) => (
                            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[11px] text-[var(--text-dim)] hover:text-[var(--accent)] hover:border-[var(--accent-glow)] transition-all max-w-[220px]">
                              <Globe size={11} className="flex-shrink-0" />
                              <span className="truncate">{s.title}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Header for streaming message */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_var(--accent-glow)]">
                        <Cpu size={16} className="text-black" />
                      </div>
                      <span className="text-[14px] font-semibold tracking-wide text-[var(--accent)]">
                        {selectedModel?.name || "Assistant"}
                      </span>
                    </div>

                    <StreamingThoughts reasoning={streamReasoning || parsedStreamContent.thinking} />
                    {streamContent ? (
                      <div className="pl-11 markdown-body text-[14px]">
                        <MarkdownContent content={parsedStreamContent.cleaned || streamContent} />
                        <span className="terminal-cursor" />
                      </div>
                    ) : !streamReasoning && !parsedStreamContent.thinking && !isSearching ? (
                      <div className="pl-11 flex items-center gap-2 text-[var(--text-dim)] text-[13px] font-mono">
                        <Loader2 size={14} className="animate-spin text-[var(--accent)]" /> Processing...
                      </div>
                    ) : null}
                  </motion.div>
                )}
                <div className="h-4" />
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom Dock ── */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent pt-10 pb-4 px-4 md:px-8 z-20">
          <div className="max-w-4xl mx-auto space-y-3">

            <AnimatePresence>
              {attachments.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex flex-wrap gap-3 pb-1">
                  {attachments.map((f, i) => (
                    f.type.startsWith("image/") ? (
                      <div key={i} className="relative group rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-2)] shadow-md">
                        <img src={URL.createObjectURL(f)} alt={f.name} className="h-24 w-auto max-w-[160px] object-cover"
                          onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)} />
                        <button onClick={() => removeAttachment(i)}
                          className="absolute top-1.5 right-1.5 p-1 bg-black/80 hover:bg-red-500 rounded-full text-white transition-colors opacity-0 group-hover:opacity-100 backdrop-blur-sm">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div key={i} className="inline-flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[12px] text-[var(--text-dim)] shadow-md font-mono">
                        <FileText size={14} className="text-[var(--accent)] flex-shrink-0" />
                        <span className="max-w-[120px] truncate">{f.name}</span>
                        <button onClick={() => removeAttachment(i)} className="text-[var(--text-muted)] hover:text-red-400 ml-1 p-0.5 rounded-full hover:bg-red-400/10"><X size={12} /></button>
                      </div>
                    )
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="chat-input-wrapper flex flex-col px-3 py-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Message NvTerminal..."
                rows={1}
                className="w-full bg-transparent text-[14px] text-white placeholder:text-[var(--text-muted)] resize-none px-2 py-1 focus:outline-none max-h-[200px] leading-relaxed hide-scrollbar"
              />
              
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border)]">
                <div className="flex items-center gap-1.5">
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-3)] rounded-lg transition-colors flex items-center justify-center gap-1.5 text-[13px]">
                    <Paperclip size={16} /> <span className="hidden sm:inline">Attach</span>
                  </button>
                  
                  <button
                    onClick={() => setSearchEnabled(!searchEnabled)}
                    className={cn(
                      "p-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-[13px]",
                      searchEnabled
                        ? "text-[var(--accent)] bg-[var(--accent-glow)] shadow-[inset_0_0_0_1px_var(--accent-glow)]"
                        : "text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-3)]"
                    )}
                  >
                    <Globe size={16} /> <span className="hidden sm:inline">Search</span>
                  </button>

                  <div className="relative ml-2 border-l border-[var(--border)] pl-2" ref={modelPickerRef}>
                    <button onClick={() => setShowModelPicker(!showModelPicker)}
                      className="flex items-center justify-center gap-2 text-[12px] font-mono text-[var(--text-dim)] hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-[var(--surface-3)]">
                      <Cpu size={14} className="text-[var(--accent)]" />
                      <span className="hidden sm:inline">{selectedModel?.name || "Model"}</span>
                      <ChevronDown size={12} className={cn("transition-transform text-[var(--text-muted)]", showModelPicker && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {showModelPicker && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }}
                          className="absolute bottom-full mb-3 left-0 w-[280px] terminal-panel rounded-xl py-2 z-50">
                          <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] px-3 py-1.5">Available Models</p>
                          <div className="max-h-[300px] overflow-y-auto hide-scrollbar px-1">
                            {models.map(m => (
                              <button key={m.id} onClick={() => { setSelectedModelId(m.id); setShowModelPicker(false); }}
                                className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors mb-0.5",
                                  selectedModelId === m.id ? "bg-[var(--surface-2)] text-white border border-[var(--border)]" : "text-[var(--text-dim)] hover:bg-[var(--surface-3)] hover:text-white border border-transparent"
                                )}>
                                <span className={cn("w-2 h-2 rounded-full", selectedModelId === m.id ? "bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" : "bg-[var(--text-muted)]")} />
                                <div>
                                  <p className="text-[13px] font-medium leading-tight">{m.name}</p>
                                  <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">{m.provider}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <button onClick={isStreaming ? stopGeneration : sendMessage} disabled={!isStreaming && (!input.trim() && !attachments.length)}
                  className={cn("px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md font-semibold text-[13px]",
                    isStreaming
                      ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                      : (input.trim() || attachments.length)
                        ? "btn-primary"
                        : "bg-[var(--surface-3)] text-[var(--text-muted)] shadow-none"
                  )}>
                  {isStreaming ? <><StopCircle size={16} /> <span className="hidden sm:inline">Stop</span></> : <><Send size={16} /> <span className="hidden sm:inline">Send</span></>}
                </button>
              </div>
            </div>
            
            <div className="text-center">
              <span className="text-[10px] text-[var(--text-muted)] font-mono tracking-wide">
                NvTerminal computing instances can produce inaccurate results. Verify critical data.
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* ── Image Lightbox Overlay ── */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md cursor-zoom-out p-4"
            onClick={() => setLightboxSrc(null)}
            onKeyDown={e => { if (e.key === "Escape") setLightboxSrc(null); }}
            tabIndex={0}
          >
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              src={lightboxSrc} alt="Enlarged"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
            <button onClick={() => setLightboxSrc(null)}
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Thinking / Reasoning Stream ─── */
function StreamingThoughts({ reasoning }: { reasoning: string }) {
  const [open, setOpen] = useState(false);
  if (!reasoning) return null;

  return (
    <div className="pl-11 mb-4">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-[12px] font-mono text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-2 bg-[var(--surface-2)] px-3 py-1.5 rounded-lg border border-[var(--border)]">
        <Brain size={13} className={open ? "text-[var(--accent)]" : ""} />
        <span>{open ? "Collapse Thought Process" : "View Thinking"}</span>
        <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-2 p-4 bg-[var(--surface-2)] border border-[var(--border)] border-l-2 border-l-[var(--accent)] rounded-lg text-[13px] font-mono text-[var(--text-dim)] leading-relaxed whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto shadow-inner hide-scrollbar">
              {reasoning}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Message Bubble ─── */
function MessageBubble({ message, modelName, onImageClick, isEditing, editInput, onEditStart, onEditChange, onEditSubmit, onEditCancel, isStreaming }: {
  message: Message;
  modelName: string;
  onImageClick?: (src: string) => void;
  isEditing: boolean;
  editInput: string;
  onEditStart: () => void;
  onEditChange: (val: string) => void;
  onEditSubmit: () => void;
  onEditCancel: () => void;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const [showThoughts, setShowThoughts] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const imageAttachments = message.attachments?.filter(a => a.type !== "source") || [];
  const sourceAttachments = message.attachments?.filter(a => a.type === "source") || [];

  // Parse <think> from stored content
  const { thinking: contentThinking, cleaned: cleanedContent } = useMemo(() => parseThinkTags(message.content), [message.content]);

  // Combine reasoning from DB with parsed <think> tags from content
  const fullReasoning = useMemo(() => {
    return [message.reasoning, contentThinking].filter(Boolean).join("\n\n");
  }, [message.reasoning, contentThinking]);

  function processContent(content: string): string {
    if (sourceAttachments.length === 0) return content;
    return content.replace(/\[(\d+)\]/g, (match, num) => {
      const idx = parseInt(num) - 1;
      if (idx >= 0 && idx < sourceAttachments.length) {
        const source = sourceAttachments[idx];
        return `[\[${num}\]](${source.data})`;
      }
      return match;
    });
  }

  if (isSystem) {
    return (
      <div className="flex justify-center py-4">
        <span className="text-[12px] font-mono text-red-400 bg-red-400/10 border border-red-500/20 px-4 py-1.5 rounded-full">{message.content}</span>
      </div>
    );
  }

  return (
    <div className="py-4 px-2 group/msg">
      {/* header */}
      <div className="flex items-center gap-3 mb-3">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-[var(--surface-3)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 shadow-sm">
            <User size={16} className="text-[var(--text-dim)]" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_var(--accent-glow)]">
            <Cpu size={16} className="text-black" />
          </div>
        )}
        <span className={cn("text-[14px] font-semibold tracking-wide", isUser ? "text-white" : "text-[var(--accent)]")}>
          {isUser ? "User" : modelName}
        </span>

        {/* Edit button for user messages */}
        {isUser && !isEditing && !isStreaming && (
          <button
            onClick={onEditStart}
            className="opacity-0 group-hover/msg:opacity-100 p-1.5 text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-3)] rounded-lg transition-all ml-auto"
            title="Edit message"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {/* reasoning toggle */}
      {fullReasoning && !isUser && (
        <div className="pl-11 mb-3">
          <button onClick={() => setShowThoughts(!showThoughts)}
            className="flex items-center gap-2 text-[12px] font-mono text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors bg-[var(--surface-2)] px-3 py-1.5 rounded-lg border border-[var(--border)]">
            <Brain size={13} className={showThoughts ? "text-[var(--accent)]" : ""} />
            {showThoughts ? "Collapse Thought Process" : "View Thinking"}
            <ChevronDown size={12} className={cn("transition-transform", showThoughts && "rotate-180")} />
          </button>
          <AnimatePresence>
            {showThoughts && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-2 p-4 bg-[var(--surface-2)] border border-[var(--border)] border-l-2 border-l-[var(--accent)] rounded-lg text-[13px] font-mono text-[var(--text-dim)] leading-relaxed whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto shadow-inner hide-scrollbar">
                  {fullReasoning}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* image attachments */}
      {imageAttachments.length > 0 && (
        <div className="pl-11 mb-3 flex flex-wrap gap-3">
          {imageAttachments.map((att, i) => (
            <div key={i} className="relative group rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-2)] shadow-md cursor-zoom-in transition-transform hover:scale-[1.02]"
              onClick={() => onImageClick?.(att.data)}>
              <img src={att.data} alt={att.name} className="max-h-[300px] max-w-full w-auto object-contain msg-image" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-6 pb-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[11px] text-white/90 font-mono truncate block">{att.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* content */}
      <div className="pl-11">
        {isUser ? (
          isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editInput}
                onChange={e => onEditChange(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onEditSubmit(); } }}
                className="w-full bg-[var(--surface)] border border-[var(--accent)]/40 rounded-lg px-3 py-2.5 text-[14px] text-white resize-none focus:outline-none focus:border-[var(--accent)] transition-colors min-h-[60px] max-h-[200px]"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button onClick={onEditSubmit} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold btn-primary">
                  <Send size={12} className="inline mr-1.5" />Submit
                </button>
                <button onClick={onEditCancel} className="px-3 py-1.5 rounded-lg text-[12px] text-[var(--text-dim)] hover:text-white hover:bg-[var(--surface-3)] transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[15px] text-[var(--text)] whitespace-pre-wrap leading-relaxed tracking-wide">
              {message.content.replace(/^\[Attached:.*?\]\n*/, '')}
            </p>
          )
        ) : (
          <div className="markdown-body">
            <MarkdownContent content={processContent(cleanedContent)} />
          </div>
        )}
      </div>

      {/* search sources */}
      {sourceAttachments.length > 0 && (
        <div className="pl-11 mt-4">
          <button onClick={() => setShowSources(!showSources)}
            className="flex items-center gap-2 text-[12px] font-mono text-[var(--text-muted)] hover:text-white transition-colors mb-2 bg-[var(--surface-2)] px-3 py-1.5 rounded-lg border border-[var(--border)]">
            <Globe size={13} className={showSources ? "text-[var(--accent)]" : ""} />
            <span>{sourceAttachments.length} Verified Source{sourceAttachments.length > 1 ? "s" : ""}</span>
            <ChevronDown size={12} className={cn("transition-transform", showSources && "rotate-180")} />
          </button>
          <AnimatePresence>
            {showSources && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="flex flex-wrap gap-2 mt-2">
                  {sourceAttachments.map((s, i) => (
                    <a key={i} href={s.data} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface-3)] transition-all group shadow-sm">
                      <span className="flex items-center justify-center w-5 h-5 rounded-md bg-[var(--bg)] text-[10px] font-mono font-bold text-[var(--accent)] border border-[var(--border)] group-hover:border-[var(--accent-glow)]">{i + 1}</span>
                      <span className="text-[12px] text-[var(--text-dim)] group-hover:text-white truncate max-w-[220px] sm:max-w-[300px]">{s.name}</span>
                    </a>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
