'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Trash2, Save, Sparkles, Database, Check } from 'lucide-react';
import {
  formatLearnedTextarea,
  normalizeDataLearned,
  parseLearnedTextarea,
} from '@/utils/dataLearned';

interface MemoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  dataLearned: Record<string, string[]>;
  onUpdateDataLearned: (updated: Record<string, string[]>) => Promise<void>;
  isSaving: boolean;
}

const AutoResizeTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [props.value]);

  return (
    <textarea
      {...props}
      ref={ref}
      rows={1}
      className={`bg-transparent outline-none resize-none overflow-hidden block ${props.className || ''}`}
    />
  );
};

export const MemoryDrawer: React.FC<MemoryDrawerProps> = ({
  isOpen,
  onClose,
  dataLearned,
  onUpdateDataLearned,
  isSaving,
}) => {
  const [localData, setLocalData] = useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync local data when dataLearned changes from external or drawer opens
  useEffect(() => {
    const normalized = normalizeDataLearned(dataLearned || {});
    setLocalData(normalized);
    setHasChanges(false);
  }, [dataLearned, isOpen]);

  const handleFieldChange = (key: string, rawValue: string) => {
    const parsed = parseLearnedTextarea(rawValue);
    setLocalData((prev) => {
      const updated = { ...prev, [key]: parsed };
      return updated;
    });
    setHasChanges(true);
  };

  const handleFieldRename = (oldKey: string, nextKey: string) => {
    const trimmed = nextKey.trim();
    if (!trimmed || trimmed === oldKey) return;

    setLocalData((prev) => {
      const updated = { ...prev };
      updated[trimmed] = updated[oldKey] || [];
      delete updated[oldKey];
      return updated;
    });
    setHasChanges(true);
  };

  const handleFieldDelete = (key: string) => {
    setLocalData((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await onUpdateDataLearned(localData);
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered keys
  const filteredKeys = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const allKeys = Object.keys(localData).sort();
    if (!q) return allKeys;
    return allKeys.filter((k) => {
      const vals = localData[k] || [];
      const valMatch = vals.some((v) => v.toLowerCase().includes(q));
      return k.toLowerCase().includes(q) || valMatch;
    });
  }, [localData, searchQuery]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl bg-background border-l border-white/10 p-0 text-white flex flex-col h-full shadow-2xl"
      >
        {/* Header */}
        <SheetHeader className="p-6 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <SheetTitle className="text-lg font-bold text-white tracking-tight">
                  Cognitive Memory Drawer
                </SheetTitle>
                <SheetDescription className="text-xs text-white/50 mt-0.5">
                  Inspect, search and edit all profile fields stored in your AI assistant.
                </SheetDescription>
              </div>
            </div>
          </div>

          {/* Full-width Search Bar */}
          <div className="relative mt-4">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search keys or values..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8.5 text-xs bg-white/[0.03] border-white/10 focus:border-accent-cyan/30 text-white placeholder:text-white/30 w-full"
            />
          </div>
        </SheetHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Stored Properties ({filteredKeys.length})
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-accent-cyan hover:underline cursor-pointer"
              >
                Clear search
              </button>
            )}
          </div>

          {filteredKeys.length === 0 ? (
            <div className="py-16 text-center rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
              <Sparkles className="w-6 h-6 text-white/20 mx-auto mb-2" />
              <p className="text-xs text-white/50">
                {searchQuery ? 'No matching fields found' : 'No memory fields saved yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredKeys.map((key) => {
                const values = localData[key] || [];
                const formattedValue = formatLearnedTextarea(values);
                return (
                  <div
                    key={key}
                    className="bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-lg p-3.5 transition-colors group space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        defaultValue={key}
                        onBlur={(e) => handleFieldRename(key, e.target.value)}
                        className="font-mono text-xs font-semibold text-accent-cyan/90 bg-transparent outline-none border-b border-transparent focus:border-accent-cyan/40 px-1 -mx-1"
                        title="Click to rename key"
                      />
                      <button
                        onClick={() => handleFieldDelete(key)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 hover:text-red-400 text-white/30 transition-all cursor-pointer"
                        title="Delete field"
                        aria-label={`Delete ${key}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <AutoResizeTextarea
                      value={formattedValue}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      className="w-full text-xs text-white/80 bg-white/[0.03] border border-white/5 rounded px-2.5 py-2 focus:border-accent-cyan/30 placeholder:text-white/20 leading-relaxed"
                      placeholder="Value..."
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-white/[0.01] shrink-0 flex items-center justify-between">
          <div className="text-xs text-white/40 flex items-center gap-1.5">
            {saveSuccess ? (
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" /> Changes synced
              </span>
            ) : hasChanges ? (
              <span className="text-amber-400/90 font-medium">Unsaved changes</span>
            ) : (
              <span>Synced with cloud</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs">
              Close
            </Button>
            <Button
              variant="solid"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="h-8 text-xs"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              <span>{isSaving ? 'Saving...' : 'Save & Sync'}</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
