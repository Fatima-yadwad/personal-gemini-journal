import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Lazy Google GenAI Client Initializer
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

// Resilient Model Fallback Ladder according to Gemini API Guidelines & Production Directives
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

/**
 * Reusable helper utility with automatic fallback ladder and retry resilience for Gemini API calls
 */
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
      return { response, modelUsed: model };
    } catch (err: any) {
      console.warn(`[Gemini Fallback] Model ${model} encountered an error:`, err?.message || err);
      lastError = err;

      // Extract error details and status
      const status = err?.status || err?.statusCode || 0;
      const msg = (err?.message || '').toLowerCase();
      const isRecoverable =
        status === 429 ||
        status === 503 ||
        status === 500 ||
        status === 404 ||
        msg.includes('503') ||
        msg.includes('429') ||
        msg.includes('unavailable') ||
        msg.includes('high demand') ||
        msg.includes('quota') ||
        msg.includes('rate limit') ||
        msg.includes('overloaded') ||
        msg.includes('not found');

      if (isRecoverable) {
        console.log(`[Gemini Fallback] Attempting next model in fallback ladder after ${model} status ${status}...`);
      } else {
        console.warn(`[Gemini Fallback] Non-standard error with ${model}, attempting next model in ladder.`);
      }
      
      // Brief pause to allow transient server spikes to settle before trying next model
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  throw lastError || new Error('All Gemini models in the fallback ladder were unavailable.');
}

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Multi-Turn Reflection & Journal Conversation Endpoint
 */
app.post('/api/journal/chat', async (req, res) => {
  try {
    const data = (req.body && typeof req.body === 'object') ? req.body : {};
    const { messages = [], currentEntry = '', journalTitle = 'Personal Reflection' } = data;

    if (!currentEntry && (!Array.isArray(messages) || messages.length === 0)) {
      return res.status(400).json({ error: 'Missing journal input or conversation messages.' });
    }

    const systemInstruction = `You are a thoughtful, empathetic, and wise personal reflection companion in the "Personal Gemini Journal" application.
Your mission is to help the user reflect deeply on their thoughts, organize their mind, discover new perspectives, brainstorm constructive ideas, and find clarity.

Key Guidelines:
1. Provide warm, grounding, non-judgmental responses.
2. Ask 1-2 thoughtful probing questions to facilitate deeper reflection when appropriate.
3. Offer constructive brainstorming angles and gentle reframings.
4. Keep answers concise yet resonant (2-4 paragraphs). Use clean formatting.
5. IMPORTANT DISCLAIMER: You are a reflective thought partner, not a therapist or medical provider. Never make clinical or medical diagnoses. Always offer comforting, self-directed exploration.`;

    // Construct conversation history for Gemini
    const contents: any[] = [];

    if (Array.isArray(messages)) {
      for (const msg of messages) {
        if (msg && msg.content) {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(msg.content) }],
          });
        }
      }
    }

    if (currentEntry) {
      contents.push({
        role: 'user',
        parts: [{ text: String(currentEntry) }],
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

    const replyText = result.response.text || 'I hear you. Take a deep breath and let your thoughts settle.';

    return res.json({
      reply: replyText,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/journal/chat:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate reflection response with Gemini.',
    });
  }
});

/**
 * AI Mood & Insight Analysis Endpoint (Structured JSON)
 */
app.post('/api/journal/analyze', async (req, res) => {
  try {
    const data = (req.body && typeof req.body === 'object') ? req.body : {};
    const { journalTitle = 'Reflection', content = '', messages = [] } = data;

    // Combine content and recent chat exchanges
    let combinedText = `Journal Title: ${journalTitle}\n`;
    if (content) {
      combinedText += `Main Reflection:\n${content}\n\n`;
    }
    if (Array.isArray(messages) && messages.length > 0) {
      combinedText += `Conversation History:\n`;
      messages.forEach((m: any) => {
        combinedText += `${m.role === 'user' ? 'User' : 'Companion'}: ${m.content}\n`;
      });
    }

    if (!combinedText.trim()) {
      return res.status(400).json({ error: 'No content provided to analyze.' });
    }

    const systemInstruction = `You are the AI Mood & Insight Analyst for the Personal Gemini Journal.
Analyze the user's reflection and extract structured emotional, thematic, and actionable insights.
Focus purely on positive self-awareness, mindfulness, creative brainstorming, and constructive personal growth.
Do NOT make medical or clinical diagnoses.

Evaluate and generate:
- mood: A vibrant, descriptive emotional state (e.g., "Quiet Gratitude", "Creative Spark", "Constructive Uncertainty", "Determined Focus", "Gentle Fatigue", "Joyful Momentum").
- moodScore: An integer rating from 1 to 10 indicating energy/optimism level (1 = lowest energy/distressed, 10 = highest enthusiasm/peace).
- keyThemes: 3 to 5 short thematic tags (e.g. ["Work-Life Harmony", "Creative Projects", "Mindful Pauses"]).
- shortSummary: A 2-sentence empathetic synthesis of the entry.
- helpfulInsight: A deep, meaningful observation that helps the user understand themselves better.
- suggestedNextAction: A gentle, practical, 1-step micromovement they can do today.
- clarityLevel: One of ["Calm", "Focused", "Reflective", "Energized", "Overwhelmed", "Seeking Direction"].`;

    const prompt = `Analyze this journal session and return the structured JSON analysis:\n\n${combinedText}`;

    const result = await generateWithFallback({
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mood: { type: Type.STRING },
            moodScore: { type: Type.INTEGER },
            keyThemes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            shortSummary: { type: Type.STRING },
            helpfulInsight: { type: Type.STRING },
            suggestedNextAction: { type: Type.STRING },
            clarityLevel: {
              type: Type.STRING,
              enum: ['Calm', 'Focused', 'Reflective', 'Energized', 'Overwhelmed', 'Seeking Direction'],
            },
          },
          required: ['mood', 'moodScore', 'keyThemes', 'shortSummary', 'helpfulInsight', 'suggestedNextAction', 'clarityLevel'],
        },
      },
    });

    const parsed = JSON.parse(result.response.text || '{}');
    return res.json({
      insight: parsed,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/journal/analyze:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to extract AI Mood & Insight from journal.',
    });
  }
});

// Vite middleware setup for Development and Static Serving for Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Personal Gemini Journal server running on http://localhost:${PORT}`);
  });
}

startServer();
