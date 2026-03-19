"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft, Plus, Trash2, X, Check, Server, Key, Globe, Cpu, Eye, EyeOff, AlertCircle, Edit2, TerminalSquare
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

  async function fetchModels() { setModels(await fetch("/api/models").then(r => r.json())); }

  function startEdit(m: Model) {
    setEditingId(m.id);
    setForm({ name: m.name, provider: m.provider, baseUrl: m.baseUrl, modelId: m.modelId, apiKey: m.apiKey, isDefault: m.isDefault });
    setShowAdd(false);
  }

  function startAdd() { setEditingId(null); setForm(EMPTY); setSelProv(""); setShowAdd(true); }

  async function saveModel() {
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { id: editingId, ...form } : form;
      await fetch("/api/models", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans antialiased"
      style={{ backgroundImage: "radial-gradient(circle at 50% -20%, rgba(20,241,149,0.03) 0%, rgba(3,3,3,1) 40%)", backgroundAttachment: "fixed" }}>

      {/* header */}
      <header className="sticky top-0 z-50 bg-[var(--surface)]/80 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <a href="/" className="p-2 hover:bg-[var(--surface-3)] rounded-lg text-[var(--text-dim)] hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </a>
          <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center shadow-[0_0_12px_var(--accent-glow)]">
            <TerminalSquare size={16} className="text-black" />
          </div>
          <h1 className="text-[15px] font-semibold text-white tracking-wide">Settings</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-[18px] font-semibold text-white mb-1 tracking-tight">Model Endpoints</h2>
            <p className="text-[13px] text-[var(--text-muted)]">Configure OpenAI-compatible API endpoints</p>
          </div>
          <button onClick={startAdd} className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent-glow)] transition-all shadow-sm">
            <Plus size={16} /> Add Model
          </button>
        </div>

        {/* models list */}
        <div className="space-y-3">
          {models.map(m => editingId === m.id ? (
            <FormCard key={m.id} form={form} setForm={setForm} onSave={saveModel} onCancel={() => { setEditingId(null); setForm(EMPTY); }} saving={saving} isEdit presets={PRESETS} selProv={form.provider} pickPreset={pickPreset} />
          ) : (
            <div key={m.id} className="group p-5 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-hover)] rounded-xl transition-colors shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                    m.isDefault ? "bg-[var(--accent-glow)] text-[var(--accent)] border border-[var(--accent)]/20" : "bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]"
                  )}>
                    <Cpu size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[14px] font-semibold text-white">{m.name}</span>
                      {m.isDefault && <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 bg-[var(--accent-glow)] text-[var(--accent)] rounded-md border border-[var(--accent)]/20">default</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[var(--text-muted)] font-mono">
                      <span className="flex items-center gap-1.5"><Server size={11} />{m.provider}</span>
                      <span className="flex items-center gap-1.5 truncate max-w-[180px] sm:max-w-none"><Globe size={11} />{m.baseUrl.replace("https://", "").split("/")[0]}</span>
                      <span className="flex items-center gap-1.5 truncate max-w-[140px] sm:max-w-none"><Cpu size={11} />{m.modelId}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2.5 text-[12px] font-mono">
                      <Key size={11} className={m.apiKey ? "text-[var(--accent)]" : "text-yellow-500"} />
                      <span className={m.apiKey ? "text-[var(--text-muted)]" : "text-yellow-500/60"}>
                        {m.apiKey ? (showKeys[m.id] ? m.apiKey : "••••" + m.apiKey.slice(-4)) : "not set"}
                      </span>
                      {m.apiKey && (
                        <button onClick={() => setShowKeys(s => ({ ...s, [m.id]: !s[m.id] }))} className="text-[var(--text-muted)] hover:text-white transition-colors">
                          {showKeys[m.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(m)} className="p-2 hover:bg-[var(--surface-3)] rounded-lg text-[var(--text-muted)] hover:text-white transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => deleteModel(m.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-[var(--text-muted)] hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}

          {!models.length && !showAdd && (
            <div className="text-center py-16 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
              <Cpu size={32} className="mx-auto text-[var(--text-muted)] mb-4" />
              <p className="text-[var(--text-muted)] text-[13px] mb-4">No models configured</p>
              <button onClick={startAdd} className="text-[var(--accent)] text-[13px] hover:underline font-medium">Add your first model</button>
            </div>
          )}

          {showAdd && (
            <FormCard form={form} setForm={setForm} onSave={saveModel} onCancel={() => { setShowAdd(false); setForm(EMPTY); }} saving={saving} isEdit={false} presets={PRESETS} selProv={selProv} pickPreset={pickPreset} />
          )}
        </div>

        {/* info */}
        <div className="mt-10 p-5 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
          <h3 className="text-[13px] font-semibold text-[var(--accent)] flex items-center gap-2 mb-2">
            <AlertCircle size={14} /> Security
          </h3>
          <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">
            API keys are stored locally in SQLite. They are only sent to the endpoint you configure during inference over TLS.
          </p>
        </div>
      </div>
    </div>
  );
}

/* form */
function FormCard({ form, setForm, onSave, onCancel, saving, isEdit, presets, selProv, pickPreset }: any) {
  const [showKey, setShowKey] = useState(false);
  return (
    <div className="p-5 bg-[var(--surface-2)] border border-[var(--accent)]/20 rounded-xl shadow-md">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[14px] font-semibold text-white">{isEdit ? "Edit Model" : "Add Model"}</h3>
        <button onClick={onCancel} className="p-1.5 hover:bg-[var(--surface-3)] rounded-lg text-[var(--text-muted)] hover:text-white transition-colors"><X size={16} /></button>
      </div>

      {!isEdit && (
        <div className="mb-5">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">Provider</label>
          <div className="flex flex-wrap gap-2">
            {presets.map((p: any) => (
              <button key={p.name} onClick={() => pickPreset(p)}
                className={cn("px-3 py-2 rounded-lg text-[12px] font-medium border transition-all",
                  selProv === p.name ? "bg-[var(--accent-glow)] border-[var(--accent)]/30 text-[var(--accent)]" : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-dim)] hover:text-white hover:border-[var(--border-hover)]"
                )}>
                {p.name}
              </button>
            ))}
          </div>
          {selProv && <p className="text-[11px] text-[var(--text-muted)] mt-2 font-mono">{presets.find((p: any) => p.name === selProv)?.hint}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <Field label="Name" value={form.name} onChange={(v: string) => setForm((f: any) => ({ ...f, name: v }))} placeholder="e.g. GPT-4o" icon={<Cpu size={13} />} />
        <Field label="Model ID" value={form.modelId} onChange={(v: string) => setForm((f: any) => ({ ...f, modelId: v }))} placeholder="e.g. gpt-4o" icon={<Server size={13} />} />
      </div>
      <div className="mb-4">
        <Field label="Base URL" value={form.baseUrl} onChange={(v: string) => setForm((f: any) => ({ ...f, baseUrl: v }))} placeholder="https://api.openai.com/v1" icon={<Globe size={13} />} />
      </div>
      <div className="mb-4">
        <label className="block text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">API Key</label>
        <div className="relative">
          <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input type={showKey ? "text" : "password"} value={form.apiKey}
            onChange={e => setForm((f: any) => ({ ...f, apiKey: e.target.value }))}
            placeholder="sk-..."
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2.5 pl-9 pr-9 text-[13px] font-mono text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]/40 transition-colors" />
          <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white transition-colors">
            {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5 cursor-pointer" onClick={() => setForm((f: any) => ({ ...f, isDefault: !f.isDefault }))}>
        <div className={cn("w-9 h-5 rounded-full p-0.5 transition-colors", form.isDefault ? "bg-[var(--accent)]" : "bg-[var(--surface-3)]")}>
          <div className={cn("w-4 h-4 rounded-full bg-white transition-transform shadow-sm", form.isDefault ? "translate-x-4" : "")} />
        </div>
        <span className="text-[12px] text-[var(--text-dim)]">Set as default</span>
      </div>

      <div className="flex gap-2 pt-4 border-t border-[var(--border)]">
        <button onClick={onSave} disabled={!form.name || !form.modelId || !form.baseUrl || saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold btn-primary disabled:opacity-40 transition-all">
          {saving ? <Spinner /> : <Check size={14} />}
          {isEdit ? "Update" : "Add"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-[13px] text-[var(--text-dim)] hover:text-white hover:bg-[var(--surface-3)] transition-colors">Cancel</button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function Field({ label, value, onChange, placeholder, icon }: any) {
  return (
    <div>
      <label className="block text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-2">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">{icon}</span>
        <input type="text" value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2.5 pl-9 text-[13px] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]/40 transition-colors" />
      </div>
    </div>
  );
}
