import { useState, useEffect, useCallback } from "react";
import { BarChart3, RefreshCw, Filter } from "lucide-react";
import { getEvaluations, getJudges, getQueues } from "../lib/firebase";
import type { Evaluation, Judge } from "../types";
import {
  EmptyState,
  VerdictBadge,
  StatCard,
  Skeleton,
} from "../components/ui";
import { clsx } from "clsx";

const VERDICT_OPTIONS = [
  { value: "", label: "All verdicts" },
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "inconclusive", label: "Inconclusive" },
];

export default function ResultsPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [queues, setQueues] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedQueue, setSelectedQueue] = useState("");
  const [selectedJudges, setSelectedJudges] = useState<string[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [selectedVerdict, setSelectedVerdict] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    const [evals, jgs, qs] = await Promise.all([
      getEvaluations({ queueId: selectedQueue || undefined }),
      getJudges(),
      getQueues(),
    ]);
    setEvaluations(evals);
    setJudges(jgs);
    setQueues(qs);
    setLoading(false);
    setRefreshing(false);
  }, [selectedQueue]);

  useEffect(() => { load(); }, [load]);

  // Derived: unique questions from loaded evaluations
  const uniqueQuestions = Array.from(
    new Map(evaluations.map((e) => [e.questionTemplateId, e.questionText])).entries()
  ).map(([id, text]) => ({ id, text }));

  // Client-side filter
  const filtered = evaluations.filter((e) => {
    if (selectedJudges.length && !selectedJudges.includes(e.judgeId)) return false;
    if (selectedQuestions.length && !selectedQuestions.includes(e.questionTemplateId)) return false;
    if (selectedVerdict && e.verdict !== selectedVerdict) return false;
    return true;
  });

  // Stats
  const total = filtered.length;
  const passes = filtered.filter((e) => e.verdict === "pass").length;
  const fails = filtered.filter((e) => e.verdict === "fail").length;
  const inconclusive = filtered.filter((e) => e.verdict === "inconclusive").length;
  const passRate = total > 0 ? Math.round((passes / total) * 100) : 0;

  const hasFilters =
    selectedQueue || selectedJudges.length || selectedQuestions.length || selectedVerdict;

  const clearFilters = () => {
    setSelectedQueue("");
    setSelectedJudges([]);
    setSelectedQuestions([]);
    setSelectedVerdict("");
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-up">
        <div>
          <h1 className="section-title mb-1">Results</h1>
          <p className="text-ink-400 text-sm font-mono">
            All AI judge evaluations across queues
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="btn-ghost"
        >
          <RefreshCw size={13} className={clsx(refreshing && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      {!loading && (
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 animate-fade-up"
          style={{ animationDelay: "60ms" }}
        >
          <StatCard
            label="Pass rate"
            value={`${passRate}%`}
            sub={`of ${total} evaluation${total !== 1 ? "s" : ""}`}
            accent
          />
          <StatCard label="Pass" value={passes} sub="verdicts" />
          <StatCard label="Fail" value={fails} sub="verdicts" />
          <StatCard label="Inconclusive" value={inconclusive} sub="verdicts" />
        </div>
      )}

      {/* Pass rate bar */}
      {!loading && total > 0 && (
        <div className="card mb-6 animate-fade-up" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-display font-semibold text-ink-300 uppercase tracking-widest">
              Verdict distribution
            </p>
            <p className="text-xs font-mono text-ink-400">{total} total</p>
          </div>
          <div className="h-2.5 rounded-full bg-ink-600 overflow-hidden flex">
            <div
              className="h-full bg-pass transition-all duration-500"
              style={{ width: `${(passes / total) * 100}%` }}
            />
            <div
              className="h-full bg-fail transition-all duration-500"
              style={{ width: `${(fails / total) * 100}%` }}
            />
            <div
              className="h-full bg-inconclusive transition-all duration-500"
              style={{ width: `${(inconclusive / total) * 100}%` }}
            />
          </div>
          <div className="flex gap-4 mt-2">
            {[
              { label: "Pass", color: "bg-pass", count: passes },
              { label: "Fail", color: "bg-fail", count: fails },
              { label: "Inconclusive", color: "bg-inconclusive", count: inconclusive },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className={clsx("w-2 h-2 rounded-full", item.color)} />
                <span className="text-xs font-mono text-ink-400">
                  {item.label} ({item.count})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div
        className="card mb-6 animate-fade-up"
        style={{ animationDelay: "100ms" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter size={13} className="text-ink-400" />
          <p className="text-xs font-display font-semibold text-ink-300 uppercase tracking-widest">
            Filters
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs font-mono text-acid hover:text-acid-dark transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Queue */}
          <div>
            <label className="label">Queue</label>
            <select
              className="select"
              value={selectedQueue}
              onChange={(e) => setSelectedQueue(e.target.value)}
            >
              <option value="">All queues</option>
              {queues.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>

          {/* Verdict */}
          <div>
            <label className="label">Verdict</label>
            <select
              className="select"
              value={selectedVerdict}
              onChange={(e) => setSelectedVerdict(e.target.value)}
            >
              {VERDICT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Judges */}
          <div>
            <label className="label">Judges</label>
            <div className="flex flex-wrap gap-1.5">
              {judges.map((j) => {
                const on = selectedJudges.includes(j.id);
                return (
                  <button
                    key={j.id}
                    onClick={() =>
                      setSelectedJudges((prev) =>
                        on ? prev.filter((x) => x !== j.id) : [...prev, j.id]
                      )
                    }
                    className={clsx(
                      "px-3 py-1 rounded-lg text-xs font-mono transition-all",
                      on
                        ? "bg-acid text-ink-800 font-semibold"
                        : "bg-ink-700 text-ink-300 hover:bg-ink-600 border border-ink-600"
                    )}
                  >
                    {j.name}
                  </button>
                );
              })}
              {judges.length === 0 && (
                <span className="text-xs text-ink-500 font-mono">No judges</span>
              )}
            </div>
          </div>

          {/* Questions */}
          <div>
            <label className="label">Questions</label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {uniqueQuestions.map((q) => {
                const on = selectedQuestions.includes(q.id);
                return (
                  <button
                    key={q.id}
                    onClick={() =>
                      setSelectedQuestions((prev) =>
                        on ? prev.filter((x) => x !== q.id) : [...prev, q.id]
                      )
                    }
                    title={q.text}
                    className={clsx(
                      "px-3 py-1 rounded-lg text-xs font-mono transition-all max-w-[200px] truncate",
                      on
                        ? "bg-acid text-ink-800 font-semibold"
                        : "bg-ink-700 text-ink-300 hover:bg-ink-600 border border-ink-600"
                    )}
                  >
                    {q.id}
                  </button>
                );
              })}
              {uniqueQuestions.length === 0 && (
                <span className="text-xs text-ink-500 font-mono">No questions yet</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card">
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BarChart3 size={40} />}
          title={hasFilters ? "No results match filters" : "No evaluations yet"}
          description={
            hasFilters
              ? "Try adjusting your filters"
              : "Run AI judges on a queue to see results here"
          }
          action={
            hasFilters ? (
              <button onClick={clearFilters} className="btn-ghost">
                Clear filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <div
          className="rounded-xl border border-ink-600 overflow-hidden animate-fade-up"
          style={{ animationDelay: "120ms" }}
        >
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Submission</th>
                <th className="table-header">Question</th>
                <th className="table-header">Judge</th>
                <th className="table-header">Model</th>
                <th className="table-header">Verdict</th>
                <th className="table-header">Reasoning</th>
                <th className="table-header">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr
                  key={e.id}
                  className={clsx(
                    "hover:bg-ink-700/40 transition-colors",
                    i % 2 === 0 ? "bg-transparent" : "bg-ink-800/30"
                  )}
                >
                  <td className="table-cell">
                    <span className="font-mono text-xs text-ink-300">{e.submissionId}</span>
                  </td>
                  <td className="table-cell max-w-[180px]">
                    <p
                      className="text-xs text-ink-200 truncate"
                      title={e.questionText}
                    >
                      {e.questionText}
                    </p>
                    <p className="text-[10px] font-mono text-ink-500 mt-0.5">
                      {e.questionTemplateId}
                    </p>
                  </td>
                  <td className="table-cell">
                    <span className="text-xs text-ink-200">{e.judgeName}</span>
                  </td>
                  <td className="table-cell">
                    <span className="text-[10px] font-mono text-ink-400">{e.model}</span>
                  </td>
                  <td className="table-cell">
                    <VerdictBadge verdict={e.verdict} />
                  </td>
                  <td className="table-cell max-w-[260px]">
                    <p
                      className="text-xs text-ink-300 line-clamp-2 leading-relaxed"
                      title={e.reasoning}
                    >
                      {e.reasoning}
                    </p>
                  </td>
                  <td className="table-cell whitespace-nowrap">
                    <span className="text-[10px] font-mono text-ink-500">
                      {new Date(e.createdAt).toLocaleDateString()}{" "}
                      {new Date(e.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-4 py-2.5 border-t border-ink-700 bg-ink-800/50 flex items-center justify-between">
            <p className="text-xs font-mono text-ink-500">
              Showing {filtered.length} of {evaluations.length} evaluations
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs font-mono text-acid hover:text-acid-dark transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
