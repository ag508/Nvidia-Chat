"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Check,
  ChevronDown,
  Command,
  Compass,
  Copy,
  Cpu,
  FileText,
  Globe,
  Image as ImageIcon,
  Loader2,
  Menu,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  TerminalSquare,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Conversation, Message, MessageAttachment, Model } from "@/lib/types";

function CodeBlock({ inline, className, children, ...props }: any) {
  const lang = /language-(\w+)/.exec(className || "")?.[1];
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, "");

  if (!inline && lang) {
    return (
      <div className="my-4 overflow-hidden rounded-2xl border border-white/10 bg-[#0a1115] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-4 py-2.5">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.28em] text-white/45">
            <span className="h-2 w-2 rounded-full bg-[#76b900]" />
            {lang}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/55 transition hover:border-[#76b900]/40 hover:text-white"
          >
            {copied ? <Check size={12} className="text-[#76b900]" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={lang}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "1rem 1.1rem",
            background: "transparent",
            fontSize: "12.5px",
            lineHeight: "1.7",
          }}
          {...props}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    );
  }

  return (
    <code className={cn("rounded-md border border-[#76b900]/15 bg-[#76b900]/10 px-1.5 py-0.5 font-mono text-[0.85em] text-[#b5f35c]", className)} {...props}>
      {children}
    </code>
  );
}

