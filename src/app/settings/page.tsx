"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft, Plus, Trash2, X, Check, Server, Key, Globe, Cpu,
  Eye, EyeOff, ShieldCheck, Edit2,
} from "lucide-react";
import * as Switch from "@radix-ui/react-switch";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Model } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { TooltipProvider } from "@/components/ui/Tooltip";

interface ModelForm {
  name: string;
  provider: string;
  baseUrl: string;
  modelId: string;
  apiKey: string;
  isDefault: boolean;
}

const EMPTY: ModelForm = {
  name: "",
  provider: "",
  baseUrl: "",
  modelId: "",
  apiKey: "",
  isDefault: false,
};

const PRESETS = [
  { name: "NVIDIA NIM", baseUrl: "https://integrate.api.nvidia.com/v1", hint: "build.nvidia.com" },
  { name: "OpenAI", baseUrl: "https://api.openai.com/v1", hint: "platform.openai.com" },
  { name: "Groq", baseUrl: "https://api.groq.com/openai/v1", hint: "console.groq.com" },
  { name: "Together AI", baseUrl: "https://api.together.xyz/v1", hint: "together.ai" },
  { name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", hint: "openrouter.ai" },
  { name: "Custom", baseUrl: "", hint: "any OpenAI-compatible API" },
];

export default function SettingsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ModelForm>(EMPTY);
  const [selProv, setSelProv] = useState("");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  async function fetchModels() {
    setModels(await fetch("/api/models").then(r => r.json()));
  }

  function startEdit(m: Model) {
    setEditingId(m.id);
    setForm({
      name: m.name,
      provider: m.provider,
      baseUrl: m.baseUrl,
      modelId: m.modelId,
      apiKey: m.apiKey,
      isDefault: m.isDefault,
    });
    setShowAdd(false);
  }

  function startAdd() {
    setEditingId(null);
    setForm(EMPTY);
    setSelProv("");
    setShowAdd(true);
  }

  async function saveModel() {
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { id: editingId, ...form } : form;
      await fetch("/api/models", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await fetchModels();
      setShowAdd(false);
      setEditingId(null);
      setForm(EMPTY);
      toast.success(editingId ? "Endpoint updated" : "Endpoint added");
    } catch (e: any) {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteModel(id: string) {
    await fetch(`/api/models?id=${id}`, { method: "DELETE" });
    fetchModels();
    if (editingId === id) {
      setEditingId(null);
      setForm(EMPTY);
    }
    toast.success("Endpoint removed");
  }

  function pickPreset(p: typeof PRESETS[0]) {
    setSelProv(p.name);
    setForm(f => ({ ...f, provider: p.name, baseUrl: p.baseUrl }));
  }

  return (
    <TooltipProvider>
      <div
        className="nv-shell"
        style={{ color: "var(--text)", overflow: "auto" }}
      >
        {/* ── Header pill ── */}
        <div className="sticky top-0 z-30 px-3 pt-3 pb-2 sm:px-6 sm:pt-4">
          <div
            className="glass max-w-[820px] mx-auto flex items-center gap-3 px-4"
            style={{ height: 56, borderRadius: "var(--r-lg)" }}
          >
            <IconButton
              size="md"
              label="Back"
              tooltip="Back to chat"
              icon={<ArrowLeft size={15} />}
              onClick={() => {
                window.location.href = "/";
              }}
            />
            <div className="flex items-baseline gap-2">
              <span
                className="font-display text-[17px] font-semibold tracking-[-0.02em]"
                style={{ color: "var(--text)" }}
              >
                Settings
              </span>
              <span
                className="mono text-[10.5px] tracking-[0.12em] uppercase opacity-70"
                style={{ color: "var(--text-mute)" }}
              >
                endpoints
              </span>
            </div>
            <div className="ml-auto">
              <Button
                variant="primary"
                size="sm"
                onClick={startAdd}
                icon={<Plus size={14} />}
              >
                Add endpoint
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-[820px] mx-auto px-4 sm:px-6 pt-6 pb-16">
          {/* page heading */}
          <div className="mb-8">
            <motion.h1
              initial={{ opacity: 0, y: 10, filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-[40px] sm:text-[56px] leading-[0.98] tracking-[-0.03em] mb-3"
              style={{
                color: "var(--text)",
                fontWeight: 400,
                fontVariationSettings: '"SOFT" 100, "opsz" 96',
              }}
            >
              <span style={{ fontStyle: "italic", fontWeight: 300 }}>Quiet</span>{" "}
              control.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="text-[14px] max-w-[520px] leading-relaxed"
              style={{ color: "var(--text-dim)" }}
            >
              Connect any OpenAI-compatible endpoint — NVIDIA NIM, Groq,
              OpenRouter, or your own self-hosted inference. Keys stay on
              this device.
            </motion.p>
          </div>

          {/* models list */}
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {models.map((m, i) =>
                editingId === m.id ? (
                  <FormCard
                    key={m.id}
                    form={form}
                    setForm={setForm}
                    onSave={saveModel}
                    onCancel={() => {
                      setEditingId(null);
                      setForm(EMPTY);
                    }}
                    saving={saving}
                    isEdit
                    presets={PRESETS}
                    selProv={form.provider}
                    pickPreset={pickPreset}
                  />
                ) : (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{
                      delay: i * 0.04,
                      type: "spring",
                      stiffness: 340,
                      damping: 32,
                    }}
                    className="group glass p-5 nv-hover-lift"
                    style={{ borderRadius: "var(--r-lg)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className="w-10 h-10 rounded-[12px] grid place-items-center flex-shrink-0"
                          style={{
                            background: m.isDefault
                              ? "var(--accent-soft)"
                              : "var(--glass)",
                            color: m.isDefault
                              ? "var(--accent)"
                              : "var(--text-dim)",
                            border: m.isDefault
                              ? "1px solid var(--accent)"
                              : "1px solid var(--hairline)",
                          }}
                        >
                          <Cpu size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-[14.5px] font-semibold tracking-[-0.005em]"
                              style={{ color: "var(--text)" }}
                            >
                              {m.name}
                            </span>
                            {m.isDefault && <span className="nv-tag">default</span>}
                          </div>
                          <div
                            className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] mono"
                            style={{ color: "var(--text-mute)" }}
                          >
                            <span className="flex items-center gap-1.5">
                              <Server size={11} />
                              {m.provider}
                            </span>
                            <span className="flex items-center gap-1.5 truncate max-w-[220px]">
                              <Globe size={11} />
                              {m.baseUrl.replace("https://", "").split("/")[0]}
                            </span>
                            <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                              <Cpu size={11} />
                              {m.modelId}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2.5 text-[11.5px] mono">
                            <Key
                              size={11}
                              style={{
                                color: m.apiKey ? "var(--accent)" : "#d97706",
                              }}
                            />
                            <span
                              style={{
                                color: m.apiKey ? "var(--text-mute)" : "#d97706",
                              }}
                            >
                              {m.apiKey
                                ? showKeys[m.id]
                                  ? m.apiKey
                                  : "••••" + m.apiKey.slice(-4)
                                : "not set"}
                            </span>
                            {m.apiKey && (
                              <button
                                type="button"
                                onClick={() =>
                                  setShowKeys(s => ({ ...s, [m.id]: !s[m.id] }))
                                }
                                className="p-0.5 cursor-pointer"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--text-mute)",
                                }}
                                aria-label="Toggle key visibility"
                              >
                                {showKeys[m.id] ? (
                                  <EyeOff size={12} />
                                ) : (
                                  <Eye size={12} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <IconButton
                          size="sm"
                          label="Edit"
                          tooltip="Edit"
                          onClick={() => startEdit(m)}
                          icon={<Edit2 size={13} />}
                        />
                        <IconButton
                          size="sm"
                          label="Delete"
                          tooltip="Delete"
                          tone="danger"
                          onClick={() => deleteModel(m.id)}
                          icon={<Trash2 size={13} />}
                        />
                      </div>
                    </div>
                  </motion.div>
                )
              )}
            </AnimatePresence>

            {!models.length && !showAdd && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass text-center py-14"
                style={{ borderRadius: "var(--r-lg)" }}
              >
                <div
                  className="w-12 h-12 mx-auto rounded-[14px] grid place-items-center mb-4"
                  style={{
                    background: "var(--glass-soft)",
                    color: "var(--text-mute)",
                    border: "1px dashed var(--hairline-strong)",
                  }}
                >
                  <Cpu size={18} />
                </div>
                <p className="text-[13.5px] mb-4" style={{ color: "var(--text-dim)" }}>
                  No endpoints yet.
                </p>
                <button
                  type="button"
                  onClick={startAdd}
                  className="text-[13px] font-medium cursor-pointer"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent)",
                  }}
                >
                  Add your first endpoint →
                </button>
              </motion.div>
            )}

            {showAdd && (
              <FormCard
                form={form}
                setForm={setForm}
                onSave={saveModel}
                onCancel={() => {
                  setShowAdd(false);
                  setForm(EMPTY);
                }}
                saving={saving}
                isEdit={false}
                presets={PRESETS}
                selProv={selProv}
                pickPreset={pickPreset}
              />
            )}
          </div>

          {/* security note */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-soft mt-10 p-4 flex items-start gap-3"
            style={{ borderRadius: "var(--r)" }}
          >
            <div
              className="w-8 h-8 rounded-[10px] grid place-items-center flex-shrink-0"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent)",
              }}
            >
              <ShieldCheck size={14} />
            </div>
            <div>
              <h3
                className="text-[13px] font-semibold mb-1 tracking-[-0.005em]"
                style={{ color: "var(--text)" }}
              >
                Keys stay local
              </h3>
              <p
                className="text-[12px] leading-relaxed"
                style={{ color: "var(--text-dim)" }}
              >
                API keys are stored in a local SQLite file, and only sent to
                the endpoint you configured, over TLS, at inference time.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ════════════════════════ Form ════════════════════════ */

function FormCard({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  isEdit,
  presets,
  selProv,
  pickPreset,
}: any) {
  const [showKey, setShowKey] = useState(false);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="glass-strong p-5 sm:p-6"
      style={{
        borderRadius: "var(--r-lg)",
        border: "1px solid var(--hairline-strong)",
        boxShadow: "0 0 0 4px var(--ring), var(--shadow-float)",
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <h3
          className="font-display text-[18px] tracking-[-0.02em]"
          style={{ color: "var(--text)", fontWeight: 500 }}
        >
          {isEdit ? "Refine endpoint" : "Connect a new endpoint"}
        </h3>
        <IconButton
          size="sm"
          label="Cancel"
          onClick={onCancel}
          icon={<X size={14} />}
        />
      </div>

      {!isEdit && (
        <div className="mb-5">
          <Label>Provider</Label>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p: any) => {
              const selected = selProv === p.name;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => pickPreset(p)}
                  className="px-3 py-2 rounded-[10px] text-[12px] font-medium cursor-pointer transition-all nv-press"
                  style={{
                    background: selected ? "var(--accent-soft)" : "var(--glass)",
                    border: `1px solid ${selected ? "var(--accent)" : "var(--hairline)"}`,
                    color: selected ? "var(--accent)" : "var(--text-dim)",
                  }}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
          {selProv && (
            <p
              className="mt-2 text-[11px] mono tracking-wide"
              style={{ color: "var(--text-mute)" }}
            >
              {presets.find((p: any) => p.name === selProv)?.hint}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <Field
          label="Name"
          value={form.name}
          onChange={(v: string) => setForm((f: any) => ({ ...f, name: v }))}
          placeholder="e.g. Nemotron Super"
          icon={<Cpu size={12} />}
        />
        <Field
          label="Model ID"
          value={form.modelId}
          onChange={(v: string) => setForm((f: any) => ({ ...f, modelId: v }))}
          placeholder="e.g. meta/llama-3.3-70b"
          icon={<Server size={12} />}
        />
      </div>
      <div className="mb-3">
        <Field
          label="Base URL"
          value={form.baseUrl}
          onChange={(v: string) => setForm((f: any) => ({ ...f, baseUrl: v }))}
          placeholder="https://integrate.api.nvidia.com/v1"
          icon={<Globe size={12} />}
        />
      </div>
      <div className="mb-4">
        <Label>API Key</Label>
        <div className="relative">
          <Key
            size={12}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-mute)" }}
          />
          <input
            type={showKey ? "text" : "password"}
            value={form.apiKey}
            onChange={e =>
              setForm((f: any) => ({ ...f, apiKey: e.target.value }))
            }
            placeholder="sk-…"
            className="w-full rounded-[12px] px-3 py-2.5 pl-9 pr-10 text-[13px] mono outline-none transition-colors nv-ring"
            style={{
              background: "var(--glass)",
              border: "1px solid var(--hairline)",
              color: "var(--text)",
              fontFamily: "var(--font-mono), ui-monospace, monospace",
            }}
          />
          <button
            type="button"
            onClick={() => setShowKey(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 cursor-pointer rounded"
            style={{
              background: "none",
              border: "none",
              color: "var(--text-mute)",
            }}
            aria-label="Toggle key visibility"
          >
            {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <Switch.Root
          checked={form.isDefault}
          onCheckedChange={v => setForm((f: any) => ({ ...f, isDefault: v }))}
          className="relative w-9 h-5 rounded-full transition-colors cursor-pointer nv-ring"
          style={{
            background: form.isDefault
              ? "var(--accent)"
              : "var(--hairline-strong)",
          }}
        >
          <Switch.Thumb
            className="block w-4 h-4 rounded-full transition-transform translate-x-[2px] data-[state=checked]:translate-x-[18px]"
            style={{
              background: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
            }}
          />
        </Switch.Root>
        <span className="text-[12.5px]" style={{ color: "var(--text-dim)" }}>
          Set as default
        </span>
      </div>

      <div
        className="flex gap-2 pt-4"
        style={{ borderTop: "1px solid var(--hairline)" }}
      >
        <Button
          variant="primary"
          onClick={onSave}
          disabled={!form.name || !form.modelId || !form.baseUrl || saving}
          icon={saving ? <Spinner /> : <Check size={14} />}
        >
          {isEdit ? "Update" : "Connect"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </motion.div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block mb-1.5 mono text-[10px] uppercase tracking-[0.12em] font-semibold"
      style={{ color: "var(--text-mute)" }}
    >
      {children}
    </label>
  );
}

function Field({ label, value, onChange, placeholder, icon }: any) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-mute)" }}
        >
          {icon}
        </span>
        <input
          type="text"
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-[12px] px-3 py-2.5 pl-9 text-[13px] outline-none transition-colors nv-ring"
          style={{
            background: "var(--glass)",
            border: "1px solid var(--hairline)",
            color: "var(--text)",
            fontFamily: "inherit",
          }}
        />
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
