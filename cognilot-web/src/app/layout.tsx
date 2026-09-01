import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

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
 * Injects modern dual-typography (Geist Sans + Geist Mono) and dark void foundation.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans bg-background text-foreground antialiased min-h-screen selection:bg-accent-violet/30 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
