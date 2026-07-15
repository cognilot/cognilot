'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { List } from 'lucide-react';

export interface LegalSection {
  id: string;
  title: string;
  label: string;
  content: ReactNode;
}

interface LegalLayoutProps {
  filename: string;
  sections: LegalSection[];
  children: ReactNode;
}

export function LegalLayout({ filename, sections, children }: LegalLayoutProps) {
  const [tocOpen, setTocOpen] = useState(false);
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');

  const handleScroll = useCallback(() => {
    const offsets = sections.map((s) => {
      const el = document.getElementById(s.id);
      return { id: s.id, top: el ? el.getBoundingClientRect().top : Infinity };
    });
    const current = offsets.reduce(
      (best, item) => (item.top <= 140 && item.top > best.top ? item : best),
      { id: sections[0]?.id ?? '', top: -Infinity }
    );
    if (current.id) setActiveId(current.id);
  }, [sections]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: y, behavior: 'smooth' });
    setActiveId(id);
  };

  return (
    <div className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl">
      {/* ── Title Bar ── */}
      <div className="px-5 py-3.5 border-b border-white/5 bg-white/5 flex items-center gap-3 select-none">
        <span className="text-white/30 text-[10px] uppercase tracking-widest font-sans font-bold">
          {filename}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setTocOpen((v) => !v)}
          className={`p-1.5 rounded transition-colors ${tocOpen ? 'bg-white/10 text-white/70' : 'text-white/30 hover:text-white/70 hover:bg-white/5'}`}
          aria-label="Toggle table of contents"
        >
          <List className="w-4 h-4" />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex relative">
        {/* Content */}
        <div className="flex-1 min-w-0 px-8 md:px-12 py-10">
          <div className="max-w-2xl legal-content">{children}</div>
        </div>

        {/* Sidepanel */}
        <div
          className={`
            shrink-0 w-64 sticky top-0 self-start h-screen
            border-l border-white/5 bg-bg-primary/90
            transition-all duration-300 ease-in-out
            ${tocOpen ? 'opacity-100' : 'opacity-0 w-0 pointer-events-none'}
          `}
        >
          <nav className="p-6 w-64">
            <div className="text-[11px] font-sans font-semibold uppercase tracking-wider text-white/30 mb-5">
              On this page
            </div>
            <ul className="space-y-1">
              {sections.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => scrollTo(s.id)}
                    className={`
                      w-full text-left text-[13px] py-1.5 px-3 rounded transition-colors
                      ${activeId === s.id ? 'text-white' : 'text-white/40 hover:text-white'}
                    `}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}
