import { useState, useCallback } from "react";
import { UploadCloud, FileJson, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { importSubmissions } from "../lib/firebase";
import type { RawSubmission } from "../types";
import { Spinner } from "../components/ui";
import { useNavigate } from "react-router-dom";

function parseAndValidate(json: unknown): RawSubmission[] {
  if (!Array.isArray(json)) throw new Error("Root must be a JSON array");
  return json.map((item, i) => {
    if (!item.id) throw new Error(`Submission at index ${i} missing 'id'`);
    if (!item.queueId) throw new Error(`Submission ${item.id} missing 'queueId'`);
    if (!Array.isArray(item.questions)) throw new Error(`Submission ${item.id} missing 'questions' array`);
    if (!item.answers || typeof item.answers !== "object") throw new Error(`Submission ${item.id} missing 'answers'`);
    return item as RawSubmission;
  });
}

export default function ImportPage() {
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ count: number; queues: string[] } | null>(null);
  const [preview, setPreview] = useState<RawSubmission[] | null>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".json")) {
      setError("Please upload a .json file");
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const submissions = parseAndValidate(json);
      setPreview(submissions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse file");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleImport = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      await importSubmissions(preview);
      const queues = [...new Set(preview.map((s) => s.queueId))];
      setResult({ count: preview.length, queues });
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8 animate-fade-up">
        <h1 className="section-title mb-1">Import Submissions</h1>
        <p className="text-ink-400 text-sm font-mono">
          Upload a JSON file matching the submission schema
        </p>
      </div>

      {/* Drop zone */}
      {!preview && !result && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={clsx(
            "border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 animate-fade-up",
            dragging
              ? "border-acid bg-acid/5 scale-[1.01]"
              : "border-ink-600 hover:border-ink-500"
          )}
          style={{ animationDelay: "60ms" }}
        >
          <div className="flex flex-col items-center gap-4">
            <div className={clsx(
              "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
              dragging ? "bg-acid/20" : "bg-ink-700"
            )}>
              <UploadCloud size={24} className={dragging ? "text-acid" : "text-ink-400"} />
            </div>
            <div>
              <p className="font-display font-semibold text-ink-200 mb-1">
                Drop your JSON file here
              </p>
              <p className="text-ink-500 text-sm">or click to browse</p>
            </div>
            <label className="btn-primary cursor-pointer">
              <FileJson size={14} />
              Choose file
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
              />
            </label>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 p-4 card animate-fade-in">
          <Spinner />
          <span className="text-ink-300 text-sm font-mono">Processing file...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-fail/10 border border-fail/20 animate-fade-in">
          <AlertCircle size={16} className="text-fail mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-fail text-sm font-medium">Parse error</p>
            <p className="text-fail/70 text-xs font-mono mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && !loading && (
        <div className="card animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-display font-semibold text-ink-100">
                {preview.length} submission{preview.length !== 1 ? "s" : ""} ready
              </p>
              <p className="text-xs text-ink-400 font-mono mt-0.5">
                Queues: {[...new Set(preview.map((s) => s.queueId))].join(", ")}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPreview(null)} className="btn-ghost">
                Cancel
              </button>
              <button onClick={handleImport} className="btn-primary">
                Import to Firestore
              </button>
            </div>
          </div>

          {/* Preview table */}
          <div className="overflow-hidden rounded-lg border border-ink-600">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="table-header">ID</th>
                  <th className="table-header">Queue</th>
                  <th className="table-header">Questions</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 5).map((s) => (
                  <tr key={s.id} className="hover:bg-ink-700/50 transition-colors">
                    <td className="table-cell font-mono text-ink-300">{s.id}</td>
                    <td className="table-cell">
                      <span className="px-2 py-0.5 bg-ink-600 rounded text-xs font-mono">
                        {s.queueId}
                      </span>
                    </td>
                    <td className="table-cell text-ink-400">{s.questions.length}</td>
                  </tr>
                ))}
                {preview.length > 5 && (
                  <tr>
                    <td className="table-cell text-ink-500 text-xs font-mono" colSpan={3}>
                      +{preview.length - 5} more submissions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="card border-pass/20 bg-pass/5 animate-fade-up">
          <div className="flex items-start gap-3 mb-5">
            <CheckCircle2 size={20} className="text-pass mt-0.5" />
            <div>
              <p className="font-display font-semibold text-ink-50">
                Import successful
              </p>
              <p className="text-ink-300 text-sm font-mono mt-0.5">
                {result.count} submission{result.count !== 1 ? "s" : ""} saved to Firestore
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/queues")}
              className="btn-primary"
            >
              Go to Queues
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setResult(null)}
              className="btn-ghost"
            >
              Import more
            </button>
          </div>
        </div>
      )}

      {/* Schema hint */}
      <div className="mt-8 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <p className="label">Expected schema</p>
        <pre className="p-4 rounded-xl bg-ink-700 border border-ink-600 text-xs font-mono text-ink-300 overflow-x-auto leading-relaxed">
{`[
  {
    "id": "sub_1",
    "queueId": "queue_1",
    "labelingTaskId": "task_1",
    "createdAt": 1690000000000,
    "questions": [
      {
        "rev": 1,
        "data": {
          "id": "q_template_1",
          "questionType": "single_choice_with_reasoning",
          "questionText": "Is the sky blue?"
        }
      }
    ],
    "answers": {
      "q_template_1": {
        "choice": "yes",
        "reasoning": "Observed on a clear day."
      }
    }
  }
]`}
        </pre>
      </div>
    </div>
  );
}
