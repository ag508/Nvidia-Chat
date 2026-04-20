"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
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
    try {
      localStorage.setItem("nv.theme", next);
    } catch {}
  }, [theme]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /* ─ data fetching ─ */
  useEffect(() => {
    fetchModels();
    fetchConversations();
  }, []);

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
      if (scrollRef.current)
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "auto" });
    }, 50);
  }
  async function createConversation() {
    const conv = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: selectedModelId }),
    }).then(r => r.json());
    setConversations(p => [conv, ...p]);
    setActiveConversation(conv.id);
    setMessages([]);
    return conv.id;
  }
  function deleteConversation(id: string) {
    const conv = conversations.find(c => c.id === id);
    const title = conv?.title || "this conversation";
    toast(`Delete "${title}"?`, {
      duration: 6000,
      action: {
        label: "Delete",
        onClick: async () => {
          await fetch(`/api/conversations?id=${id}`, { method: "DELETE" });
          setConversations(p => p.filter(c => c.id !== id));
          if (activeConversation === id) {
            setActiveConversation(null);
            setMessages([]);
          }
          toast.success("Removed");
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ─── Web search helpers ─── */
  // Tag the query with a freshness window when the user clearly asks for
  // fresh information — providers use this to prefer recently-indexed pages.
  function detectFreshness(
    text: string
  ): "day" | "week" | "month" | "year" | undefined {
    const s = text.toLowerCase();
    if (
      /\b(today|right now|breaking|just now|minutes? ago|hours? ago|latest)\b/.test(
        s
      )
    )
      return "day";
    if (/\b(this week|past week|recent|newly|just released)\b/.test(s))
      return "week";
    if (/\b(this month|past month|recently)\b/.test(s)) return "month";
    if (/\b(this year|past year|in 20\d\d)\b/.test(s)) return "year";
    return undefined;
  }

  interface SearchHit {
    title: string;
    url: string;
    snippet?: string;
    raw?: string;
    domain?: string;
    age?: string;
  }

  function buildSearchContext(
    query: string,
    hits: SearchHit[],
    provider: string
  ): string {
    const today = new Date().toISOString().slice(0, 10);
    const blocks = hits
      .map((r, i) => {
        const body = (r.raw || r.snippet || "").slice(0, 1800);
        const age = r.age ? `  (${r.age})` : "";
        return `[${i + 1}] ${r.title}\nURL: ${r.url}${age}\n${body}`;
      })
      .join("\n\n---\n\n");
    return [
      `You have live web search results from ${provider}.`,
      `Today's date is ${today}. The query issued was: "${query}".`,
      `Rules:`,
      `  • Use these results as ground truth for recent facts. Prefer them over prior training data when they conflict.`,
      `  • Cite sources inline as [1], [2], etc., matching the numbered list below.`,
      `  • If results don't cover the question, say so plainly and answer what you can without fabricating.`,
      ``,
      `---`,
      `SEARCH RESULTS:`,
      blocks,
      `---`,
    ].join("\n");
  }

  /* ─── AI helpers ─── */
  const generateTitle = useCallback(
    async (convId: string, userText: string, attachmentNames?: string[]) => {
      if (!selectedModelId) return;
      try {
        const r = await fetch("/api/conversations/title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: convId,
            modelId: selectedModelId,
            userText,
            attachmentNames,
          }),
        }).then(r => r.json());
        if (r.title) {
          setConversations(prev =>
            prev.map(c => (c.id === convId ? { ...c, title: r.title } : c))
          );
        }
      } catch {}
    },
    [selectedModelId]
  );

  const generateSearchQuery = useCallback(
    async (
      userText: string,
      attachmentContext?: string,
      history?: Array<{ role: string; content: string }>
    ): Promise<string> => {
      if (!selectedModelId) return userText;
      try {
        const r = await fetch("/api/search/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelId: selectedModelId,
            userText,
            attachmentContext,
            history,
          }),
        }).then(r => r.json());
        return r.query || userText;
      } catch {
        return userText;
      }
    },
    [selectedModelId]
  );

  /* ─── Edit & Resend ─── */
  async function handleEditSubmit(messageId: string) {
    if (!editInput.trim() || isStreaming || !activeConversation) return;
    await fetch(`/api/messages?id=${messageId}&conversationId=${activeConversation}`, {
      method: "DELETE",
    });
    const targetMsg = messages.find(m => m.id === messageId);
    if (targetMsg) {
      setMessages(prev =>
        prev.filter(m => new Date(m.createdAt) < new Date(targetMsg.createdAt))
      );
    }
    setEditingMessageId(null);
    const text = editInput.trim();
    setInput("");
    setEditInput("");
    setTimeout(() => sendMessageDirect(text), 50);
  }

  /* ─── Direct send (used by edit-resubmit and empty-state prompt) ─── */
  const sendMessageDirect = useCallback(
    async (textContent: string) => {
      if (!textContent || isStreaming) return;
      const isFreshConv = !activeConversation;
      const convId = activeConversation || (await createConversation());

      const userMsg = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      if (isFreshConv) {
        // don't await — run title generation alongside the main stream
        generateTitle(convId, textContent);
      }

      const currentMsgs = await fetch(`/api/messages?conversationId=${convId}`).then(r => r.json());
      const chatMsgs: Array<{ role: string; content: any }> = currentMsgs.map((m: any) => ({
        role: m.role,
        content: m.content,
      }));

      let sources: Array<{ title: string; url: string }> = [];
      if (searchEnabled && textContent) {
        setIsSearching(true);
        try {
          const query = await generateSearchQuery(
            textContent,
            undefined,
            currentMsgs.slice(-4).map((m: any) => ({
              role: m.role,
              content: typeof m.content === "string" ? m.content : "",
            }))
          );
          const freshness = detectFreshness(textContent);
          const sr = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, maxResults: 8, freshness }),
          });
          if (sr.ok) {
            const { results, provider } = (await sr.json()) as {
              results: SearchHit[];
              provider: string;
            };
            if (results?.length) {
              sources = results.map(r => ({ title: r.title, url: r.url }));
              setSearchSources(sources);
              chatMsgs.unshift({
                role: "system",
                content: buildSearchContext(query, results, provider),
              });
            }
          }
        } catch (e) {
          console.error("Search failed:", e);
        } finally {
          setIsSearching(false);
        }
      }

      await runStream(chatMsgs, convId, sources);
    },
    [isStreaming, activeConversation, selectedModelId, searchEnabled, generateTitle, generateSearchQuery]
  );

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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatMsgs,
          modelId: selectedModelId,
          conversationId: convId,
        }),
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
          for (const line of decoder
            .decode(value)
            .split("\n")
            .filter(l => l.startsWith("data: "))) {
            const d = line.slice(6);
            if (d === "[DONE]") continue;
            try {
              const p = JSON.parse(d);
              if (p.type === "error") throw new Error(p.content);
              if (p.type === "reasoning") {
                streamReasoningRef.current += p.content;
                scheduleFlush();
              }
              if (p.type === "content") {
                streamContentRef.current += p.content;
                scheduleFlush();
              }
            } catch {}
          }
        }
      }

      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      const finalContent = streamContentRef.current;
      const finalReasoning = streamReasoningRef.current;
      const { thinking: parsedThinking, cleaned: cleanedContent } = parseThinkTags(finalContent);
      const combinedReasoning = [finalReasoning, parsedThinking].filter(Boolean).join("\n\n");

      const sourceAttachments =
        sources.length > 0
          ? sources.map(s => ({ name: s.title, type: "source", data: s.url }))
          : undefined;

      const am = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId: convId,
              role: "assistant",
              content: pc || partial,
              reasoning: pr || undefined,
              modelName: selectedModel?.name || "Assistant",
            }),
          }).then(r => r.json());
          setMessages(p => [...p, am]);
        }
      } else {
        toast.error(err.message || "Request failed");
        setMessages(p => [
          ...p,
          {
            id: "err-" + Date.now(),
            conversationId: convId,
            role: "system",
            content: `Error: ${err.message}`,
            createdAt: new Date().toISOString(),
          },
        ]);
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
    const isFreshConv = !activeConversation;

    const displayContent = textContent;
    setInput("");
    setAttachments([]);

    const convId = activeConversation || (await createConversation());

    let savedAttachments: MessageAttachment[] | undefined;
    if (currentAttachments.length > 0) {
      savedAttachments = [];
      for (const f of currentAttachments) {
        const dataUri = await fileToBase64(f);
        savedAttachments.push({
          name: f.name,
          type: f.type || "application/octet-stream",
          data: dataUri,
        });
      }
    }

    const optimisticId = "tmp-" + Date.now();
    const optimisticMsg: Message = {
      id: optimisticId,
      conversationId: convId,
      role: "user",
      content: displayContent,
      attachments: savedAttachments,
      createdAt: new Date().toISOString(),
    };
    setMessages(p => [...p, optimisticMsg]);
    setIsStreaming(true);

    fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: convId,
        role: "user",
        content: displayContent,
        attachments: savedAttachments,
      }),
    })
      .then(r => r.json())
      .then(saved =>
        setMessages(p => p.map(m => (m.id === optimisticId ? saved : m)))
      )
      .catch(() => {});
    fetchConversations();
    streamContentRef.current = "";
    streamReasoningRef.current = "";
    setStreamContent("");
    setStreamReasoning("");

    let apiContent:
      | string
      | Array<{ type: string; text?: string; image_url?: { url: string } }> = textContent;
    const imageAttachments = currentAttachments.filter(f => f.type.startsWith("image/"));
    const nonImageAttachments = currentAttachments.filter(f => !f.type.startsWith("image/"));

    let extractedBlock = "";
    const extractedImages: string[] = [];
    if (nonImageAttachments.length) {
      const results = await Promise.all(
        nonImageAttachments.map(async f => {
          try {
            const fd = new FormData();
            fd.append("file", f);
            const r = await fetch("/api/extract", { method: "POST", body: fd });
            if (!r.ok) {
              const { error } = await r.json().catch(() => ({ error: "extraction failed" }));
              return {
                name: f.name,
                text: `[Could not extract: ${error}]`,
                truncated: false,
                images: [] as string[],
              };
            }
            return (await r.json()) as {
              name: string;
              text: string;
              truncated: boolean;
              images?: string[];
            };
          } catch (e: any) {
            return {
              name: f.name,
              text: `[Extraction error: ${e?.message || "unknown"}]`,
              truncated: false,
              images: [] as string[],
            };
          }
        })
      );
      extractedBlock = results
        .map(
          r =>
            `--- File: ${r.name}${r.truncated ? " (truncated)" : ""} ---\n${r.text}\n--- End of ${r.name} ---`
        )
        .join("\n\n");
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
        const attachmentSummary = extractedBlock
          ? extractedBlock.slice(0, 1500)
          : currentAttachments.length
            ? `Files attached: ${currentAttachments.map(f => f.name).join(", ")}`
            : undefined;
        const query = await generateSearchQuery(
          textContent,
          attachmentSummary,
          messages.slice(-4).map(m => ({
            role: m.role,
            content: typeof m.content === "string" ? m.content : "",
          }))
        );
        const freshness = detectFreshness(textContent);
        const sr = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, maxResults: 8, freshness }),
        });
        if (sr.ok) {
          const { results, provider } = (await sr.json()) as {
            results: SearchHit[];
            provider: string;
          };
          if (results?.length) {
            sources = results.map(r => ({ title: r.title, url: r.url }));
            setSearchSources(sources);
            chatMsgs.unshift({
              role: "system",
              content: buildSearchContext(query, results, provider),
            });
          }
        }
      } catch (e) {
        console.error("Search failed:", e);
      } finally {
        setIsSearching(false);
      }
    }

    chatMsgs.push({ role: "user", content: apiContent });

    if (isFreshConv) {
      // Fire-and-forget title generation alongside the stream
      generateTitle(
        convId,
        textContent || (currentAttachments[0]?.name ?? "Attached file"),
        currentAttachments.map(f => f.name)
      );
    }

    await runStream(chatMsgs, convId, sources);
  }, [
    input,
    isStreaming,
    activeConversation,
    messages,
    selectedModelId,
    attachments,
    searchEnabled,
    generateTitle,
    generateSearchQuery,
  ]);

  const selectedModel = models.find(m => m.id === selectedModelId) || null;

  /* ─── layout constants ─── */
  const desktopOpen = sidebarOpen && !isMobile;
  const sidebarWidth = desktopOpen ? 284 : 0;

  return (
    <div className="nv-shell flex" style={{ color: "var(--text)" }}>
      {/* ── Mobile backdrop ── */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            key="mobile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{
              background: "rgba(5, 5, 10, 0.45)",
              backdropFilter: "blur(10px) saturate(1.2)",
              WebkitBackdropFilter: "blur(10px) saturate(1.2)",
            }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar wrapper ── */}
      {isMobile ? (
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              key="mobile-sidebar"
              initial={{ x: "-110%" }}
              animate={{ x: 0 }}
              exit={{ x: "-110%" }}
              transition={{ type: "spring", stiffness: 360, damping: 36 }}
              className="fixed top-0 left-0 bottom-0 z-50"
              style={{ width: 292, padding: "12px 0 12px 12px" }}
            >
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
              />
            </motion.aside>
          )}
        </AnimatePresence>
      ) : (
        <motion.aside
          animate={{ width: sidebarWidth }}
          initial={false}
          transition={{ type: "spring", stiffness: 280, damping: 34 }}
          className="h-full min-h-0 flex-shrink-0 overflow-hidden relative z-40"
          style={{ paddingLeft: desktopOpen ? 12 : 0, paddingTop: 12, paddingBottom: 12 }}
        >
          <div style={{ width: 272, height: "100%" }}>
            <Sidebar
              conversations={conversations}
              activeId={activeConversation}
              onSelectConv={loadMessages}
              onNewChat={() => {
                setActiveConversation(null);
                setMessages([]);
              }}
              onDeleteConv={deleteConversation}
              onCollapse={() => setSidebarOpen(false)}
            />
          </div>
        </motion.aside>
      )}

      {/* ── Main ── */}
      <main className="flex flex-col min-w-0 min-h-0 flex-1 relative">
        {/* Floating topbar */}
        <div
          className="relative z-20 px-3 sm:px-4 pt-3 pb-2"
          style={{ flexShrink: 0 }}
        >
          <div className="mx-auto" style={{ maxWidth: 1200 }}>
            <Topbar
              model={selectedModel}
              models={models}
              onPickModel={m => setSelectedModelId(m.id)}
              onToggleSidebar={() => setSidebarOpen(v => !v)}
              sidebarOpen={desktopOpen}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          </div>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto min-h-0 relative z-[1]"
        >
          {!messages.length && !isStreaming ? (
            <Empty
              modelName={selectedModel?.name}
              onPrompt={text => {
                setInput(text);
                // focus composer — will happen naturally
              }}
            />
          ) : (
            <div
              className="mx-auto px-4 sm:px-7 pt-4 sm:pt-6"
              style={{ maxWidth: 820, paddingBottom: 240 }}
            >
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
                  onEditCancel={() => {
                    setEditingMessageId(null);
                    setEditInput("");
                  }}
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
      </main>

      {/* Composer — sibling of sidebar + main so it spans the full viewport
          width at the bottom (including under the sidebar on desktop).
          leftOffset realigns the centered pill with the message column. */}
      <Composer
        value={input}
        onChange={setInput}
        onSubmit={sendMessage}
        onStop={stopGeneration}
        streaming={isStreaming}
        attachments={attachments}
        onAttach={files => setAttachments(prev => [...prev, ...files])}
        onRemoveAttachment={i =>
          setAttachments(prev => prev.filter((_, idx) => idx !== i))
        }
        searchEnabled={searchEnabled}
        onToggleSearch={() => setSearchEnabled(v => !v)}
        leftOffset={desktopOpen ? sidebarWidth : 0}
      />

      {/* ── Image Lightbox ── */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center cursor-zoom-out p-4"
            style={{
              background: "rgba(5, 5, 10, 0.88)",
              backdropFilter: "blur(12px) saturate(1.2)",
              WebkitBackdropFilter: "blur(12px) saturate(1.2)",
            }}
            onClick={() => setLightboxSrc(null)}
          >
            <motion.img
              src={lightboxSrc}
              alt="Enlarged"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-[18px]"
              onClick={e => e.stopPropagation()}
              style={{ boxShadow: "0 40px 100px -20px rgba(0,0,0,0.6)" }}
            />
            <button
              type="button"
              onClick={() => setLightboxSrc(null)}
              className="absolute top-6 right-6 w-10 h-10 grid place-items-center rounded-full cursor-pointer nv-press"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(12px)",
              }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
