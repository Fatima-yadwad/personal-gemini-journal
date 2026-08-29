export interface JournalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface MoodInsight {
  id: string;
  userId: string;
  sessionId: string;
  sessionTitle: string;
  mood: string;
  moodScore: number; // 1 to 10 for trends
  keyThemes: string[];
  shortSummary: string;
  helpfulInsight: string;
  suggestedNextAction: string;
  clarityLevel?: 'Calm' | 'Focused' | 'Reflective' | 'Energized' | 'Overwhelmed' | 'Seeking Direction';
  createdAt: string;
}

export interface JournalSession {
  id: string;
  userId: string;
  title: string;
  promptTopic?: string;
  summary: string;
  messages: JournalMessage[];
  latestInsight?: MoodInsight;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatRequestBody {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  currentEntry: string;
  journalTitle?: string;
  sessionContext?: string;
}

export interface AnalyzeRequestBody {
  journalTitle: string;
  content: string;
  messages?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface AnalysisResponse {
  mood: string;
  moodScore: number;
  keyThemes: string[];
  shortSummary: string;
  helpfulInsight: string;
  suggestedNextAction: string;
  clarityLevel: 'Calm' | 'Focused' | 'Reflective' | 'Energized' | 'Overwhelmed' | 'Seeking Direction';
}
