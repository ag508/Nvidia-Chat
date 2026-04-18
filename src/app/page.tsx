"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { Model, Conversation, Message, MessageAttachment } from "@/lib/types";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { Empty } from "@/components/Empty";
import { Composer } from "@/components/Composer";
import { MessageView, StreamingView, parseThinkTags } from "@/components/Message";

export default function ChatPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState("");
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
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const scrollRef = useRef<HTMLDivElement>(null);
  const streamContentRef = useRef("");
  const streamReasoningRef = useRef("");
  const rafIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  /* ─ theme init / persist ─ */
  useEffect(() => {
    const t = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme(t);
  }, []);
  const toggleTheme = useCallback(() => {
    const next: "light" | "dark" = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try { localStorage.setItem("nv.theme", next); } catch {}
  }, [theme]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /* ─ data fetching ─ */
  useEffect(() => { fetchModels(); fetchConversations(); }, []);

  /* ─ mobile detection ─ */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 820px)");
    setIsMobile(mq.matches);
    setSidebarOpen(!mq.matches);
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      setSidebarOpen(!e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /* smooth scroll */
  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 400;
    if (isNearBottom) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);
  useEffect(() => {
    requestAnimationFrame(() => scrollToBottom());
  }, [messages, streamContent, streamReasoning, scrollToBottom]);

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
      if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "auto" });
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
    await fetch(`/api/messages?id=${messageId}&conversationId=${activeConversation}`, { method: "DELETE" });
    const targetMsg = messages.find(m => m.id === messageId);
    if (targetMsg) {
      setMessages(prev => prev.filter(m => new Date(m.createdAt) < new Date(targetMsg.createdAt)));
    }
    setEditingMessageId(null);
    const text = editInput.trim();
    setInput("");
    setEditInput("");
    setTimeout(() => sendMessageDirect(text), 50);
  }

  /* ─── Direct send (used by edit-resubmit and empty-state prompt) ─── */
  const sendMessageDirect = useCallback(async (textContent: string) => {
    if (!textContent || isStreaming) return;
    const convId = activeConversation || await createConversation();

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
    setStreamContent(""); setStreamReasoning("");

    const currentMsgs = await fetch(`/api/messages?conversationId=${convId}`).then(r => r.json());
    const chatMsgs: Array<{ role: string; content: any }> = currentMsgs.map((m: any) => ({ role: m.role, content: m.content }));

    let sources: Array<{ title: string; url: string }> = [];
    if (searchEnabled && textContent) {
      setIsSearching(true);
      try {
        const sr = await fetch("/api/search", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: textContent, maxResults: 5 }),
        });
        if (sr.ok) {
          const { results } = await sr.json();
          if (results?.length) {
            sources = results.map((r: any) => ({ title: r.title, url: r.url }));
            setSearchSources(sources);
            const ctx = results.map((r: any, i: number) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`).join("\n\n");
            chatMsgs.unshift({ role: "system", content: `You have access to the following real-time web search results. Cite sources using [1], [2], etc.\n\n---\nSEARCH RESULTS:\n${ctx}\n---` });
          }
        }
      } catch (e) { console.error("Search failed:", e); }
      finally { setIsSearching(false); }
    }

    await runStream(chatMsgs, convId, sources);
  }, [isStreaming, activeConversation, selectedModelId, searchEnabled]);

  /* ─── Shared stream runner ─── */
  const runStream = async (
    chatMsgs: Array<{ role: string; content: any }>,
    convId: string,
    sources: Array<{ title: string; url: string }>
  ) => {
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
        if (!rafIdRef.current) rafIdRef.current = requestAnimationFrame(flushStream);
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
        body: JSON.stringify({
          conversationId: convId,
          role: "assistant",
          content: cleanedContent,
          reasoning: combinedReasoning || undefined,
          attachments: sourceAttachments,
          modelName: selectedModel?.name || "Assistant",
        }),
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
            body: JSON.stringify({
              conversationId: convId, role: "assistant",
              content: pc || partial, reasoning: pr || undefined,
              modelName: selectedModel?.name || "Assistant",
            }),
          }).then(r => r.json());
          setMessages(p => [...p, am]);
        }
      } else {
        setMessages(p => [...p, {
          id: "err-" + Date.now(), conversationId: convId, role: "system",
          content: `Error: ${err.message}`, createdAt: new Date().toISOString(),
        }]);
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
  };

  /* ─── Send from composer ─── */
  const sendMessage = useCallback(async () => {
    if ((!input.trim() && !attachments.length) || isStreaming) return;
    const textContent = input.trim();
    const currentAttachments = [...attachments];

    const displayContent = textContent;
    setInput("");
    setAttachments([]);

    const convId = activeConversation || await createConversation();

    let savedAttachments: MessageAttachment[] | undefined;
    if (currentAttachments.length > 0) {
      savedAttachments = [];
      for (const f of currentAttachments) {
        const dataUri = await fileToBase64(f);
        savedAttachments.push({ name: f.name, type: f.type || "application/octet-stream", data: dataUri });
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
    setStreamContent(""); setStreamReasoning("");

    let apiContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }> = textContent;
    const imageAttachments = currentAttachments.filter(f => f.type.startsWith("image/"));
    const nonImageAttachments = currentAttachments.filter(f => !f.type.startsWith("image/"));

    // Extract text (and rasterized pages for PDFs) via /api/extract
    let extractedBlock = "";
    const extractedImages: string[] = [];
    if (nonImageAttachments.length) {
      const results = await Promise.all(nonImageAttachments.map(async f => {
        try {
          const fd = new FormData();
          fd.append("file", f);
          const r = await fetch("/api/extract", { method: "POST", body: fd });
          if (!r.ok) {
            const { error } = await r.json().catch(() => ({ error: "extraction failed" }));
            return { name: f.name, text: `[Could not extract: ${error}]`, truncated: false, images: [] as string[] };
          }
          return await r.json() as { name: string; text: string; truncated: boolean; images?: string[] };
        } catch (e: any) {
          return { name: f.name, text: `[Extraction error: ${e?.message || "unknown"}]`, truncated: false, images: [] as string[] };
        }
      }));
      extractedBlock = results.map(r =>
        `--- File: ${r.name}${r.truncated ? " (truncated)" : ""} ---\n${r.text}\n--- End of ${r.name} ---`
      ).join("\n\n");
      for (const r of results) if (r.images?.length) extractedImages.push(...r.images);
    }

    const composedText = [extractedBlock, textContent].filter(Boolean).join("\n\n");
    const hasAnyImages = imageAttachments.length > 0 || extractedImages.length > 0;

    if (hasAnyImages) {
      const parts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
      if (composedText) parts.push({ type: "text", text: composedText });
      for (const f of imageAttachments) {
        const dataUri = await fileToBase64(f);
        parts.push({ type: "image_url", image_url: { url: dataUri } });
      }
      for (const url of extractedImages) {
        parts.push({ type: "image_url", image_url: { url } });
      }
      apiContent = parts;
    } else if (composedText) {
      apiContent = composedText;
    }

    const chatMsgs: Array<{ role: string; content: any }> = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    let sources: Array<{ title: string; url: string }> = [];
    if (searchEnabled && textContent) {
      setIsSearching(true);
      try {
        const sr = await fetch("/api/search", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: textContent, maxResults: 5 }),
        });
        if (sr.ok) {
          const { results } = await sr.json();
          if (results?.length) {
            sources = results.map((r: any) => ({ title: r.title, url: r.url }));
            setSearchSources(sources);
            const ctx = results.map((r: any, i: number) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`).join("\n\n");
            chatMsgs.unshift({ role: "system", content: `You have access to the following real-time web search results. Cite sources using [1], [2], etc.\n\n---\nSEARCH RESULTS:\n${ctx}\n---` });
          }
        }
      } catch (e) { console.error("Search failed:", e); }
      finally { setIsSearching(false); }
    }

    chatMsgs.push({ role: "user", content: apiContent });

    await runStream(chatMsgs, convId, sources);
  }, [input, isStreaming, activeConversation, messages, selectedModelId, attachments, searchEnabled]);

  const selectedModel = models.find(m => m.id === selectedModelId) || null;

  /* ─── layout ─── */
  const desktopOpen = sidebarOpen && !isMobile;

  return (
    <div
      className="nv-chat-shell flex"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      {/* ── Mobile backdrop ── */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className="h-full min-h-0 flex-shrink-0 overflow-hidden"
        style={
          isMobile
            ? {
                position: "fixed",
                top: 0, bottom: 0, left: 0,
                width: 280,
                zIndex: 50,
                transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
                transition: "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
              }
            : {
                position: "relative",
                width: desktopOpen ? 260 : 0,
                transition: "width 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
              }
        }
      >
        <div style={{ width: isMobile ? 280 : 260, height: "100%" }}>
          <Sidebar
            conversations={conversations}
            activeId={activeConversation}
            onSelectConv={loadMessages}
            onNewChat={() => {
              setActiveConversation(null);
              setMessages([]);
              if (isMobile) setSidebarOpen(false);
            }}
            onDeleteConv={deleteConversation}
            onCollapse={() => setSidebarOpen(false)}
            theme={theme}
          />
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex flex-col min-w-0 min-h-0 flex-1 relative" style={{ background: "var(--canvas)" }}>
        <Topbar
          model={selectedModel}
          models={models}
          onPickModel={m => setSelectedModelId(m.id)}
          onToggleSidebar={() => setSidebarOpen(v => !v)}
          sidebarOpen={desktopOpen && !isMobile}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
          {!messages.length && !isStreaming ? (
            <Empty modelName={selectedModel?.name} />
          ) : (
            <div className="mx-auto px-4 sm:px-7 pt-6 sm:pt-8" style={{ maxWidth: 780, paddingBottom: 220 }}>
              {messages.map(msg => (
                <MessageView
                  key={msg.id}
                  message={msg}
                  modelName={msg.modelName || selectedModel?.name || "Assistant"}
                  onImageClick={setLightboxSrc}
                  isEditing={editingMessageId === msg.id}
                  editInput={editInput}
                  onEditStart={() => {
                    const clean = msg.content.replace(/^\[Attached:.*?\]\n*/, "");
                    setEditingMessageId(msg.id);
                    setEditInput(clean);
                  }}
                  onEditChange={setEditInput}
                  onEditSubmit={() => handleEditSubmit(msg.id)}
                  onEditCancel={() => { setEditingMessageId(null); setEditInput(""); }}
                  isStreaming={isStreaming}
                />
              ))}

              {(isStreaming || streamContent || streamReasoning) && (
                <StreamingView
                  modelName={selectedModel?.name || "Assistant"}
                  streamContent={streamContent}
                  streamReasoning={streamReasoning}
                  searchSources={searchSources}
                  isSearching={isSearching}
                />
              )}
            </div>
          )}
        </div>

        <Composer
          value={input}
          onChange={setInput}
          onSubmit={sendMessage}
          onStop={stopGeneration}
          streaming={isStreaming}
          attachments={attachments}
          onAttach={files => setAttachments(prev => [...prev, ...files])}
          onRemoveAttachment={i => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
          searchEnabled={searchEnabled}
          onToggleSearch={() => setSearchEnabled(v => !v)}
        />
      </main>

      {/* ── Image Lightbox ── */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center cursor-zoom-out p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="Enlarged"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxSrc(null)}
            className="absolute top-6 right-6 p-2 rounded-full cursor-pointer"
            style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "none" }}
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
