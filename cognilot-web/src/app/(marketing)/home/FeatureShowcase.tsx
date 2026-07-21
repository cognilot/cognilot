'use client';

import { useState } from 'react';
import { Accordion, type AccordionItem } from '@cognilot/ui';

interface FeatureItem extends AccordionItem {
  slug: string;
  desc: string;
  preview: string;
}

const FEATURES: FeatureItem[] = [
  {
    id: 'learn-profile',
    slug: 'learn_your_profile',
    title: 'learn_your_profile',
    desc: 'Cognilot scans the forms you interact with and builds a profile from your data — name, role, company, social URLs, API tokens, and more. The more you use it, the sharper the match.',
    preview: `// scanning form fields on linkedin.com/jobs/apply
> fields_detected: 7

  profile.name     = "Jack Pérez"
  profile.email    = "jack@cognilot.com"
  profile.role     = "Senior Engineer"
  profile.company  = "Cognilot"

// confidence: 97% · 4 fields pre-mapped`,
  },
  {
    id: 'instant-fill',
    slug: 'instant_autofill',
    title: 'instant_autofill',
    desc: 'In milliseconds, Cognilot maps the context of the active page — form labels, field types, surrounding copy — and propagates your stored data across all detected fields.',
    preview: `$ cognilot fill --tab=current

  ✓ field[firstName]   → "Jack"            12ms
  ✓ field[lastName]    → "Pérez"           13ms
  ✓ field[email]       → "jack@..."        13ms
  ✓ field[company]     → "Cognilot"        14ms

// 4/4 fields filled · saved 43 seconds`,
  },
  {
    id: 'memory-engine',
    slug: 'memory_engine',
    title: 'memory_engine',
    desc: 'Your profile lives encrypted in your browser. The vector-based memory engine decides which stored entries are relevant for each form context — without ever sending your data to our servers.',
    preview: `// memory.db · encrypted · AES-256

  [0x1a2b]  name       "Jack Pérez"
  [0x3c4d]  email      "jack@cognilot.com"
  [0x5e6f]  role       "Senior Engineer"
  [0x7g8h]  github     "github.com/jack"

// 128-dim vectors · local-first · 0 cloud writes`,
  },
  {
    id: 'local-inference',
    slug: 'local_inference',
    title: 'local_inference',
    desc: 'Connect your own API key from Groq, Gemini Nano, or OpenAI. Cognilot routes inference requests through your key so no form data ever passes through our infrastructure.',
    preview: `// inference_router.config

  groq_llama3    ●  ACTIVE    42ms   local key
  gemini_nano    ○  standby         on-device  
  openai_gpt4o   ○  inactive        —

// no data leaves your machine`,
  },
];

/**
 * FeatureShowcase — Interactive accordion with a live code-style preview panel.
 *
 * Layout:
 *   Left  — Accordion list (4 feature items, one expanded at a time)
 *   Right — Flat product mockup panel that reflects the active item's preview
 *
 * Animation:
 *   Accordion: CSS grid-rows trick (0fr → 1fr) — no JS height measurement
 *   Preview:   opacity fade between items via key-triggered re-render
 */
export function FeatureShowcase() {
  const [activeId, setActiveId] = useState<string>('learn-profile');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
      {/* ── Left: Accordion list ── */}
      <Accordion
        items={FEATURES}
        defaultOpen={['learn-profile']}
        onOpenChange={(ids) => setActiveId(ids[0] ?? 'learn-profile')}
        renderContent={(item) => (
          <p className="font-mono text-dim text-[13px] leading-relaxed pb-5 pr-6">
            {(item as FeatureItem).desc}
          </p>
        )}
      />

      {/* ── Right: Preview panel ── */}
      <div className="lg:sticky lg:top-28">
        {FEATURES.map((feature) => (
          <div
            key={feature.id}
            className={`transition-opacity duration-300 ${
              activeId === feature.id ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
            }`}
            aria-hidden={activeId !== feature.id}
          >
            <div className="border border-white/[0.07] bg-white/[0.02] rounded-xl overflow-hidden">
              {/* Panel header bar */}
              <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                <span className="font-mono text-[11px] text-ghost uppercase tracking-widest select-none">
                  // {feature.slug}.preview
                </span>
                <span className="font-mono text-[10px] text-white/20 select-none">
                  cognilot
                  <span className="text-accent-cyan">_</span>
                </span>
              </div>

              {/* Monospace code output */}
              <pre className="p-6 font-mono text-[12px] leading-relaxed text-dim whitespace-pre-wrap overflow-auto max-h-64">
                {feature.preview}
              </pre>

              {/* Panel footer */}
              <div className="px-5 py-2.5 border-t border-white/5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-violet animate-pulse shadow-[0_0_6px_var(--color-accent-violet)]" />
                <span className="font-mono text-[11px] text-ghost select-none">
                  extension active
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
