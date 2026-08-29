import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { JournalSession, MoodInsight } from '../types';
import { Sparkles, PlusCircle, BookOpen, BarChart3, History, ArrowRight, Clock, ShieldCheck } from 'lucide-react';

interface PrivateDashboardProps {
  onNewSession: () => void;
  onSelectSession: (session: JournalSession) => void;
  onNavigateToHistory: () => void;
  onNavigateToInsights: () => void;
}

export const PrivateDashboard: React.FC<PrivateDashboardProps> = ({
  onNewSession,
  onSelectSession,
  onNavigateToHistory,
  onNavigateToInsights,
}) => {
  const { currentUser } = useAuth();
  const [recentSessions, setRecentSessions] = useState<JournalSession[]>([]);
  const [recentInsights, setRecentInsights] = useState<MoodInsight[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!currentUser) return;

    // Fetch recent 3 sessions
    const sessionsRef = collection(db, 'users', currentUser.uid, 'sessions');
    const qSessions = query(sessionsRef, orderBy('createdAt', 'desc'), limit(3));
    const unsubSessions = onSnapshot(qSessions, (snapshot) => {
      const list: JournalSession[] = [];
      snapshot.forEach((d) => list.push(d.data() as JournalSession));
      setRecentSessions(list);
      setLoading(false);
    });

    // Fetch recent 3 insights
    const insightsRef = collection(db, 'users', currentUser.uid, 'insights');
    const qInsights = query(insightsRef, orderBy('createdAt', 'desc'), limit(3));
    const unsubInsights = onSnapshot(qInsights, (snapshot) => {
      const list: MoodInsight[] = [];
      snapshot.forEach((d) => list.push(d.data() as MoodInsight));
      setRecentInsights(list);
    });

    return () => {
      unsubSessions();
      unsubInsights();
    };
  }, [currentUser]);

  const firstName = currentUser?.displayName?.split(' ')[0] || 'Friend';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Welcome Banner */}
      <div className="rounded-3xl border border-stone-200/80 bg-gradient-to-r from-stone-900 to-stone-800 p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-300 border border-amber-500/30 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Encrypted Personal Sanctuary</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-stone-50">
            Welcome back, {firstName}.
          </h1>
          <p className="mt-2 text-sm text-stone-300 leading-relaxed">
            Ready to unwind and reflect? Your Gemini Thought Partner is ready to listen, brainstorm, and help organize your thoughts.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              id="btn-dashboard-new-session"
              onClick={onNewSession}
              className="flex items-center space-x-2 rounded-xl bg-amber-700 px-5 py-2.5 text-xs font-medium text-white shadow-xs hover:bg-amber-600 transition active:scale-95"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Start New Reflection</span>
            </button>

            <button
              id="btn-dashboard-view-insights"
              onClick={onNavigateToInsights}
              className="flex items-center space-x-2 rounded-xl border border-stone-600 bg-stone-800/80 px-4 py-2.5 text-xs font-medium text-stone-200 hover:bg-stone-700 transition"
            >
              <BarChart3 className="h-4 w-4 text-amber-400" />
              <span>Explore AI Insights</span>
            </button>
          </div>
        </div>

        {/* Ambient subtle decorative shape */}
        <div className="absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-amber-600/10 blur-2xl pointer-events-none" />
      </div>

      {/* Quick Stats / Security Health */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Security Invariant</span>
          <div className="mt-1 flex items-center text-xs font-semibold text-emerald-800">
            <ShieldCheck className="h-4 w-4 text-emerald-600 mr-1.5" /> Owner-Bound UID Isolation
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Gemini Architecture</span>
          <div className="mt-1 flex items-center text-xs font-semibold text-stone-800">
            <Sparkles className="h-4 w-4 text-amber-700 mr-1.5" /> Backend Proxy + Zero Browser Keys
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500">Firestore Rules</span>
          <div className="mt-1 flex items-center text-xs font-semibold text-stone-800">
            <BookOpen className="h-4 w-4 text-amber-700 mr-1.5" /> Zero Public Read/Write Access
          </div>
        </div>
      </div>

      {/* Grid: Recent Sessions vs Recent Insights */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        
        {/* Left Column: Recent Sessions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-medium text-stone-900 flex items-center">
              <History className="h-5 w-5 mr-2 text-amber-800" />
              Recent Journal Entries
            </h2>
            <button
              onClick={onNavigateToHistory}
              className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3 ml-1" />
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-xs text-stone-400">
                Loading sessions...
              </div>
            ) : recentSessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-6 text-center">
                <BookOpen className="mx-auto h-6 w-6 text-stone-400 mb-2" />
                <p className="text-xs text-stone-500">No journal sessions recorded yet.</p>
                <button
                  onClick={onNewSession}
                  className="mt-3 text-xs font-semibold text-amber-800 hover:underline"
                >
                  Write your first entry →
                </button>
              </div>
            ) : (
              recentSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session)}
                  className="group cursor-pointer rounded-2xl border border-stone-200 bg-white p-4 shadow-xs transition hover:border-amber-700/50 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-serif text-sm font-semibold text-stone-900 group-hover:text-amber-900 transition">
                      {session.title || 'Untitled Session'}
                    </h3>
                    <span className="text-[10px] text-stone-400 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-600 line-clamp-2">
                    {session.summary || session.promptTopic || 'Personal reflection'}
                  </p>
                  {session.latestInsight && (
                    <div className="mt-2 flex items-center space-x-1.5">
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                        {session.latestInsight.mood}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recent Insights */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-medium text-stone-900 flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-amber-800" />
              Latest AI Reflections & Advice
            </h2>
            <button
              onClick={onNavigateToInsights}
              className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center"
            >
              <span>Dashboard</span>
              <ArrowRight className="h-3 w-3 ml-1" />
            </button>
          </div>

          <div className="space-y-3">
            {recentInsights.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-6 text-center">
                <Sparkles className="mx-auto h-6 w-6 text-stone-400 mb-2" />
                <p className="text-xs text-stone-500">No AI Mood & Insights generated yet.</p>
                <p className="text-[11px] text-stone-400 mt-1">
                  Click "Generate AI Insights" in any reflection session.
                </p>
              </div>
            ) : (
              recentInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="rounded-2xl border border-amber-200/60 bg-amber-50/30 p-4 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
                      {insight.mood}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      Score: {insight.moodScore}/10
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-stone-700 italic">
                    "{insight.shortSummary}"
                  </p>
                  <div className="mt-2 text-[11px] text-stone-800 bg-white/80 rounded-xl p-2 border border-stone-200/60">
                    <span className="font-semibold text-amber-900">Next Action: </span>
                    {insight.suggestedNextAction}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
