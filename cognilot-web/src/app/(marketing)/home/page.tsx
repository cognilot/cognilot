import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FeatureShowcaseLoader } from './FeatureShowcaseLoader';

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
    <>
      {/* Hero */}
      <section className="relative z-10 w-full px-6 md:px-12 lg:px-20 pt-32 pb-40 flex flex-col justify-center min-h-[80vh]">
        {/* Right Side: Colorful Git-Graph / Circuit Line */}
        <div
          className="absolute inset-y-0 right-6 md:right-12 lg:right-20 w-32 pointer-events-none select-none"
          aria-hidden="true"
        >
          <svg className="w-full h-full overflow-visible opacity-30 text-white/20">
            {/* Git Branch 1 (Violet) - Extending leftward */}
            <path
              d="M 128,96 L 108,116 L 108,320 L 128,340"
              fill="none"
              stroke="var(--color-accent-violet)"
              strokeWidth="1.5"
            />
            {/* Circle Nodes on Branch 1 */}
            <circle
              cx="108"
              cy="180"
              r="3"
              className="fill-background stroke-accent-violet"
              strokeWidth="1.5"
            />
            <circle
              cx="108"
              cy="250"
              r="3"
              className="fill-background stroke-accent-violet"
              strokeWidth="1.5"
            />

            {/* Git Branch 2 (Cyan - Dashed) - Extending further leftward */}
            <path
              d="M 128,200 L 88,240 L 88,420"
              fill="none"
              stroke="var(--color-accent-cyan)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            {/* Diamond Node on Branch 2 */}
            <rect
              x="85"
              y="300"
              width="6"
              height="6"
              className="fill-background stroke-accent-cyan"
              strokeWidth="1.5"
              transform="rotate(45 88 303)"
            />

            {/* Junction Dots on Main Trunk */}
            <circle cx="128" cy="96" r="3.5" className="fill-accent-violet" />
            <circle cx="128" cy="200" r="3.5" className="fill-accent-cyan" />
            <circle cx="128" cy="340" r="3.5" className="fill-accent-violet" />
          </svg>
        </div>

        {/* Content Container (Padded equally inside spines) */}
        <div className="relative px-10 md:px-20">
          {/* Release Tag */}
          <div className="inline-flex items-center gap-2 text-ghost text-xs font-mono mb-12 select-none">
            <span className="w-2 h-2 rounded-full bg-accent-violet animate-pulse shadow-[0_0_8px_var(--color-accent-violet)]" />
            <span>Beta abierta v0.6.5</span>
          </div>

          {/* Massive Typography Headline */}
          <h1
            className="font-mono font-bold leading-[0.9] tracking-tighter text-white select-none
                         text-[11vw] sm:text-[9vw] md:text-[8vw] lg:text-[7.5vw] xl:text-[7vw]"
          >
            STOP RE-TYPING.
            <br />
            LET AI <span className="text-accent-violet animate-pulse">*</span> FILL
            <br />
            IT<span className="text-accent-cyan animate-pulse">_</span>
          </h1>

          {/* Subtext and CTAs */}
          <div className="mt-16 md:mt-24 grid md:grid-cols-12 gap-8 items-end">
            {/* Subtext as comments */}
            <div className="md:col-span-6 font-mono text-[13px] leading-relaxed text-white/40 italic select-none whitespace-pre-wrap">
              {`/**\n * cognilot learns your personal data and preferences\n * and autofills web forms with ai-powered precision.\n */`}
            </div>

            {/* Action scripts */}
            <div className="md:col-span-6 flex flex-wrap gap-4 md:justify-end items-center">
              <Button variant="terminal" size="lg" asChild>
                <Link href="/auth?mode=signup">
                  <span className="text-accent-violet opacity-60 group-hover:opacity-100 transition-opacity font-bold">
                    &gt;
                  </span>
                  ./get_started.sh
                </Link>
              </Button>
              <a
                href="https://chromewebstore.google.com"
                className="h-[52px] px-6 bg-white hover:bg-white/80 border border-white/10 text-black rounded transition-colors
                           flex items-center justify-center gap-3 font-mono shadow-sm group"
              >
                <svg
                  className="w-10 h-10 flex-shrink-0"
                  viewBox="0 0 256 256"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M128,51.2a76.8,76.8,0,1,0,76.8,76.8A76.8,76.8,0,0,0,128,51.2Zm0,122.88a46.08,46.08,0,1,1,46.08-46.08A46.08,46.08,0,0,1,128,174.08Z"
                    fill="#4285f4"
                  />
                  <path
                    d="M128,51.2c-31.57,0-58.88,18.43-71.17,44.54L91.2,156.42C94.46,141.57,109.82,130.56,128,130.56h76.8C204.8,92.67,170.5,51.2,128,51.2Z"
                    fill="#34a853"
                  />
                  <path
                    d="M204.8,128c0,32.77-21.5,60.67-51.71,72.45L118.53,139.9A46.08,46.08,0,0,1,128,130.56h76.8Z"
                    fill="#fbbc04"
                  />
                  <path
                    d="M56.83,95.74A76.8,76.8,0,0,0,51.2,128c0,42.5,34.3,76.8,76.8,76.8,13.82,0,26.62-3.84,37.38-10.24L130.82,134.14c-11.78,6.91-27.14,4.61-36.35-4.61s-11.52-24.57-4.61-36.35Z"
                    fill="#ea4335"
                  />
                  <circle cx="128" cy="128" r="46.08" fill="#4285f4" />
                </svg>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-black/40 leading-none mb-1 group-hover:text-black/60 transition-colors font-sans">
                    Available in the
                  </span>
                  <span className="text-xs font-bold text-black leading-none font-mono">
                    Chrome Web Store
                  </span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations bar */}
      <section className="relative z-10 border-y border-border-subtle py-8 px-6 md:px-12 lg:px-20 w-full">
        {/* Intersection Vertical Diamonds */}
        <div
          className="absolute left-6 md:left-12 lg:left-20 top-0 bottom-0 w-px pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-background border border-white/30 rotate-45" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 bg-background border border-white/30 rotate-45" />
        </div>
        <div
          className="absolute right-6 md:right-12 lg:right-20 top-0 bottom-0 w-px pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-background border border-white/30 rotate-45" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 bg-background border border-white/30 rotate-45" />
        </div>

        <div className="relative px-10 md:px-20 flex flex-col sm:flex-row sm:items-center justify-between gap-6 select-none">
          <div className="font-mono text-[11px] uppercase tracking-widest text-ghost">coverage</div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-[12px] font-mono text-dim font-medium">
            <span className="hover:text-white transition-colors cursor-default">
              12+ field types
            </span>
            <span className="text-white/10">|</span>
            <span className="hover:text-white transition-colors cursor-default">
              30+ form patterns
            </span>
            <span className="text-white/10">|</span>
            <span className="hover:text-white transition-colors cursor-default">99.9% uptime</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 w-full px-6 md:px-12 lg:px-20 py-36">
        {/* Right Side: Features Circuit SVG */}
        <div
          className="absolute inset-y-0 right-6 md:right-12 lg:right-20 w-32 pointer-events-none select-none"
          aria-hidden="true"
        >
          <svg className="w-full h-full overflow-visible opacity-30 text-white/20">
            {/* Git Branch 1 (Violet) - Extending leftward */}
            <path
              d="M 128,100 L 108,120 L 108,250"
              fill="none"
              stroke="var(--color-accent-violet)"
              strokeWidth="1.5"
            />
            <circle
              cx="108"
              cy="250"
              r="3"
              className="fill-background stroke-accent-violet"
              strokeWidth="1.5"
            />
            <circle cx="128" cy="100" r="3.5" className="fill-accent-violet" />
          </svg>
        </div>

        <div className="relative px-10 md:px-20">
          {/* Massive header */}
          <h2
            className="font-mono font-bold leading-none tracking-tighter text-white mb-20 select-none
                         text-[8vw] sm:text-[6vw] md:text-[5vw] lg:text-[4.5vw]"
          >
            CORE_CAPABILITIES
            <span className="text-accent-violet">/</span>
            <span className="text-accent-cyan">/</span>
          </h2>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-8 h-8"
                  >
                    <polygon points="13,2 4,14 12,14 11,22 20,10 12,10" />
                  </svg>
                ),
                title: 'instant autofill',
                desc: 'Detects form fields and fills them in milliseconds using your learned profile.',
                colorClass: 'border-accent-cyan',
              },
              {
                icon: (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-8 h-8"
                  >
                    <circle cx="12" cy="4" r="2" />
                    <circle cx="4" cy="20" r="2" />
                    <circle cx="20" cy="20" r="2" />
                    <path d="M10.5 5.5 5.5 18.5" />
                    <path d="M13.5 5.5 18.5 18.5" />
                    <line x1="6" y1="20" x2="18" y2="20" />
                  </svg>
                ),
                title: 'continuous learning',
                desc: 'Gets smarter with every form you fill. Adapts to your style over time.',
                colorClass: 'border-accent-violet',
              },
              {
                icon: (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-8 h-8"
                  >
                    <rect x="5" y="11" width="14" height="10" rx="1.5" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    <circle cx="12" cy="15.5" r="1" />
                  </svg>
                ),
                title: 'privacy first',
                desc: 'Your data stays encrypted. We never sell or share your profile.',
                colorClass: 'border-success',
              },
            ].map((f) => (
              <div
                key={f.title}
                className={`p-8 bg-surface border-t-2 ${f.colorClass} border-x border-b border-white/5 rounded transition-all hover:bg-white/5 duration-300 group`}
              >
                <div className="mb-6 text-accent-violet">{f.icon}</div>
                <h3 className="font-mono text-white font-bold text-base mb-4 flex items-center gap-2">
                  {f.title}
                </h3>
                <p className="font-mono text-dim text-[13px] leading-relaxed select-none">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* How it Works — Feature Showcase */}
      <section className="relative z-10 w-full px-6 md:px-12 lg:px-20 py-36">
        {/* Flat top divider with diamond nodes */}
        <div
          className="absolute top-0 left-0 right-0 border-t border-white/5 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute left-6 md:left-12 lg:left-20 top-0 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-background border border-white/30 rotate-45" />
          <div className="absolute right-6 md:right-12 lg:right-20 top-0 translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-background border border-white/30 rotate-45" />
        </div>

        <div className="relative px-10 md:px-20">
          {/* Section heading */}
          <h2
            className="font-mono font-bold leading-none tracking-tighter text-white mb-16 select-none
                         text-[8vw] sm:text-[6vw] md:text-[5vw] lg:text-[4.5vw]"
          >
            HOW_IT_WORKS
            <span className="text-accent-violet">/</span>
            <span className="text-accent-cyan">/</span>
          </h2>

          <FeatureShowcaseLoader />
        </div>
      </section>
    </>
  );
}
