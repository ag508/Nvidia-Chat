"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft, Plus, Trash2, X, Check, Server, Key, Globe, Cpu,
  Eye, EyeOff, AlertCircle, Edit2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Model } from "@/lib/types";

interface ModelForm {
  name: string; provider: string; baseUrl: string; modelId: string; apiKey: string; isDefault: boolean;
}

const EMPTY: ModelForm = { name: "", provider: "", baseUrl: "", modelId: "", apiKey: "", isDefault: false };

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

  useEffect(() => { fetchModels(); }, []);

  async function fetchModels() {
    setModels(await fetch("/api/models").then(r => r.json()));
  }

  function startEdit(m: Model) {
    setEditingId(m.id);
    setForm({
      name: m.name, provider: m.provider, baseUrl: m.baseUrl,
      modelId: m.modelId, apiKey: m.apiKey, isDefault: m.isDefault,
    });
    setShowAdd(false);
  }

  function startAdd() {
    setEditingId(null); setForm(EMPTY); setSelProv(""); setShowAdd(true);
  }

  async function saveModel() {
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { id: editingId, ...form } : form;
      await fetch("/api/models", {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await fetchModels();
      setShowAdd(false); setEditingId(null); setForm(EMPTY);
    } finally { setSaving(false); }
  }

  async function deleteModel(id: string) {
    await fetch(`/api/models?id=${id}`, { method: "DELETE" });
    fetchModels();
    if (editingId === id) { setEditingId(null); setForm(EMPTY); }
  }

  function pickPreset(p: typeof PRESETS[0]) {
    setSelProv(p.name);
    setForm(f => ({ ...f, provider: p.name, baseUrl: p.baseUrl }));
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      {/* header */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: "var(--canvas)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="max-w-[820px] mx-auto px-4 sm:px-6 h-[56px] flex items-center gap-3">
          <a
            href="/"
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--text-dim)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-dim)"; }}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </a>
          <h1 className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>Settings</h1>
          <span className="mono text-[11px]" style={{ color: "var(--text-mute)" }}>· endpoints</span>
        </div>
      </header>

      <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* page heading */}
        <div className="flex items-start sm:items-center justify-between gap-3 mb-6 sm:mb-8 flex-col sm:flex-row">
          <div>
            <h2 className="text-[20px] sm:text-[22px] font-bold tracking-tight mb-1" style={{ color: "var(--text)" }}>
              Model Endpoints
            </h2>
            <p className="text-[13px]" style={{ color: "var(--text-mute)" }}>
              Configure OpenAI-compatible API endpoints.
            </p>
          </div>
          <button
            onClick={startAdd}
            className="flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[13px] font-medium cursor-pointer border-none transition-all flex-shrink-0 w-full sm:w-auto justify-center"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            <Plus size={15} /> Add model
          </button>
        </div>

        {/* models list */}
        <div className="space-y-3">
          {models.map(m => editingId === m.id ? (
            <FormCard
              key={m.id}
              form={form}
              setForm={setForm}
              onSave={saveModel}
              onCancel={() => { setEditingId(null); setForm(EMPTY); }}
              saving={saving}
              isEdit
              presets={PRESETS}
              selProv={form.provider}
              pickPreset={pickPreset}
            />
          ) : (
            <div
              key={m.id}
              className="group p-4 rounded-[12px] transition-colors"
              style={{ background: "var(--panel)", border: "1px solid var(--border)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: m.isDefault ? "var(--accent-soft)" : "var(--card)",
                      color: m.isDefault ? "var(--accent)" : "var(--text-dim)",
                      border: m.isDefault ? "1px solid var(--accent)" : "1px solid var(--border)",
                    }}
                  >
                    <Cpu size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>{m.name}</span>
                      {m.isDefault && <span className="nv-tag">default</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] mono" style={{ color: "var(--text-mute)" }}>
                      <span className="flex items-center gap-1.5"><Server size={11} />{m.provider}</span>
                      <span className="flex items-center gap-1.5 truncate max-w-[220px]">
                        <Globe size={11} />
                        {m.baseUrl.replace("https://", "").split("/")[0]}
                      </span>
                      <span className="flex items-center gap-1.5 truncate max-w-[180px]">
                        <Cpu size={11} />{m.modelId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2.5 text-[12px] mono">
                      <Key size={11} style={{ color: m.apiKey ? "var(--accent)" : "#d97706" }} />
                      <span style={{ color: m.apiKey ? "var(--text-mute)" : "#d97706" }}>
                        {m.apiKey ? (showKeys[m.id] ? m.apiKey : "••••" + m.apiKey.slice(-4)) : "not set"}
                      </span>
                      {m.apiKey && (
                        <button
                          onClick={() => setShowKeys(s => ({ ...s, [m.id]: !s[m.id] }))}
                          className="p-0.5 cursor-pointer"
                          style={{ background: "none", border: "none", color: "var(--text-mute)" }}
                          aria-label="Toggle key visibility"
                        >
                          {showKeys[m.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => startEdit(m)}
                    className="p-2 rounded-lg cursor-pointer transition-colors"
                    style={{ background: "none", border: "none", color: "var(--text-mute)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.color = "var(--text)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-mute)"; }}
                    aria-label="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => deleteModel(m.id)}
                    className="p-2 rounded-lg cursor-pointer transition-colors"
                    style={{ background: "none", border: "none", color: "var(--text-mute)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--danger-soft)"; e.currentTarget.style.color = "var(--danger)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-mute)"; }}
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {!models.length && !showAdd && (
            <div
              className="text-center py-14 rounded-[12px]"
              style={{ background: "var(--panel)", border: "1px solid var(--border)" }}
            >
              <div
                className="w-10 h-10 mx-auto rounded-lg grid place-items-center mb-4"
                style={{ background: "var(--card)", color: "var(--text-mute)", border: "1px dashed var(--border-strong)" }}
              >
                <Cpu size={18} />
              </div>
              <p className="text-[13px] mb-4" style={{ color: "var(--text-mute)" }}>No models configured</p>
              <button
                onClick={startAdd}
                className="text-[13px] font-medium cursor-pointer"
                style={{ background: "none", border: "none", color: "var(--accent)" }}
              >
                Add your first model →
              </button>
            </div>
          )}

          {showAdd && (
            <FormCard
              form={form}
              setForm={setForm}
              onSave={saveModel}
              onCancel={() => { setShowAdd(false); setForm(EMPTY); }}
              saving={saving}
              isEdit={false}
              presets={PRESETS}
              selProv={selProv}
              pickPreset={pickPreset}
            />
          )}
        </div>

        {/* security note */}
        <div
          className="mt-10 p-4 rounded-[12px] flex items-start gap-3"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <AlertCircle size={16} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
          <div>
            <h3 className="text-[13px] font-semibold mb-1" style={{ color: "var(--text)" }}>Security</h3>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
              API keys are stored locally in SQLite and only sent to the endpoint you configure over TLS during inference.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Form ═══ */
function FormCard({
  form, setForm, onSave, onCancel, saving, isEdit, presets, selProv, pickPreset,
}: any) {
  const [showKey, setShowKey] = useState(false);
  return (
    <div
      className="p-5 rounded-[12px]"
      style={{
        background: "var(--panel)",
        border: "1px solid var(--accent)",
        boxShadow: "0 0 0 3px var(--accent-soft)",
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>
          {isEdit ? "Edit model" : "Add model"}
        </h3>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg cursor-pointer transition-colors"
          style={{ background: "none", border: "none", color: "var(--text-mute)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-mute)"; }}
          aria-label="Cancel"
        >
          <X size={16} />
        </button>
      </div>

      {!isEdit && (
        <div className="mb-5">
          <Label>Provider</Label>
          <div className="flex flex-wrap gap-2">
            {presets.map((p: any) => {
              const selected = selProv === p.name;
              return (
                <button
                  key={p.name}
                  onClick={() => pickPreset(p)}
                  className="px-3 py-2 rounded-lg text-[12px] font-medium cursor-pointer transition-all"
                  style={{
                    background: selected ? "var(--accent-soft)" : "var(--card)",
                    border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                    color: selected ? "var(--accent)" : "var(--text-dim)",
                  }}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
          {selProv && (
            <p className="mt-2 text-[11px] mono" style={{ color: "var(--text-mute)" }}>
              {presets.find((p: any) => p.name === selProv)?.hint}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <Field label="Name" value={form.name} onChange={(v: string) => setForm((f: any) => ({ ...f, name: v }))} placeholder="e.g. Nemotron Super" icon={<Cpu size={12} />} />
        <Field label="Model ID" value={form.modelId} onChange={(v: string) => setForm((f: any) => ({ ...f, modelId: v }))} placeholder="e.g. meta/llama-3.3-70b" icon={<Server size={12} />} />
      </div>
      <div className="mb-3">
        <Field label="Base URL" value={form.baseUrl} onChange={(v: string) => setForm((f: any) => ({ ...f, baseUrl: v }))} placeholder="https://integrate.api.nvidia.com/v1" icon={<Globe size={12} />} />
      </div>
      <div className="mb-4">
        <Label>API Key</Label>
        <div className="relative">
          <Key size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-mute)" }} />
          <input
            type={showKey ? "text" : "password"}
            value={form.apiKey}
            onChange={e => setForm((f: any) => ({ ...f, apiKey: e.target.value }))}
            placeholder="sk-..."
            className="w-full rounded-lg px-3 py-2.5 pl-9 pr-10 text-[13px] mono outline-none transition-colors nv-focus-ring"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          />
          <button
            onClick={() => setShowKey(v => !v)}
            type="button"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 cursor-pointer rounded"
            style={{ background: "none", border: "none", color: "var(--text-mute)" }}
            aria-label="Toggle key visibility"
          >
            {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
      </div>

      <label
        className="flex items-center gap-3 mb-5 cursor-pointer"
        onClick={() => setForm((f: any) => ({ ...f, isDefault: !f.isDefault }))}
      >
        <div
          className="w-9 h-5 rounded-full p-[2px] transition-colors"
          style={{ background: form.isDefault ? "var(--accent)" : "var(--border-strong)" }}
        >
          <div
            className="w-4 h-4 rounded-full transition-transform"
            style={{
              background: "#fff",
              transform: form.isDefault ? "translateX(16px)" : "translateX(0)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
            }}
          />
        </div>
        <span className="text-[12.5px]" style={{ color: "var(--text-dim)" }}>Set as default</span>
      </label>

      <div className="flex gap-2 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
        <button
          onClick={onSave}
          disabled={!form.name || !form.modelId || !form.baseUrl || saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all"
          style={{
            background: "var(--accent)",
            color: "var(--accent-ink)",
            border: "none",
            cursor: (!form.name || !form.modelId || !form.baseUrl || saving) ? "not-allowed" : "pointer",
            opacity: (!form.name || !form.modelId || !form.baseUrl || saving) ? 0.4 : 1,
          }}
        >
          {saving ? <Spinner /> : <Check size={14} />}
          {isEdit ? "Update" : "Add"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-[13px] cursor-pointer transition-colors"
          style={{ background: "none", border: "none", color: "var(--text-dim)", fontFamily: "inherit" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--card)"; e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-dim)"; }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block mb-1.5 text-[10.5px] uppercase tracking-[0.1em] font-medium"
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
          className="w-full rounded-lg px-3 py-2.5 pl-9 text-[13px] outline-none transition-colors nv-focus-ring"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
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
      width={14} height={14} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
