import type { Metadata } from 'next';

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
  return <>{children}</>;
}
