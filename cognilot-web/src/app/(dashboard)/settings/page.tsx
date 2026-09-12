'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Eye, EyeOff, Trash2, Sliders, Key, ShieldAlert } from 'lucide-react';
import { extensionBridge } from '@/utils/extensionBridge';
import { DocLayout } from '@/components/layout/DocLayout';
import { Button } from '@/components/ui/button';

interface ExtSettings {
  ghostTextEnabled: boolean;
  autocompleteDelay: number;
  theme: string;
  useProfileContext: boolean;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [savingByok, setSavingByok] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [clearingMemory, setClearingMemory] = useState(false);

  // BYOK Settings
  const [provider, setProvider] = useState<'openai' | 'anthropic' | 'groq'>('groq');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [modelOverride, setModelOverride] = useState('');
  const [activeProviderBadge, setActiveProviderBadge] = useState('gemini-nano');

  // Extension Preferences
  const [prefs, setPrefs] = useState<ExtSettings>({
    ghostTextEnabled: true,
    autocompleteDelay: 300,
    theme: 'dark',
    useProfileContext: true,
  });

  const checkSessionStatus = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      setActiveProviderBadge('groq-gpt-oss');
    } else {
      setActiveProviderBadge('gemini-nano');
    }
  };

  useEffect(() => {
    // Load local storage extension preferences
    const savedPrefs = localStorage.getItem('cognilot_extension_settings');
    if (savedPrefs) {
      try {
        setPrefs(JSON.parse(savedPrefs));
      } catch (err) {
        console.error(err);
      }
    }

    // Load saved BYOK configuration from localStorage
    const savedByok = localStorage.getItem('cognilot_byok_config');
    if (savedByok) {
      try {
        const parsed = JSON.parse(savedByok);
        setProvider(parsed.provider || 'groq');
        setApiKey(parsed.apiKey || '');
        setModelOverride(parsed.model || '');
        setActiveProviderBadge('byok-override');
      } catch (err) {
        console.error(err);
      }
    } else {
      // Default to Nano/Groq badge based on auth status
      checkSessionStatus();
    }
    setLoading(false);
  }, []);

  const handleSaveByok = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingByok(true);

    try {
      const config = {
        provider,
        apiKey: apiKey.trim(),
        model: modelOverride.trim() || undefined,
      };

      if (apiKey.trim()) {
        localStorage.setItem('cognilot_byok_config', JSON.stringify(config));
        setActiveProviderBadge('byok-override');
        extensionBridge.syncByok(config);
        toast.success(`BYOK config updated. Current provider: ${provider}`);
      } else {
        localStorage.removeItem('cognilot_byok_config');
        await checkSessionStatus();
        extensionBridge.syncByok({ provider: 'groq', apiKey: '', model: '' });
        toast.success('BYOK config cleared. Reverted to standard routing.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to save BYOK configuration.');
    } finally {
      setSavingByok(false);
    }
  };

  const handleSavePrefs = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrefs(true);

    try {
      localStorage.setItem('cognilot_extension_settings', JSON.stringify(prefs));

      const mappedPrefs = {
        copilotSuggestions: {
          enabled: prefs.ghostTextEnabled,
          ghostText: prefs.ghostTextEnabled,
          useProfileContext: prefs.useProfileContext !== false,
        },
      };
      extensionBridge.syncSettings(mappedPrefs);

      // Dispatch storage event so content script or sidebar is notified if open
      window.dispatchEvent(new Event('storage'));

      toast.success('Extension preferences saved.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save preferences.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleClearMemory = async () => {
    const confirmClear = confirm(
      'WARNING: This will permanently wipe all AI-learned facts in your profile. Your alias shortcuts will remain intact. Proceed?'
    );
    if (!confirmClear) return;

    setClearingMemory(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const apiBase = process.env['NEXT_PUBLIC_API_URL'] || '';

      const response = await fetch(`${apiBase}/api/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          dataLearned: {},
        }),
      });

      if (!response.ok) {
        throw new Error('Memory clear failed');
      }

      toast.success('Cognitive memory database cleared successfully.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to wipe cognitive database.');
    } finally {
      setClearingMemory(false);
    }
  };

  if (loading) {
    return (
      <DocLayout
        filename="Settings"
        description="Configure BYOK LLM models, extension behavior, and database security"
      >
        <div className="h-72 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />
      </DocLayout>
    );
  }

  return (
    <DocLayout
      filename="Settings"
      description="Configure BYOK LLM models, extension behavior, and database security"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Columns: BYOK & Extension Settings */}
        <div className="lg:col-span-2 space-y-8">
          {/* BYOK Config Card */}
          <div className="bg-surface border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-lg">
            <div className="flex items-center justify-between pb-6 border-b border-white/5 mb-6">
              <div className="flex items-center gap-2.5">
                <Key className="w-5 h-5 text-accent-violet" />
                <div>
                  <h2 className="text-base font-bold text-white">Custom LLM (BYOK)</h2>
                  <p className="text-xs text-dim mt-0.5">
                    Connect your own API key to bypass server models
                  </p>
                </div>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-mono bg-accent-violet/10 border border-accent-violet/30 text-accent-violet">
                {activeProviderBadge}
              </span>
            </div>

            <form onSubmit={handleSaveByok} className="space-y-5">
              {/* Provider Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/80">AI Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as 'openai' | 'anthropic' | 'groq')}
                  className="w-full bg-white/[0.03] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:border-accent-violet focus:ring-1 focus:ring-accent-violet outline-none transition-colors cursor-pointer"
                >
                  <option className="bg-[#0a0a0f] text-white" value="groq">
                    Groq (Default Cloud Llama-3.3-70B)
                  </option>
                  <option className="bg-[#0a0a0f] text-white" value="openai">
                    OpenAI (Direct API)
                  </option>
                  <option className="bg-[#0a0a0f] text-white" value="anthropic">
                    Anthropic (Direct API)
                  </option>
                </select>
              </div>

              {/* API Key */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/80">API Key</label>
                <div className="relative flex items-center">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      apiKey
                        ? '••••••••••••••••••••'
                        : 'Leave empty to use default server inference'
                    }
                    className="w-full bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 py-2.5 pr-11 text-sm focus:border-accent-violet focus:ring-1 focus:ring-accent-violet outline-none font-mono text-xs transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-white/40">
                  Your keys are encrypted in browser local storage and never stored on our servers.
                </p>
              </div>

              {/* Model Override */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/80">
                  Model Identifier (Optional)
                </label>
                <input
                  type="text"
                  value={modelOverride}
                  onChange={(e) => setModelOverride(e.target.value)}
                  placeholder={
                    provider === 'groq'
                      ? 'llama-3.3-70b-versatile'
                      : provider === 'openai'
                        ? 'gpt-4o-mini'
                        : 'claude-3-5-haiku-latest'
                  }
                  className="w-full bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 rounded-xl px-4 py-2.5 text-sm focus:border-accent-violet focus:ring-1 focus:ring-accent-violet outline-none font-mono text-xs transition-colors"
                />
              </div>

              <div className="pt-2">
                <Button variant="solid" size="md" type="submit" disabled={savingByok}>
                  <span>{savingByok ? 'Saving...' : 'Save LLM Settings'}</span>
                </Button>
              </div>
            </form>
          </div>

          {/* Extension Preferences Card */}
          <div className="bg-surface border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-2.5 pb-6 border-b border-white/5 mb-6">
              <Sliders className="w-5 h-5 text-accent-cyan" />
              <div>
                <h2 className="text-base font-bold text-white">Extension Behavior</h2>
                <p className="text-xs text-dim mt-0.5">
                  Control how Cognilot interacts on webpages
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePrefs} className="space-y-6">
              {/* Ghost text toggle */}
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <div>
                  <div className="text-sm font-semibold text-white">Ghost Text Suggestions</div>
                  <div className="text-xs text-dim mt-0.5">
                    Show inline gray autocomplete predictions inside web inputs
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPrefs({ ...prefs, ghostTextEnabled: !prefs.ghostTextEnabled })}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    prefs.ghostTextEnabled
                      ? 'bg-accent-cyan justify-end'
                      : 'bg-white/10 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                </button>
              </div>

              {/* Profile Context toggle */}
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <div>
                  <div className="text-sm font-semibold text-white">Profile Memory Context</div>
                  <div className="text-xs text-dim mt-0.5">
                    Use your learned personal facts and aliases to improve suggestions
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPrefs({ ...prefs, useProfileContext: !prefs.useProfileContext })
                  }
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    prefs.useProfileContext
                      ? 'bg-accent-cyan justify-end'
                      : 'bg-white/10 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                </button>
              </div>

              {/* Delay */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/80">
                  Trigger Scan Delay (ms)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={prefs.autocompleteDelay}
                    onChange={(e) =>
                      setPrefs({ ...prefs, autocompleteDelay: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                    max="5000"
                    className="bg-white/[0.03] border border-white/10 text-white rounded-xl px-4 py-2 text-sm w-32 font-mono text-center focus:border-accent-cyan outline-none"
                  />
                  <span className="text-xs text-dim">
                    milliseconds debounce before AI prediction
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button variant="solid" size="md" type="submit" disabled={savingPrefs}>
                  <span>{savingPrefs ? 'Saving...' : 'Save Preferences'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Danger Zone */}
        <div>
          <div className="bg-surface border border-red-500/30 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm mb-4">
              <ShieldAlert className="w-4 h-4" />
              <span>Danger Zone</span>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-white">Clear AI Memory</div>
                <p className="text-xs text-dim leading-relaxed">
                  Permanently wipe all learned personal data and profile facts from your account.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearMemory}
                  disabled={clearingMemory}
                  className="w-full mt-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{clearingMemory ? 'Clearing Memory...' : 'Clear All AI Facts'}</span>
                </Button>
              </div>

              <div className="space-y-2 pt-4 border-t border-white/5">
                <div className="text-sm font-semibold text-white/50">Delete Account</div>
                <p className="text-xs text-white/30 leading-relaxed">
                  To permanently delete your Cognilot account and cloud profile, please contact
                  support.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  className="w-full text-white/20 border border-white/5 cursor-not-allowed"
                >
                  Contact Support
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DocLayout>
  );
}
