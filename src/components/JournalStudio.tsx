import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, RefreshCw, Save, Check, ArrowRight, Brain, Lightbulb, Tag, Compass, AlertCircle, MessageSquare } from 'lucide-react';
import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { sanitizeFirestorePayload, formatFirestoreError } from '../lib/firestore-utils';
import { askGeminiReflection, analyzeJournalWithGemini } from '../lib/gemini-client';
import { JournalSession, JournalMessage, MoodInsight } from '../types';
import confetti from 'canvas-confetti';

const INSPIRATIONAL_PROMPTS = [
  'What moment brought you unexpected peace or energy today?',
  'What decision or obstacle has been lingering on your mind lately?',
  'What is something you are curious about learning or exploring next?',
  'How did you handle a challenging interaction or boundary recently?',
  'What would make today feel truly meaningful and grounded?'
];

interface JournalStudioProps {
  initialSession?: JournalSession | null;
  onSessionSaved?: (session: JournalSession) => void;
  onNavigateToDashboard?: () => void;
}

export const JournalStudio: React.FC<JournalStudioProps> = ({
  initialSession,
  onSessionSaved,
  onNavigateToDashboard,
}) => {
  const { currentUser } = useAuth();
  
  // Session State
  const [sessionId, setSessionId] = useState<string>(initialSession?.id || `session_${Date.now()}`);
  const [title, setTitle] = useState<string>(initialSession?.title || 'Daily Reflection');
  const [currentEntry, setCurrentEntry] = useState<string>(initialSession?.promptTopic || '');
  const [messages, setMessages] = useState<JournalMessage[]>(initialSession?.messages || []);
  const [latestInsight, setLatestInsight] = useState<MoodInsight | undefined>(initialSession?.latestInsight);

  // Interaction State
  const [isResponding, setIsResponding] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'reflect' | 'insights'>('reflect');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync if initialSession changes
  useEffect(() => {
    if (initialSession) {
      setSessionId(initialSession.id);
      setTitle(initialSession.title);
      setCurrentEntry(initialSession.promptTopic || '');
      setMessages(initialSession.messages || []);
      setLatestInsight(initialSession.latestInsight);
    }
  }, [initialSession]);

  // Scroll chat into view on updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isResponding]);

  // Handle Asking Gemini (Multi-Turn Reflection)
  const handleSendMessage = async (textToSend?: string) => {
    const inputContent = (textToSend !== undefined ? textToSend : currentEntry).trim();
    if (!inputContent) return;

    setErrorMessage(null);
    const userMsg: JournalMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: inputContent,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setCurrentEntry('');
    setIsResponding(true);

    try {
      const response = await askGeminiReflection({
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        currentEntry: inputContent,
        journalTitle: title,
      });

      const assistantMsg: JournalMessage = {
        id: `msg_gemini_${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);

      // Auto-save progress to Firestore
      if (currentUser) {
        await persistSession(finalMessages, latestInsight, inputContent);
      }
    } catch (err: any) {
      console.error('Reflection error:', err);
      setErrorMessage(err.message || 'Could not connect to Gemini reflection service. You can retry below.');
    } finally {
      setIsResponding(false);
    }
  };

  // Extract AI Mood & Insight Analysis
  const handleGenerateInsights = async () => {
    if (!messages.length && !currentEntry.trim()) {
      setErrorMessage('Please write a thought or start a reflection first before analyzing.');
      return;
    }

    setErrorMessage(null);
    setIsAnalyzing(true);

    try {
      const fullContent = [
        currentEntry,
        ...messages.map(m => `${m.role === 'user' ? 'User' : 'Companion'}: ${m.content}`)
      ].join('\n\n');

      const { insight: analysis } = await analyzeJournalWithGemini({
        journalTitle: title,
        content: fullContent,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      });

      const insightDoc: MoodInsight = {
        id: `insight_${Date.now()}`,
        userId: currentUser?.uid || 'guest',
        sessionId: sessionId,
        sessionTitle: title,
        mood: analysis.mood,
        moodScore: analysis.moodScore || 7,
        keyThemes: analysis.keyThemes || [],
        shortSummary: analysis.shortSummary,
        helpfulInsight: analysis.helpfulInsight,
        suggestedNextAction: analysis.suggestedNextAction,
        clarityLevel: analysis.clarityLevel,
        createdAt: new Date().toISOString(),
      };

      setLatestInsight(insightDoc);
      setActiveTab('insights');

      // Trigger soft celebratory confetti
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#b45309', '#f59e0b', '#78716c'],
      });

      // Save insight to Firestore subcollections
      if (currentUser) {
        await persistSession(messages, insightDoc, currentEntry);
        // Also save to dedicated /users/{uid}/insights collection
        const insightRef = doc(db, 'users', currentUser.uid, 'insights', insightDoc.id);
        await setDoc(insightRef, sanitizeFirestorePayload(insightDoc));
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorMessage(err.message || 'Failed to extract AI Mood & Insight.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Firestore Persistence Helper
  const persistSession = async (
    msgsToSave: JournalMessage[],
    insightToSave?: MoodInsight,
    promptContent?: string
  ) => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      const sessionDocRef = doc(db, 'users', currentUser.uid, 'sessions', sessionId);
      const sessionData: JournalSession = {
        id: sessionId,
        userId: currentUser.uid,
        title: title || 'Untitled Reflection',
        promptTopic: promptContent || currentEntry,
        summary: insightToSave?.shortSummary || msgsToSave[msgsToSave.length - 1]?.content.slice(0, 120) || 'Personal reflection',
        messages: msgsToSave,
        latestInsight: insightToSave,
        createdAt: initialSession?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(sessionDocRef, sanitizeFirestorePayload(sessionData));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (onSessionSaved) {
        onSessionSaved(sessionData);
      }
    } catch (err: any) {
      console.error('Firestore save error:', err);
      setErrorMessage(formatFirestoreError(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Top Header & Session Controls */}
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <input
            id="journal-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Name your reflection session..."
            className="w-full font-serif text-2xl font-semibold text-stone-900 placeholder:text-stone-400 bg-transparent border-b border-transparent focus:border-amber-700 focus:outline-hidden py-1 transition"
          />
          <p className="text-xs text-stone-500 mt-1">
            Session ID: <span className="font-mono text-[10px] text-stone-400">{sessionId}</span>
            {saveSuccess && (
              <span className="ml-3 inline-flex items-center text-xs text-emerald-700 font-medium">
                <Check className="h-3.5 w-3.5 mr-1" /> Saved to Cloud Firestore
              </span>
            )}
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center space-x-2">
          {/* Analyze / Insights Button */}
          <button
            id="btn-analyze-insights"
            onClick={handleGenerateInsights}
            disabled={isAnalyzing || (!messages.length && !currentEntry.trim())}
            className="flex items-center space-x-1.5 rounded-xl bg-amber-800 px-3.5 py-2 text-xs font-medium text-amber-50 shadow-xs hover:bg-amber-900 transition active:scale-95 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Analyzing Mood...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Generate AI Insights</span>
              </>
            )}
          </button>

          {/* Manual Save Button */}
          <button
            id="btn-save-session"
            onClick={() => persistSession(messages, latestInsight, currentEntry)}
            disabled={isSaving}
            className="flex items-center space-x-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 shadow-xs hover:bg-stone-50 transition active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-stone-500" />
            ) : (
              <Save className="h-3.5 w-3.5 text-stone-500" />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Session'}</span>
          </button>
        </div>
      </div>

      {/* Error / Alert Banner */}
      {errorMessage && (
        <div className="mt-4 flex items-start space-x-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p>{errorMessage}</p>
            <button
              onClick={() => {
                setErrorMessage(null);
                if (currentEntry) handleSendMessage();
              }}
              className="mt-1 font-semibold underline text-red-900 hover:text-red-700"
            >
              Dismiss & Retry
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-4 flex space-x-2 border-b border-stone-200">
        <button
          id="tab-btn-reflect"
          onClick={() => setActiveTab('reflect')}
          className={`flex items-center space-x-2 border-b-2 px-4 py-2 text-sm font-medium transition ${
            activeTab === 'reflect'
              ? 'border-amber-800 text-amber-900 font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Reflective Chat ({messages.length})</span>
        </button>

        <button
          id="tab-btn-insights"
          onClick={() => setActiveTab('insights')}
          className={`flex items-center space-x-2 border-b-2 px-4 py-2 text-sm font-medium transition ${
            activeTab === 'insights'
              ? 'border-amber-800 text-amber-900 font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-700" />
          <span>AI Mood & Insights</span>
          {latestInsight && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">
              {latestInsight.mood}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: REFLECTIVE CHAT WORKSPACE */}
      {activeTab === 'reflect' && (
        <div className="mt-6 flex flex-col space-y-6">
          
          {/* Empty State / Prompts Starter */}
          {messages.length === 0 && (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-6 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 mb-3">
                <Brain className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-base font-medium text-stone-900">
                What’s on your mind today?
              </h3>
              <p className="mt-1 text-xs text-stone-500 max-w-md mx-auto">
                Write freely below or choose an introspective prompt to begin your reflection dialogue.
              </p>

              {/* Prompt Suggestions */}
              <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                {INSPIRATIONAL_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    id={`prompt-pill-${idx}`}
                    onClick={() => {
                      setCurrentEntry(prompt);
                      handleSendMessage(prompt);
                    }}
                    className="rounded-full border border-stone-300/80 bg-white px-3 py-1.5 text-xs text-stone-700 transition hover:border-amber-700 hover:bg-amber-50 hover:text-amber-900 text-left"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation Stream */}
          {messages.length > 0 && (
            <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 sm:p-6 shadow-xs max-h-[500px] overflow-y-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-3 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-700 text-amber-50 shadow-xs">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-stone-900 text-stone-100 rounded-tr-xs'
                        : 'bg-stone-100/90 text-stone-800 border border-stone-200/70 rounded-tl-xs whitespace-pre-wrap'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">
                        {msg.role === 'user' ? 'You' : 'Gemini Thought Partner'}
                      </span>
                      <span className="text-[9px] opacity-40 ml-2">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div>{msg.content}</div>
                  </div>

                  {msg.role === 'user' && currentUser && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-stone-200 text-stone-700 text-xs font-bold">
                      {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isResponding && (
                <div className="flex items-start space-x-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-700 text-amber-50 shadow-xs animate-pulse">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl rounded-tl-xs bg-stone-100 px-4 py-3 text-xs text-stone-500 flex items-center space-x-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-700 animate-bounce"></span>
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-700 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-700 animate-bounce [animation-delay:0.4s]"></span>
                    <span className="ml-2 font-medium">Gemini is formulating thoughtful reflections...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}

          {/* Input Box */}
          <div className="rounded-2xl border border-stone-300 bg-white p-3 shadow-sm focus-within:border-amber-700 focus-within:ring-2 focus-within:ring-amber-200">
            <textarea
              id="journal-input-textarea"
              rows={3}
              value={currentEntry}
              onChange={(e) => setCurrentEntry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSendMessage();
                }
              }}
              placeholder="Type your reflection, challenge, gratitude, or question... (Cmd/Ctrl + Enter to send)"
              className="w-full resize-none border-none bg-transparent p-1 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden"
            />
            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <span className="text-[11px] text-stone-400">
                Press <kbd className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[10px]">Ctrl+Enter</kbd> to converse
              </span>
              <button
                id="btn-send-message"
                onClick={() => handleSendMessage()}
                disabled={isResponding || !currentEntry.trim()}
                className="flex items-center space-x-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-stone-800 active:scale-95 disabled:opacity-40"
              >
                <span>Reflect</span>
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI MOOD & INSIGHT DASHBOARD FOR THIS ENTRY */}
      {activeTab === 'insights' && (
        <div className="mt-6 space-y-6">
          {latestInsight ? (
            <div className="space-y-6">
              
              {/* Mood & Clarity Hero Banner */}
              <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-stone-50 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                      Identified Emotional State
                    </span>
                    <h2 className="font-serif text-3xl font-normal text-stone-900 mt-1">
                      {latestInsight.mood}
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Clarity Level: <span className="font-semibold text-stone-700">{latestInsight.clarityLevel || 'Reflective'}</span>
                    </p>
                  </div>

                  {/* Energy Score Dial */}
                  <div className="flex items-center space-x-3 rounded-2xl bg-white p-4 border border-stone-200 shadow-xs">
                    <div className="text-center">
                      <div className="text-2xl font-bold font-serif text-amber-800">
                        {latestInsight.moodScore}/10
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-stone-500 font-medium">
                        Optimism & Energy
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Themes Tag Chips */}
                <div className="mt-4 flex flex-wrap items-center gap-2 pt-4 border-t border-amber-200/60">
                  <span className="text-xs font-medium text-stone-600 flex items-center mr-1">
                    <Tag className="h-3.5 w-3.5 mr-1 text-amber-700" /> Key Themes:
                  </span>
                  {latestInsight.keyThemes.map((theme, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-white border border-stone-200 px-3 py-1 text-xs font-medium text-stone-800 shadow-2xs"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>

              {/* 3 Insight Pillars */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                
                {/* Synthesis */}
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center space-x-2 text-stone-900 font-serif text-base font-medium mb-2">
                    <Brain className="h-4 w-4 text-amber-700" />
                    <h4>Core Synthesis</h4>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {latestInsight.shortSummary}
                  </p>
                </div>

                {/* Helpful Insight */}
                <div className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-5 shadow-xs">
                  <div className="flex items-center space-x-2 text-amber-950 font-serif text-base font-medium mb-2">
                    <Lightbulb className="h-4 w-4 text-amber-700" />
                    <h4>Helpful Insight</h4>
                  </div>
                  <p className="text-xs text-amber-900/90 leading-relaxed">
                    {latestInsight.helpfulInsight}
                  </p>
                </div>

                {/* Suggested Next Action */}
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-xs">
                  <div className="flex items-center space-x-2 text-emerald-950 font-serif text-base font-medium mb-2">
                    <Compass className="h-4 w-4 text-emerald-700" />
                    <h4>Suggested Micro-Action</h4>
                  </div>
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    {latestInsight.suggestedNextAction}
                  </p>
                </div>

              </div>

              {/* Bottom Notice */}
              <div className="rounded-xl bg-stone-100 p-3 text-center text-[11px] text-stone-500">
                Non-clinical personal reflection. Extracted with Google Gemini AI.
              </div>

            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-amber-700 mb-2" />
              <h3 className="font-serif text-base font-medium text-stone-900">
                No Insights Extracted Yet
              </h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                Write your thoughts and click "Generate AI Insights" above to extract your mood, themes, and suggested actions.
              </p>
              <button
                onClick={handleGenerateInsights}
                disabled={isAnalyzing || (!messages.length && !currentEntry.trim())}
                className="mt-4 inline-flex items-center space-x-1.5 rounded-xl bg-amber-800 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-amber-900"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Analyze Current Entry</span>
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
