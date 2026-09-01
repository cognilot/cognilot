'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import { RefreshCw, Check, Sparkles, HelpCircle, Zap } from 'lucide-react';
import { DocLayout } from '@/components/layout/DocLayout';
import { Button } from '@/components/ui/button';

interface ProfileResponse {
  user: {
    id: string;
    email: string;
    plan: 'free' | 'pro';
  };
  usage?: {
    creditsUsed: number;
    creditsLimit: number;
    resetsAt: string;
  };
  profile: {
    dataLearned: Record<string, any>;
    onboardingCompleted: string | null;
  };
}

export default function PlanPage() {
  const [loading, setLoading] = useState(true);
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [maxCredits, setMaxCredits] = useState(50);
  const [resetsAt, setResetsAt] = useState<string>('');

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

      if (data.usage) {
        setCreditsUsed(data.usage.creditsUsed ?? 0);
        setMaxCredits(data.usage.creditsLimit ?? 50);
        setResetsAt(data.usage.resetsAt ?? '');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to retrieve billing plan status.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlan = async (newPlan: 'free' | 'pro') => {
    try {
      setUpdatingPlan(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sesión no encontrada');
        return;
      }

      const apiBase = process.env['NEXT_PUBLIC_API_URL'] || '';
      const response = await fetch(`${apiBase}/api/profile/plan`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan: newPlan }),
      });

      if (!response.ok) throw new Error('Error al actualizar el plan');

      const data = await response.json();
      setPlan(data.user.plan);
      toast.success(
        newPlan === 'pro' ? 'Plan actualizado a Pro (Modo Demo)' : 'Plan actualizado a Free'
      );
    } catch (err) {
      console.error(err);
      toast.error('Error al cambiar de plan');
    } finally {
      setUpdatingPlan(false);
    }
  };

  useEffect(() => {
    void fetchPlanStatus();
  }, []);

  const usagePercent = Math.min(100, Math.round((creditsUsed / Math.max(1, maxCredits)) * 100));

  if (loading) {
    return (
      <DocLayout
        filename="Plan & Billing"
        description="Manage your subscription, daily AI quotas, and team billing"
      >
        <div className="h-72 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />
      </DocLayout>
    );
  }

  return (
    <DocLayout
      filename="Plan & Billing"
      description="Manage your subscription, daily AI quotas, and team billing"
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchPlanStatus}
          className="text-white/60 hover:text-white"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      }
    >
      {/* Current Plan & Usage Summary */}
      <div className="bg-surface border border-white/10 rounded-2xl p-6 md:p-8 mb-8 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-white/5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">
              Active Tier
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-white capitalize">{plan} Plan</span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  plan === 'pro'
                    ? 'bg-accent-violet/20 text-accent-violet border border-accent-violet/30'
                    : 'bg-white/10 text-white/70 border border-white/10'
                }`}
              >
                {plan.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {plan === 'free' ? (
              <Button
                variant="solid"
                size="md"
                onClick={() => handleTogglePlan('pro')}
                disabled={updatingPlan}
                className="cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-accent-violet" />
                <span>{updatingPlan ? 'Upgrading...' : 'Upgrade to Pro'}</span>
              </Button>
            ) : (
              <Button
                variant="terminal"
                size="md"
                onClick={() => handleTogglePlan('free')}
                disabled={updatingPlan}
                className="cursor-pointer"
              >
                <span>{updatingPlan ? 'Updating...' : 'Downgrade to Free'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Quotas */}
        <div className="pt-6">
          <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            Daily AI API Usage
          </div>

          {plan === 'pro' ? (
            <div className="flex items-center gap-2 text-success font-medium text-sm py-2">
              <Zap className="w-4 h-4 text-success" />
              <span>Unlimited — Pro tier bypasses all daily rate limits.</span>
            </div>
          ) : (
            <div className="space-y-3 max-w-md">
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-accent-cyan h-full rounded-full transition-all duration-500"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-white/60 font-sans">
                <span>
                  {creditsUsed} / {maxCredits} requests used today
                </span>
                <span>{usagePercent}% utilized</span>
              </div>
            </div>
          )}
          <p className="text-xs text-white/30 mt-3 leading-relaxed">
            Local Gemini Nano executions on Chrome are always unlimited and run 100% private on your
            device.
          </p>
        </div>
      </div>

      {/* Plan Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Free Card */}
        <div
          className={`p-6 md:p-8 rounded-2xl border transition-all ${
            plan === 'free'
              ? 'bg-surface border-white/20 shadow-lg'
              : 'bg-surface/50 border-white/5 opacity-80 hover:opacity-100'
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
            Starter
          </div>
          <div className="text-xl font-bold text-white mb-1">Free</div>
          <div className="text-2xl font-extrabold text-white mb-6">
            $0 <span className="text-xs font-normal text-white/40">/ month</span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2.5 text-white/80">
              <Check className="w-4 h-4 text-accent-cyan shrink-0" />
              <span>50 AI API requests / day</span>
            </div>
            <div className="flex items-center gap-2.5 text-white/80">
              <Check className="w-4 h-4 text-accent-cyan shrink-0" />
              <span>Local Gemini Nano support</span>
            </div>
            <div className="flex items-center gap-2.5 text-white/80">
              <Check className="w-4 h-4 text-accent-cyan shrink-0" />
              <span>Local alias shortcut rules</span>
            </div>
            <div className="flex items-center gap-2.5 text-white/30">
              <span className="w-4 h-4 flex items-center justify-center text-xs">&times;</span>
              <span className="line-through">Cloud profile sync</span>
            </div>
            <div className="flex items-center gap-2.5 text-white/30">
              <span className="w-4 h-4 flex items-center justify-center text-xs">&times;</span>
              <span className="line-through">Groq Llama-3.3-70B model access</span>
            </div>
          </div>
        </div>

        {/* Pro Card */}
        <div
          className={`p-6 md:p-8 rounded-2xl border transition-all relative ${
            plan === 'pro'
              ? 'bg-surface border-accent-violet/50 shadow-lg shadow-accent-violet/5'
              : 'bg-surface/70 border-accent-violet/30 hover:border-accent-violet/60'
          }`}
        >
          <div className="absolute top-6 right-6">
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-accent-violet/20 border border-accent-violet/40 text-accent-violet font-bold uppercase tracking-wider">
              Popular
            </span>
          </div>

          <div className="text-xs font-semibold uppercase tracking-wider text-accent-violet mb-2">
            Professional
          </div>
          <div className="text-xl font-bold text-white mb-1">Pro</div>
          <div className="text-2xl font-extrabold text-white mb-6">
            $9 <span className="text-xs font-normal text-white/40">/ month</span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2.5 text-white/90">
              <Check className="w-4 h-4 text-accent-cyan shrink-0" />
              <span>Unlimited AI requests</span>
            </div>
            <div className="flex items-center gap-2.5 text-white/90">
              <Check className="w-4 h-4 text-accent-cyan shrink-0" />
              <span>Groq Llama-3.3-70B Cloud Model</span>
            </div>
            <div className="flex items-center gap-2.5 text-white/90">
              <Check className="w-4 h-4 text-accent-cyan shrink-0" />
              <span>Continuous Cloud Profile Sync</span>
            </div>
            <div className="flex items-center gap-2.5 text-white/90">
              <Check className="w-4 h-4 text-accent-cyan shrink-0" />
              <span>Custom Skill Sandbox execution</span>
            </div>
            <div className="flex items-center gap-2.5 text-white/90">
              <Check className="w-4 h-4 text-accent-cyan shrink-0" />
              <span>Priority Support & Updates</span>
            </div>
          </div>
        </div>
      </div>

      {/* Support footnote */}
      <div className="flex items-center gap-2 text-white/40 text-xs">
        <HelpCircle className="w-4 h-4 shrink-0" />
        <span>
          Need custom enterprise quotas or team billing?{' '}
          <a
            href="mailto:support@cognilot.app"
            className="text-accent-cyan hover:underline transition-colors"
          >
            Contact support
          </a>
        </span>
      </div>
    </DocLayout>
  );
}
