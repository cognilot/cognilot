import Link from 'next/link';

export function MarketingFooter() {
  return (
    <footer className="relative z-10 w-full px-6 md:px-12 lg:px-20 border-t border-white/10 pt-20 pb-12 mt-20 bg-background overflow-hidden">
      {/* Top Section: Slogan & Navigation Columns (Antigravity & Google Labs inspired) */}
      <div className="relative px-10 md:px-20 flex flex-col lg:flex-row items-start justify-between gap-12 mb-20">
        {/* Left Headline */}
        <div className="flex flex-col items-start gap-4 max-w-md">
          <h3 className="font-sans text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Autofill with zero friction.
          </h3>
          <p className="font-sans text-sm text-dim leading-relaxed">
            Cognilot continuously learns your professional context to automatically map and fill
            forms across the web with AI precision.
          </p>
        </div>

        {/* Right Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-10 sm:gap-16">
          {/* Column 1: Product */}
          <div className="flex flex-col gap-3 font-sans">
            <span className="text-xs font-semibold uppercase tracking-wider text-white">
              Product
            </span>
            <Link
              href="/auth?mode=signup"
              className="text-sm text-dim hover:text-white transition-colors"
            >
              Get Started
            </Link>
            <a
              href="https://chromewebstore.google.com"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-dim hover:text-white transition-colors"
            >
              Chrome Extension
            </a>
            <Link href="/plan" className="text-sm text-dim hover:text-white transition-colors">
              Pricing Plans
            </Link>
          </div>

          {/* Column 2: Platform */}
          <div className="flex flex-col gap-3 font-sans">
            <span className="text-xs font-semibold uppercase tracking-wider text-white">
              Platform
            </span>
            <Link href="/memory" className="text-sm text-dim hover:text-white transition-colors">
              Memory Studio
            </Link>
            <Link
              href="/playground"
              className="text-sm text-dim hover:text-white transition-colors"
            >
              Skills Workbench
            </Link>
            <Link href="/settings" className="text-sm text-dim hover:text-white transition-colors">
              BYOK & Preferences
            </Link>
          </div>

          {/* Column 3: Legal */}
          <div className="flex flex-col gap-3 font-sans">
            <span className="text-xs font-semibold uppercase tracking-wider text-white">
              Legal & Help
            </span>
            <Link href="/privacy" className="text-sm text-dim hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-dim hover:text-white transition-colors">
              Terms of Service
            </Link>
            <a
              href="mailto:hello@cognilot.com"
              className="text-sm text-dim hover:text-white transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>

      {/* Monumental ASCII Wordmark Banner (Antigravity & Google Labs Inspired) */}
      <div className="w-full flex justify-center items-center py-10 my-4 border-y border-white/[0.04] overflow-hidden select-none">
        <pre className="font-mono text-[9px] sm:text-[13px] md:text-[16px] lg:text-[20px] xl:text-[24px] leading-[1.08] tracking-widest text-white/[0.08] hover:text-white/[0.14] transition-colors text-center whitespace-pre pointer-events-none">
          {` ██████╗  ██████╗  ██████╗ ███╗   ██╗██╗██╗      ██████╗ ████████╗
██╔════╝ ██╔═══██╗██╔════╝ ████╗  ██║██║██║     ██╔═══██╗╚══██╔══╝
██║      ██║   ██║██║  ███╗██╔██╗ ██║██║██║     ██║   ██║   ██║   
██║      ██║   ██║██║   ██║██║╚██╗██║██║██║     ██║   ██║   ██║   
╚██████╗ ╚██████╔╝╚██████╔╝██║ ╚████║██║███████╗╚██████╔╝   ██║   
 ╚═════╝  ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚═╝╚══════╝ ╚═════╝    ╚═╝   `}
        </pre>
      </div>

      {/* Bottom Bar: Brand on left, Legal/Copyright on right */}
      <div className="relative px-10 md:px-20 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-ghost">
        <Link
          href="/home"
          className="font-mono text-white font-bold text-sm hover:opacity-80 transition-opacity"
        >
          &gt; cognilot_
        </Link>

        <div className="flex flex-wrap items-center gap-6">
          <span>&copy; {new Date().getFullYear()} Cognilot. All rights reserved.</span>
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
