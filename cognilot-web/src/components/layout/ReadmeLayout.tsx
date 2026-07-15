'use client';

import type { ReactNode } from 'react';

interface ReadmeLayoutProps {
  filename: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ReadmeLayout({
  filename,
  description,
  action,
  children,
  className = '',
}: ReadmeLayoutProps) {
  return (
    <div className={`p-8 max-w-4xl mx-auto animate-fade-in font-mono text-[13px] ${className}`}>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-accent-violet">#</span> {filename}
          </h1>
          {description && <p className="text-white/40">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}
