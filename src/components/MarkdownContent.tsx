"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight, vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";

const CodeBlock = React.memo(function CodeBlock({
  inline, className, children, ...props
}: any) {
  const lang = /language-(\w+)/.exec(className || "")?.[1];
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, "");

  if (!inline && lang) {
    const isDark =
      typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    return (
      <div
        className="my-3 rounded-[10px] overflow-hidden"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div
          className="flex items-center justify-between px-3 py-2 mono text-[11px]"
          style={{ borderBottom: "1px solid var(--border)", color: "var(--text-mute)" }}
        >
          <span>{lang}</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded transition-colors cursor-pointer"
            style={{ background: "none", border: "none", color: "var(--text-mute)", fontFamily: "inherit", fontSize: 11 }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-mute)"; }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "copied" : "copy"}
          </button>
        </div>
        <SyntaxHighlighter
          style={isDark ? vscDarkPlus : oneLight}
          language={lang}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "14px",
            background: "transparent",
            fontSize: "12.5px",
            lineHeight: "1.6",
            fontFamily: "'JetBrains Mono', monospace",
          }}
          {...props}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    );
  }
  return <code className={className} {...props}>{children}</code>;
});

export const MarkdownContent = React.memo(function MarkdownContent({ content }: { content: string }) {
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
