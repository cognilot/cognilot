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
          <div key={item.id} className="border-b border-white/10">
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
                className="flex w-full items-center justify-between gap-6 py-7 md:py-8 text-left transition-colors group cursor-pointer"
              >
                <span
                  className={`font-sans font-bold text-xl sm:text-2xl md:text-[26px] tracking-tight transition-colors ${
                    isOpen ? 'text-white' : 'text-white/70 group-hover:text-white'
                  }`}
                >
                  {item.title}
                </span>
                <span
                  className={`font-sans font-light text-2xl md:text-3xl shrink-0 transition-colors select-none ${
                    isOpen ? 'text-white' : 'text-white/40 group-hover:text-white'
                  }`}
                  aria-hidden="true"
                >
                  {isOpen ? '−' : '+'}
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
                <div className="pb-8 pr-6 font-sans text-sm sm:text-base leading-relaxed text-dim max-w-xl">
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
