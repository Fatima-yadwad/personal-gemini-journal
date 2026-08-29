import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();

// Cloud Run provides PORT.
// Local development falls back to 3000.
const PORT = Number(process.env.PORT) || 3000;

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// --------------------------------------------------
// Gemini Client
// --------------------------------------------------

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (
    !apiKey ||
    apiKey.trim() === "" ||
    apiKey === "MY_GEMINI_API_KEY"
  ) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not configured."
    );
  }

  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
    });
  }

  return genAIClient;
}

// --------------------------------------------------
// Gemini Model Fallback Ladder
// --------------------------------------------------

const MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
];

// --------------------------------------------------
// Gemini Helper
// --------------------------------------------------

async function generateWithFallback(params: {
  contents: any;
  config?: any;
}) {
  const ai = getGenAI();

  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });

      return {
        response,
        modelUsed: model,
      };
    } catch (err: any) {
      console.warn(
        `[Gemini Fallback] Model ${model} encountered an error:`,
        err?.message || err
      );

      lastError = err;

      const status = err?.status || err?.statusCode || 0;
      const msg = String(err?.message || "").toLowerCase();

      const isRecoverable =
        status === 429 ||
        status === 503 ||
        status === 500 ||
        status === 404 ||
        msg.includes("503") ||
        msg.includes("429") ||
        msg.includes("unavailable") ||
        msg.includes("high demand") ||
        msg.includes("quota") ||
        msg.includes("rate limit") ||
        msg.includes("overloaded") ||
        msg.includes("not found");

      if (isRecoverable) {
        console.log(
          `[Gemini Fallback] Trying next model after ${model}. Status: ${status}`
        );
      } else {
        console.warn(
          `[Gemini Fallback] Non-standard error with ${model}. Trying next model.`
        );
      }

      // Small delay before trying the next model.
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  throw (
    lastError ||
    new Error(
      "All Gemini models in the fallback ladder were unavailable."
    )
  );
}

// --------------------------------------------------
// Health Check
// --------------------------------------------------

app.get("/api/health", (_req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;

  res.json({
    status: "ok",
    geminiConfigured: Boolean(
      apiKey &&
        apiKey.trim() !== "" &&
        apiKey !== "MY_GEMINI_API_KEY"
    ),
    timestamp: new Date().toISOString(),
  });
});

// --------------------------------------------------
// Journal Chat Endpoint
// --------------------------------------------------

