'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { Compass, Database, Sparkles, Settings, CreditCard, LogOut } from 'lucide-react';

const supabase = createBrowserClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''
);

/**
 * Dashboard Layout — Client Component.
 *
 * Responsibilities:
 * 1. Auth guard: redirects to /auth if no active session.
 * 2. Renders a fixed 100vh modern sidebar navigation.
 * 3. Injects ambient lighting background.
 * 4. Ensures independent content scrolling without sidebar stretching.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
        import('../../utils/extensionBridge').then((m) => m.extensionBridge.clearTokens());
        router.replace('/auth');
      } else if (session?.user) {
        setUser(session.user);
      }
    });

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const {
          data: { session },
        } = await supabase.auth.getSession();
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
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { href: '/welcome', label: 'Welcome', icon: Compass, hint: 'Getting started' },
    { href: '/memory', label: 'Memory', icon: Database, hint: 'Learned profile' },
    { href: '/playground', label: 'Playground', icon: Sparkles, hint: 'Skills & prompts' },
    { href: '/settings', label: 'Settings', icon: Settings, hint: 'BYOK & preferences' },
    { href: '/plan', label: 'Plan & Billing', icon: CreditCard, hint: 'Usage limits' },
  ];

  if (loading) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-white/40 text-sm font-sans">
          <span className="w-2 h-2 rounded-full bg-accent-violet animate-pulse" />
          <span>Loading session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground flex">
      {/* Ambient background blobs */}
      <div
        aria-hidden="true"
        className="fixed inset-0 overflow-hidden pointer-events-none select-none z-0"
      >
        <div className="absolute -top-48 -left-48 w-[600px] h-[600px] rounded-full bg-violet-500/8 blur-[120px] animate-blob" />
        <div
          className="absolute -bottom-32 right-0 w-[500px] h-[500px] rounded-full bg-cyan-500/6 blur-[120px] animate-blob"
          style={{ animationDelay: '3s' }}
        />
      </div>

      {/* ── Fixed Sidebar ─────────────────────────────────────────────────── */}
      <aside className="relative z-20 w-64 h-full border-r border-white/10 bg-surface/50 backdrop-blur-xl flex flex-col justify-between py-6 shrink-0 select-none">
        <div>
          {/* Logo */}
          <div className="px-6 mb-8">
            <Link
              href="/home"
              className="font-mono text-lg font-bold text-white hover:opacity-80 transition-opacity"
            >
              &gt; cognilot_
            </Link>
            <div className="text-white/30 text-[11px] font-mono tracking-wider mt-1">
              v2.0.0-alpha
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-sans transition-all ${
                    isActive
                      ? 'bg-white/10 text-white font-semibold shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-accent-cyan' : 'text-white/40 group-hover:text-white/80'
                    }`}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate leading-tight">{item.label}</span>
                    <span
                      className={`text-[11px] font-normal leading-none mt-0.5 truncate transition-colors ${
                        isActive ? 'text-white/50' : 'text-white/30 group-hover:text-white/40'
                      }`}
                    >
                      {item.hint}
                    </span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="px-4 border-t border-white/10 pt-4">
          {user && (
            <div className="mb-3 px-2">
              <div className="text-white/80 text-xs font-sans font-medium truncate">
                {user.email}
              </div>
              <div className="text-white/30 text-[10px] font-mono uppercase tracking-wider mt-0.5">
                {user.app_metadata?.provider ?? 'email'}
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-sans transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400/70" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Scrollable Content ────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 h-full overflow-y-auto">{children}</main>
    </div>
  );
}
