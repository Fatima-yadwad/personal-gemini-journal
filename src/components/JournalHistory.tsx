import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { JournalSession } from '../types';
import { History, Search, Calendar, MessageSquare, Trash2, ArrowRight, Sparkles, Filter } from 'lucide-react';
import { formatFirestoreError } from '../lib/firestore-utils';

interface JournalHistoryProps {
  onSelectSession: (session: JournalSession) => void;
  onNewSession: () => void;
}

export const JournalHistory: React.FC<JournalHistoryProps> = ({
  onSelectSession,
  onNewSession,
}) => {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // Strict Owner Path Query: /users/{userId}/sessions
    const sessionsRef = collection(db, 'users', currentUser.uid, 'sessions');
    const q = query(sessionsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: JournalSession[] = [];
        snapshot.forEach((docSnap) => {
          fetched.push(docSnap.data() as JournalSession);
        });
        setSessions(fetched);
        setLoading(false);
      },
      (error) => {
        console.error('Firestore snapshot error on sessions:', error);
        setErrorMessage(formatFirestoreError(error));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!currentUser) return;
    if (!window.confirm('Are you sure you want to delete this journal session?')) return;

    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'sessions', sessionId));
    } catch (err: any) {
      console.error('Delete session error:', err);
      setErrorMessage(formatFirestoreError(err));
    }
  };

  const filteredSessions = sessions.filter((s) => {
    const queryLower = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(queryLower) ||
      (s.summary && s.summary.toLowerCase().includes(queryLower)) ||
      (s.latestInsight?.mood && s.latestInsight.mood.toLowerCase().includes(queryLower))
    );
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-5">
        <div>
          <h2 className="font-serif text-3xl font-normal text-stone-900 flex items-center">
            <History className="h-7 w-7 mr-2.5 text-amber-800" />
            Journal History
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Your private chronicle of thoughts and Gemini conversations. Isolated to your account.
          </p>
        </div>

        <button
          id="btn-history-new-entry"
          onClick={onNewSession}
          className="flex items-center space-x-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-stone-800 transition active:scale-95"
        >
          <span>New Journal Entry</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200">
          {errorMessage}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="mt-6 flex items-center rounded-xl border border-stone-300 bg-white px-3 py-2 shadow-2xs focus-within:border-amber-700">
        <Search className="h-4 w-4 text-stone-400 mr-2" />
        <input
          id="input-history-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by reflection title, thoughts, or mood tag..."
          className="w-full text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden bg-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-stone-400 hover:text-stone-700 font-semibold px-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Session Cards List */}
      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-stone-400">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-amber-800 mb-2"></div>
            <p>Loading your private journal archive...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/60 p-10 text-center">
            <History className="mx-auto h-8 w-8 text-stone-400 mb-2" />
            <h3 className="font-serif text-base font-medium text-stone-800">
              {searchQuery ? 'No matching reflections found' : 'No journal sessions recorded yet'}
            </h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'Try a different search term or clear the filter.'
                : 'Start writing your very first reflection and converse with Gemini.'}
            </p>
            {!searchQuery && (
              <button
                onClick={onNewSession}
                className="mt-4 rounded-xl bg-amber-800 px-4 py-2 text-xs font-medium text-white hover:bg-amber-900"
              >
                Create First Entry
              </button>
            )}
          </div>
        ) : (
          filteredSessions.map((session) => {
            const dateObj = new Date(session.createdAt);
            const formattedDate = dateObj.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const formattedTime = dateObj.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session)}
                className="group relative cursor-pointer rounded-2xl border border-stone-200 bg-white p-5 shadow-xs transition hover:border-amber-700/60 hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-serif text-lg font-medium text-stone-900 group-hover:text-amber-900 transition">
                        {session.title || 'Untitled Reflection'}
                      </h3>
                      {session.latestInsight && (
                        <span className="inline-flex items-center rounded-full bg-amber-100/80 px-2.5 py-0.5 text-[10px] font-medium text-amber-900 border border-amber-200">
                          <Sparkles className="h-2.5 w-2.5 mr-1 text-amber-700" />
                          {session.latestInsight.mood}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center space-x-4 text-xs text-stone-500">
                      <span className="flex items-center">
                        <Calendar className="h-3.5 w-3.5 mr-1 text-stone-400" />
                        {formattedDate} at {formattedTime}
                      </span>
                      <span className="flex items-center">
                        <MessageSquare className="h-3.5 w-3.5 mr-1 text-stone-400" />
                        {session.messages?.length || 0} message turns
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-stone-600 line-clamp-2 leading-relaxed">
                      {session.summary || session.promptTopic || 'No summary available.'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    <button
                      onClick={(e) => handleDelete(e, session.id)}
                      title="Delete entry"
                      className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-stone-700 group-hover:bg-amber-800 group-hover:text-white transition">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
