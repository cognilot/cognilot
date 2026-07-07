import { type FC, type ReactNode } from 'react';
import type { ProfileSection } from '../utils/profileFields';

interface CollapsibleSectionProps {
  section: ProfileSection;
  isOpen: boolean;
  onToggle: () => void;
  completion: { completed: number; total: number };
  children: ReactNode;
}

import { Card, CardContent } from './ui/card';

// ... (interface remains same)

export const CollapsibleSection: FC<CollapsibleSectionProps> = ({
  section,
  isOpen,
  onToggle,
  completion,
  children,
}) => {
  return (
    <Card
      className={`mb-3 transition-all duration-300 border-l-4 ${isOpen ? 'border-l-brand-primary' : 'border-l-transparent'}`}
    >
      <div
        className="flex items-center justify-between cursor-pointer py-4 px-6"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{section.icon}</span>
          <div>
            <h3 className="text-base font-semibold m-0">{section.title}</h3>
            {!isOpen && <p className="text-[10px] text-dim m-0">Click para editar</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              completion.completed === completion.total
                ? 'bg-success/20 text-success'
                : 'bg-surface-soft text-dim'
            }`}
          >
            {completion.completed}/{completion.total}
          </div>
          <div
            className={`text-[10px] opacity-40 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          >
            ▼
          </div>
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <CardContent className="pt-0 pb-6 px-6 border-t border-surface-soft/50">
          <div className="pt-4">{children}</div>
        </CardContent>
      </div>
    </Card>
  );
};
