import React from 'react';
import { Sparkles, BookOpen, BarChart3, ShieldCheck, LogOut, PlusCircle, History } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  activeTab: 'dashboard' | 'studio' | 'history' | 'insights';
  setActiveTab: (tab: 'dashboard' | 'studio' | 'history' | 'insights') => void;
  onNewSessionClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onNewSessionClick,
}) => {
  const { currentUser, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-stone-50/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        
        {/* Brand */}
        <div 
          onClick={() => setActiveTab('dashboard')}
          className="flex cursor-pointer items-center space-x-2.5 transition-opacity hover:opacity-90"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-700 text-amber-50 shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="font-serif text-lg font-semibold tracking-tight text-stone-900">
              Personal Gemini Journal
            </span>
            <span className="hidden text-xs font-medium text-amber-800/80 sm:inline-block ml-2 px-2 py-0.5 rounded-full bg-amber-100/60">
              Private & Encrypted
            </span>
          </div>
        </div>

        {/* Navigation Tabs (Only when authenticated) */}
        {currentUser && (
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              id="nav-tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-amber-100/80 text-amber-900 shadow-xs'
                  : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </button>

            <button
              id="nav-tab-studio"
              onClick={() => {
                if (onNewSessionClick) onNewSessionClick();
                setActiveTab('studio');
              }}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                activeTab === 'studio'
                  ? 'bg-amber-800 text-amber-50 shadow-xs'
                  : 'bg-amber-700/10 text-amber-900 hover:bg-amber-700/20'
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              <span>Write & Reflect</span>
            </button>

            <button
              id="nav-tab-history"
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-amber-100/80 text-amber-900 shadow-xs'
                  : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900'
              }`}
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Journal History</span>
            </button>

            <button
              id="nav-tab-insights"
              onClick={() => setActiveTab('insights')}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                activeTab === 'insights'
                  ? 'bg-amber-100/80 text-amber-900 shadow-xs'
                  : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">AI Mood & Insights</span>
            </button>
          </nav>
        )}

        {/* User Profile & Sign Out */}
        {currentUser && (
          <div className="flex items-center space-x-3">
            <div className="hidden items-center space-x-2 md:flex">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="h-8 w-8 rounded-full border border-stone-200 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 text-amber-900 text-xs font-bold">
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                </div>
              )}
              <div className="text-left leading-tight">
                <p className="text-xs font-semibold text-stone-800 truncate max-w-[120px]">
                  {currentUser.displayName || 'Member'}
                </p>
                <p className="text-[10px] text-stone-500 truncate max-w-[120px]">
                  {currentUser.email}
                </p>
              </div>
            </div>

            <button
              id="btn-logout"
              onClick={() => signOut()}
              title="Log out of journal"
              className="flex items-center space-x-1 rounded-lg border border-stone-300/80 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-100 hover:text-red-700"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
