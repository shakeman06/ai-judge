# AI Judge

Full-stack web app that uses LLMs to evaluate question-answer pairs. Built as a take-home engineering challenge.

Upload submissions, configure AI judges with custom prompts, run evaluations, and review results with pass-rate stats. Supports both Anthropic and OpenAI models.

## Stack
- React, Node.js, Express, Firebase Firestore

## Setup
1. Clone the repo and run `npm install`
2. Create a Firebase project and Firestore database
3. Copy `.env.example` to `.env` and fill in your Firebase config and API keys
4. Run `npm run dev`

App runs at `http://localhost:5173`. API runs at `http://localhost:3001`.
