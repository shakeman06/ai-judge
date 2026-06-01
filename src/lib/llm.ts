import type { Judge, RawAnswer, RawQuestion, Verdict } from "../types";

const ANTHROPIC_PROXY = "/api/evaluate"; // goes through our backend server

export interface EvalRequest {
  judge: Judge;
  question: RawQuestion;
  answer: RawAnswer;
}

export interface EvalResponse {
  verdict: Verdict;
  reasoning: string;
}

function buildUserMessage(question: RawQuestion, answer: RawAnswer): string {
  const lines: string[] = [];
  lines.push(`QUESTION: ${question.data.questionText}`);
  lines.push(`QUESTION TYPE: ${question.data.questionType}`);

  if (question.data.options?.length) {
    lines.push(`OPTIONS: ${question.data.options.join(", ")}`);
  }

  lines.push("");
  lines.push("ANSWER:");
  if (answer.choice) lines.push(`  Choice: ${answer.choice}`);
  if (answer.choices?.length) lines.push(`  Choices: ${answer.choices.join(", ")}`);
  if (answer.reasoning) lines.push(`  Reasoning: ${answer.reasoning}`);
  if (answer.text) lines.push(`  Text: ${answer.text}`);

  lines.push("");
  lines.push(
    'Respond ONLY with a JSON object with two fields: "verdict" (must be exactly "pass", "fail", or "inconclusive") and "reasoning" (1-2 sentence explanation). Example: {"verdict": "pass", "reasoning": "The answer correctly identifies..."}'
  );

  return lines.join("\n");
}

function parseVerdict(raw: string): EvalResponse {
  // Try to extract JSON from the response
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const verdict = parsed.verdict?.toLowerCase();
      if (verdict === "pass" || verdict === "fail" || verdict === "inconclusive") {
        return {
          verdict: verdict as Verdict,
          reasoning: parsed.reasoning ?? "No reasoning provided.",
        };
      }
    } catch {
      // fall through
    }
  }

  // Fallback: scan text for verdict keywords
  const lower = raw.toLowerCase();
  let verdict: Verdict = "inconclusive";
  if (lower.includes('"verdict": "pass"') || lower.includes("verdict: pass")) verdict = "pass";
  else if (lower.includes('"verdict": "fail"') || lower.includes("verdict: fail")) verdict = "fail";

  return { verdict, reasoning: raw.slice(0, 300) };
}

export async function runEvaluation(req: EvalRequest): Promise<EvalResponse> {
  const userMessage = buildUserMessage(req.question, req.answer);

  const response = await fetch(ANTHROPIC_PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: req.judge.provider,
      model: req.judge.model,
      systemPrompt: req.judge.systemPrompt,
      userMessage,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "Unknown error");
    throw new Error(`LLM API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return parseVerdict(data.content);
}
