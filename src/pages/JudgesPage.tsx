import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Gavel } from "lucide-react";
import {
  getJudges,
  createJudge,
  updateJudge,
  deleteJudge,
} from "../lib/firebase";
import type { Judge, LLMModel, LLMProvider } from "../types";
import {
  Spinner,
  EmptyState,
  Modal,
  Toggle,
  Skeleton,
} from "../components/ui";
import { clsx } from "clsx";

const MODELS: { value: LLMModel; label: string; provider: LLMProvider }[] = [
  { value: "claude-opus-4-5", label: "Claude Opus 4.5", provider: "anthropic" },
  { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", provider: "anthropic" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5", provider: "anthropic" },
  { value: "gpt-4o", label: "GPT-4o", provider: "openai" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", provider: "openai" },
];

const DEFAULT_PROMPT = `You are an AI judge evaluating answers to labeling questions.
Assess the answer's correctness, completeness, and reasoning quality.
Be strict but fair. Respond only with a JSON object containing "verdict" and "reasoning".`;

interface FormState {
  name: string;
  systemPrompt: string;
  model: LLMModel;
  active: boolean;
}

const defaultForm: FormState = {
  name: "",
  systemPrompt: DEFAULT_PROMPT,
  model: "claude-sonnet-4-5",
  active: true,
};

export default function JudgesPage() {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Judge | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await getJudges();
    setJudges(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const openEdit = (j: Judge) => {
    setEditTarget(j);
    setForm({ name: j.name, systemPrompt: j.systemPrompt, model: j.model, active: j.active });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.systemPrompt.trim()) return;
    setSaving(true);
    const provider = MODELS.find((m) => m.value === form.model)?.provider ?? "anthropic";
    try {
      if (editTarget) {
        await updateJudge(editTarget.id, { ...form, provider });
      } else {
        await createJudge({ ...form, provider });
      }
      await load();
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (j: Judge) => {
    await updateJudge(j.id, { active: !j.active });
    setJudges((prev) =>
      prev.map((x) => (x.id === j.id ? { ...x, active: !x.active } : x))
    );
  };

  const handleDelete = async (id: string) => {
    await deleteJudge(id);
    setJudges((prev) => prev.filter((j) => j.id !== id));
    setDeleteId(null);
  };

  const selectedModel = MODELS.find((m) => m.value === form.model);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8 animate-fade-up">
        <div>
          <h1 className="section-title mb-1">Judges</h1>
          <p className="text-ink-400 text-sm font-mono">
            Define LLM judges with system prompts and target models
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={14} strokeWidth={2.5} />
          New Judge
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card" style={{ animationDelay: `${i * 60}ms` }}>
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-3 w-64" />
            </div>
          ))}
        </div>
      ) : judges.length === 0 ? (
        <EmptyState
          icon={<Gavel size={40} />}
          title="No judges yet"
          description="Create your first AI judge to start evaluating answers"
          action={
            <button onClick={openCreate} className="btn-primary">
              <Plus size={14} />
              Create a judge
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {judges.map((j, i) => (
            <div
              key={j.id}
              className={clsx(
                "card animate-fade-up flex items-start gap-4 transition-opacity",
                !j.active && "opacity-50"
              )}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Provider dot */}
              <div
                className={clsx(
                  "mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-display font-bold",
                  j.provider === "anthropic"
                    ? "bg-orange-500/15 text-orange-400"
                    : "bg-blue-500/15 text-blue-400"
                )}
              >
                {j.provider === "anthropic" ? "AN" : "OA"}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-display font-semibold text-ink-100">{j.name}</p>
                  {!j.active && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-ink-600 text-ink-400">
                      inactive
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-ink-400 mb-2">{j.model}</p>
                <p className="text-xs text-ink-500 line-clamp-2 font-mono leading-relaxed">
                  {j.systemPrompt}
                </p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Toggle checked={j.active} onChange={() => handleToggle(j)} />
                <button
                  onClick={() => openEdit(j)}
                  className="btn-ghost px-2 py-2 text-ink-400"
                  title="Edit"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => setDeleteId(j.id)}
                  className="btn-ghost px-2 py-2 text-ink-400 hover:text-fail"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? "Edit Judge" : "New Judge"}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              placeholder="e.g. Strict Accuracy Judge"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Model</label>
            <select
              className="select"
              value={form.model}
              onChange={(e) =>
                setForm((f) => ({ ...f, model: e.target.value as LLMModel }))
              }
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.provider})
                </option>
              ))}
            </select>
            {selectedModel && (
              <p className="text-[11px] font-mono text-ink-500 mt-1">
                Provider: {selectedModel.provider}
              </p>
            )}
          </div>

          <div>
            <label className="label">System Prompt / Rubric</label>
            <textarea
              className="textarea"
              rows={6}
              placeholder="Describe how this judge should evaluate answers..."
              value={form.systemPrompt}
              onChange={(e) =>
                setForm((f) => ({ ...f, systemPrompt: e.target.value }))
              }
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <Toggle
              checked={form.active}
              onChange={(v) => setForm((f) => ({ ...f, active: v }))}
              label="Active"
            />
            <div className="flex gap-2">
              <button onClick={() => setModalOpen(false)} className="btn-ghost">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.systemPrompt.trim()}
                className="btn-primary"
              >
                {saving ? <Spinner size={14} /> : null}
                {editTarget ? "Save changes" : "Create judge"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete judge?"
      >
        <p className="text-ink-300 text-sm mb-5">
          This will permanently remove the judge. Existing evaluations will not be affected.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setDeleteId(null)} className="btn-ghost">
            Cancel
          </button>
          <button
            onClick={() => deleteId && handleDelete(deleteId)}
            className="btn-danger"
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
