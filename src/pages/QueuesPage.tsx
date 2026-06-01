import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ListChecks,
  Play,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Minus,
} from "lucide-react";
import {
  getQueues,
  getSubmissions,
  getJudges,
  getAssignments,
  upsertAssignment,
  saveEvaluations,
  createRun,
  updateRun,
} from "../lib/firebase";
import type {
  Submission,
  Judge,
  JudgeAssignment,
  Evaluation,
} from "../types";
import { runEvaluation } from "../lib/llm";
import { Spinner, EmptyState, MultiSelect, StatCard, Skeleton } from "../components/ui";

// ── Queue List ────────────────────────────────────────────────────────────────
export default function QueuesPage() {
  const { queueId } = useParams<{ queueId?: string }>();

  if (queueId) return <QueueDetail queueId={queueId} />;
  return <QueueList />;
}

function QueueList() {
  const [queues, setQueues] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getQueues().then((q) => { setQueues(q); setLoading(false); });
  }, []);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8 animate-fade-up">
        <h1 className="section-title mb-1">Queues</h1>
        <p className="text-ink-400 text-sm font-mono">
          Select a queue to assign judges and run evaluations
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="card">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      ) : queues.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={40} />}
          title="No queues found"
          description="Import a JSON file to create queues"
          action={
            <Link to="/" className="btn-primary">
              Import data
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {queues.map((qid, i) => (
            <button
              key={qid}
              onClick={() => navigate(`/queues/${qid}`)}
              className="card-hover w-full text-left animate-fade-up flex items-center justify-between"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div>
                <p className="font-display font-semibold text-ink-100">{qid}</p>
                <p className="text-xs font-mono text-ink-400 mt-0.5">Queue ID</p>
              </div>
              <ChevronRight size={16} className="text-ink-500" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Queue Detail ──────────────────────────────────────────────────────────────
interface RunSummary {
  planned: number;
  completed: number;
  failed: number;
  errors: string[];
}

function QueueDetail({ queueId }: { queueId: string }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [assignments, setAssignments] = useState<JudgeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [savingQuestion, setSavingQuestion] = useState<string | null>(null);

  // Unique questions across submissions in this queue
  const questions = (() => {
    const seen = new Map<string, { id: string; text: string; type: string }>();
    for (const s of submissions) {
      for (const q of s.questions) {
        if (!seen.has(q.data.id)) {
          seen.set(q.data.id, {
            id: q.data.id,
            text: q.data.questionText,
            type: q.data.questionType,
          });
        }
      }
    }
    return Array.from(seen.values());
  })();

  const activeJudges = judges.filter((j) => j.active);

  const load = async () => {
    setLoading(true);
    const [subs, jgs, asns] = await Promise.all([
      getSubmissions(queueId),
      getJudges(),
      getAssignments(queueId),
    ]);
    setSubmissions(subs);
    setJudges(jgs);
    setAssignments(asns);
    setLoading(false);
  };

  useEffect(() => { load(); }, [queueId]);

  const getAssignedJudgeIds = (questionTemplateId: string) =>
    assignments.find((a) => a.questionTemplateId === questionTemplateId)?.judgeIds ?? [];

  const handleAssignment = async (questionTemplateId: string, judgeIds: string[]) => {
    setSavingQuestion(questionTemplateId);
    await upsertAssignment(queueId, questionTemplateId, judgeIds);
    setAssignments((prev) => {
      const exists = prev.findIndex((a) => a.questionTemplateId === questionTemplateId);
      const updated: JudgeAssignment = {
        id: prev[exists]?.id ?? "",
        queueId,
        questionTemplateId,
        judgeIds,
        updatedAt: Date.now(),
      };
      return exists >= 0
        ? prev.map((a, i) => (i === exists ? updated : a))
        : [...prev, updated];
    });
    setSavingQuestion(null);
  };

  const handleRunEvaluations = async () => {
    setRunning(true);
    setRunSummary(null);

    // Build task list: (submission × question × judge)
    const tasks: {
      submission: Submission;
      questionTemplateId: string;
      questionText: string;
      questionType: string;
      judgeId: string;
    }[] = [];

    for (const sub of submissions) {
      for (const q of sub.questions) {
        const judgeIds = getAssignedJudgeIds(q.data.id);
        for (const judgeId of judgeIds) {
          tasks.push({
            submission: sub,
            questionTemplateId: q.data.id,
            questionText: q.data.questionText,
            questionType: q.data.questionType,
            judgeId,
          });
        }
      }
    }

    const runId = await createRun(queueId, tasks.length);
    const summary: RunSummary = { planned: tasks.length, completed: 0, failed: 0, errors: [] };
    const results: Omit<Evaluation, "id">[] = [];

    for (const task of tasks) {
      const judge = judges.find((j) => j.id === task.judgeId);
      if (!judge) { summary.failed++; continue; }

      const question = task.submission.questions.find(
        (q) => q.data.id === task.questionTemplateId
      );
      const answer = task.submission.answers[task.questionTemplateId];
      if (!question || !answer) { summary.failed++; continue; }

      try {
        const result = await runEvaluation({ judge, question, answer });
        results.push({
          submissionId: task.submission.id,
          queueId,
          questionTemplateId: task.questionTemplateId,
          questionText: task.questionText,
          answer,
          judgeId: judge.id,
          judgeName: judge.name,
          model: judge.model,
          verdict: result.verdict,
          reasoning: result.reasoning,
          createdAt: Date.now(),
          runId,
        });
        summary.completed++;
      } catch (e) {
        summary.failed++;
        summary.errors.push(e instanceof Error ? e.message : "Unknown error");
      }
    }

    if (results.length > 0) await saveEvaluations(results);
    await updateRun(runId, {
      status: summary.failed === tasks.length ? "failed" : "completed",
      completedAt: Date.now(),
      completed: summary.completed,
      failed: summary.failed,
    });

    setRunSummary(summary);
    setRunning(false);
  };

  const totalAssigned = assignments.reduce((acc, a) => acc + a.judgeIds.length, 0);

  if (loading) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-8" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="card"><Skeleton className="h-20" /></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 animate-fade-up">
        <div className="flex items-center gap-2 text-ink-400 text-sm font-mono mb-2">
          <Link to="/queues" className="hover:text-ink-200 transition-colors">Queues</Link>
          <ChevronRight size={12} />
          <span className="text-ink-200">{queueId}</span>
        </div>
        <h1 className="section-title mb-1">{queueId}</h1>
        <p className="text-ink-400 text-sm font-mono">
          {submissions.length} submissions · {questions.length} unique questions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <StatCard label="Submissions" value={submissions.length} />
        <StatCard label="Questions" value={questions.length} />
        <StatCard label="Judge assignments" value={totalAssigned} accent />
      </div>

      {/* Run button */}
      <div className="card mb-6 animate-fade-up" style={{ animationDelay: "100ms" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display font-semibold text-ink-100 mb-0.5">Run AI Judges</p>
            <p className="text-xs font-mono text-ink-400">
              {totalAssigned === 0
                ? "Assign judges to questions below before running"
                : `~${Math.round(submissions.length * totalAssigned / (questions.length || 1))} evaluations planned`}
            </p>
          </div>
          <button
            onClick={handleRunEvaluations}
            disabled={running || totalAssigned === 0}
            className="btn-primary"
          >
            {running ? <Spinner size={14} /> : <Play size={14} />}
            {running ? "Running..." : "Run evaluations"}
          </button>
        </div>

        {/* Run summary */}
        {runSummary && (
          <div className="mt-4 pt-4 border-t border-ink-600 animate-fade-in">
            <p className="text-xs font-display font-semibold text-ink-300 uppercase tracking-widest mb-2">
              Run complete
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-sm">
                <CheckCircle2 size={13} className="text-pass" />
                <span className="text-ink-200 font-mono">{runSummary.completed} completed</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <XCircle size={13} className="text-fail" />
                <span className="text-ink-200 font-mono">{runSummary.failed} failed</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Minus size={13} className="text-ink-400" />
                <span className="text-ink-200 font-mono">{runSummary.planned} planned</span>
              </div>
            </div>
            {runSummary.errors.length > 0 && (
              <div className="mt-2 p-2 rounded bg-fail/5 border border-fail/20">
                {runSummary.errors.slice(0, 3).map((e, i) => (
                  <p key={i} className="text-xs font-mono text-fail/70">{e}</p>
                ))}
              </div>
            )}
            <Link to="/results" className="btn-ghost mt-3 text-acid hover:text-acid-dark">
              View results →
            </Link>
          </div>
        )}
      </div>

      {/* Judge assignment per question */}
      <div className="animate-fade-up" style={{ animationDelay: "140ms" }}>
        <p className="label mb-3">Judge assignments per question</p>

        {activeJudges.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-ink-400 text-sm mb-2">No active judges available</p>
            <Link to="/judges" className="btn-primary inline-flex">
              Create a judge
            </Link>
          </div>
        ) : questions.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-ink-400 text-sm">No questions found in this queue</p>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, i) => {
              const assigned = getAssignedJudgeIds(q.id);
              return (
                <div
                  key={q.id}
                  className="card animate-fade-up"
                  style={{ animationDelay: `${160 + i * 40}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink-100 font-medium mb-1 leading-snug">
                        {q.text}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-ink-500">{q.id}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-600 text-ink-400 font-mono">
                          {q.type}
                        </span>
                      </div>
                    </div>
                    {savingQuestion === q.id && (
                      <Spinner size={12} />
                    )}
                  </div>

                  <MultiSelect
                    options={activeJudges.map((j) => ({ value: j.id, label: j.name }))}
                    value={assigned}
                    onChange={(ids) => handleAssignment(q.id, ids)}
                  />

                  {assigned.length > 0 && (
                    <p className="text-[11px] font-mono text-ink-500 mt-2">
                      {assigned.length} judge{assigned.length !== 1 ? "s" : ""} assigned
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
