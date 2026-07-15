'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

/**
 * Auth Page — Login & Sign Up.
 * Minimal terminal aesthetic with conventional UX for accessibility.
 * Client Component (uses browser-side Supabase client).
 */
export default function AuthPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/memory');
      }
    });
  }, [router, supabase.auth]);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
      router.replace('/memory');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/memory` },
    });
  };

  const openModal = (signUp: boolean) => {
    setIsSignUp(signUp);
    setShowModal(true);
    setEmail('');
    setPassword('');
    setError(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setEmail('');
    setPassword('');
    setError(null);
  };

  return (
    <main className="min-h-screen bg-background text-foreground overflow-hidden relative font-mono">
      {/* Ambient Background */}
      <div
        aria-hidden="true"
        className="fixed inset-0 overflow-hidden pointer-events-none select-none"
      >
        <div className="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full bg-violet-500/10 blur-[120px] animate-blob" />
        <div
          className="absolute -bottom-32 right-0 w-[400px] h-[400px] rounded-full bg-cyan-500/8 blur-[120px] animate-blob"
          style={{ animationDelay: '3s' }}
        />
      </div>

      {/* Content - centered */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 md:px-12 lg:px-20">
        <div className="w-full max-w-2xl">
          {/* Terminal Card - rectangular */}
          <div className="bg-white/[0.02] border border-white/8 rounded-lg overflow-hidden shadow-2xl">
            {/* Window Bar */}
            <div className="px-4 py-2.5 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
              <div className="flex gap-1.5 mr-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
              </div>
              <span className="font-mono text-white/25 text-[10px] uppercase tracking-widest flex-1 text-right">
                cognilot/auth
              </span>
            </div>

            {/* Card Content */}
            <div className="p-6">
              {/* Terminal Prompt - static, already executed */}
              <div className="mb-4 select-none">
                <div className="font-mono text-xs text-white">
                  <Link href="/" className="hover:text-white/80 transition-colors">
                    ~/cognilot
                  </Link>
                  <span className="text-accent-violet"> $</span>
                  <span className="text-ghost ml-2">auth</span>
                </div>
              </div>

              {/* ASCII Art - COGNILOT */}
              <div className="mb-5 select-none overflow-x-auto">
                <pre className="text-[9px] leading-[1.1] whitespace-pre text-white/8 inline-block">{`██████╗      ██████╗       ██████╗       ██╗  ██╗     ██╗  ██╗         ██████╗      ████████╗
██╔════╝     ██╔═══██╗     ██╔════╝      ██║  ██║     ██║  ██║         ██╔═══██╗    ╚══██╔══╝
██║          ██║   ██║     ██║  ███╗     ██║ ██╔╝     ██║  ██║         ██║   ██║       ██║
██║          ██║   ██║     ██║   ██║     █████╔╝      ██║  ██║         ██║   ██║       ██║
╚██████╗     ╚██████╔╝     ╚██████╔╝     ██╔═██╗      ╚██████╔╝       ╚██████╔╝       ██║
 ╚═════╝      ╚═════╝       ╚═════╝      ╚═╝ ╚═╝        ╚═════╝         ╚═════╝        ╚═╝`}</pre>
              </div>

              {/* Buttons */}
              <div className="flex flex-col items-start gap-3">
                {/* Google Button - Conventional Design */}
                <button
                  onClick={handleGoogle}
                  className="max-w-[280px] w-full py-2.5 px-5 bg-white hover:bg-gray-100 text-black rounded-lg font-sans font-semibold text-sm transition-colors flex items-center justify-center gap-3 shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 w-full max-w-[280px]">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-white/20 text-xs font-sans">or</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Email Button - Script Style */}
                <button
                  onClick={() => openModal(false)}
                  className="max-w-[280px] w-full py-2.5 px-5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors flex items-center gap-3 border border-white/10 group"
                >
                  <span className="text-accent-violet font-bold opacity-60 group-hover:opacity-100 transition-opacity">
                    &gt;
                  </span>
                  <span className="text-ghost group-hover:text-white transition-colors text-sm font-sans">
                    Continue with Email
                  </span>
                </button>
              </div>

              {/* Footer - Terms + Circuit Line */}
              <div className="mt-5 flex items-end justify-between gap-4">
                <p className="text-white/25 text-[10px] leading-relaxed font-sans">
                  By continuing, you agree to our{' '}
                  <a
                    href="/terms"
                    className="text-accent-violet hover:text-accent-violet/80 transition-colors"
                  >
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a
                    href="/privacy"
                    className="text-accent-violet hover:text-accent-violet/80 transition-colors"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>

                {/* Circuit Line - decorative */}
                <div className="hidden sm:block w-16 h-12 pointer-events-none select-none shrink-0">
                  <svg className="w-full h-full overflow-visible opacity-30 text-white/20">
                    <path
                      d="M 64,0 L 44,20 L 44,50"
                      fill="none"
                      stroke="var(--color-accent-violet)"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx="44"
                      cy="30"
                      r="2"
                      className="fill-background stroke-accent-violet"
                      strokeWidth="1.5"
                    />
                    <circle cx="64" cy="0" r="2.5" className="fill-accent-violet" />
                    <circle cx="44" cy="50" r="2.5" className="fill-accent-violet" />
                    <path
                      d="M 64,25 L 24,45 L 24,65"
                      fill="none"
                      stroke="var(--color-accent-cyan)"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    <rect
                      x="22"
                      y="42"
                      width="4"
                      height="4"
                      className="fill-background stroke-accent-cyan"
                      strokeWidth="1.5"
                      transform="rotate(45 24 44)"
                    />
                    <circle cx="64" cy="25" r="2.5" className="fill-accent-cyan" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Modal - Conventional Design */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />

          {/* Modal */}
          <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <h2 className="text-white font-sans font-semibold text-base">
                {isSignUp ? 'Create Account' : 'Sign In'}
              </h2>
              <button
                onClick={closeModal}
                className="text-white/30 hover:text-white transition-colors p-1"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Email */}
              <div>
                <label
                  htmlFor="modal-email"
                  className="block text-white/60 text-sm font-sans mb-1.5"
                >
                  Email
                </label>
                <input
                  id="modal-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-sans
                             placeholder:text-white/20 focus:outline-none focus:border-accent-violet/50 transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="modal-password"
                  className="block text-white/60 text-sm font-sans mb-1.5"
                >
                  Password
                </label>
                <input
                  id="modal-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-sans
                             placeholder:text-white/20 focus:outline-none focus:border-accent-violet/50 transition-colors"
                  placeholder="••••••••"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-4 py-2.5 rounded-lg font-sans">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-5 bg-accent-violet hover:bg-accent-violet/90 text-white rounded-lg font-sans font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-white/5 text-center">
              <p className="text-white/40 text-sm font-sans">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-accent-violet hover:text-accent-violet/80 transition-colors font-medium"
                >
                  {isSignUp ? 'Sign In' : 'Create Account'}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
