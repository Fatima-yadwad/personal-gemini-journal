import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { PrivateDashboard } from './components/PrivateDashboard';
import { JournalStudio } from './components/JournalStudio';
import { JournalHistory } from './components/JournalHistory';
import { MoodDashboard } from './components/MoodDashboard';
import { JournalSession } from './types';
import { checkServerHealth } from './lib/gemini-client';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

function AppContent() {
  const { currentUser, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'studio' | 'history' | 'insights'>('dashboard');
  const [selectedSession, setSelectedSession] = useState<JournalSession | null>(null);
  const [serverHealth, setServerHealth] = useState<{ status: string; geminiConfigured: boolean } | null>(null);

  useEffect(() => {
    checkServerHealth().then(setServerHealth).catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 text-stone-600">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-amber-800"></div>
          <p className="mt-3 font-serif text-sm font-medium text-stone-800">Opening your private journal...</p>
        </div>
      </div>
    );
  }

  // Non-authenticated user view: Landing Page
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 selection:bg-amber-200 selection:text-amber-900 font-sans">
        <Navbar activeTab="dashboard" setActiveTab={() => {}} />
        <main>
          <LandingPage />
        </main>
      </div>
    );
  }

  // Authenticated user private views
  return (
    <div className="min-h-screen bg-stone-50/90 text-stone-900 selection:bg-amber-200 selection:text-amber-900 font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewSessionClick={() => {
          setSelectedSession(null);
          setActiveTab('studio');
        }}
      />

      {/* API Key Missing Warning Banner (If not set) */}
      {serverHealth && !serverHealth.geminiConfigured && (
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-xs text-amber-900 text-center flex items-center justify-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
          <span>
            <strong>Gemini API Key Notice:</strong> Please configure <code className="bg-amber-200/80 px-1 py-0.5 rounded font-mono">GEMINI_API_KEY</code> in your environment or Settings Secrets panel.
          </span>
        </div>
      )}

      <main className="pb-16">
        {activeTab === 'dashboard' && (
          <PrivateDashboard
            onNewSession={() => {
              setSelectedSession(null);
              setActiveTab('studio');
            }}
            onSelectSession={(session) => {
              setSelectedSession(session);
              setActiveTab('studio');
            }}
            onNavigateToHistory={() => setActiveTab('history')}
            onNavigateToInsights={() => setActiveTab('insights')}
          />
        )}

        {activeTab === 'studio' && (
          <JournalStudio
            initialSession={selectedSession}
            onSessionSaved={(saved) => setSelectedSession(saved)}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'history' && (
          <JournalHistory
            onSelectSession={(session) => {
              setSelectedSession(session);
              setActiveTab('studio');
            }}
            onNewSession={() => {
              setSelectedSession(null);
              setActiveTab('studio');
            }}
          />
        )}

        {activeTab === 'insights' && (
          <MoodDashboard />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
