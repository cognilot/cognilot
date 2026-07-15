import Link from 'next/link';

export function MarketingFooter() {
  return (
    <footer className="relative z-10 w-full px-6 md:px-12 lg:px-20 border-t border-white/5 py-10 mt-10">
      <div className="relative px-10 md:px-20 flex flex-col md:flex-row items-start justify-between gap-8">
        {/* Left: Terminal output */}
        <div className="flex flex-col items-start gap-0.5 min-w-0">
          {/* Prompt line */}
          <div className="font-mono text-sm text-white mb-1.5 select-none">
            ~/cognilot/footer
            <span className="text-accent-violet"> $</span>
            <span className="text-ghost ml-2">tree</span>
          </div>

          {/* Tree listing */}
          <div className="flex flex-col gap-0.5 font-mono text-[13px] pl-6">
            <div className="flex items-center gap-2 text-dim">
              <span className="text-white/20 select-none">├──</span>
              <Link href="/privacy" className="hover:text-white transition-colors">
                privacy.md
              </Link>
            </div>
            <div className="flex items-center gap-2 text-dim">
              <span className="text-white/20 select-none">├──</span>
              <Link href="/terms" className="hover:text-white transition-colors">
                terms.md
              </Link>
            </div>
            <div className="flex items-center gap-2 text-dim">
              <span className="text-white/20 select-none">└──</span>
              <a href="mailto:hello@cognilot.com" className="hover:text-white transition-colors">
                contact.md
              </a>
            </div>
          </div>

          {/* Copyright */}
          <div className="font-mono text-[11px] text-ghost mt-1.5 select-none">
            © {new Date().getFullYear()} Cognilot. All rights reserved.
          </div>
        </div>

        {/* Right: ASCII art - desktop only */}
        <div className="hidden md:block font-mono select-none text-[10px] leading-[1.15] whitespace-pre">
          {[
            '  #####  #######  #####  #     # ### #       ####### ####### ',
            ' #     # #     # #     # ##    #  #  #       #     #    #    ',
            ' #       #     # #       # #   #  #  #       #     #    #    ',
            ' #       #     # #  #### #  #  #  #  #       #     #    #    ',
            ' #       #     # #     # #   # #  #  #       #     #    #    ',
            ' #     # #     # #     # #    ##  #  #       #     #    #    ',
            '  #####  #######  #####  #     # ### ####### #######    #    ',
          ].join('\n')}
        </div>
      </div>
    </footer>
  );
}
