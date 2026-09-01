'use client';

import type { ReactNode } from 'react';

interface DocLayoutProps {
  filename: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DocLayout({
  filename,
  description,
  action,
  children,
  className = '',
}: DocLayoutProps) {
  // Format clean title from legacy .md filename prop
  const cleanTitle = filename
    .replace(/\.md$/i, '')
    .replace(/^[#/]+\s*/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className={`p-6 md:p-10 max-w-5xl mx-auto animate-fade-in font-sans ${className}`}>
      {/* Modern Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>{cleanTitle}</span>
          </h1>
          {description && <p className="text-sm text-dim mt-1.5 leading-relaxed">{description}</p>}
        </div>
        {action && <div className="shrink-0 flex items-center gap-3">{action}</div>}
      </div>

      {children}
    </div>
  );
}
