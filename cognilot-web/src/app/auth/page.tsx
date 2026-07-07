'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

/**
 * Auth Page — Login & Sign Up.
 * Client Component (uses browser-side Supabase client).
 */
export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard/memory');
      }
    });
  }, [router, supabase.auth]);

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
      router.replace('/dashboard/memory');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard/memory` },
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full bg-violet-500/10 blur-[120px] animate-blob" />
        <div
          className="absolute -bottom-32 right-0 w-[400px] h-[400px] rounded-full bg-cyan-500/8 blur-[120px] animate-blob"
          style={{ animationDelay: '3s' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden shadow-2xl">
          {/* Window Bar */}
          <div className="px-5 py-4 border-b border-white/5 bg-white/3 flex items-center gap-2">
            <div className="flex gap-2 mr-4">
              <div className="w-3 h-3 rounded-full bg-red-500/70 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70 shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
              <div className="w-3 h-3 rounded-full bg-green-500/70 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            </div>
            <span className="font-mono text-white/30 text-xs uppercase tracking-widest flex-1 text-right">
              {isSignUp ? 'auth/signup.sh' : 'auth/signin.sh'}
            </span>
          </div>

          <div className="p-8 font-mono">
            <h1 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <span className="text-violet-400">#</span>
              {isSignUp ? 'create_account' : 'sign_in'}
            </h1>
            <p className="text-white/30 text-xs mb-8">{'// Cognilot authentication'}</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="flex relative items-center hover:bg-white/4 -mx-4 px-4 rounded transition-colors py-1 group">
                <label className="text-violet-400 select-none w-[80px] shrink-0 text-sm font-semibold">
                  email<span className="text-violet-400/50">:</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-transparent text-white flex-1 py-1.5 min-w-0 placeholder:text-white/10 focus:bg-white/4 rounded px-2 -mx-2 transition-colors outline-none text-sm"
                  placeholder="you@example.com"
                />
              </div>

              {/* Password */}
              <div className="flex relative items-center hover:bg-white/4 -mx-4 px-4 rounded transition-colors py-1 group">
                <label className="text-violet-400 select-none w-[80px] shrink-0 text-sm font-semibold">
                  password<span className="text-violet-400/50">:</span>
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-transparent text-white flex-1 py-1.5 min-w-0 placeholder:text-white/10 focus:bg-white/4 rounded px-2 -mx-2 transition-colors outline-none text-sm"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded">
                  {'// error: '}
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors flex items-center gap-2 border border-white/10 group disabled:opacity-50"
              >
                <span className="text-violet-400 font-bold opacity-50 group-hover:opacity-100 transition-opacity">
                  &gt;
                </span>
                {loading
                  ? './authenticating...'
                  : isSignUp
                    ? './create_account.sh'
                    : './sign_in.sh'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-white/20 text-xs">// or</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            {/* Google */}
            <button
              onClick={handleGoogle}
              className="w-full py-2.5 px-5 bg-white text-black rounded-lg font-sans font-semibold text-sm hover:bg-white/90 transition-opacity flex items-center justify-center gap-2"
            >
              Continue with Google
            </button>

            {/* Toggle */}
            <p className="text-center text-white/30 text-xs mt-6">
              {isSignUp ? '// already have an account? ' : '// new here? '}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {isSignUp ? '[sign_in]' : '[create_account]'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
