import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function MarketingNav() {
  return (
    <div className="relative z-20 w-full border-b border-border-strong bg-background/50 backdrop-blur-md">
      <nav className="flex items-center justify-between px-6 md:px-12 lg:px-20 py-6 w-full relative">
        <Link
          href="/home"
          className="font-mono text-white font-bold text-lg hover:opacity-80 transition-opacity"
        >
          <span className="text-accent-violet">&gt;</span> <span>cognilot</span>
          <span className="text-accent-cyan">_</span>
        </Link>
        <div className="flex items-center gap-6">
          <Button variant="variable" asChild>
            <Link href="/auth">sign_in</Link>
          </Button>
          <Button variant="solid" asChild>
            <Link href="/auth?mode=signup">Get Started</Link>
          </Button>
        </div>

        {/* Nodos de diamante decorativos centrados sobre la línea de margen */}
        <div className="absolute left-6 md:left-12 lg:left-20 -bottom-[4.5px] w-2 h-2 bg-background border border-white/30 rotate-45 z-30 -translate-x-1/2" />
        <div className="absolute right-6 md:right-12 lg:right-20 -bottom-[4.5px] w-2 h-2 bg-background border border-white/30 rotate-45 z-30 translate-x-1/2" />
      </nav>
    </div>
  );
}
