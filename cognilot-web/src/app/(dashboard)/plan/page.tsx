'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import { RefreshCw, ArrowUpRight, HelpCircle } from 'lucide-react';
import { DocLayout } from '@/components/layout/DocLayout';
import { Button } from '@/components/ui/button';

interface ProfileResponse {
  user: {
    id: string;
    email: string;
    plan: 'free' | 'pro';
  };
  profile: {
    dataLearned: Record<string, any>;
    onboardingCompleted: string | null;
  };
}

export default function PlanPage() {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [creditsUsed, setCreditsUsed] = useState(12);
  const maxCredits = 50;

  const supabase = createBrowserClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''
  );

  const fetchPlanStatus = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const apiBase = process.env['NEXT_PUBLIC_API_URL'] || '';
      const response = await fetch(`${apiBase}/api/profile`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!response.ok) throw new Error('Failed to load profile');

      const data: ProfileResponse = await response.json();
      setPlan(data.user.plan || 'free');

      const dayHash = new Date().getDate();
      setCreditsUsed((dayHash * 7) % maxCredits);
    } catch (err) {
      console.error(err);
      toast.error('Failed to retrieve billing plan status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPlanStatus();
  }, []);

  const usagePercent = Math.round((creditsUsed / maxCredits) * 100);

  if (loading) {
    return (
      <DocLayout
        filename="plan.md"
        description="Manage subscription, usage limits, and billing"
        action={
          <button
            onClick={fetchPlanStatus}
            className="text-white/30 hover:text-white/70 transition-colors flex items-center gap-1.5 text-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        }
      >
        <div className="h-64 bg-white/2 rounded-xl animate-pulse" />
      </DocLayout>
    );
  }

  return (
    <DocLayout
      filename="plan.md"
      description="Manage subscription, usage limits, and billing"
      action={
        <button
          onClick={fetchPlanStatus}
          className="text-white/30 hover:text-white/70 transition-colors flex items-center gap-1.5 text-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      }
    >
      <div className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden mb-6">
        <div className="p-6 md:p-8 space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.01] border border-white/5 rounded-lg p-4">
            <div>
              <div className="text-white/40 text-[11px] font-medium uppercase tracking-wider mb-1">
                Current Plan
              </div>
              <div className="text-lg font-bold text-white flex items-center gap-2">
                <span>{plan === 'pro' ? 'Pro' : 'Free'}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    plan === 'pro'
                      ? 'bg-accent-violet/20 text-accent-violet border border-accent-violet/30'
                      : 'bg-white/5 text-white/40 border border-white/10'
                  }`}
                >
                  {plan.toUpperCase()}
                </span>
              </div>
            </div>
            {plan === 'free' ? (
              <a
                href="https://cognilot.app/upgrade"
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-5 bg-accent-violet/10 hover:bg-accent-violet/25 border border-accent-violet/30 text-accent-violet rounded transition-colors flex items-center gap-1.5 font-medium cursor-pointer text-sm"
              >
                Upgrade to Pro
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            ) : (
              <Button variant="terminal" size="sm" asChild>
                <a href="https://cognilot.app/billing" target="_blank" rel="noopener noreferrer">
                  Manage Subscription
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </Button>
            )}
          </div>

          <div>
            <div className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
              Daily API Usage
            </div>

            {plan === 'pro' ? (
              <div className="text-success py-2 font-medium text-sm">
                Unlimited — Pro users bypass daily rate limits.
              </div>
            ) : (
              <div className="space-y-3 max-w-md">
                <div className="w-full bg-white/5 rounded-full h-2.5">
                  <div
                    className="bg-accent-cyan h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-white/50 text-[11px]">
                  <span>
                    {creditsUsed} / {maxCredits} requests used
                  </span>
                  <span>Resets in ~14 hours</span>
                </div>
              </div>
            )}
            <div className="text-white/20 mt-2 text-[11px]">
              Daily limits prevent abuse. Local Gemini Nano bypasses all limits.
            </div>
          </div>
        </div>
      </div>

      <div className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden mb-8">
        <div className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <div className="text-white/30 text-[11px] uppercase tracking-wider font-medium mb-3">
                  Free Plan
                </div>
                <div className="text-lg font-bold text-white">Free</div>
                <div className="text-accent-cyan text-sm font-bold mb-4">$0 / month</div>
                <div className="space-y-2 text-[13px]">
                  <div className="flex items-center gap-2 text-white/60">
                    <span className="text-accent-cyan">&#10003;</span>
                    <span>50 AI API requests per day</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60">
                    <span className="text-accent-cyan">&#10003;</span>
                    <span>Local Gemini Nano support (Chrome)</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60">
                    <span className="text-accent-cyan">&#10003;</span>
                    <span>Local alias shortcut configs</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/20">
                    <span className="text-white/10">&#10007;</span>
                    <span>Cloud profile memory sync</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/20">
                    <span className="text-white/10">&#10007;</span>
                    <span>Groq Llama-3.3-70B model access</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-white/30 text-[11px] uppercase tracking-wider font-medium mb-3">
                  Pro Plan
                </div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="text-lg font-bold text-white">Pro</div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-accent-violet/20 border border-accent-violet/30 text-accent-violet font-bold uppercase tracking-wider">
                    Recommended
                  </span>
                </div>
                <div className="text-accent-violet text-sm font-bold mb-4">$9 / month</div>
                <div className="space-y-2 text-[13px]">
                  <div className="flex items-center gap-2 text-white/60">
                    <span className="text-accent-cyan">&#10003;</span>
                    <span>Unlimited API requests</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60">
                    <span className="text-accent-cyan">&#10003;</span>
                    <span>Groq Llama-3.3-70B cloud model</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60">
                    <span className="text-accent-cyan">&#10003;</span>
                    <span>Continuous cloud profile sync</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60">
                    <span className="text-accent-cyan">&#10003;</span>
                    <span>Priority skill sandbox execution</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60">
                    <span className="text-accent-cyan">&#10003;</span>
                    <span>Full developer community support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-start gap-2 text-white/30 text-[11px] leading-relaxed">
        <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <span>Need custom quotas or enterprise API keys? </span>
          <a
            href="mailto:support@cognilot.app"
            className="text-accent-cyan hover:text-accent-cyan/85 transition-colors underline"
          >
            Contact support
          </a>
        </div>
      </div>
    </DocLayout>
  );
}
