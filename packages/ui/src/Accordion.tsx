'use client';

import { useState, useEffect, type ReactNode } from 'react';

export interface AccordionItem {
  id: string;
  title: string;
  content?: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultOpen?: string[];
  className?: string;
  renderTrigger?: (item: AccordionItem, isOpen: boolean) => ReactNode;
  renderContent?: (item: AccordionItem) => ReactNode;
  onOpenChange?: (openIds: string[]) => void;
}

export function Accordion({
  items,
  allowMultiple = false,
  defaultOpen,
  className = '',
  renderTrigger,
  renderContent,
  onOpenChange,
}: AccordionProps) {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpen ?? [items[0]?.id].filter(Boolean));

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      if (allowMultiple) {
        return prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      }
      return prev.includes(id) && prev.length === 1 ? [] : [id];
    });
  };

  useEffect(() => {
    onOpenChange?.(openIds);
  }, [openIds, onOpenChange]);

  return (
    <div className={`flex flex-col ${className}`}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);

        return (
          <div key={item.id} className="border-b border-white/5">
            {renderTrigger ? (
              <div
                onClick={() => toggle(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggle(item.id);
                }}
              >
                {renderTrigger(item, isOpen)}
              </div>
            ) : (
              <button
                onClick={() => toggle(item.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-3 py-6 text-left transition-colors hover:bg-white/[0.02] group -mx-3 rounded"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span
                    className={`font-mono font-bold text-sm select-none transition-colors ${
                      isOpen ? 'text-accent-violet' : 'text-white/20 group-hover:text-white/40'
                    }`}
                    aria-hidden="true"
                  >
                    &gt;
                  </span>
                  <span
                    className={`font-mono font-semibold text-[15px] md:text-base transition-colors ${
                      isOpen ? 'text-white' : 'text-white/50 group-hover:text-white/80'
                    }`}
                  >
                    {item.title}
                  </span>
                </span>
                <span
                  className={`font-mono font-bold text-base shrink-0 transition-colors select-none ${
                    isOpen ? 'text-accent-cyan' : 'text-white/20 group-hover:text-white/40'
                  }`}
                  aria-hidden="true"
                >
                  {isOpen ? '[-]' : '[+]'}
                </span>
              </button>
            )}

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isOpen ? 'max-h-[999px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              {renderContent ? (
                renderContent(item)
              ) : (
                <div className="pb-6 pr-6 font-mono text-[13px] leading-relaxed text-white/50">
                  {item.content}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
