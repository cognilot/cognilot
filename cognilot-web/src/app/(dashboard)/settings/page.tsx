'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import { Shield, Eye, EyeOff, Trash2, Check } from 'lucide-react';
import { extensionBridge } from '@/utils/extensionBridge';
import { ReadmeLayout } from '@/components/layout/ReadmeLayout';
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

  const supabase = createBrowserClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''
  );

  const checkSessionStatus = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      setActiveProviderBadge('groq-llama3');
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

      // PATCH /api/profile with empty dataLearned resets the DB memory!
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
      <ReadmeLayout filename="settings.md" description="// loading system configurations...">
        <div className="h-64 bg-white/2 rounded-xl animate-pulse" />
      </ReadmeLayout>
    );
  }

  return (
    <ReadmeLayout
      filename="settings.md"
      description="Configure BYOK LLM models, extension behavior, and database security"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Columns (Form & Prefs) */}
        <div className="lg:col-span-2 space-y-8">
          {/* BYOK Config */}
          <div className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            <form onSubmit={handleSaveByok} className="p-6 space-y-5">
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs font-semibold text-white/30 uppercase tracking-wider">
                  LLM Provider
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-accent-violet/10 border border-accent-violet/20 text-accent-violet font-bold">
                  {activeProviderBadge}
                </span>
              </div>

              <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                <div className="text-white/60 font-medium w-[140px] shrink-0 py-1.5">Provider</div>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as any)}
                  className="bg-transparent text-white flex-1 py-1.5 min-w-0 focus:bg-white/5 rounded px-2 -mx-2 transition-colors outline-none cursor-pointer border-none"
                >
                  <option className="bg-slate-950 text-white" value="groq">
                    Groq (Default Backend)
                  </option>
                  <option className="bg-slate-950 text-white" value="openai">
                    OpenAI (Direct)
                  </option>
                  <option className="bg-slate-950 text-white" value="anthropic">
                    Anthropic (Direct)
                  </option>
                </select>
              </div>

              <div className="flex relative items-center hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                <div className="text-white/60 font-medium w-[140px] shrink-0 py-1.5">API Key</div>
                <div className="flex-1 flex items-center">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      apiKey ? '••••••••••••••••••••' : 'Leave empty to use server default'
                    }
                    className="bg-transparent text-white flex-1 py-1.5 min-w-0 placeholder:text-white/15 focus:bg-white/5 rounded px-2 -mx-2 transition-colors outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-white/30 hover:text-white/70 p-1.5 transition-colors cursor-pointer"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                <div className="text-white/60 font-medium w-[140px] shrink-0 py-1.5">
                  Model Override
                </div>
                <input
                  type="text"
                  value={modelOverride}
                  onChange={(e) => setModelOverride(e.target.value)}
                  placeholder={
                    provider === 'groq'
                      ? 'llama-3.3-70b-versatile'
                      : provider === 'openai'
                        ? 'gpt-4o-mini'
                        : 'claude-3-haiku-20240307'
                  }
                  className="bg-transparent text-white flex-1 py-1.5 min-w-0 placeholder:text-white/15 focus:bg-white/5 rounded px-2 -mx-2 transition-colors outline-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Button variant="terminal" size="sm" type="submit" disabled={savingByok}>
                  {savingByok ? 'Saving...' : 'Save Configuration'}
                </Button>
                <div className="text-white/20 text-[11px]">
                  Keys stored locally in browser cache
                </div>
              </div>
            </form>
          </div>

          {/* Preferences */}
          <div className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            <form onSubmit={handleSavePrefs} className="p-6 space-y-5">
              <div className="text-xs font-semibold text-white/30 uppercase tracking-wider">
                Extension Preferences
              </div>

              <div className="flex relative items-center hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1.5">
                <div className="text-white/60 font-medium w-[140px] shrink-0">Ghost Text</div>
                <button
                  type="button"
                  onClick={() => setPrefs({ ...prefs, ghostTextEnabled: !prefs.ghostTextEnabled })}
                  className={`px-3 py-1 font-medium text-xs rounded transition-colors cursor-pointer ${
                    prefs.ghostTextEnabled
                      ? 'bg-success/10 border border-success/20 text-success hover:bg-success/20'
                      : 'bg-white/5 border border-white/10 text-white/30 hover:bg-white/10'
                  }`}
                >
                  {prefs.ghostTextEnabled ? 'Enabled' : 'Disabled'}
                </button>
                <span className="text-white/20 ml-4 text-[11px]">
                  Shows gray shadow values inside inputs
                </span>
              </div>

              <div className="flex relative items-center hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1.5">
                <div className="text-white/60 font-medium w-[140px] shrink-0">Profile Context</div>
                <button
                  type="button"
                  onClick={() =>
                    setPrefs({ ...prefs, useProfileContext: !prefs.useProfileContext })
                  }
                  className={`px-3 py-1 font-medium text-xs rounded transition-colors cursor-pointer ${
                    prefs.useProfileContext
                      ? 'bg-success/10 border border-success/20 text-success hover:bg-success/20'
                      : 'bg-white/5 border border-white/10 text-white/30 hover:bg-white/10'
                  }`}
                >
                  {prefs.useProfileContext ? 'Enabled' : 'Disabled'}
                </button>
                <span className="text-white/20 ml-4 text-[11px]">
                  Uses profile data and aliases for autofills
                </span>
              </div>

              <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                <div className="text-white/60 font-medium w-[140px] shrink-0 py-1.5">
                  Trigger Delay
                </div>
                <div className="flex-1 flex items-center gap-4">
                  <input
                    type="number"
                    value={prefs.autocompleteDelay}
                    onChange={(e) =>
                      setPrefs({ ...prefs, autocompleteDelay: parseInt(e.target.value) || 0 })
                    }
                    min="0"
                    max="5000"
                    className="bg-transparent text-white py-1.5 max-w-[80px] border-b border-white/10 outline-none text-center"
                  />
                  <span className="text-white/20 text-[11px]">ms before triggering AI scan</span>
                </div>
              </div>

              <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                <div className="text-white/60 font-medium w-[140px] shrink-0 py-1.5">Theme</div>
                <span className="py-1.5 text-white/60">
                  Dark <span className="text-white/20 text-[11px]">(only option available)</span>
                </span>
              </div>

              <div className="pt-2">
                <Button variant="terminal" size="sm" type="submit" disabled={savingPrefs}>
                  {savingPrefs ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Danger Zone */}
        <div>
          <div className="bg-bg-primary/90 backdrop-blur-2xl border border-red-500/20 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6 space-y-6">
              <div className="text-red-400/60 font-semibold uppercase tracking-wider text-xs">
                Danger Zone
              </div>

              <div className="space-y-2">
                <div className="text-white/80 font-medium">Clear AI Memory</div>
                <div className="text-white/30 text-[11px] leading-relaxed">
                  Permanently deletes all AI-learned facts from your profile. Aliases are untouched.
                </div>
                <button
                  type="button"
                  onClick={handleClearMemory}
                  disabled={clearingMemory}
                  className="w-full py-2 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded transition-colors text-[11px] font-bold cursor-pointer"
                >
                  {clearingMemory ? 'Clearing...' : 'Clear AI Memory'}
                </button>
              </div>

              <div className="space-y-2 border-t border-white/5 pt-4">
                <div className="text-white/40 font-medium">Delete Account</div>
                <div className="text-white/20 text-[11px] leading-relaxed">
                  Wipes your data and terminates credentials. Disables extension sync immediately.
                </div>
                <button
                  type="button"
                  className="w-full py-2 border border-white/5 bg-white/2 text-white/20 rounded text-[11px] font-bold cursor-not-allowed"
                  disabled
                >
                  Contact Support to Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ReadmeLayout>
  );
}
