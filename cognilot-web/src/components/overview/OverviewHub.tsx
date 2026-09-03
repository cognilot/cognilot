'use client';

import React, { useState, type KeyboardEvent } from 'react';
import {
  MapPin,
  FileText,
  Sparkles,
  Plus,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowRight,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CVUploader } from '@/components/CVUploader';
import Link from 'next/link';

interface OverviewHubProps {
  totalLearnedCount: number;
  userPlan?: string;
  onDetectLocation: () => Promise<void>;
  isLocating: boolean;
  onCVUpload: (data: unknown) => Promise<void>;
  onAddQuickKey: (key: string, val: string) => Promise<void>;
  onOpenDrawer: () => void;
  className?: string;
}

export const OverviewHub: React.FC<OverviewHubProps> = ({
  totalLearnedCount,
  userPlan = 'Free',
  onDetectLocation,
  isLocating,
  onCVUpload,
  onAddQuickKey,
  onOpenDrawer,
  className = '',
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [showCVUploader, setShowCVUploader] = useState(false);

  const handleAddKey = async () => {
    const k = keyInput.trim();
    const v = valueInput.trim();
    if (!k || !v) return;

    await onAddQuickKey(k, v);
    setKeyInput('');
    setValueInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleAddKey();
    }
  };

  return (
    <section
      className={`bg-surface border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl transition-all ${className}`}
    >
      {/* ── 1. Top Status & Metrics Header ───────────────────────────────────── */}
      <div className="p-6 md:p-8 border-b border-white/10 relative overflow-hidden bg-white/[0.01]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 font-sans">
                Cognilot Core Active
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Contextual Autofill Ready
            </h2>
            <p className="text-xs md:text-sm text-white/60 leading-relaxed">
              Your assistant is active and synchronized with Chrome to auto-complete forms on any
              website using your learned profile.
            </p>
          </div>

          {/* Metrics & Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3.5 min-w-[110px]">
              <div className="text-[11px] text-white/40 font-medium">Memory Items</div>
              <div className="text-lg font-bold text-white font-mono mt-0.5">
                {totalLearnedCount}
              </div>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3.5 min-w-[110px]">
              <div className="text-[11px] text-white/40 font-medium">Active Tier</div>
              <div className="text-lg font-bold text-accent-cyan font-mono uppercase mt-0.5">
                {userPlan}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-6 mt-6 border-t border-white/5">
          <Button
            variant="solid"
            size="sm"
            onClick={onOpenDrawer}
            className="text-xs font-semibold"
          >
            <Database className="w-3.5 h-3.5 text-accent-violet" />
            <span>Open Memory Drawer</span>
            <ArrowRight className="w-3.5 h-3.5 text-black/60" />
          </Button>
          <Button variant="terminal" size="sm" asChild className="text-xs">
            <Link href="/playground">
              <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Explore Custom Skills</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ── 2. Interactive Operational Rows (MailerSend Pattern) ─────────────── */}
      <div className="divide-y divide-white/10">
        {/* ── Row 1: Geographic Location ────────────────────────────────────── */}
        <div className="p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.01] transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Geographic Location</h3>
              <p className="text-xs text-white/50 mt-0.5 max-w-xl leading-relaxed">
                Auto-detect and sync your country, city, address, and postal code for job boards and
                web portals.
              </p>
            </div>
          </div>

          <div className="shrink-0 self-start sm:self-auto">
            <Button
              variant="terminal"
              size="sm"
              onClick={onDetectLocation}
              disabled={isLocating}
              className="text-xs font-medium h-9 px-4"
            >
              <MapPin
                className={`w-3.5 h-3.5 text-accent-cyan ${isLocating ? 'animate-pulse' : ''}`}
              />
              <span>{isLocating ? 'Detecting Location...' : 'Detect Location (GPS)'}</span>
            </Button>
          </div>
        </div>

        {/* ── Row 2: Resume & Career (CV) ───────────────────────────────────── */}
        <div className="p-6 md:p-8 space-y-4 hover:bg-white/[0.01] transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent-violet/10 border border-accent-violet/20 flex items-center justify-center text-accent-violet shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Career History &amp; Resume (CV)
                </h3>
                <p className="text-xs text-white/50 mt-0.5 max-w-xl leading-relaxed">
                  Ingest your CV (PDF or DOCX) to automatically extract employment history, skills,
                  and degrees.
                </p>
              </div>
            </div>

            <div className="shrink-0 self-start sm:self-auto">
              <Button
                variant="terminal"
                size="sm"
                onClick={() => setShowCVUploader(!showCVUploader)}
                className="text-xs font-medium h-9 px-4"
              >
                <FileText className="w-3.5 h-3.5 text-accent-violet" />
                <span>{showCVUploader ? 'Close Uploader' : 'Upload Resume / CV'}</span>
              </Button>
            </div>
          </div>

          {/* Inline Dropzone (Collapsible) */}
          {showCVUploader && (
            <div className="pt-2 pl-0 sm:pl-14">
              <CVUploader
                onUploadSuccess={async (data) => {
                  await onCVUpload(data);
                  setShowCVUploader(false);
                }}
                className="p-4"
              />
            </div>
          )}
        </div>

        {/* ── Row 3: Custom Memory Attributes ─────────────────────────────────── */}
        <div className="p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-white/[0.01] transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Custom Profile Attributes</h3>
              <p className="text-xs text-white/50 mt-0.5 max-w-md leading-relaxed">
                Add personalized key-value properties for portfolio URLs, compensation, or specific
                custom answers.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pl-0 sm:pl-14 lg:pl-0 shrink-0">
            {/* Inline Quick Add Input */}
            <div className="bg-white/[0.02] border border-white/10 rounded-lg p-1.5 focus-within:border-accent-cyan/40 transition-colors flex items-center gap-1.5">
              <Input
                type="text"
                placeholder="Key (e.g. github)"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-7 text-xs bg-white/5 border-white/5 placeholder:text-white/30 w-28 md:w-32"
              />
              <span className="text-white/20 text-xs">:</span>
              <Input
                type="text"
                placeholder="Value"
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-7 text-xs bg-white/5 border-white/5 placeholder:text-white/30 w-36 md:w-44"
              />
              <Button
                variant="solid"
                size="sm"
                onClick={handleAddKey}
                disabled={!keyInput.trim() || !valueInput.trim()}
                className="h-7 px-2.5 text-xs shrink-0"
              >
                <Plus className="w-3 h-3 mr-0.5" />
                <span>Add</span>
              </Button>
            </div>

            {/* Direct Drawer Button */}
            <Button
              variant="terminal"
              size="sm"
              onClick={onOpenDrawer}
              className="text-xs font-medium h-10 px-3.5 shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Manage All ({totalLearnedCount})</span>
              <ArrowUpRight className="w-3 h-3 text-white/40" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
