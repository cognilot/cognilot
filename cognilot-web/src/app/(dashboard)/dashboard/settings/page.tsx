'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import { Shield, Eye, EyeOff, Save, Trash2, Check } from 'lucide-react';

interface ExtSettings {
  ghostTextEnabled: boolean;
  autocompleteDelay: number;
  theme: string;
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
        toast.success(`BYOK config updated. Current provider: ${provider}`);
      } else {
        localStorage.removeItem('cognilot_byok_config');
        await checkSessionStatus();
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
      <div className="p-8 max-w-4xl mx-auto font-mono text-[13px] text-white/30 space-y-6 animate-pulse">
        <div>// reading_system_configurations.sh...</div>
        <div className="h-64 bg-white/2 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in font-mono text-[13px]">
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-accent-violet">#</span> settings.md
        </h1>
        <p className="text-white/40">
          {'// Configure BYOK LLM models, extension behavior, and database security'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Columns (Form & Prefs) */}
        <div className="lg:col-span-2 space-y-8">
          {/* BYOK Config Window */}
          <div className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 bg-white/3 flex items-center gap-2 select-none">
              <div className="flex gap-1.5 mr-4">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="text-white/30 text-[10px] uppercase tracking-widest font-sans font-bold flex-1 text-right">
                config/byok.sh
              </div>
            </div>

            <form onSubmit={handleSaveByok} className="p-6 space-y-5">
              <div className="flex justify-between items-center mb-2">
                <div className="text-white/30 select-none font-bold uppercase tracking-wider text-[11px]">
                  ## inference_providers_config
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-accent-violet font-bold select-none">
                  ACTIVE_ROUTE: [{activeProviderBadge}]
                </span>
              </div>

              {/* Provider */}
              <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                <div className="text-accent-violet select-none w-[140px] shrink-0 py-1.5 flex items-center font-semibold">
                  llm_provider
                  <span className="text-accent-violet/50 ml-1">:</span>
                </div>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as any)}
                  className="bg-transparent text-white flex-1 py-1.5 min-w-0 placeholder:text-white/10 focus:bg-white/5 rounded px-2 -mx-2 transition-colors outline-none cursor-pointer border-none"
                >
                  <option className="bg-slate-950 text-white" value="groq">
                    Groq (Default Backend proxy)
                  </option>
                  <option className="bg-slate-950 text-white" value="openai">
                    OpenAI (Direct client-side)
                  </option>
                  <option className="bg-slate-950 text-white" value="anthropic">
                    Anthropic (Direct client-side)
                  </option>
                </select>
              </div>

              {/* API Key */}
              <div className="flex relative items-center hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                <div className="text-accent-violet select-none w-[140px] shrink-0 py-1.5 flex items-center font-semibold">
                  api_secret_key
                  <span className="text-accent-violet/50 ml-1">:</span>
                </div>
                <div className="flex-1 flex items-center">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      apiKey
                        ? '••••••••••••••••••••'
                        : '// leave empty to use server default / local Nano'
                    }
                    className="bg-transparent text-white flex-1 py-1.5 min-w-0 placeholder:text-white/10 focus:bg-white/5 rounded px-2 -mx-2 transition-colors outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-white/30 hover:text-white/70 p-1.5 transition-colors cursor-pointer select-none"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Model Override */}
              <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                <div className="text-accent-violet select-none w-[140px] shrink-0 py-1.5 flex items-center font-semibold">
                  model_override
                  <span className="text-accent-violet/50 ml-1">:</span>
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
                  className="bg-transparent text-white flex-1 py-1.5 min-w-0 placeholder:text-white/10 focus:bg-white/5 rounded px-2 -mx-2 transition-colors outline-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingByok}
                  className="py-2.5 px-5 bg-white/5 hover:bg-white/10 text-white rounded transition-colors flex items-center gap-2 border border-white/10 group font-bold select-none cursor-pointer"
                >
                  <span className="text-accent-violet font-bold opacity-50 group-hover:opacity-100 transition-opacity">
                    {'>'}
                  </span>
                  {savingByok ? './saving...' : './save_byok.sh'}
                </button>
                <div className="text-white/20 select-none text-[11px]">
                  // keys are stored securely in local cache
                </div>
              </div>
            </form>
          </div>

          {/* Preferences Config Window */}
          <div className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 bg-white/3 flex items-center gap-2 select-none">
              <div className="flex gap-1.5 mr-4">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="text-white/30 text-[10px] uppercase tracking-widest font-sans font-bold flex-1 text-right">
                config/preferences.sh
              </div>
            </div>

            <form onSubmit={handleSavePrefs} className="p-6 space-y-5">
              <div className="text-white/30 select-none font-bold uppercase tracking-wider text-[11px]">
                ## browser_extension_preferences
              </div>

              {/* Ghost Text */}
              <div className="flex relative items-center hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1.5">
                <div className="text-accent-violet select-none w-[140px] shrink-0 flex items-center font-semibold">
                  ghost_autocomplete
                  <span className="text-accent-violet/50 ml-1">:</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPrefs({ ...prefs, ghostTextEnabled: !prefs.ghostTextEnabled })}
                  className={`px-3 py-1 font-bold text-xs rounded transition-colors cursor-pointer select-none ${
                    prefs.ghostTextEnabled
                      ? 'bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20'
                      : 'bg-white/5 border border-white/10 text-white/30 hover:bg-white/10'
                  }`}
                >
                  {prefs.ghostTextEnabled ? '[ENABLED]' : '[DISABLED]'}
                </button>
                <span className="text-white/20 select-none ml-4 text-[11px]">
                  // renders gray shadow values inside inputs
                </span>
              </div>

              {/* Autocomplete Delay */}
              <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                <div className="text-accent-violet select-none w-[140px] shrink-0 py-1.5 flex items-center font-semibold">
                  trigger_delay_ms
                  <span className="text-accent-violet/50 ml-1">:</span>
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
                  <span className="text-white/20 select-none text-[11px]">
                    // wait period before triggering AI inference scan
                  </span>
                </div>
              </div>

              {/* UI Theme */}
              <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                <div className="text-accent-violet select-none w-[140px] shrink-0 py-1.5 flex items-center font-semibold">
                  ui_console_theme
                  <span className="text-accent-violet/50 ml-1">:</span>
                </div>
                <span className="py-1.5 text-white/60">
                  dark_terminal{' '}
                  <span className="text-white/20 text-[11px] select-none">
                    (only option available)
                  </span>
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPrefs}
                  className="py-2.5 px-5 bg-white/5 hover:bg-white/10 text-white rounded transition-colors flex items-center gap-2 border border-white/10 group font-bold select-none cursor-pointer"
                >
                  <span className="text-accent-violet font-bold opacity-50 group-hover:opacity-100 transition-opacity">
                    {'>'}
                  </span>
                  {savingPrefs ? './saving...' : './save_preferences.sh'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Danger Zone */}
        <div>
          <div className="bg-bg-primary/90 backdrop-blur-2xl border border-red-500/20 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-red-500/10 bg-red-950/10 flex items-center gap-2 select-none">
              <span className="text-red-400 font-sans text-[10px] uppercase font-bold tracking-widest">
                CRITICAL_ZONE.sh
              </span>
            </div>

            <div className="p-6 space-y-6">
              <div className="text-red-400/60 select-none font-bold uppercase tracking-wider text-[11px]">
                ## destructive_procedures
              </div>

              {/* Clear Memory */}
              <div className="space-y-2">
                <div className="text-white/80 font-bold font-mono">clear_ai_memory</div>
                <div className="text-white/30 text-[11px] leading-relaxed">
                  Permanently deletes the entire AI-learned database cache profile facts from your
                  profile. Aliases are untouched.
                </div>
                <button
                  type="button"
                  onClick={handleClearMemory}
                  disabled={clearingMemory}
                  className="w-full py-2 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded transition-colors text-[11px] font-bold select-none cursor-pointer"
                >
                  {clearingMemory ? 'WIPING_MEMORY...' : 'EXECUTE CLEAR_MEM_FACTS'}
                </button>
              </div>

              {/* Delete Account */}
              <div className="space-y-2 border-t border-white/5 pt-4">
                <div className="text-white/40 font-bold font-mono">terminate_account</div>
                <div className="text-white/20 text-[11px] leading-relaxed">
                  Wipes your database rows and terminates credentials. Disables extension client
                  sync immediately.
                </div>
                <button
                  type="button"
                  className="w-full py-2 border border-white/5 bg-white/2 text-white/20 rounded text-[11px] font-bold select-none cursor-not-allowed"
                  disabled
                >
                  CONTACT_ADMIN_TO_DELETE
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
