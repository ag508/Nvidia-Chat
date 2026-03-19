"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft, Plus, Trash2, X, Check, Server, Key, Globe, Cpu, Eye, EyeOff, AlertCircle, Edit2
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
    <div className="min-h-screen bg-bg text-[#d4d4d4] text-[13px]">

      {/* header */}
      <header className="sticky top-0 z-50 bg-surface border-b border-[#222]">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center gap-3">
          <a href="/" className="p-1.5 hover:bg-[#222] rounded text-[#888] hover:text-white transition-colors">
            <ArrowLeft size={16} />
          </a>
          <div className="w-5 h-5 rounded bg-nvidia-green flex items-center justify-center">
            <span className="text-black font-bold text-[10px] font-mono">N</span>
          </div>
          <h1 className="text-[14px] font-semibold text-white">Settings</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[16px] font-semibold text-white mb-1">Model Endpoints</h2>
            <p className="text-[12px] text-[#666]">Configure OpenAI-compatible API endpoints</p>
          </div>
          <button onClick={startAdd} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-nvidia-green border border-nvidia-green/30 hover:bg-nvidia-green/10 transition-colors">
            <Plus size={14} /> Add
          </button>
        </div>

        {/* models list */}
        <div className="space-y-2">
          {models.map(m => editingId === m.id ? (
            <FormCard key={m.id} form={form} setForm={setForm} onSave={saveModel} onCancel={() => { setEditingId(null); setForm(EMPTY); }} saving={saving} isEdit presets={PRESETS} selProv={form.provider} pickPreset={pickPreset} />
          ) : (
            <div key={m.id} className="group p-4 bg-surface border border-[#222] hover:border-[#333] rounded-lg transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn("w-8 h-8 rounded flex items-center justify-center flex-shrink-0 text-[13px] font-mono font-bold",
                    m.isDefault ? "bg-nvidia-green/10 text-nvidia-green border border-nvidia-green/20" : "bg-[#1a1a1a] text-[#555] border border-[#222]"
                  )}>
                    <Cpu size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-semibold text-white">{m.name}</span>
                      {m.isDefault && <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 bg-nvidia-green/10 text-nvidia-green rounded border border-nvidia-green/20">default</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[11px] text-[#666] font-mono">
                      <span className="flex items-center gap-1"><Server size={10} />{m.provider}</span>
                      <span className="flex items-center gap-1 truncate max-w-[150px] sm:max-w-none"><Globe size={10} />{m.baseUrl.replace("https://", "").split("/")[0]}</span>
                      <span className="flex items-center gap-1 truncate max-w-[120px] sm:max-w-none"><Cpu size={10} />{m.modelId}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-[11px] font-mono">
                      <Key size={10} className={m.apiKey ? "text-nvidia-green" : "text-yellow-500"} />
                      <span className={m.apiKey ? "text-[#666]" : "text-yellow-500/60"}>
                        {m.apiKey ? (showKeys[m.id] ? m.apiKey : "••••" + m.apiKey.slice(-4)) : "not set"}
                      </span>
                      {m.apiKey && (
                        <button onClick={() => setShowKeys(s => ({ ...s, [m.id]: !s[m.id] }))} className="text-[#555] hover:text-white">
                          {showKeys[m.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(m)} className="p-1.5 hover:bg-[#222] rounded text-[#666] hover:text-white transition-colors"><Edit2 size={13} /></button>
                  <button onClick={() => deleteModel(m.id)} className="p-1.5 hover:bg-red-500/10 rounded text-[#666] hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}

          {!models.length && !showAdd && (
            <div className="text-center py-12 bg-surface border border-[#222] rounded-lg">
              <Cpu size={28} className="mx-auto text-[#333] mb-3" />
              <p className="text-[#666] text-[12px] mb-3">No models configured</p>
              <button onClick={startAdd} className="text-nvidia-green text-[12px] hover:underline">Add your first model</button>
            </div>
          )}

          {showAdd && (
            <FormCard form={form} setForm={setForm} onSave={saveModel} onCancel={() => { setShowAdd(false); setForm(EMPTY); }} saving={saving} isEdit={false} presets={PRESETS} selProv={selProv} pickPreset={pickPreset} />
          )}
        </div>

        {/* info */}
        <div className="mt-8 p-4 bg-surface border border-[#222] rounded-lg">
          <h3 className="text-[12px] font-semibold text-nvidia-green flex items-center gap-1.5 mb-2">
            <AlertCircle size={13} /> Security
          </h3>
          <p className="text-[11px] text-[#666] leading-relaxed">
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
    <div className="p-4 bg-surface-2 border border-nvidia-green/20 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-white">{isEdit ? "Edit model" : "Add model"}</h3>
        <button onClick={onCancel} className="p-1 hover:bg-[#222] rounded text-[#666] hover:text-white"><X size={14} /></button>
      </div>

      {!isEdit && (
        <div className="mb-4">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-[#555] mb-2">Provider</label>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p: any) => (
              <button key={p.name} onClick={() => pickPreset(p)}
                className={cn("px-2.5 py-1.5 rounded text-[11px] font-medium border transition-colors",
                  selProv === p.name ? "bg-nvidia-green/10 border-nvidia-green/30 text-nvidia-green" : "bg-[#141414] border-[#222] text-[#888] hover:text-white hover:border-[#333]"
                )}>
                {p.name}
              </button>
            ))}
          </div>
          {selProv && <p className="text-[10px] text-[#555] mt-1.5 font-mono">{presets.find((p: any) => p.name === selProv)?.hint}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <Field label="Name" value={form.name} onChange={(v: string) => setForm((f: any) => ({ ...f, name: v }))} placeholder="e.g. GPT-4o" icon={<Cpu size={12} />} />
        <Field label="Model ID" value={form.modelId} onChange={(v: string) => setForm((f: any) => ({ ...f, modelId: v }))} placeholder="e.g. gpt-4o" icon={<Server size={12} />} />
      </div>
      <div className="mb-3">
        <Field label="Base URL" value={form.baseUrl} onChange={(v: string) => setForm((f: any) => ({ ...f, baseUrl: v }))} placeholder="https://api.openai.com/v1" icon={<Globe size={12} />} />
      </div>
      <div className="mb-3">
        <label className="block text-[10px] font-mono uppercase tracking-widest text-[#555] mb-1.5">API Key</label>
        <div className="relative">
          <Key size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555]" />
          <input type={showKey ? "text" : "password"} value={form.apiKey}
            onChange={e => setForm((f: any) => ({ ...f, apiKey: e.target.value }))}
            placeholder="sk-..."
            className="w-full bg-[#141414] border border-[#222] rounded-md px-2.5 py-2 pl-8 pr-8 text-[12px] font-mono text-[#d4d4d4] placeholder:text-[#444] focus:outline-none focus:border-nvidia-green/40" />
          <button onClick={() => setShowKey(!showKey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] hover:text-white">
            {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={() => setForm((f: any) => ({ ...f, isDefault: !f.isDefault }))}>
        <div className={cn("w-8 h-4 rounded-full p-0.5 transition-colors", form.isDefault ? "bg-nvidia-green" : "bg-[#333]")}>
          <div className={cn("w-3 h-3 rounded-full bg-white transition-transform", form.isDefault ? "translate-x-4" : "")} />
        </div>
        <span className="text-[11px] text-[#888]">Set as default</span>
      </div>

      <div className="flex gap-2 pt-3 border-t border-[#222]">
        <button onClick={onSave} disabled={!form.name || !form.modelId || !form.baseUrl || saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium bg-nvidia-green text-black hover:bg-nvidia-light disabled:opacity-40 transition-colors">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {isEdit ? "Update" : "Add"}
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 rounded-md text-[12px] text-[#888] hover:text-white hover:bg-[#222] transition-colors">Cancel</button>
      </div>
    </div>
  );
}

function Loader2(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function Field({ label, value, onChange, placeholder, icon }: any) {
  return (
    <div>
      <label className="block text-[10px] font-mono uppercase tracking-widest text-[#555] mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555]">{icon}</span>
        <input type="text" value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full bg-[#141414] border border-[#222] rounded-md px-2.5 py-2 pl-8 text-[12px] text-[#d4d4d4] placeholder:text-[#444] focus:outline-none focus:border-nvidia-green/40" />
      </div>
    </div>
  );
}
