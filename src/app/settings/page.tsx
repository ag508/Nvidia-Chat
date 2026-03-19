"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronRight,
  Cpu,
  Edit2,
  Eye,
  EyeOff,
  Globe,
  Key,
  Plus,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Model } from "@/lib/types";

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
  { name: "Custom", baseUrl: "", hint: "any OpenAI-compatible endpoint" },
];

export default function SettingsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ModelForm>(EMPTY);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  async function fetchModels() {
    setModels(await fetch("/api/models").then((response) => response.json()));
  }

  function startEdit(model: Model) {
    setEditingId(model.id);
    setForm({
      name: model.name,
      provider: model.provider,
      baseUrl: model.baseUrl,
      modelId: model.modelId,
      apiKey: model.apiKey,
      isDefault: model.isDefault,
    });
    setSelectedProvider(model.provider);
    setShowAdd(false);
  }

  function startAdd() {
    setEditingId(null);
    setForm(EMPTY);
    setSelectedProvider("");
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
      setSelectedProvider("");
    } finally {
      setSaving(false);
    }
  }

  async function deleteModel(id: string) {
    await fetch(`/api/models?id=${id}`, { method: "DELETE" });
    await fetchModels();
    if (editingId === id) {
      setEditingId(null);
      setForm(EMPTY);
      setSelectedProvider("");
    }
  }

  function pickPreset(preset: (typeof PRESETS)[number]) {
    setSelectedProvider(preset.name);
    setForm((current) => ({ ...current, provider: preset.name, baseUrl: preset.baseUrl }));
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(118,185,0,0.16),_transparent_24%),linear-gradient(180deg,#071015_0%,#05080b_45%,#040506_100%)] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-60">
        <div className="terminal-grid absolute inset-0" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
        <header className="mb-6 rounded-[28px] border border-white/10 bg-black/35 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <a
                href="/"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/65 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
              >
                <ArrowLeft size={18} />
              </a>
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#9ae61a]">MODEL CONTROL</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Refined provider workspace</h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-white/58">
                  Configure OpenAI-compatible endpoints with a cleaner, more premium control panel that matches the redesigned chat interface.
                </p>
              </div>
            </div>

            <button
              onClick={startAdd}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#76b900]/30 bg-[#76b900]/12 px-4 py-3 text-sm font-medium text-white shadow-[0_14px_40px_rgba(118,185,0,0.1)] transition hover:border-[#76b900]/45 hover:bg-[#76b900]/18"
            >
              <Plus size={16} className="text-[#9ae61a]" />
              Add model
            </button>
          </div>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <SettingsMetric label="Configured" value={String(models.length).padStart(2, "0")} icon={<Cpu size={16} />} />
          <SettingsMetric label="Default ready" value={models.some((model) => model.isDefault) ? "Yes" : "No"} icon={<Check size={16} />} />
          <SettingsMetric label="Security" value="Local SQLite" icon={<ShieldCheck size={16} />} />
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-3">
            <AnimatePresence initial={false}>
              {models.map((model) =>
                editingId === model.id ? (
                  <FormCard
                    key={model.id}
                    form={form}
                    setForm={setForm}
                    onSave={saveModel}
                    onCancel={() => {
                      setEditingId(null);
                      setForm(EMPTY);
                      setSelectedProvider("");
                    }}
                    saving={saving}
                    isEdit
                    presets={PRESETS}
                    selectedProvider={selectedProvider}
                    pickPreset={pickPreset}
                  />
                ) : (
                  <motion.div
                    key={model.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex min-w-0 gap-4">
                        <div className={cn("mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border", model.isDefault ? "border-[#76b900]/35 bg-[#76b900]/12 text-[#9ae61a]" : "border-white/10 bg-white/[0.03] text-white/55")}>
                          <Cpu size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-semibold text-white">{model.name}</h2>
                            {model.isDefault && <span className="rounded-full border border-[#76b900]/25 bg-[#76b900]/10 px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-[#9ae61a]">Default</span>}
                          </div>
                          <div className="mt-3 grid gap-2 text-sm text-white/55 sm:grid-cols-2">
                            <InfoChip icon={<Server size={13} />} label={model.provider} />
                            <InfoChip icon={<Globe size={13} />} label={model.baseUrl.replace(/^https?:\/\//, "").split("/")[0]} />
                            <InfoChip icon={<Cpu size={13} />} label={model.modelId} />
                            <InfoChip
                              icon={<Key size={13} />}
                              label={model.apiKey ? (showKeys[model.id] ? model.apiKey : `••••${model.apiKey.slice(-4)}`) : "API key not set"}
                              action={
                                model.apiKey ? (
                                  <button onClick={() => setShowKeys((current) => ({ ...current, [model.id]: !current[model.id] }))} className="rounded-full p-1 text-white/45 transition hover:bg-white/5 hover:text-white">
                                    {showKeys[model.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                                  </button>
                                ) : undefined
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start">
                        <button onClick={() => startEdit(model)} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/65 transition hover:border-white/20 hover:text-white">
                          <Edit2 size={14} /> Edit
                        </button>
                        <button onClick={() => deleteModel(model.id)} className="inline-flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/8 px-3 py-2 text-sm text-red-200 transition hover:border-red-400/30 hover:bg-red-500/12">
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              )}
            </AnimatePresence>

            {!models.length && !showAdd && (
              <div className="rounded-[28px] border border-dashed border-white/12 bg-black/25 p-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
                <Sparkles size={28} className="mx-auto mb-3 text-[#9ae61a]" />
                <h3 className="text-lg font-semibold text-white">No models configured</h3>
                <p className="mt-2 text-sm text-white/55">Add a provider to start chatting from the redesigned interface.</p>
                <button onClick={startAdd} className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-[#76b900]/30 bg-[#76b900]/12 px-4 py-3 text-sm text-white transition hover:border-[#76b900]/45 hover:bg-[#76b900]/18">
                  <Plus size={15} className="text-[#9ae61a]" /> Add your first model
                </button>
              </div>
            )}

            {showAdd && (
              <FormCard
                form={form}
                setForm={setForm}
                onSave={saveModel}
                onCancel={() => {
                  setShowAdd(false);
                  setForm(EMPTY);
                  setSelectedProvider("");
                }}
                saving={saving}
                isEdit={false}
                presets={PRESETS}
                selectedProvider={selectedProvider}
                pickPreset={pickPreset}
              />
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-black/30 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#9ae61a]">Best practices</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-white/58">
                <li className="flex gap-3"><ChevronRight size={16} className="mt-1 shrink-0 text-[#9ae61a]" />Use provider presets to prefill compatible base URLs quickly.</li>
                <li className="flex gap-3"><ChevronRight size={16} className="mt-1 shrink-0 text-[#9ae61a]" />Keep one default model so new chats always open with a valid runtime target.</li>
                <li className="flex gap-3"><ChevronRight size={16} className="mt-1 shrink-0 text-[#9ae61a]" />For local endpoints, ensure Docker networking exposes the model server to this app.</li>
              </ul>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(118,185,0,0.12),rgba(118,185,0,0.05))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <AlertCircle size={16} className="text-[#9ae61a]" /> Security notes
              </h3>
              <p className="mt-3 text-sm leading-7 text-white/60">
                API keys are stored locally in SQLite and only transmitted to the endpoint you explicitly configure when a request is sent.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SettingsMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/30 px-5 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
      <div className="flex items-center justify-between text-white/42">
        <span className="text-xs uppercase tracking-[0.24em]">{label}</span>
        {icon}
      </div>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function InfoChip({ icon, label, action }: { icon: React.ReactNode; label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-[#9ae61a]">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      {action}
    </div>
  );
}

function FormCard({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  isEdit,
  presets,
  selectedProvider,
  pickPreset,
}: any) {
  const [showKey, setShowKey] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-[28px] border border-[#76b900]/18 bg-[linear-gradient(180deg,rgba(118,185,0,0.08),rgba(255,255,255,0.03))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#9ae61a]">{isEdit ? "Edit endpoint" : "New endpoint"}</p>
          <h3 className="mt-1 text-xl font-semibold text-white">{isEdit ? "Refine model configuration" : "Add a provider"}</h3>
        </div>
        <button onClick={onCancel} className="rounded-2xl border border-white/10 p-2 text-white/55 transition hover:border-white/20 hover:text-white">
          <X size={16} />
        </button>
      </div>

      {!isEdit && (
        <div className="mb-5">
          <label className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-white/40">Provider preset</label>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset: any) => (
              <button
                key={preset.name}
                onClick={() => pickPreset(preset)}
                className={cn(
                  "rounded-full border px-3 py-2 text-sm transition",
                  selectedProvider === preset.name
                    ? "border-[#76b900]/35 bg-[#76b900]/12 text-white"
                    : "border-white/10 bg-white/[0.03] text-white/58 hover:border-white/18 hover:text-white"
                )}
              >
                {preset.name}
              </button>
            ))}
          </div>
          {selectedProvider && <p className="mt-2 text-xs text-white/45">Preset hint: {presets.find((preset: any) => preset.name === selectedProvider)?.hint}</p>}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" value={form.name} onChange={(value: string) => setForm((current: any) => ({ ...current, name: value }))} placeholder="GPT-4o" icon={<Cpu size={14} />} />
        <Field label="Model ID" value={form.modelId} onChange={(value: string) => setForm((current: any) => ({ ...current, modelId: value }))} placeholder="gpt-4o" icon={<Server size={14} />} />
      </div>

      <div className="mt-4 grid gap-4">
        <Field label="Provider" value={form.provider} onChange={(value: string) => setForm((current: any) => ({ ...current, provider: value }))} placeholder="OpenAI" icon={<Sparkles size={14} />} />
        <Field label="Base URL" value={form.baseUrl} onChange={(value: string) => setForm((current: any) => ({ ...current, baseUrl: value }))} placeholder="https://api.openai.com/v1" icon={<Globe size={14} />} />
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-white/40">API key</label>
        <div className="relative">
          <Key size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ae61a]" />
          <input
            type={showKey ? "text" : "password"}
            value={form.apiKey}
            onChange={(event) => setForm((current: any) => ({ ...current, apiKey: event.target.value }))}
            placeholder="sk-..."
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-11 py-3 text-sm text-white placeholder:text-white/28 focus:border-[#76b900]/35 focus:outline-none"
          />
          <button onClick={() => setShowKey((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/45 transition hover:bg-white/5 hover:text-white">
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      <button
        onClick={() => setForm((current: any) => ({ ...current, isDefault: !current.isDefault }))}
        className="mt-5 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:border-white/20"
      >
        <div>
          <p className="text-sm font-medium text-white">Use as default model</p>
          <p className="mt-1 text-xs text-white/45">New chats will automatically start with this endpoint.</p>
        </div>
        <div className={cn("flex h-7 w-12 items-center rounded-full p-1 transition", form.isDefault ? "bg-[#76b900]" : "bg-white/15")}>
          <div className={cn("h-5 w-5 rounded-full bg-white transition", form.isDefault ? "translate-x-5" : "translate-x-0")} />
        </div>
      </button>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
        <button
          onClick={onSave}
          disabled={!form.name || !form.provider || !form.baseUrl || !form.modelId || saving}
          className="inline-flex items-center gap-2 rounded-2xl border border-[#76b900]/30 bg-[#76b900] px-4 py-3 text-sm font-medium text-black transition hover:bg-[#8fd80b] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? <Spinner size={15} /> : <Check size={15} />}
          {isEdit ? "Save changes" : "Add model"}
        </button>
        <button onClick={onCancel} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/65 transition hover:border-white/20 hover:text-white">
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

function Field({ label, value, onChange, placeholder, icon }: any) {
  return (
    <div>
      <label className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-white/40">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ae61a]">{icon}</span>
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-white/10 bg-black/25 px-11 py-3 text-sm text-white placeholder:text-white/28 focus:border-[#76b900]/35 focus:outline-none"
        />
      </div>
    </div>
  );
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
