'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import { RefreshCw, Check, ArrowUpRight, HelpCircle } from 'lucide-react';

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
  const [creditsUsed, setCreditsUsed] = useState(12); // Simulated starting count
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
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load profile');
      }

      const data: ProfileResponse = await response.json();
      setPlan(data.user.plan || 'free');

      // Randomize simulated usage slightly for realism in dashboard sandbox
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

  // Compute progress bar characters
  const filledBlocks = Math.round((creditsUsed / maxCredits) * 20);
  const emptyBlocks = 20 - filledBlocks;
  const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto font-mono text-[13px] text-white/30 space-y-6 animate-pulse">
        <div>// reading_billing_status.sh...</div>
        <div className="h-64 bg-white/2 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in font-mono text-[13px]">
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-accent-violet">#</span> plan.md
        </h1>
        <div className="text-white/40 flex items-center justify-between">
          <span>{'// Manage subscription tiers, usage limits, and cloud integrations'}</span>
          <button
            onClick={fetchPlanStatus}
            className="text-white/30 hover:text-white/70 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            [RELOAD]
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden relative mb-8">
        {/* Title bar */}
        <div className="px-5 py-4 border-b border-white/5 bg-white/3 flex items-center gap-2 select-none">
          <div className="flex gap-1.5 mr-4">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <div className="text-white/30 text-[10px] uppercase tracking-widest font-sans font-bold flex-1 text-right">
            billing/subscription_status.env
          </div>
        </div>

        {/* Panel Content */}
        <div className="p-6 md:p-8 space-y-8">
          {/* Active Status Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.01] border border-white/5 rounded-lg p-4">
            <div>
              <div className="text-white/40 text-[11px] font-bold uppercase tracking-wider mb-1">
                current_plan_tier
              </div>
              <div className="text-lg font-bold text-white flex items-center gap-2">
                <span>{plan === 'pro' ? 'PRO_MEMBERSHIP' : 'FREE_SANDBOX_TIER'}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    plan === 'pro'
                      ? 'bg-violet-500/20 text-accent-violet border border-violet-500/30'
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
                className="py-2 px-5 bg-violet-500/10 hover:bg-violet-500/25 border border-violet-500/30 text-accent-violet rounded transition-colors flex items-center gap-1.5 font-bold cursor-pointer select-none"
              >
                ./upgrade_to_pro.sh
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            ) : (
              <a
                href="https://cognilot.app/billing"
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded transition-colors flex items-center gap-1.5 font-bold cursor-pointer select-none"
              >
                ./manage_subscription.sh
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Usage Meter */}
          <div>
            <div className="text-white/30 mb-3 select-none font-bold uppercase tracking-wider text-[11px]">
              ## daily_api_inference_usage
            </div>

            {plan === 'pro' ? (
              <div className="text-green-400 select-none py-2 font-bold">
                [UNLIMITED] // Pro tier users bypass daily rate-limits.
              </div>
            ) : (
              <div className="space-y-3 max-w-md">
                <div className="font-mono text-[14px] text-accent-cyan tracking-wider">
                  {progressBar}{' '}
                  <span className="text-white ml-2">
                    {((creditsUsed / maxCredits) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between text-white/50 text-[11px]">
                  <span>
                    Used: {creditsUsed} / {maxCredits} requests
                  </span>
                  <span>Resets in: ~14 hours</span>
                </div>
              </div>
            )}
            <div className="text-white/20 select-none mt-2 text-[11px]">
              // daily limits prevent system abuse. local gemini nano bypasses all limits.
            </div>
          </div>
        </div>
      </div>

      {/* Plans Comparison Grid */}
      <div className="text-white/30 mb-4 select-none font-bold uppercase tracking-wider text-[11px]">
        ## available_subscription_tiers
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 select-none">
        {/* Free Plan Card */}
        <div
          className={`rounded-xl p-6 border transition-all ${
            plan === 'free' ? 'border-white/20 bg-white/[0.02]' : 'border-white/5 bg-white/[0.005]'
          }`}
        >
          <div className="text-lg font-bold text-white mb-1">Free Sandbox</div>
          <div className="text-accent-cyan text-sm mb-4 font-bold">$0.00 / month</div>

          <div className="border-t border-white/5 pt-4 space-y-3">
            <div className="flex items-center gap-2 text-white/60">
              <Check className="w-3.5 h-3.5 text-accent-cyan" />
              <span>50 AI API requests per day</span>
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <Check className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Local Gemini Nano support (Chrome)</span>
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <Check className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Local alias shortcut configs</span>
            </div>
            <div className="flex items-center gap-2 text-white/20 line-through">
              <span>Cloud profile memory sync</span>
            </div>
            <div className="flex items-center gap-2 text-white/20 line-through">
              <span>Groq Llama-3.3-70B model access</span>
            </div>
          </div>
        </div>

        {/* Pro Plan Card */}
        <div
          className={`rounded-xl p-6 border transition-all ${
            plan === 'pro'
              ? 'border-violet-500/40 bg-violet-950/10'
              : 'border-violet-500/20 bg-violet-500/5 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-white mb-1">Pro Operator</div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-accent-violet font-bold uppercase tracking-wider">
              RECOMMENDED
            </span>
          </div>
          <div className="text-accent-violet text-sm mb-4 font-bold">$9.00 / month</div>

          <div className="border-t border-white/5 pt-4 space-y-3">
            <div className="flex items-center gap-2 text-white">
              <Check className="w-3.5 h-3.5 text-accent-violet" />
              <span className="font-bold">UNLIMITED API requests</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <Check className="w-3.5 h-3.5 text-accent-violet" />
              <span>Groq Llama-3.3-70B cloud model</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <Check className="w-3.5 h-3.5 text-accent-violet" />
              <span>Continuous cloud profile memory sync</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <Check className="w-3.5 h-3.5 text-accent-violet" />
              <span>Priority custom skill sandbox execution</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <Check className="w-3.5 h-3.5 text-accent-violet" />
              <span>Full developer community support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Help Note */}
      <div className="mt-8 flex items-start gap-2 text-white/30 text-[11px] leading-relaxed">
        <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <span>Need custom quotas or enterprise-scale API keys? </span>
          <a
            href="mailto:support@cognilot.app"
            className="text-accent-cyan hover:text-accent-cyan/85 transition-colors underline"
          >
            Contact developer operations
          </a>
        </div>
      </div>
    </div>
  );
}
