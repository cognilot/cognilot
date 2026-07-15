import type { Metadata } from 'next';
import { MarketingNav } from '@/components/layout/MarketingNav';
import { MarketingFooter } from '@/components/layout/MarketingFooter';

export const metadata: Metadata = {
  title: 'Cognilot — Smart AI Form Autofill',
  description:
    'The browser extension that learns your professional profile and fills forms automatically. Stop re-typing. Start doing.',
};

/**
 * Marketing layout — wraps all public-facing pages.
 * These pages are publicly accessible (no auth required).
 * Server Components by default for optimal SEO.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground overflow-hidden relative font-mono">
      {/* Ambient Background */}
      <div
        aria-hidden="true"
        className="fixed inset-0 overflow-hidden pointer-events-none select-none"
      >
        <div className="absolute -top-48 -left-48 w-[600px] h-[600px] rounded-full bg-violet-500/10 blur-[120px] animate-blob" />
        <div
          className="absolute -bottom-32 right-0 w-[500px] h-[500px] rounded-full bg-cyan-500/8 blur-[120px] animate-blob"
          style={{ animationDelay: '3s' }}
        />
      </div>

      {/* Global Spines */}
      <div
        className="fixed inset-y-0 left-6 md:left-12 lg:left-20 w-px bg-white/10 pointer-events-none select-none z-0"
        aria-hidden="true"
      />
      <div
        className="fixed inset-y-0 right-6 md:right-12 lg:right-20 w-px bg-white/10 pointer-events-none select-none z-0"
        aria-hidden="true"
      />

      <MarketingNav />

      {children}

      <MarketingFooter />
    </main>
  );
}
