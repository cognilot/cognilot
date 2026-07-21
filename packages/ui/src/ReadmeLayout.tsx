'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { List } from 'lucide-react';

export interface ReadmeSection {
  id: string;
  title: string;
  label: string;
  content: ReactNode;
}

interface ReadmeLayoutProps {
  filename: string;
  sections: ReadmeSection[];
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function ReadmeLayout({
  filename,
  sections,
  title,
  description,
  children,
  className = '',
}: ReadmeLayoutProps) {
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
    <div
      className={`flex w-full flex-col items-center justify-center px-4 py-16 md:py-24 ${className}`}
    >
      <div className="w-full max-w-[900px] rounded-xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-2xl">
        {/* Title Bar */}
        <div className="flex items-center gap-3 border-b border-white/5 bg-white/5 px-5 py-3.5 select-none">
          <span className="font-mono text-[10px] font-bold tracking-widest text-white/30 uppercase">
            {filename}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setTocOpen((v) => !v)}
            className={`rounded p-1.5 transition-colors ${
              tocOpen
                ? 'bg-white/10 text-white/70'
                : 'text-white/30 hover:bg-white/5 hover:text-white/70'
            }`}
            aria-label="Toggle table of contents"
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="relative flex flex-col lg:flex-row">
          {/* Content */}
          <div className="min-w-0 flex-1 px-6 py-8 md:px-12 md:py-10">
            {title && (
              <div className="mb-12">
                <h1 className="mb-4 text-4xl font-extrabold leading-tight text-white md:text-5xl">
                  {title}
                </h1>
                {description && (
                  <p className="max-w-[600px] text-base leading-relaxed text-white/50">
                    {description}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-6 text-white/70">{children}</div>
          </div>

          {/* Sidepanel */}
          <div
            className={`lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:self-start lg:border-l lg:border-white/5 lg:bg-white/[0.02] lg:block transition-all duration-300 ease-in-out ${
              tocOpen ? 'block' : 'hidden'
            }`}
          >
            <nav className="p-6 lg:w-64">
              <div className="mb-5 font-sans text-[11px] font-semibold tracking-wider text-white/30 uppercase">
                On this page
              </div>
              <ul className="space-y-1">
                {sections.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => scrollTo(s.id)}
                      className={`w-full rounded px-3 py-1.5 text-left text-[13px] transition-colors ${
                        activeId === s.id ? 'text-white' : 'text-white/40 hover:text-white'
                      }`}
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
    </div>
  );
}
