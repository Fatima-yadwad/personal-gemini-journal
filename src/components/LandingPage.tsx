import React from 'react';
import { Sparkles, Shield, Lock, BrainCircuit, LineChart, HeartHandshake, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LandingPage: React.FC = () => {
  const { signInWithGoogle, authError } = useAuth();
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch (e) {
      console.log('Login cancelled or blocked');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-stone-50 text-stone-900">
      {/* Hero Section */}
      <div className="mx-auto max-w-5xl px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:px-8 text-center">
        
        {/* Badge */}
        <div className="inline-flex items-center space-x-2 rounded-full border border-amber-300/80 bg-amber-100/60 px-3.5 py-1 text-xs font-medium text-amber-900 shadow-xs mb-6">
          <Sparkles className="h-3.5 w-3.5 text-amber-700" />
          <span>Intelligent Reflection • Strict Data Privacy • Cloud Firestore</span>
        </div>

        {/* Headline */}
        <h1 className="font-serif text-4xl font-normal tracking-tight text-stone-900 sm:text-5xl md:text-6xl max-w-3xl mx-auto leading-[1.15]">
          A private sanctuary for your <span className="italic text-amber-800 underline decoration-amber-300/80 underline-offset-8">inner thoughts</span> and ideas.
        </h1>

        {/* Subhead */}
        <p className="mt-6 text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
          Reflect freely with an AI thought partner powered by Google Gemini. Explore perspectives, brainstorm solutions, and track your emotional clarity over time in a secure, owner-isolated journal.
        </p>

        {/* Error Notification */}
        {authError && (
          <div className="mt-4 mx-auto max-w-md rounded-xl bg-red-50 p-3 text-sm text-red-800 border border-red-200">
            {authError}
          </div>
        )}

        {/* CTA Button */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            id="btn-landing-google-signin"
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="flex items-center justify-center space-x-3 rounded-xl bg-stone-900 px-6 py-3.5 text-base font-medium text-white shadow-md hover:bg-stone-800 transition active:scale-[0.98] disabled:opacity-75"
          >
            {/* Google G Logo */}
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.41 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.98 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.59 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{isSigningIn ? 'Signing In...' : 'Sign In with Google'}</span>
            <ArrowRight className="h-4 w-4 ml-1 text-stone-400" />
          </button>
        </div>

        {/* Security Reassurance */}
        <div className="mt-4 flex items-center justify-center space-x-6 text-xs text-stone-500">
          <span className="flex items-center">
            <Lock className="h-3.5 w-3.5 mr-1.5 text-stone-400" />
            No Passwords Stored
          </span>
          <span className="flex items-center">
            <Shield className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
            Owner-Isolated Firestore
          </span>
        </div>
      </div>

      {/* Feature Pillar Grid */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 border-t border-stone-200">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          
          {/* Card 1 */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs transition hover:shadow-md">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800 mb-4">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-stone-900 font-serif">Multi-Turn Reflection</h2>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              Engage in multi-turn dialogues with Gemini. Untangle complex thoughts, brainstorm solutions, and receive empathetic, grounding reflections without judgment.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs transition hover:shadow-md">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800 mb-4">
              <LineChart className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-stone-900 font-serif">AI Mood & Insights Dashboard</h2>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              Extract key themes, emotional mood trends, meaningful insights, and suggested daily micro-actions automatically. See your personal growth evolution over time.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs transition hover:shadow-md">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800 mb-4">
              <Shield className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-stone-900 font-serif">Zero-Trust Isolation</h2>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              Built on strict Cloud Firestore Security Rules. Every session is linked directly to your authenticated UID. Nobody else can ever read or modify your reflections.
            </p>
          </div>

        </div>

        {/* Disclaimer Banner */}
        <div className="mt-12 rounded-xl bg-stone-100/80 border border-stone-200 p-4 text-xs text-stone-600 text-center max-w-2xl mx-auto">
          <p>
            <span className="font-semibold text-stone-800">Mindful Reflection Notice:</span> This application and its AI insights are designed purely for personal reflection, creativity, and self-organization. It does not provide medical or clinical advice.
          </p>
        </div>
      </div>
    </div>
  );
};
