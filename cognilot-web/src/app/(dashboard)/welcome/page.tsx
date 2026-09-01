'use client';

import { useRouter } from 'next/navigation';
import { OnboardingGuide } from '@/components/OnboardingGuide';
import { Button } from '@/components/ui/button';
import { DocLayout } from '@/components/layout/DocLayout';
import { ArrowRight, Database, Sparkles } from 'lucide-react';

export default function WelcomePage() {
  const router = useRouter();

  return (
    <DocLayout
      filename="Getting Started"
      description="Welcome to Cognilot! Your intelligent cognitive autofill assistant is ready."
    >
      <div className="space-y-8">
        {/* Status Card */}
        <div className="bg-surface border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
            </span>
            <span className="text-sm font-semibold text-white">Cognilot Core Engine Active</span>
          </div>

          <h2 className="text-xl font-bold text-white mb-2">Autofill with zero friction</h2>
          <p className="text-sm text-dim leading-relaxed max-w-2xl">
            When you browse job boards, government portals, or web applications, Cognilot
            automatically detects field labels and suggests contextual answers from your learned
            cognitive profile.
          </p>

          <div className="flex flex-wrap gap-4 pt-6 mt-6 border-t border-white/5">
            <Button
              variant="solid"
              size="md"
              onClick={() => router.push('/memory')}
              className="cursor-pointer"
            >
              <Database className="w-4 h-4 text-accent-violet" />
              <span>Configure Profile Memory</span>
              <ArrowRight className="w-4 h-4 text-black/60" />
            </Button>
            <Button
              variant="terminal"
              size="md"
              onClick={() => router.push('/playground')}
              className="cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-accent-cyan" />
              <span>Explore Custom Skills</span>
            </Button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors">
            <div className="text-xs font-semibold uppercase tracking-wider text-accent-violet mb-2">
              Privacy First
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Local AI & Cloud Hybrid</h3>
            <p className="text-xs text-dim leading-relaxed">
              Use Chrome Gemini Nano for 100% private on-device executions, or sync to your secured
              cloud profile.
            </p>
          </div>

          <div className="bg-surface border border-white/10 rounded-2xl p-6 hover:border-accent-cyan/40 transition-colors">
            <div className="text-xs font-semibold uppercase tracking-wider text-accent-cyan mb-2">
              Cognitive Profile
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Continuous Learning</h3>
            <p className="text-xs text-dim leading-relaxed">
              Upload your CV or let Cognilot learn as you fill forms. Your data is structured
              automatically.
            </p>
          </div>
        </div>

        <OnboardingGuide />
      </div>
    </DocLayout>
  );
}
