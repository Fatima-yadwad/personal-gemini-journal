import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { MoodInsight } from '../types';
import { BarChart3, Sparkles, TrendingUp, Tag, Lightbulb, Compass, Calendar, ArrowUpRight } from 'lucide-react';
import { formatFirestoreError } from '../lib/firestore-utils';

export const MoodDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [insights, setInsights] = useState<MoodInsight[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setInsights([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // Strict Owner Path Query: /users/{userId}/insights
    const insightsRef = collection(db, 'users', currentUser.uid, 'insights');
    const q = query(insightsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: MoodInsight[] = [];
        snapshot.forEach((docSnap) => {
          fetched.push(docSnap.data() as MoodInsight);
        });
        setInsights(fetched);
        setLoading(false);
      },
      (error) => {
        console.error('Firestore snapshot error on insights:', error);
        setErrorMessage(formatFirestoreError(error));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Aggregate stats
  const totalInsights = insights.length;
  const avgMoodScore = totalInsights
    ? (insights.reduce((acc, curr) => acc + (curr.moodScore || 7), 0) / totalInsights).toFixed(1)
    : '0';

  // Extract all unique themes
  const themeCounts: { [key: string]: number } = {};
  insights.forEach((i) => {
    (i.keyThemes || []).forEach((t) => {
      themeCounts[t] = (themeCounts[t] || 0) + 1;
    });
  });

  const sortedThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="border-b border-stone-200 pb-5">
        <div className="flex items-center space-x-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-800 text-amber-50 shadow-xs">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-3xl font-normal text-stone-900">
              AI Mood & Insight Dashboard
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Reflective emotional analytics, recurring themes, and actionable wisdom over time.
            </p>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200">
          {errorMessage}
        </div>
      )}

      {/* Top Overview Cards */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {/* Metric 1 */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Total Insights Extracted
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-serif text-3xl font-bold text-stone-900">{totalInsights}</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              Reflections Analyzed
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Average Optimism / Energy
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-serif text-3xl font-bold text-amber-800">
              {avgMoodScore} <span className="text-sm font-normal text-stone-400">/ 10</span>
            </span>
            <span className="flex items-center text-xs text-emerald-700 font-medium">
              <TrendingUp className="h-3.5 w-3.5 mr-0.5" /> Stable Baseline
            </span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Dominant Theme
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-serif text-xl font-medium text-stone-900 truncate">
              {sortedThemes[0]?.[0] || 'Mindful Growth'}
            </span>
            <span className="text-xs text-stone-400">
              {sortedThemes[0]?.[1] ? `${sortedThemes[0][1]} times` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Recurring Themes Cloud */}
      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
        <h3 className="font-serif text-base font-medium text-stone-900 flex items-center mb-3">
          <Tag className="h-4 w-4 mr-2 text-amber-700" />
          Recurring Themes & Areas of Focus
        </h3>
        {sortedThemes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {sortedThemes.map(([theme, count], idx) => (
              <div
                key={idx}
                className="flex items-center space-x-1.5 rounded-full border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-xs font-medium text-stone-800"
              >
                <span>{theme}</span>
                <span className="rounded-full bg-stone-200 px-1.5 py-0.2 text-[10px] text-stone-600 font-bold">
                  {count}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-stone-500">
            Generate insights in your journal entries to discover recurring life themes and focuses.
          </p>
        )}
      </div>

      {/* Historical Insights Feed */}
      <div className="mt-8">
        <h3 className="font-serif text-xl font-medium text-stone-900 mb-4 flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-amber-700" />
          Timeline of Generated Insights
        </h3>

        {loading ? (
          <div className="py-12 text-center text-xs text-stone-400">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-amber-800 mb-2"></div>
            <p>Loading insight history...</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
            <Lightbulb className="mx-auto h-8 w-8 text-stone-400 mb-2" />
            <h4 className="font-serif text-sm font-medium text-stone-800">
              No Insight Records Extracted Yet
            </h4>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              When you use the "Generate AI Insights" feature inside any journal session, a structured log will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {insights.map((item) => {
              const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-xs transition hover:shadow-md"
                >
                  <div>
                    {/* Header with mood and date */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                          {item.mood}
                        </span>
                        <h4 className="font-serif text-lg font-medium text-stone-900 mt-0.5">
                          {item.sessionTitle || 'Reflection'}
                        </h4>
                      </div>
                      <span className="text-[10px] text-stone-400 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formattedDate}
                      </span>
                    </div>

                    {/* Summary */}
                    <p className="mt-3 text-xs text-stone-600 leading-relaxed italic">
                      "{item.shortSummary}"
                    </p>

                    {/* Helpful Insight */}
                    <div className="mt-3 rounded-xl bg-amber-50/60 border border-amber-200/50 p-3 text-xs text-amber-950">
                      <span className="font-semibold block mb-0.5 text-[11px] text-amber-900 flex items-center">
                        <Lightbulb className="h-3 w-3 mr-1 text-amber-700" /> Wisdom:
                      </span>
                      {item.helpfulInsight}
                    </div>

                    {/* Action */}
                    <div className="mt-2 rounded-xl bg-emerald-50/50 border border-emerald-200/50 p-3 text-xs text-emerald-950">
                      <span className="font-semibold block mb-0.5 text-[11px] text-emerald-900 flex items-center">
                        <Compass className="h-3 w-3 mr-1 text-emerald-700" /> Suggested Action:
                      </span>
                      {item.suggestedNextAction}
                    </div>
                  </div>

                  {/* Theme tags */}
                  <div className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-stone-100">
                    {item.keyThemes?.map((t, idx) => (
                      <span
                        key={idx}
                        className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] text-stone-600 font-medium"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Clinical Disclaimer */}
      <div className="mt-12 rounded-xl bg-stone-100 p-4 text-center text-xs text-stone-500 border border-stone-200">
        <p>
          <span className="font-semibold text-stone-700">Notice:</span> AI Mood & Insight analytics are synthesized by Google Gemini for personal reflection, motivation, and subjective journaling assistance. They do not constitute medical or mental health diagnoses.
        </p>
      </div>

    </div>
  );
};
