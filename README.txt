# AI Judge — Besimple Take-Home

An AI-powered annotation review platform. Upload labeling submissions, define LLM judges with custom rubrics, assign them to questions, run evaluations, and review results with filtering and pass-rate stats.

## Quick start

### 1. Clone and install

```bash
git clone <repo>
cd ai-judge
npm install
```

### 2. Firebase setup

1. Go to [Firebase Console](https://console.firebase.google.com/) → **Add project**
2. Create a **Firestore Database** (start in test mode for development)
3. Go to **Project Settings → Your apps → Web** → register an app
4. Copy the config values

### 3. Environment variables

```bash
cp .env.example .env
```

Fill in `.env` with your Firebase config and LLM API keys.

### 4. Run

```bash
npm run dev
```

This starts both:
- **Vite dev server** on `http://localhost:5173`
- **Express API server** on `http://localhost:3001`

Vite proxies `/api/*` to the Express server so API keys never reach the browser.

---

## Firestore collections

| Collection | Purpose |
|---|---|
| `submissions` | Imported JSON submissions keyed by `id` |
| `judges` | Judge definitions (name, model, system prompt, active flag) |
| `assignments` | Maps `(queueId, questionTemplateId)` to `judgeIds[]` |
| `evaluations` | Evaluation records with verdict and reasoning |
| `evaluationRuns` | Run-level metadata (planned/completed/failed) |

---

## Architecture decisions

**Why Express for LLM calls?** API keys must stay server-side. A lightweight Express proxy receives requests from React and forwards to Anthropic/OpenAI. In production this would be a Firebase Cloud Function.

**Why client-side filtering?** Firestore doesn't support multi-field array filters in a single query without composite indexes. The app fetches by `queueId` server-side then filters judge/question/verdict client-side. Production would use Algolia or BigQuery.

**Sequential evaluation runner** avoids hammering rate limits. Production would use a job queue (BullMQ, Cloud Tasks) with configurable concurrency.

**Adding a new LLM provider** takes ~15 lines: add models to `MODELS` in `JudgesPage.tsx` and add a branch in `src/server/index.ts`.

---

## Time spent

~7 hours. Trade-offs: sequential runner (vs concurrent), client-side filtering (vs composite indexes), no auth (out of scope), no pagination (fine for demo volumes).
