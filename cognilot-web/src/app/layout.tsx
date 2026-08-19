import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cognilot — AI-Powered Form Autofill',
  description:
    'Cognilot learns your professional profile and automatically fills web forms with AI-powered precision. Boost your productivity with intelligent autofill.',
  keywords: ['AI autofill', 'form automation', 'productivity', 'browser extension'],
  openGraph: {
    title: 'Cognilot — AI-Powered Form Autofill',
    description: 'Stop re-typing your info. Let Cognilot handle it.',
    type: 'website',
  },
};

/**
 * Root layout — applied to all routes in the app.
 * Wraps everything with the dark design system globals.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-mono bg-background text-foreground antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
