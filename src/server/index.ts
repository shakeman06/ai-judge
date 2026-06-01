import express, { Request, Response } from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { config } from "dotenv";

config();

const app = express();
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:4173"] }));
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/evaluate", async (req: Request, res: Response): Promise<void> => {
  const { provider, model, systemPrompt, userMessage } = req.body;

  if (!provider || !model || !systemPrompt || !userMessage) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    let content = "";

    if (provider === "anthropic") {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });
      content =
        response.content[0]?.type === "text" ? response.content[0].text : "";
    } else if (provider === "openai") {
      const response = await openai.chat.completions.create({
        model,
        max_tokens: 512,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      });
      content = response.choices[0]?.message?.content ?? "";
    } else {
      res.status(400).json({ error: `Unsupported provider: ${provider}` });
      return;
    }

    res.json({ content });
  } catch (err: unknown) {
    console.error("LLM error:", err);
    const message = err instanceof Error ? err.message : "Unknown LLM error";

    if (message.includes("401") || message.includes("auth")) {
      res.status(401).json({ error: "Invalid API key" });
      return;
    }
    if (message.includes("429") || message.includes("quota")) {
      res.status(429).json({ error: "Rate limit or quota exceeded" });
      return;
    }
    res.status(500).json({ error: message });
  }
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`API server running on :${PORT}`));