const promptIdeas = [
  "Design a launch plan for a GPU inference API with pricing tiers.",
  "Explain a CUDA kernel optimization strategy like a terminal log.",
  "Compare Claude, GPT, and local models for a support assistant.",
  "Summarize the latest architecture decisions in this project.",
];

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
  const animationFrameRef = useRef<number | null>(null);
  const pendingContentRef = useRef("");
  const pendingReasoningRef = useRef("");

  useEffect(() => {
    fetchModels();
    fetchConversations();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    setIsMobile(mq.matches);
    setSidebarOpen(!mq.matches);

    const handler = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
      setSidebarOpen(!event.matches);
    };

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(event.target as Node)) {
        setShowModelPicker(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const scrollToBottom = useCallback((force = false) => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 220;
    if (force || isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: force ? "auto" : "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamContent, streamReasoning, scrollToBottom]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
  }, [input]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const selectedModel = models.find((model) => model.id === selectedModelId);
  const activeConversationTitle = conversations.find((item) => item.id === activeConversation)?.title;
  const sourceCount = useMemo(
    () => messages.reduce((acc, message) => acc + (message.attachments?.filter((attachment) => attachment.type === "source").length || 0), 0),
    [messages]
  );

  const scheduleStreamFlush = useCallback(() => {
    if (animationFrameRef.current) return;
    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;
      setStreamContent(pendingContentRef.current);
      setStreamReasoning(pendingReasoningRef.current);
    });
  }, []);

  async function fetchModels() {
    const data = await fetch("/api/models").then((response) => response.json());
    setModels(data);
    const defaultModel = data.find((model: Model) => model.isDefault) || data[0];
    if (defaultModel) setSelectedModelId(defaultModel.id);
  }

  async function fetchConversations() {
    setConversations(await fetch("/api/conversations").then((response) => response.json()));
  }

  async function loadMessages(id: string) {
    setMessages(await fetch(`/api/messages?conversationId=${id}`).then((response) => response.json()));
    setActiveConversation(id);
    scrollToBottom(true);
    if (isMobile) setSidebarOpen(false);
  }

  async function createConversation() {
    const conversation = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: selectedModelId }),
    }).then((response) => response.json());

    setConversations((prev) => [conversation, ...prev]);
    setActiveConversation(conversation.id);
    setMessages([]);
    return conversation.id;
  }

  async function deleteConversation(id: string) {
    await fetch(`/api/conversations?id=${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((conversation) => conversation.id !== id));
    if (activeConversation === id) {
      setActiveConversation(null);
      setMessages([]);
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(event.target.files || [])]);
    }
    event.target.value = "";
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const sendMessage = useCallback(async () => {
    if ((!input.trim() && !attachments.length) || isStreaming) return;

    const textContent = input.trim();
    const currentAttachments = [...attachments];

    let displayContent = textContent;
    if (currentAttachments.length) {
      const names = currentAttachments.map((file) => file.name).join(", ");
      displayContent = textContent ? `[Attached: ${names}]\n\n${textContent}` : `[Attached: ${names}]`;
    }

    setInput("");
    setAttachments([]);

    const conversationId = activeConversation || (await createConversation());

    const imageFiles = currentAttachments.filter((file) => file.type.startsWith("image/"));
    let savedAttachments: MessageAttachment[] | undefined;

    if (imageFiles.length > 0) {
      savedAttachments = [];
      for (const imageFile of imageFiles) {
        const dataUri = await fileToBase64(imageFile);
        savedAttachments.push({ name: imageFile.name, type: imageFile.type, data: dataUri });
      }
    }

    const userMessage = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId,
        role: "user",
        content: displayContent,
        attachments: savedAttachments,
      }),
    }).then((response) => response.json());

    setMessages((prev) => [...prev, userMessage]);
    fetchConversations();
    setIsStreaming(true);
    pendingContentRef.current = "";
    pendingReasoningRef.current = "";
    setStreamContent("");
    setStreamReasoning("");

    let apiContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }> = textContent;
    const imageAttachments = currentAttachments.filter((file) => file.type.startsWith("image/"));
    const nonImageAttachments = currentAttachments.filter((file) => !file.type.startsWith("image/"));

    if (imageAttachments.length > 0) {
      const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
      let fullText = textContent;

      if (nonImageAttachments.length) {
        const names = nonImageAttachments.map((file) => file.name).join(", ");
        fullText = fullText ? `[Attached files: ${names}]\n\n${fullText}` : `[Attached files: ${names}]`;
      }

      if (fullText) contentParts.push({ type: "text", text: fullText });

      for (const imageFile of imageAttachments) {
        const dataUri = await fileToBase64(imageFile);
        contentParts.push({ type: "image_url", image_url: { url: dataUri } });
      }

      apiContent = contentParts;
    } else if (nonImageAttachments.length) {
      const names = nonImageAttachments.map((file) => file.name).join(", ");
      apiContent = textContent ? `[Attached files: ${names}]\n\n${textContent}` : `[Attached files: ${names}]`;
    }

    const chatMessages: Array<{ role: string; content: any }> = [
      ...messages.map((message) => ({ role: message.role, content: message.content })),
    ];

    let sources: Array<{ title: string; url: string }> = [];

    if (searchEnabled && textContent) {
      setIsSearching(true);
      try {
        const searchResponse = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: textContent, maxResults: 5 }),
        });

        if (searchResponse.ok) {
          const { results } = await searchResponse.json();
          if (results?.length) {
            sources = results.map((result: any) => ({ title: result.title, url: result.url }));
            setSearchSources(sources);
            const searchContext = results
              .map((result: any, index: number) => `[${index + 1}] ${result.title}\nURL: ${result.url}\n${result.snippet}`)
              .join("\n\n");

            chatMessages.unshift({
              role: "system",
              content:
                "You have access to the following real-time web search results for the user's query. Use this information to provide accurate, up-to-date answers. Cite sources using [1], [2], etc. when referencing specific results.\n\n---\nSEARCH RESULTS:\n" +
                searchContext +
                "\n---",
            });
          }
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }

    chatMessages.push({ role: "user", content: apiContent });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatMessages, modelId: selectedModelId, conversationId }),
      });

      if (!response.ok) {
        throw new Error((await response.json()).error || "Request failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let reasoning = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          for (const line of decoder.decode(value).split("\n").filter((item) => item.startsWith("data: "))) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const payload = JSON.parse(data);
              if (payload.type === "error") throw new Error(payload.content);
              if (payload.type === "reasoning") {
                reasoning += payload.content;
                pendingReasoningRef.current = reasoning;
                scheduleStreamFlush();
              }
              if (payload.type === "content") {
                full += payload.content;
                pendingContentRef.current = full;
                scheduleStreamFlush();
              }
            } catch {
              continue;
            }
          }
        }
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setStreamContent(full);
      setStreamReasoning(reasoning);

      const sourceAttachments = sources.length
        ? sources.map((source) => ({ name: source.title, type: "source", data: source.url }))
        : undefined;

      const assistantMessage = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          role: "assistant",
          content: full,
          reasoning: reasoning || undefined,
          attachments: sourceAttachments,
        }),
      }).then((response) => response.json());

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          conversationId,
          role: "system",
          content: `Error: ${error.message}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsStreaming(false);
      pendingContentRef.current = "";
      pendingReasoningRef.current = "";
      setStreamContent("");
      setStreamReasoning("");
      setSearchSources([]);
    }
  }, [activeConversation, attachments, createConversation, input, isStreaming, messages, scheduleStreamFlush, searchEnabled, selectedModelId]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(118,185,0,0.16),_transparent_24%),linear-gradient(180deg,#071015_0%,#05080b_45%,#040506_100%)] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-60">
        <div className="terminal-grid absolute inset-0" />
        <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,_rgba(118,185,0,0.18),_transparent_55%)]" />
      </div>

      {isMobile && sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <div className="relative flex h-screen overflow-hidden">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={isMobile ? { x: -320, opacity: 0 } : { opacity: 0 }}
              animate={isMobile ? { x: 0, opacity: 1 } : { opacity: 1 }}
              exit={isMobile ? { x: -320, opacity: 0 } : { opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "z-40 flex h-full w-[320px] shrink-0 flex-col border-r border-white/10 bg-black/45 backdrop-blur-2xl",
                isMobile && "mobile-sidebar fixed left-0 top-0 bottom-0"
              )}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#76b900]/40 bg-[#76b900]/15 shadow-[0_0_30px_rgba(118,185,0,0.18)]">
                      <TerminalSquare size={19} className="text-[#9ae61a]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-[#9ae61a]">NVIDIA CHAT</p>
                      <h1 className="text-lg font-semibold text-white">Terminal intelligence</h1>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-xl border border-white/10 p-2 text-white/55 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4 border-b border-white/10 px-5 py-4">
                <button
                  onClick={() => {
                    setActiveConversation(null);
                    setMessages([]);
                    setSearchSources([]);
                    if (isMobile) setSidebarOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-[#76b900]/25 bg-[linear-gradient(135deg,rgba(118,185,0,0.14),rgba(118,185,0,0.04))] px-4 py-3.5 text-left shadow-[0_16px_40px_rgba(118,185,0,0.08)] transition hover:border-[#76b900]/40 hover:translate-y-[-1px]"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">New conversation</p>
                    <p className="mt-1 text-xs text-white/55">Start a fresh terminal session.</p>
                  </div>
                  <Plus size={18} className="text-[#9ae61a]" />
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Chats" value={String(conversations.length).padStart(2, "0")} icon={<MessageSquare size={15} />} />
                  <MetricCard label="Sources" value={String(sourceCount).padStart(2, "0")} icon={<Search size={15} />} />
                </div>
              </div>

              <div className="px-5 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">Recents</p>
                  <span className="text-[11px] text-white/35">{conversations.length} threads</span>
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-5">
                {conversations.map((conversation, index) => (
                  <motion.button
                    key={conversation.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.02, 0.14) }}
                    onClick={() => loadMessages(conversation.id)}
                    className={cn(
                      "group relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border px-3.5 py-3 text-left transition",
                      activeConversation === conversation.id
                        ? "border-[#76b900]/35 bg-[#76b900]/12 shadow-[0_12px_34px_rgba(118,185,0,0.10)]"
                        : "border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]"
                    )}
                  >
                    <div className={cn("mt-0.5 rounded-xl border p-2", activeConversation === conversation.id ? "border-[#76b900]/40 bg-[#76b900]/10 text-[#9ae61a]" : "border-white/10 bg-black/20 text-white/45")}>
                      <Command size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-white">{conversation.title}</p>
                        {index === 0 && <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] text-white/40">Latest</span>}
                      </div>
                      <p className="mt-1 truncate text-xs text-white/40">{conversation.updatedAt?.replace("T", " ").slice(0, 16) || "Awaiting activity"}</p>
                    </div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteConversation(conversation.id);
                      }}
                      className="rounded-lg p-1.5 text-white/0 transition group-hover:text-white/45 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.button>
                ))}

                {!conversations.length && (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
                    <Sparkles size={22} className="mx-auto mb-3 text-[#76b900]" />
                    <p className="text-sm font-medium text-white">No conversations yet</p>
                    <p className="mt-1 text-xs text-white/45">Create your first Claude-style terminal chat.</p>
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 px-5 py-4">
                <a
                  href="/settings"
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
                >
                  <span className="inline-flex items-center gap-2">
                    <Settings size={15} /> Configure models
                  </span>
                  <ArrowRight size={14} className="text-[#9ae61a]" />
                </a>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <main className="relative flex min-w-0 flex-1 flex-col">
          <header className="border-b border-white/10 bg-black/25 px-3 py-3 backdrop-blur-xl sm:px-5">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  onClick={() => setSidebarOpen((prev) => !prev)}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-white/65 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                >
                  <Menu size={17} />
                </button>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#76b900]/30 bg-[#76b900]/10 px-3 py-1 text-[11px] uppercase tracking-[0.26em] text-[#9ae61a]">
                      <span className="h-2 w-2 rounded-full bg-[#9ae61a] shadow-[0_0_12px_rgba(154,230,26,0.85)]" />
                      Live session
                    </span>
                    <span className="truncate text-sm font-semibold text-white">{activeConversationTitle || "New terminal conversation"}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-white/45">
                    {selectedModel ? `${selectedModel.provider} · ${selectedModel.modelId}` : "Configure a model to begin streaming responses."}
                  </p>
                </div>
              </div>

              <div className="hidden items-center gap-2 md:flex">
                <StatusPill icon={<Globe size={13} />} label={searchEnabled ? "Search armed" : "Search off"} active={searchEnabled} />
                <StatusPill icon={<Cpu size={13} />} label={selectedModel?.name || "No model"} active />
              </div>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-6">
            <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col">
              {!messages.length && !isStreaming ? (
                <EmptyState
                  selectedModel={selectedModel}
                  searchEnabled={searchEnabled}
                  setInput={setInput}
                  prompts={promptIdeas}
                />
              ) : (
                <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 pb-6">
                  <AnimatePresence initial={false}>
                    {messages.map((message, index) => (
                      <MessageBubble key={message.id} message={message} isLatest={index === messages.length - 1} />
                    ))}
                  </AnimatePresence>

                  <AnimatePresence>
                    {isSearching && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="ml-0 flex w-full max-w-3xl items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/60 shadow-[0_18px_40px_rgba(0,0,0,0.2)]"
                      >
                        <Globe size={16} className="text-[#76b900] animate-spin" />
                        Searching the web for fresh context...
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isStreaming && (
                    <StreamingPanel reasoning={streamReasoning} content={streamContent} searchSources={searchSources} />
                  )}
                </div>
              )}
            </div>
          </div>

          <footer className="border-t border-white/10 bg-black/35 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl sm:px-5 sm:pt-4">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {attachments.map((file, index) => (
                    <AttachmentPreview key={`${file.name}-${index}`} file={file} onRemove={() => removeAttachment(index)} />
                  ))}
                </div>
              )}

              <div className="rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.03))] p-2.5 shadow-[0_-12px_40px_rgba(0,0,0,0.28),0_18px_45px_rgba(118,185,0,0.06)] backdrop-blur-xl">
                <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
                  <ToolbarChip
                    icon={<Globe size={14} />}
                    label={searchEnabled ? "Search on" : "Search"}
                    active={searchEnabled}
                    onClick={() => setSearchEnabled((prev) => !prev)}
                  />
                  <ToolbarChip
                    icon={<Paperclip size={14} />}
                    label="Attach"
                    onClick={() => fileInputRef.current?.click()}
                  />
                  <div className="hidden sm:block h-5 w-px bg-white/10" />
                  <p className="hidden text-xs text-white/35 sm:block">Streaming tuned for smooth token updates.</p>
                </div>

                <div className="flex items-end gap-2">
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                    rows={1}
                    placeholder="Ask anything, inspect code, or draft an answer..."
                    className="max-h-[220px] min-h-[66px] flex-1 resize-none bg-transparent px-3 py-3 text-[15px] leading-7 text-white placeholder:text-white/28 focus:outline-none"
                  />
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={sendMessage}
                    disabled={(!input.trim() && !attachments.length) || isStreaming}
                    className={cn(
                      "mb-1 inline-flex h-12 w-12 items-center justify-center rounded-2xl border transition",
                      (input.trim() || attachments.length) && !isStreaming
                        ? "border-[#76b900]/40 bg-[#76b900] text-black shadow-[0_12px_28px_rgba(118,185,0,0.35)] hover:bg-[#8fd80b]"
                        : "border-white/10 bg-white/[0.04] text-white/28"
                    )}
                  >
                    {isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </motion.button>
                </div>

                <div className="mt-2 flex flex-col gap-2 border-t border-white/8 px-1 pt-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative" ref={modelPickerRef}>
                    <button
                      onClick={() => setShowModelPicker((prev) => !prev)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/65 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
                    >
                      <Cpu size={14} className="text-[#9ae61a]" />
                      {selectedModel?.name || "Select model"}
                      <ChevronDown size={13} className={cn("transition", showModelPicker && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {showModelPicker && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          className="model-picker-popup absolute bottom-full left-0 z-50 mb-3 w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-white/12 bg-[#071015]/95 shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
                        >
                          <div className="border-b border-white/8 px-4 py-3">
                            <p className="text-[11px] uppercase tracking-[0.28em] text-white/38">Models</p>
                            <p className="mt-1 text-xs text-white/45">Switch providers without leaving the conversation.</p>
                          </div>
                          <div className="max-h-[320px] overflow-y-auto p-2">
                            {models.map((model) => (
                              <button
                                key={model.id}
                                onClick={() => {
                                  setSelectedModelId(model.id);
                                  setShowModelPicker(false);
                                }}
                                className={cn(
                                  "mb-1.5 flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition last:mb-0",
                                  selectedModelId === model.id
                                    ? "border-[#76b900]/30 bg-[#76b900]/10 text-white"
                                    : "border-white/8 bg-white/[0.03] text-white/68 hover:border-white/15 hover:bg-white/[0.05]"
                                )}
                              >
                                <div className={cn("mt-0.5 h-2.5 w-2.5 rounded-full", selectedModelId === model.id ? "bg-[#9ae61a] shadow-[0_0_12px_rgba(154,230,26,0.7)]" : "bg-white/20")} />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">{model.name}</p>
                                  <p className="mt-1 truncate font-mono text-[11px] text-white/42">{model.provider} · {model.modelId}</p>
                                </div>
                              </button>
                            ))}
                            {!models.length && <p className="px-3 py-4 text-sm text-white/40">No models configured yet.</p>}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/35">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5">
                      <Wand2 size={12} className="text-[#9ae61a]" />
                      Shift + Enter for new line
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5">
                      <Compass size={12} className="text-[#9ae61a]" />
                      Mobile and desktop optimized
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

function EmptyState({
  selectedModel,
  searchEnabled,
  setInput,
  prompts,
}: {
  selectedModel?: Model;
  searchEnabled: boolean;
  setInput: (value: string) => void;
  prompts: string[];
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-8 py-8 md:py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#76b900]/30 bg-[#76b900]/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.3em] text-[#9ae61a]">
            <TerminalSquare size={13} />
            Claude-inspired terminal UI
          </div>
          <h2 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Elegant chat surfaces with a sharper terminal soul.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
            A redesigned workspace with calm gradients, responsive cards, smooth streaming updates, and a focused composer for both desktop and mobile.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <HeroBadge title="Streaming" value="Smooth" icon={<Sparkles size={16} />} />
            <HeroBadge title="Model" value={selectedModel?.name || "Unset"} icon={<Cpu size={16} />} />
            <HeroBadge title="Web search" value={searchEnabled ? "Ready" : "Optional"} icon={<Globe size={16} />} />
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-black/30 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-8">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-white/38">
            <Command size={14} className="text-[#9ae61a]" />
            Quick start
          </div>
          <div className="mt-5 space-y-3">
            {prompts.map((prompt, index) => (
              <button
                key={prompt}
                onClick={() => setInput(prompt)}
                className="group flex w-full items-start justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-left transition hover:border-[#76b900]/30 hover:bg-[#76b900]/8"
              >
                <div>
                  <p className="text-sm font-medium text-white">Prompt {String(index + 1).padStart(2, "0")}</p>
                  <p className="mt-1 text-sm leading-6 text-white/55">{prompt}</p>
                </div>
                <ArrowRight size={16} className="mt-1 shrink-0 text-white/35 transition group-hover:text-[#9ae61a]" />
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3.5 py-3">
      <div className="flex items-center justify-between text-white/42">
        <span className="text-xs uppercase tracking-[0.22em]">{label}</span>
        {icon}
      </div>
      <p className="mt-2 font-mono text-2xl text-white">{value}</p>
    </div>
  );
}

function StatusPill({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs", active ? "border-[#76b900]/25 bg-[#76b900]/10 text-white" : "border-white/10 bg-white/[0.03] text-white/55")}>
      {icon}
      {label}
    </span>
  );
}

function HeroBadge({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/25 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-white/40">{icon}<span>{title}</span></div>
      <p className="mt-2 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function ToolbarChip({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition",
        active ? "border-[#76b900]/30 bg-[#76b900]/12 text-white" : "border-white/10 bg-white/[0.03] text-white/58 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
      )}
    >
      <span className={active ? "text-[#9ae61a]" : "text-white/45"}>{icon}</span>
      {label}
    </button>
  );
}

function AttachmentPreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (file.type.startsWith("image/") && preview) {
    return (
      <div className="group relative overflow-hidden rounded-2xl border border-white/12 bg-black/35">
        <img src={preview} alt={file.name} className="attach-thumb h-24 w-auto max-w-[160px] object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent px-3 pb-2 pt-6">
          <p className="truncate text-xs text-white/70">{file.name}</p>
        </div>
        <button onClick={onRemove} className="absolute right-2 top-2 rounded-full border border-white/15 bg-black/60 p-1 text-white/70 transition hover:border-red-400/40 hover:text-red-200">
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/65">
      <FileText size={14} className="text-[#9ae61a]" />
      <span className="max-w-[180px] truncate">{file.name}</span>
      <button onClick={onRemove} className="rounded-full p-1 text-white/40 transition hover:bg-white/5 hover:text-red-200">
        <X size={12} />
      </button>
    </div>
  );
}

function StreamingPanel({
  reasoning,
  content,
  searchSources,
}: {
  reasoning: string;
  content: string;
  searchSources: Array<{ title: string; url: string }>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      {searchSources.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {searchSources.map((source, index) => (
            <a
              key={`${source.url}-${index}`}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-2 text-xs text-white/58 transition hover:border-[#76b900]/30 hover:text-white"
            >
              <Globe size={12} className="text-[#9ae61a]" />
              <span className="max-w-[220px] truncate">{source.title}</span>
            </a>
          ))}
        </div>
      )}

      <MessageShell role="assistant" streaming>
        <ThoughtsPanel reasoning={reasoning} />
        {content ? (
          <motion.div layout className="markdown-body stream-fade-in">
            <ReactMarkdown components={{ code: CodeBlock }} remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
            <span className="ml-1 inline-block h-5 w-2 animate-[pulse_1s_ease-in-out_infinite] rounded-sm bg-[#9ae61a] align-middle" />
          </motion.div>
        ) : !reasoning ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/55">
            <Loader2 size={14} className="animate-spin text-[#9ae61a]" />
            Generating response...
          </div>
        ) : null}
      </MessageShell>
    </motion.div>
  );
}

function ThoughtsPanel({ reasoning }: { reasoning?: string }) {
  const [open, setOpen] = useState(false);
  if (!reasoning) return null;

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/58 transition hover:border-[#76b900]/25 hover:text-white"
      >
        <Brain size={13} className="text-[#9ae61a]" />
        {open ? "Hide reasoning" : "Show reasoning"}
        <ChevronDown size={13} className={cn("transition", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-2xl border border-[#76b900]/15 bg-[#76b900]/8 p-4 font-mono text-xs leading-6 text-white/68">
              {reasoning}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MessageShell({
  role,
  children,
  streaming = false,
}: {
  role: "assistant" | "user";
  children: React.ReactNode;
  streaming?: boolean;
}) {
  const isUser = role === "user";

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex w-full gap-3", isUser ? "max-w-2xl flex-row-reverse" : streaming ? "max-w-3xl" : "max-w-3xl")}>
        <div
          className={cn(
            "mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold",
            isUser
              ? "border-white/10 bg-white/[0.06] text-white"
              : "border-[#76b900]/35 bg-[#76b900]/14 text-[#9ae61a]"
          )}
        >
          {isUser ? "U" : "AI"}
        </div>
        <div
          className={cn(
            "w-full rounded-[26px] border px-5 py-4 shadow-[0_20px_55px_rgba(0,0,0,0.16)]",
            isUser
              ? "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))]"
              : "border-white/10 bg-[linear-gradient(180deg,rgba(6,12,15,0.98),rgba(8,10,12,0.92))]"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message; isLatest?: boolean }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const [showSources, setShowSources] = useState(false);

  const imageAttachments = message.attachments?.filter((attachment) => attachment.type !== "source") || [];
  const sourceAttachments = message.attachments?.filter((attachment) => attachment.type === "source") || [];

  function processContent(content: string) {
    if (!sourceAttachments.length) return content;
    return content.replace(/\[(\d+)\]/g, (match, num) => {
      const index = Number(num) - 1;
      if (index >= 0 && index < sourceAttachments.length) {
        return `[\\[${num}\\]](${sourceAttachments[index].data})`;
      }
      return match;
    });
  }

  if (isSystem) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
        <div className="rounded-full border border-red-500/20 bg-red-500/8 px-4 py-2 text-xs text-red-200">{message.content}</div>
      </motion.div>
    );
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      <MessageShell role={isUser ? "user" : "assistant"}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">{isUser ? "You" : "Assistant"}</p>
            <p className="text-xs text-white/38">{message.createdAt?.replace("T", " ").slice(0, 16)}</p>
          </div>
          {!isUser && sourceAttachments.length > 0 && (
            <button
              onClick={() => setShowSources((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/55 transition hover:border-[#76b900]/25 hover:text-white"
            >
              <Globe size={12} className="text-[#9ae61a]" />
              {sourceAttachments.length} source{sourceAttachments.length > 1 ? "s" : ""}
              <ChevronDown size={12} className={cn("transition", showSources && "rotate-180")} />
            </button>
          )}
        </div>

        {!isUser && <ThoughtsPanel reasoning={message.reasoning} />}

        {imageAttachments.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-3">
            {imageAttachments.map((attachment, index) => (
              <button
                key={`${attachment.name}-${index}`}
                onClick={() => window.open(attachment.data, "_blank")}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 text-left"
              >
                {attachment.type.startsWith("image/") ? (
                  <img src={attachment.data} alt={attachment.name} className="msg-image max-h-[280px] max-w-[360px] w-auto object-contain" />
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 text-sm text-white/70">
                    <FileText size={15} className="text-[#9ae61a]" />
                    <span>{attachment.name}</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent px-3 pb-2 pt-6 opacity-0 transition group-hover:opacity-100">
                  <p className="text-xs text-white/75">{attachment.name}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {isUser ? (
          <p className="whitespace-pre-wrap text-[15px] leading-7 text-white/88">{message.content.replace(/^\[Attached:[^\n]*\]\n*/, "")}</p>
        ) : (
          <div className="markdown-body text-[15px] leading-7 text-white/85">
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

        <AnimatePresence>
          {showSources && sourceAttachments.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-4 flex flex-wrap gap-2">
                {sourceAttachments.map((source, index) => (
                  <a
                    key={`${source.data}-${index}`}
                    href={source.data}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/62 transition hover:border-[#76b900]/25 hover:text-white"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#76b900]/12 font-mono text-[10px] text-[#9ae61a]">{index + 1}</span>
                    <span className="max-w-[220px] truncate">{source.name}</span>
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </MessageShell>
    </motion.div>
  );
}
