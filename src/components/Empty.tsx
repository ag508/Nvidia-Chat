"use client";

import { motion } from "motion/react";
import { Sparkles, Code2, FileText, Compass, Lightbulb } from "lucide-react";

const STARTERS = [
  { icon: Lightbulb, label: "Explain quantum entanglement in plain English" },
  { icon: Code2, label: "Write a Python script to deduplicate a CSV" },
  { icon: FileText, label: "Summarise a long PDF into key bullet points" },
  { icon: Compass, label: "Plan a weekend in Kyoto around cherry blossoms" },
];

export function Empty({
  modelName,
  onPrompt,
}: {
  modelName?: string;
  onPrompt?: (text: string) => void;
}) {
  return (
    <div
      className="relative mx-auto flex flex-col items-center justify-center h-full"
      style={{
        maxWidth: 820,
        padding: "40px 28px 220px",
        minHeight: "72vh",
      }}
    >
      {/* quiet glow behind the headline */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="absolute pointer-events-none"
        style={{
          top: "18%",
          width: 480,
          height: 260,
          background:
            "radial-gradient(60% 60% at 50% 50%, var(--accent-glow) 0%, transparent 75%)",
          filter: "blur(36px)",
          zIndex: 0,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 14, filter: "blur(2px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-[1] flex items-center gap-3 mb-1.5"
      >
        <span
          className="mono text-[10.5px] tracking-[0.22em] uppercase font-semibold px-2.5 py-1 rounded-full"
          style={{
            color: "var(--text-mute)",
            background: "var(--glass-soft)",
            border: "1px solid var(--hairline)",
          }}
        >
          <Sparkles size={10} className="inline mr-1.5" style={{ color: "var(--accent)" }} />
          atelier · nim
        </span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 18, filter: "blur(2px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="font-display relative z-[1] tracking-[-0.035em] leading-[0.92] text-center"
        style={{
          fontSize: "clamp(56px, 9vw, 96px)",
          fontWeight: 400,
          color: "var(--text)",
          fontVariationSettings: '"SOFT" 100, "opsz" 144',
        }}
      >
        <span className="block">
          <span style={{ fontStyle: "italic", fontWeight: 300 }}>Quietly</span>{" "}
          <span className="nv-text-gradient">brilliant.</span>
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3 }}
        className="relative z-[1] mt-6 text-[15px] max-w-[520px] text-center leading-relaxed"
        style={{ color: "var(--text-dim)" }}
      >
        A calm surface for reasoning with {modelName ? (
          <span style={{ color: "var(--text)", fontWeight: 500 }}>{modelName}</span>
        ) : (
          "NVIDIA NIM endpoints"
        )}
        . Start a thought below, attach a file, or try one of these.
      </motion.p>

      {onPrompt && (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.07, delayChildren: 0.45 } },
          }}
          className="relative z-[1] mt-10 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-[620px]"
        >
          {STARTERS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.button
                key={i}
                type="button"
                onClick={() => onPrompt(s.label)}
                variants={{
                  hidden: { opacity: 0, y: 10, filter: "blur(1px)" },
                  show: { opacity: 1, y: 0, filter: "blur(0px)" },
                }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                className="group glass text-left px-4 py-3.5 flex items-start gap-3 cursor-pointer nv-ring"
                style={{
                  borderRadius: 16,
                  border: "1px solid var(--hairline)",
                }}
              >
                <div
                  className="mt-0.5 w-7 h-7 grid place-items-center rounded-lg flex-shrink-0 transition-colors"
                  style={{
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                  }}
                >
                  <Icon size={13} />
                </div>
                <span
                  className="text-[13px] leading-snug"
                  style={{ color: "var(--text-dim)" }}
                >
                  {s.label}
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.8 }}
        className="relative z-[1] mt-10 flex items-center gap-2 mono text-[10.5px] tracking-[0.1em]"
        style={{ color: "var(--text-mute)" }}
      >
        <span
          className="inline-block w-6 h-[1px]"
          style={{ background: "var(--hairline-strong)" }}
        />
        press{" "}
        <kbd
          className="px-1.5 py-0.5 rounded"
          style={{
            background: "var(--glass)",
            border: "1px solid var(--hairline)",
            color: "var(--text-dim)",
          }}
        >
          ⌘K
        </kbd>{" "}
        to switch models
        <span
          className="inline-block w-6 h-[1px]"
          style={{ background: "var(--hairline-strong)" }}
        />
      </motion.div>
    </div>
  );
}
