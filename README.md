# AI Judge

Write a rubric, point an LLM at a queue of human answers and get back a verdict and a reason for every one. Results are saved and filterable with a live pass rate.

Built as a take-home for Besimple AI. Works with Anthropic and OpenAI models.

<!-- Add a screenshot of the Results page here -->

## What it does

- Import submissions from a JSON file
- Create judges with a name, a rubric, a model and an on/off switch
- Pick which judges run on each question
- Run them all. Every submission, question and judge combo gets a pass, fail or inconclusive verdict with a short reason
- Filter results by queue, judge, question or verdict. The pass rate updates as you filter

## Design choices

**Keys never touch the browser.** The frontend sends prompts to a small Express server and the server calls the model provider. Anything else would leak keys in the network tab.

**One bad call doesn't kill a run.** Rate limits, bad keys and timeouts get counted as failures and the run keeps going. You see planned, completed and failed counts at the end.

**Model output gets parsed defensively.** Models don't always return clean JSON. The parser tries JSON first, then scans the text for a verdict, then falls back to inconclusive.

**New providers are cheap.** Add the model names to one list and one branch to the server.

## Stack

React 19, TypeScript, Vite, Tailwind, Express, Firebase Firestore, Anthropic SDK, OpenAI SDK.

## Run it

You need Node 20+ and a Firebase project with Firestore enabled.

```bash
npm install
cp .env.example .env
npm run dev
```

Fill in `.env` with your Firebase web config and an API key for whichever provider you want to use. Edit it in a plain text editor. Rich text editors break the keys.

The app runs at `http://localhost:5173` and the API at `http://localhost:3001`. Import `sample_input.json` from the repo root to try it.

## Trade-offs

Runs are sequential to stay under rate limits. A worker queue with capped concurrency and retries is the obvious next step.

Result filters run in the browser to avoid Firestore composite indexes. That works for thousands of evaluations and not much past that.

There's no auth and the Express server runs locally. Both would change before this went anywhere public.
