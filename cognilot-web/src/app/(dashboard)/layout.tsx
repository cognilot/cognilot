'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

/**
 * Dashboard Layout — Client Component.
 *
 * Responsibilities:
 * 1. Auth guard: redirects to /auth if no active session.
 * 2. Renders the IDE-style sidebar navigation.
 * 3. Injects the animated ambient background shared across all dashboard pages.
 * 4. Listens to SIGNED_OUT events and redirects immediately.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''
  );

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace('/auth');
        return;
      }
      
      setUser(session.user);
      
      // Fetch local user profile and sync with extension
      try {
        const { authService } = await import('../../services/auth.service');
        const { extensionBridge } = await import('../../utils/extensionBridge');
        const localUser = await authService.getCurrentUser(session.access_token);
        extensionBridge.syncTokens(session.access_token, session.refresh_token, localUser);
      } catch (error) {
        console.error('Failed to sync with extension:', error);
      }
      
      setLoading(false);
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        import('../../utils/extensionBridge').then(m => m.extensionBridge.clearTokens());
        router.replace('/auth');
      } else if (session?.user) {
        setUser(session.user);
      }
    });

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          try {
            const { authService } = await import('../../services/auth.service');
            const { extensionBridge } = await import('../../utils/extensionBridge');
            const localUser = await authService.getCurrentUser(session.access_token);
            extensionBridge.syncTokens(session.access_token, session.refresh_token, localUser);
          } catch (e) {
            // ignore
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { href: '/dashboard/memory', label: 'memory', hint: '// profile & learned data' },
    { href: '/dashboard/aliases', label: 'aliases', hint: '// shorthand mappings' },
    { href: '/dashboard/playground', label: 'playground', hint: '// skills & testing' },
    { href: '/dashboard/settings', label: 'settings', hint: '// BYOK & preferences' },
    { href: '/dashboard/plan', label: 'plan', hint: '// billing & usage' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="font-mono text-white/30 text-sm animate-pulse">// loading session...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Ambient background blobs */}
      <div
        aria-hidden="true"
        className="fixed inset-0 overflow-hidden pointer-events-none select-none"
      >
        <div className="absolute -top-48 -left-48 w-[600px] h-[600px] rounded-full bg-violet-500/8 blur-[120px] animate-blob" />
        <div
          className="absolute -bottom-32 right-0 w-[500px] h-[500px] rounded-full bg-cyan-500/6 blur-[120px] animate-blob"
          style={{ animationDelay: '3s' }}
        />
      </div>

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className="relative z-10 w-60 border-r border-white/5 bg-white/[0.02] flex flex-col py-6 shrink-0">
        {/* Logo */}
        <div className="px-5 mb-8">
          <Link
            href="/dashboard/memory"
            className="font-mono text-base font-bold text-white flex items-center gap-1 hover:opacity-80 transition-opacity"
          >
            <span className="text-violet-400">&gt;</span>
            <span> cognilot</span>
            <span className="text-cyan-400 animate-pulse">_</span>
          </Link>
          <div className="text-white/20 text-[10px] font-mono uppercase tracking-widest mt-1">
            // v2.0.0-alpha
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex flex-col px-3 py-2.5 rounded-lg font-mono text-sm transition-colors ${
                  isActive
                    ? 'bg-white/8 text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/4'
                }`}
              >
                <span className="flex items-center gap-2">
                  {isActive ? (
                    <span className="text-cyan-400 text-xs font-bold shrink-0">&gt;</span>
                  ) : (
                    <span className="w-3 shrink-0" />
                  )}
                  <span className={isActive ? 'text-white' : ''}>{item.label}</span>
                </span>
                {isActive && (
                  <span className="text-white/25 text-[10px] pl-5 mt-0.5 font-sans leading-none">
                    {item.hint}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 mt-4 border-t border-white/5 pt-4">
          {user && (
            <div className="mb-3">
              <div className="text-white/60 text-[11px] font-mono truncate">{user.email}</div>
              <div className="text-white/20 text-[10px] font-sans uppercase tracking-wider mt-0.5">
                {user.app_metadata?.provider ?? 'email'}
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="text-white/30 hover:text-red-400 font-mono text-xs transition-colors flex items-center gap-1.5"
          >
            <span className="text-red-500/50">&gt;</span>
            ./sign_out.sh
          </button>
        </div>
      </aside>

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 overflow-auto">{children}</main>
    </div>
  );
}