app.post("/api/journal/chat", async (req, res) => {
  try {
    const data =
      req.body && typeof req.body === "object"
        ? req.body
        : {};

    const {
      messages = [],
      currentEntry = "",
      journalTitle = "Personal Reflection",
    } = data;

    if (
      !currentEntry &&
      (!Array.isArray(messages) || messages.length === 0)
    ) {
      return res.status(400).json({
        error:
          "Missing journal input or conversation messages.",
      });
    }

    const systemInstruction = `
You are a thoughtful, empathetic, and wise personal reflection
companion in the "Personal Gemini Journal" application.

Your mission is to help the user reflect deeply on their thoughts,
organize their mind, discover new perspectives, brainstorm
constructive ideas, and find clarity.

Key Guidelines:

1. Provide warm, grounding, non-judgmental responses.
2. Ask 1-2 thoughtful probing questions when appropriate.
3. Offer constructive brainstorming angles and gentle reframings.
4. Keep answers concise yet resonant, around 2-4 paragraphs.
5. Use clean formatting.
6. Do not make clinical or medical diagnoses.
7. You are a reflective thought partner, not a therapist or
   medical provider.
8. Encourage self-directed exploration and practical reflection.

The journal title is:
${String(journalTitle)}
`;

    // Build Gemini conversation history.
    const contents: any[] = [];

    if (Array.isArray(messages)) {
      for (const msg of messages) {
        if (msg && msg.content) {
          contents.push({
            role:
              msg.role === "assistant"
                ? "model"
                : "user",
            parts: [
              {
                text: String(msg.content),
              },
            ],
          });
        }
      }
    }

    // Add the current journal entry.
    if (currentEntry) {
      contents.push({
        role: "user",
        parts: [
          {
            text: String(currentEntry),
          },
        ],
      });
    }

    const result = await generateWithFallback({
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    const replyText =
      result.response.text ||
      "I hear you. Take a deep breath and let your thoughts settle.";

    return res.json({
      reply: replyText,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error(
      "Error in /api/journal/chat:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Failed to generate reflection response with Gemini.",
    });
  }
});

// --------------------------------------------------
// Journal Analysis Endpoint
// --------------------------------------------------

app.post("/api/journal/analyze", async (req, res) => {
  try {
    const data =
      req.body && typeof req.body === "object"
        ? req.body
        : {};

    const {
      journalTitle = "Reflection",
      content = "",
      messages = [],
    } = data;

    let combinedText = `Journal Title: ${journalTitle}\n`;

    if (content) {
      combinedText += `Main Reflection:\n${content}\n\n`;
    }

    if (Array.isArray(messages) && messages.length > 0) {
      combinedText += "Conversation History:\n";

      messages.forEach((m: any) => {
        combinedText += `${
          m.role === "user"
            ? "User"
            : "Companion"
        }: ${m.content}\n`;
      });
    }

    if (!content && (!Array.isArray(messages) || messages.length === 0)) {
      return res.status(400).json({
        error: "No content provided to analyze.",
      });
    }

    const systemInstruction = `
You are the AI Mood & Insight Analyst for the
"Personal Gemini Journal" application.

Analyze the user's reflection and extract structured emotional,
thematic, and actionable insights.

Focus on:

- Positive self-awareness
- Mindfulness
- Creative brainstorming
- Constructive personal growth

Do NOT make medical or clinical diagnoses.

Generate:

- mood: A vibrant, descriptive emotional state.
- moodScore: An integer from 1 to 10 indicating energy/optimism.
- keyThemes: 3 to 5 short thematic tags.
- shortSummary: A concise 2-sentence empathetic synthesis.
- helpfulInsight: A meaningful observation that helps the user
  understand themselves better.
- suggestedNextAction: One gentle, practical action they can take.
- clarityLevel: One of:
  ["Calm", "Focused", "Reflective", "Energized",
   "Overwhelmed", "Seeking Direction"].
`;

    const prompt = `
Analyze this journal session and return the structured JSON analysis.

${combinedText}
`;

    const result = await generateWithFallback({
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",

        responseSchema: {
          type: Type.OBJECT,

          properties: {
            mood: {
              type: Type.STRING,
            },

            moodScore: {
              type: Type.INTEGER,
            },

            keyThemes: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },

            shortSummary: {
              type: Type.STRING,
            },

            helpfulInsight: {
              type: Type.STRING,
            },

            suggestedNextAction: {
              type: Type.STRING,
            },

            clarityLevel: {
              type: Type.STRING,
              enum: [
                "Calm",
                "Focused",
                "Reflective",
                "Energized",
                "Overwhelmed",
                "Seeking Direction",
              ],
            },
          },

          required: [
            "mood",
            "moodScore",
            "keyThemes",
            "shortSummary",
            "helpfulInsight",
            "suggestedNextAction",
            "clarityLevel",
          ],
        },

        temperature: 0.5,
        maxOutputTokens: 1000,
      },
    });

    const responseText = result.response.text || "{}";

    let parsed;

    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      console.error(
        "Failed to parse Gemini JSON response:",
        responseText
      );

      return res.status(500).json({
        error:
          "Gemini returned an invalid structured response.",
      });
    }

    return res.json({
      insight: parsed,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error(
      "Error in /api/journal/analyze:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Failed to extract AI Mood & Insight from journal.",
    });
  }
});

// --------------------------------------------------
// Server Startup
// --------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.join(
      process.cwd(),
      "dist"
    );

    app.use(express.static(distPath));

    app.get("*", (_req, res) => {
      res.sendFile(
        path.join(distPath, "index.html")
      );
    });
  }

  // Cloud Run requires 0.0.0.0 and process.env.PORT.
  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Personal Gemini Journal server running on port ${PORT}`
    );
  });
}

startServer().catch((error) => {
  console.error(
    "Failed to start Personal Gemini Journal server:",
    error
  );

  process.exit(1);
});