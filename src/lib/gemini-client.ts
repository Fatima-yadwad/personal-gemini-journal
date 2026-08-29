import { AnalysisResponse } from '../types';

export async function askGeminiReflection(params: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentEntry: string;
  journalTitle?: string;
}): Promise<{ reply: string; modelUsed: string }> {
  const response = await fetch('/api/journal/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to communicate with Gemini reflection service.');
  }

  return data;
}

export async function analyzeJournalWithGemini(params: {
  journalTitle: string;
  content: string;
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<{ insight: AnalysisResponse; modelUsed: string }> {
  const response = await fetch('/api/journal/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to extract AI Mood & Insight from Gemini.');
  }

  return data;
}

export async function checkServerHealth(): Promise<{ status: string; geminiConfigured: boolean }> {
  try {
    const response = await fetch('/api/health');
    if (!response.ok) return { status: 'error', geminiConfigured: false };
    return await response.json();
  } catch (err) {
    return { status: 'offline', geminiConfigured: false };
  }
}
