"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Plus, Send, Settings, Trash2, MessageSquare, ChevronDown, Loader2,
  Menu, X, Cpu, Brain, Paperclip, Copy, Check, FileText, Image as ImageIcon,
  Globe, Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Model, Conversation, Message, MessageAttachment } from "@/lib/types";

/* ─── Code Block ─── */
function CodeBlock({ node, inline, className, children, ...props }: any) {
  const lang = /language-(\w+)/.exec(className || "")?.[1];
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, "");

  if (!inline && lang) {
    return (
      <div className="my-3 rounded-lg overflow-hidden border border-[#2a2a2a] bg-[#1e1e1e]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#181818] border-b border-[#2a2a2a]">
          <span className="text-[11px] font-mono text-[#888] uppercase tracking-wider">{lang}</span>
          <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="flex items-center gap-1 text-[11px] text-[#666] hover:text-[#aaa] transition-colors">
            {copied ? <Check size={12} className="text-nvidia-green" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <SyntaxHighlighter style={vscDarkPlus} language={lang} PreTag="div"
          customStyle={{ margin: 0, padding: "0.75rem 1rem", background: "transparent", fontSize: "12.5px", lineHeight: "1.6" }}
          {...props}>
          {code}
        </SyntaxHighlighter>
      </div>
    );
  }
  return <code className={className} {...props}>{children}</code>;
}

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [streamReasoning, setStreamReasoning] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSources, setSearchSources] = useState<Array<{ title: string; url: string }>>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);

  /* ─ data fetching ─ */
  useEffect(() => { fetchModels(); fetchConversations(); }, []);

  /* ─ detect mobile ─ */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    setSidebarOpen(!mq.matches); // open by default on desktop
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

  /* smooth scroll — only scroll the last 80px into view to avoid jarring jump */
  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 300;
    if (isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, streamContent, streamReasoning, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
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
    setMessages(await fetch(`/api/messages?conversationId=${id}`).then(r => r.json()));
    setActiveConversation(id);
    if (isMobile) setSidebarOpen(false); // auto-close sidebar on mobile
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

  /* ─ helpers ─ */
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* send */
  const sendMessage = useCallback(async () => {
    if ((!input.trim() && !attachments.length) || isStreaming) return;

    const textContent = input.trim();
    const currentAttachments = [...attachments];

    // Display text for the message content
    let displayContent = textContent;
    if (currentAttachments.length) {
      const names = currentAttachments.map(f => f.name).join(", ");
      displayContent = textContent ? `[Attached: ${names}]\n\n${textContent}` : `[Attached: ${names}]`;
    }
    setInput("");
    setAttachments([]);

    let convId = activeConversation || await createConversation();

    // Convert image attachments to base64 for storage & display
    const imageFiles = currentAttachments.filter(f => f.type.startsWith("image/"));
    let savedAttachments: MessageAttachment[] | undefined;
    if (imageFiles.length > 0) {
      savedAttachments = [];
      for (const imgFile of imageFiles) {
        const dataUri = await fileToBase64(imgFile);
        savedAttachments.push({ name: imgFile.name, type: imgFile.type, data: dataUri });
      }
    }

    // Save user message to DB (with attachment data)
    const userMsg = await fetch("/api/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: convId, role: "user", content: displayContent, attachments: savedAttachments }),
    }).then(r => r.json());

    setMessages(p => [...p, userMsg]);
    fetchConversations();
    setIsStreaming(true);
    setStreamContent("");
    setStreamReasoning("");

    // Build the multimodal content for the API
    let apiContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }> = textContent;

    const imageAttachments = currentAttachments.filter(f => f.type.startsWith("image/"));
    const nonImageAttachments = currentAttachments.filter(f => !f.type.startsWith("image/"));

    if (imageAttachments.length > 0) {
      // Build multimodal content array for vision-capable models
      const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

      // Add text part
      let fullText = textContent;
      if (nonImageAttachments.length) {
        const names = nonImageAttachments.map(f => f.name).join(", ");
        fullText = fullText ? `[Attached files: ${names}]\n\n${fullText}` : `[Attached files: ${names}]`;
      }
      if (fullText) {
        contentParts.push({ type: "text", text: fullText });
      }

      // Convert each image to base64 and add as image_url parts
      for (const imgFile of imageAttachments) {
        const dataUri = await fileToBase64(imgFile);
        contentParts.push({
          type: "image_url",
          image_url: { url: dataUri },
        });
      }

      apiContent = contentParts;
    } else if (nonImageAttachments.length) {
      const names = nonImageAttachments.map(f => f.name).join(", ");
      apiContent = textContent ? `[Attached files: ${names}]\n\n${textContent}` : `[Attached files: ${names}]`;
    }

    // Build message history for the API (previous messages as text, current with images)
    const chatMsgs: Array<{ role: string; content: any }> = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    // Web search: if enabled, search first and inject results as system context
    let sources: Array<{ title: string; url: string }> = [];
    if (searchEnabled && textContent) {
      setIsSearching(true);
      try {
        const searchRes = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: textContent, maxResults: 5 }),
        });
        if (searchRes.ok) {
          const { results } = await searchRes.json();
          if (results && results.length > 0) {
            sources = results.map((r: any) => ({ title: r.title, url: r.url }));
            setSearchSources(sources);

            // Build search context
            const searchContext = results
              .map((r: any, i: number) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`)
              .join("\n\n");

            chatMsgs.unshift({
              role: "system",
              content: `You have access to the following real-time web search results for the user's query. Use this information to provide accurate, up-to-date answers. Cite sources using [1], [2], etc. when referencing specific results.\n\n---\nSEARCH RESULTS:\n${searchContext}\n---`,
            });
          }
        }
      } catch (e) {
        console.error("Search failed:", e);
      } finally {
        setIsSearching(false);
      }
    }

    // Add the current user message
    chatMsgs.push({ role: "user", content: apiContent });

    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatMsgs, modelId: selectedModelId, conversationId: convId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Request failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = "", reasoning = "";

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
              if (p.type === "reasoning") { reasoning += p.content; setStreamReasoning(reasoning); }
              if (p.type === "content") { full += p.content; setStreamContent(full); }
            } catch {}
          }
        }
      }

      // Save sources as attachments on the assistant message
      const sourceAttachments = sources.length > 0
        ? sources.map((s, i) => ({ name: s.title, type: "source", data: s.url }))
        : undefined;

      const am = await fetch("/api/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, role: "assistant", content: full, reasoning: reasoning || undefined, attachments: sourceAttachments }),
      }).then(r => r.json());
      setMessages(p => [...p, am]);
    } catch (err: any) {
      setMessages(p => [...p, { id: "err-" + Date.now(), conversationId: convId, role: "system", content: `Error: ${err.message}`, createdAt: new Date().toISOString() }]);
    } finally {
      setIsStreaming(false);
      setStreamContent("");
      setStreamReasoning("");
      setSearchSources([]);
    }
  }, [input, isStreaming, activeConversation, messages, selectedModelId, attachments, searchEnabled]);

  const selectedModel = models.find(m => m.id === selectedModelId);

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-[#d4d4d4] text-[13px]">

      {/* ── Mobile backdrop ── */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={cn(
        "h-full flex-shrink-0 bg-surface border-r border-[#222] flex flex-col transition-all duration-200 overflow-hidden",
        isMobile ? (sidebarOpen ? "mobile-sidebar" : "mobile-sidebar-closed") : (sidebarOpen ? "w-[240px]" : "w-0"),
        "z-40"
      )}>
        <div className="flex flex-col h-full min-w-[240px]">
          {/* head */}
          <div className="flex items-center justify-between px-3 py-3 border-b border-[#222]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-nvidia-green flex items-center justify-center">
                <span className="text-black font-bold text-[10px] font-mono">N</span>
              </div>
              <span className="font-semibold text-[13px] text-white">nvidia-chat</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-[#222] rounded text-[#666] hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* new chat */}
          <div className="px-2 py-2">
            <button onClick={() => { setActiveConversation(null); setMessages([]); if (isMobile) setSidebarOpen(false); }}
              className="sidebar-btn w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[12px] font-medium text-[#aaa] hover:text-white hover:bg-[#222] border border-[#222] hover:border-[#333] transition-all">
              <Plus size={14} /> New chat
            </button>
          </div>

          {/* list */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#555] px-2 py-2">history</p>
            {conversations.map(c => (
              <div key={c.id} onClick={() => loadMessages(c.id)}
                className={cn("group flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors text-[12px] mb-0.5",
                  activeConversation === c.id ? "bg-nvidia-green/10 text-nvidia-green" : "text-[#888] hover:text-white hover:bg-[#1a1a1a]"
                )}>
                <MessageSquare size={13} className="flex-shrink-0" />
                <span className="truncate flex-1">{c.title}</span>
                <button onClick={e => { e.stopPropagation(); deleteConversation(c.id); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-red-500 hover:text-red-400 transition-all">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {!conversations.length && <p className="text-[11px] text-[#444] text-center py-6">No chats yet</p>}
          </div>

          {/* bottom */}
          <div className="px-2 py-2 border-t border-[#222]">
            <a href="/settings" className="flex items-center gap-2 px-2.5 py-2 rounded-md text-[12px] text-[#888] hover:text-white hover:bg-[#1a1a1a] transition-colors">
              <Settings size={14} /> Settings
            </a>
          </div>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <main className="flex-1 flex flex-col min-w-0 relative">

        {/* top bar — just the sidebar toggle when collapsed */}
        {!sidebarOpen && (
          <div className="absolute top-2 left-2 z-50">
            <button onClick={() => setSidebarOpen(true)} className="p-2 bg-surface hover:bg-surface-2 border border-[#222] rounded-md transition-colors text-[#888] hover:text-white">
              <Menu size={16} />
            </button>
          </div>
        )}

        {/* message area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-4 px-2">
          {!messages.length && !isStreaming ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-[#222] text-[11px] font-mono text-nvidia-green mb-6 glow-pulse">
                  <span className="w-1.5 h-1.5 bg-nvidia-green rounded-full" />
                  {selectedModel?.name || "no model"} online
                </div>
                <h1 className="text-2xl font-semibold text-white mb-2 welcome-title">nvidia-chat</h1>
                <p className="text-[#666] text-[13px] leading-relaxed welcome-subtitle">
                  <span className="terminal-prompt">Connected to <span className="text-nvidia-green font-mono text-[12px]">{selectedModel?.provider || "—"}</span> endpoint.</span><br/>
                  Type a message below to begin.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-6 space-y-1">
              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} className="message-enter" />
              ))}

              {/* searching indicator */}
              {isSearching && (
                <div className="py-4">
                  <div className="pl-8 flex items-center gap-2 text-[#666] text-[12px]">
                    <Globe size={13} className="animate-spin text-nvidia-green" /> Searching the web...
                  </div>
                </div>
              )}

              {/* streaming */}
              {isStreaming && (
                <div className="py-4">
                  {/* search sources */}
                  {searchSources.length > 0 && (
                    <div className="pl-8 mb-3">
                      <div className="flex flex-wrap gap-1.5">
                        {searchSources.map((s, i) => (
                          <a
                            key={i}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-[10px] text-[#888] hover:text-nvidia-green hover:border-nvidia-green/30 transition-colors max-w-[200px]"
                          >
                            <Globe size={9} className="flex-shrink-0" />
                            <span className="truncate">{s.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <StreamingThoughts reasoning={streamReasoning} />
                  {streamContent ? (
                    <div className="pl-8 markdown-body">
                      <ReactMarkdown components={{ code: CodeBlock }} remarkPlugins={[remarkGfm]}>{streamContent}</ReactMarkdown>
                      <span className="terminal-cursor" />
                    </div>
                  ) : !streamReasoning && !isSearching ? (
                    <div className="pl-8 flex items-center gap-2 text-[#666] text-[12px]">
                      <Loader2 size={13} className="animate-spin text-nvidia-green" /> Generating...
                    </div>
                  ) : null}
                </div>
              )}
              <div className="h-4" />
            </div>
          )}
        </div>

        {/* ── Bottom Dock: model selector + input ── */}
        <div className="border-t border-[#222] bg-surface px-4 md:px-4 px-2 py-3 bottom-dock">
          <div className="max-w-3xl mx-auto space-y-2">

            {/* attachment previews */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-2">
                {attachments.map((f, i) => (
                  f.type.startsWith("image/") ? (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-[#2a2a2a] bg-[#1a1a1a]">
                      <img
                        src={URL.createObjectURL(f)}
                        alt={f.name}
                        className="h-20 w-auto max-w-[140px] object-cover attach-thumb"
                        onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                      />
                      <button onClick={() => removeAttachment(i)}
                        className="absolute top-1 right-1 p-0.5 bg-black/70 hover:bg-red-500/80 rounded-full text-white transition-colors opacity-0 group-hover:opacity-100">
                        <X size={12} />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
                        <span className="text-[9px] text-[#ccc] truncate block">{f.name}</span>
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="file-chip">
                      <FileText size={12} className="text-nvidia-green flex-shrink-0" />
                      <span>{f.name}</span>
                      <button onClick={() => removeAttachment(i)} className="text-[#555] hover:text-red-400 ml-1"><X size={10} /></button>
                    </div>
                  )
                ))}
              </div>
            )}

            {/* input row */}
            <div className="input-container flex items-end gap-2 p-1.5">
              {/* attach */}
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
              <button onClick={() => fileInputRef.current?.click()} className="p-2 text-[#555] hover:text-white hover:bg-[#222] rounded-md transition-colors flex-shrink-0" title="Attach files">
                <Paperclip size={15} />
              </button>

              {/* web search toggle */}
              <button
                onClick={() => setSearchEnabled(!searchEnabled)}
                className={cn(
                  "p-2 rounded-md transition-colors flex-shrink-0",
                  searchEnabled
                    ? "text-nvidia-green bg-nvidia-green/10 hover:bg-nvidia-green/20"
                    : "text-[#555] hover:text-white hover:bg-[#222]"
                )}
                title={searchEnabled ? "Web search ON" : "Web search OFF"}
              >
                <Globe size={15} />
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Send a message..."
                rows={1}
                className="flex-1 bg-transparent text-[13px] text-[#d4d4d4] placeholder:text-[#555] resize-none py-2 px-1 focus:outline-none max-h-[160px] leading-relaxed"
              />

              <button onClick={sendMessage} disabled={(!input.trim() && !attachments.length) || isStreaming}
                className={cn("p-2 rounded-md flex-shrink-0 transition-all",
                  (input.trim() || attachments.length) && !isStreaming
                    ? "bg-nvidia-green text-black hover:bg-nvidia-light"
                    : "bg-[#222] text-[#555]"
                )}>
                {isStreaming ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>

            {/* model selector row */}
            <div className="flex items-center justify-between">
              <div className="relative" ref={modelPickerRef}>
                <button onClick={() => setShowModelPicker(!showModelPicker)}
                  className="flex items-center gap-1.5 text-[11px] font-mono text-[#666] hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#1a1a1a]">
                  <Cpu size={12} className="text-nvidia-green" />
                  {selectedModel?.name || "select model"}
                  <ChevronDown size={11} className={cn("transition-transform", showModelPicker && "rotate-180")} />
                </button>

                {showModelPicker && (
                  <div className="model-picker-popup absolute bottom-full mb-2 left-0 w-[260px] bg-[#141414] border border-[#2a2a2a] rounded-lg shadow-2xl shadow-black/60 py-1 z-50">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-[#555] px-3 py-1.5">engines</p>
                    {models.map(m => (
                      <button key={m.id} onClick={() => { setSelectedModelId(m.id); setShowModelPicker(false); }}
                        className={cn("w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
                          selectedModelId === m.id ? "bg-nvidia-green/10 text-nvidia-green" : "text-[#aaa] hover:bg-[#1a1a1a] hover:text-white"
                        )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", selectedModelId === m.id ? "bg-nvidia-green" : "bg-[#333]")} />
                        <div>
                          <p className="text-[12px] font-medium leading-tight">{m.name}</p>
                          <p className="text-[10px] text-[#555] font-mono">{m.provider} · {m.modelId}</p>
                        </div>
                      </button>
                    ))}
                    {!models.length && <p className="text-[11px] text-[#444] text-center py-3">No models configured</p>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {searchEnabled && (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-nvidia-green">
                    <Globe size={10} /> Web search
                  </span>
                )}
                <span className="text-[10px] text-[#444] font-mono">AI can make mistakes</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── Thinking / Reasoning Stream (collapsed by default) ─── */
function StreamingThoughts({ reasoning }: { reasoning: string }) {
  const [open, setOpen] = useState(false);
  if (!reasoning) return null;

  return (
    <div className="pl-8 mb-3">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] font-mono text-[#555] hover:text-nvidia-green transition-colors mb-1">
        <Brain size={12} />
        <span>{open ? "hide thinking" : "show thinking"}</span>
        <ChevronDown size={10} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-1 p-3 bg-[#111] border-l-2 border-nvidia-green/30 rounded text-[12px] font-mono text-[#777] leading-relaxed whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto">
          {reasoning}
        </div>
      )}
    </div>
  );
}

/* ─── Message Bubble ─── */
function MessageBubble({ message, className }: { message: Message; className?: string }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const [showThoughts, setShowThoughts] = useState(false);
  const [showSources, setShowSources] = useState(false);

  // Separate image attachments from source attachments
  const imageAttachments = message.attachments?.filter(a => a.type !== "source") || [];
  const sourceAttachments = message.attachments?.filter(a => a.type === "source") || [];

  // Transform inline [N] citations into clickable links
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
      <div className="flex justify-center py-3">
        <span className="text-[11px] font-mono text-red-400 bg-red-500/5 border border-red-500/10 px-3 py-1 rounded-full">{message.content}</span>
      </div>
    );
  }

  return (
    <div className={cn("py-4", isUser ? "border-b border-[#1a1a1a]" : "", className)}>
      {/* header */}
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold font-mono flex-shrink-0",
          isUser ? "bg-[#333] text-white" : "bg-nvidia-green text-black"
        )}>
          {isUser ? ">" : "N"}
        </div>
        <span className={cn("text-[12px] font-semibold", isUser ? "text-[#ccc]" : "text-nvidia-green")}>
          {isUser ? "You" : "Assistant"}
        </span>
      </div>

      {/* reasoning toggle */}
      {message.reasoning && (
        <div className="pl-7 mb-2">
          <button onClick={() => setShowThoughts(!showThoughts)}
            className="flex items-center gap-1.5 text-[11px] font-mono text-[#555] hover:text-nvidia-green transition-colors">
            <Brain size={12} />
            {showThoughts ? "hide thinking" : "show thinking"}
            <ChevronDown size={10} className={cn("transition-transform", showThoughts && "rotate-180")} />
          </button>
          {showThoughts && (
            <div className="mt-1.5 p-3 bg-[#111] border-l-2 border-nvidia-green/30 rounded text-[12px] font-mono text-[#777] leading-relaxed whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto">
              {message.reasoning}
            </div>
          )}
        </div>
      )}

      {/* image attachments */}
      {imageAttachments.length > 0 && (
        <div className="pl-7 mb-2 flex flex-wrap gap-2">
          {imageAttachments.map((att, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-[#2a2a2a] bg-[#1a1a1a] cursor-pointer"
              onClick={() => window.open(att.data, '_blank')}>
              <img
                src={att.data}
                alt={att.name}
                className="max-h-[240px] max-w-[360px] w-auto object-contain rounded-lg msg-image"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-white/80 font-mono truncate block">{att.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* content */}
      <div className="pl-7">
        {isUser ? (
          <p className="text-[13px] text-[#d4d4d4] whitespace-pre-wrap leading-relaxed">
            {message.content.replace(/^\[Attached:.*?\]\n*/, '')}
          </p>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown
              components={{
                code: CodeBlock,
                a: ({ href, children, ...props }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                    {children}
                  </a>
                ),
              }}
              remarkPlugins={[remarkGfm]}
            >
              {processContent(message.content)}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* search sources */}
      {sourceAttachments.length > 0 && (
        <div className="pl-7 mt-3">
          <button
            onClick={() => setShowSources(!showSources)}
            className="flex items-center gap-1.5 text-[11px] font-mono text-[#555] hover:text-nvidia-green transition-colors mb-1.5"
          >
            <Globe size={12} />
            <span>{sourceAttachments.length} source{sourceAttachments.length > 1 ? "s" : ""}</span>
            <ChevronDown size={10} className={cn("transition-transform", showSources && "rotate-180")} />
          </button>
          {showSources && (
            <div className="flex flex-wrap gap-1.5">
              {sourceAttachments.map((s, i) => (
                <a
                  key={i}
                  href={s.data}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] hover:border-nvidia-green/30 transition-colors group"
                >
                  <span className="flex items-center justify-center w-4 h-4 rounded bg-[#222] text-[9px] font-mono font-bold text-nvidia-green">{i + 1}</span>
                  <span className="text-[11px] text-[#888] group-hover:text-nvidia-green truncate max-w-[200px] sm:max-w-[280px]">{s.name}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
