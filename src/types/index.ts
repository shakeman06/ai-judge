// ── Raw JSON input shape ─────────────────────────────────────────────────────

export interface RawQuestion {
  rev: number;
  data: {
    id: string;
    questionType: "single_choice_with_reasoning" | "multiple_choice" | "free_form" | string;
    questionText: string;
    options?: string[];
  };
}

export interface RawAnswer {
  choice?: string;
  choices?: string[];
  reasoning?: string;
  text?: string;
}

export interface RawSubmission {
  id: string;
  queueId: string;
  labelingTaskId: string;
  createdAt: number;
  questions: RawQuestion[];
  answers: Record<string, RawAnswer>;
}

// ── Firestore models ──────────────────────────────────────────────────────────

export interface Submission {
  id: string;
  queueId: string;
  labelingTaskId: string;
  createdAt: number;
  importedAt: number; // server timestamp
  questions: RawQuestion[];
  answers: Record<string, RawAnswer>;
}

export type LLMProvider = "anthropic" | "openai";

export type LLMModel =
  | "claude-opus-4-5"
  | "claude-sonnet-4-5"
  | "claude-haiku-4-5"
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gpt-4-turbo";

export interface Judge {
  id: string;
  name: string;
  systemPrompt: string;
  model: LLMModel;
  provider: LLMProvider;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface JudgeAssignment {
  id: string;
  queueId: string;
  questionTemplateId: string;
  judgeIds: string[];
  updatedAt: number;
}

export type Verdict = "pass" | "fail" | "inconclusive";

export interface Evaluation {
  id: string;
  submissionId: string;
  queueId: string;
  questionTemplateId: string;
  questionText: string;
  answer: RawAnswer;
  judgeId: string;
  judgeName: string;
  model: LLMModel;
  verdict: Verdict;
  reasoning: string;
  createdAt: number;
  runId: string;
}

export interface EvaluationRun {
  id: string;
  queueId: string;
  startedAt: number;
  completedAt?: number;
  status: "running" | "completed" | "failed";
  planned: number;
  completed: number;
  failed: number;
}

// ── API payloads ──────────────────────────────────────────────────────────────

export interface RunEvaluationsPayload {
  queueId: string;
  submissions: Submission[];
  assignments: JudgeAssignment[];
  judges: Judge[];
}

export interface EvaluationResult {
  submissionId: string;
  questionTemplateId: string;
  judgeId: string;
  verdict: Verdict;
  reasoning: string;
}
