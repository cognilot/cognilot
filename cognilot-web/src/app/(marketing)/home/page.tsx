import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cognilot — AI-Powered Form Autofill',
  description:
    'The browser extension that learns your professional profile and fills forms automatically. Stop re-typing. Start doing.',
};

/**
 * Landing Page — Public-facing marketing page.
 * Server Component: Renders on the server for maximum SEO performance.
 */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground overflow-hidden relative">
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

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-6xl mx-auto">
        <div className="font-mono text-white font-bold text-lg">
          <span className="text-violet-400">&gt;</span> <span>cognilot</span>
          <span className="text-cyan-400">_</span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/auth"
            className="font-mono text-sm text-white/60 hover:text-white transition-colors"
          >
            sign_in
          </Link>
          <Link
            href="/auth?mode=signup"
            className="font-mono text-sm px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors"
          >
            [GET STARTED]
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 pt-24 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-mono mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          v2.0 — Now with Adaptive AI Inference
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
          Stop re-typing.{' '}
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Let AI fill it.
          </span>
        </h1>

        <p className="text-xl text-white/50 font-mono max-w-2xl mx-auto mb-12 leading-relaxed">
          {'// Cognilot learns your professional profile and'}
          <br />
          {'// autofills web forms with AI-powered precision.'}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth?mode=signup"
            className="px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-mono font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/25"
          >
            {'> ./get_started.sh'}
          </Link>
          <a
            href="https://chromewebstore.google.com"
            className="px-8 py-4 bg-white/5 border border-white/10 text-white font-mono rounded-xl hover:bg-white/10 transition-colors"
          >
            [ADD TO CHROME]
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 pb-32">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: '⚡',
              title: 'instant_autofill',
              desc: '// Detects form fields and fills them in milliseconds using your learned profile.',
            },
            {
              icon: '🧠',
              title: 'continuous_learning',
              desc: '// Gets smarter with every form you fill. Adapts to your style over time.',
            },
            {
              icon: '🔒',
              title: 'privacy_first',
              desc: '// Your data stays encrypted. We never sell or share your profile.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="p-6 bg-white/3 border border-white/8 rounded-xl hover:border-white/15 transition-colors"
            >
              <div className="text-2xl mb-4">{f.icon}</div>
              <h3 className="font-mono text-white font-semibold mb-2">
                <span className="text-violet-400">{'>'}</span> {f.title}
              </h3>
              <p className="font-mono text-white/40 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
