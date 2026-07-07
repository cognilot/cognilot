'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import { RefreshCw, Trash2, Plus, Check, Save } from 'lucide-react';

interface UserInfo {
  id: string;
  email: string;
  plan: string;
}

interface ProfileData {
  dataLearned: Record<string, any>;
  onboardingCompleted: boolean | null;
}

/**
 * Memory Page Component
 * Renders the terminal-style interface to view and edit the user's AI-learned brain profile.
 */
export default function MemoryPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [showSavedMessage, setShowSavedMessage] = useState(false);

  // States for adding custom key-value pairs
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const supabase = createBrowserClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''
  );

  const fetchProfile = async () => {
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
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const data = await response.json();
      setUser(data.user);
      setProfile(data.profile);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load profile memory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProfile();
  }, []);

  const handleFieldChange = (key: string, value: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      dataLearned: {
        ...profile.dataLearned,
        [key]: value,
      },
    });
  };

  const handleDeleteField = (key: string) => {
    if (!profile) return;
    const updatedLearned = { ...profile.dataLearned };
    delete updatedLearned[key];
    setProfile({
      ...profile,
      dataLearned: updatedLearned,
    });
    toast.success(`Removed memory key: ${key}`);
  };

  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newKey.trim() || !newValue.trim()) return;

    const normalizedKey = newKey
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    if (profile.dataLearned[normalizedKey] !== undefined) {
      toast.error(`Key "${normalizedKey}" already exists.`);
      return;
    }

    setProfile({
      ...profile,
      dataLearned: {
        ...profile.dataLearned,
        [normalizedKey]: newValue,
      },
    });

    setNewKey('');
    setNewValue('');
    toast.success(`Added memory key: ${normalizedKey}`);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setShowSavedMessage(false);

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
          dataLearned: profile.dataLearned,
        }),
      });

      if (!response.ok) {
        throw new Error('Save failed');
      }

      setShowSavedMessage(true);
      toast.success('Cognilot memory synced successfully.');
      setTimeout(() => setShowSavedMessage(false), 4000);
    } catch (err) {
      console.error(err);
      toast.error('Failed to sync changes with the cloud.');
    } finally {
      setSaving(false);
    }
  };

  // Preset categories for clean layout grouping
  const coreFields = [
    { key: 'first_name', label: 'first_name', placeholder: 'John' },
    { key: 'last_name', label: 'last_name', placeholder: 'Doe' },
    { key: 'email', label: 'contact_email', placeholder: 'john.doe@example.com' },
    { key: 'phone', label: 'phone_number', placeholder: '+1 (555) 0199' },
    { key: 'location', label: 'location_address', placeholder: 'San Francisco, CA' },
  ];

  const socialFields = [
    { key: 'github_url', label: 'github_profile', placeholder: 'https://github.com/username' },
    {
      key: 'linkedin_url',
      label: 'linkedin_profile',
      placeholder: 'https://linkedin.com/in/username',
    },
    { key: 'portfolio_url', label: 'portfolio_site', placeholder: 'https://username.dev' },
  ];

  // Any keys in dataLearned that aren't core or social, and aren't bio
  const customEntries = profile
    ? Object.entries(profile.dataLearned).filter(([k]) => {
        const isCore = coreFields.some((f) => f.key === k);
        const isSocial = socialFields.some((f) => f.key === k);
        return !isCore && !isSocial && k !== 'bio';
      })
    : [];

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto font-mono text-[13px] text-white/30 space-y-6">
        <div className="animate-pulse">// scanning_cognitive_database.sh...</div>
        <div className="h-64 bg-white/2 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in font-mono text-[13px]">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-accent-violet">#</span> memory.md
        </h1>
        <div className="text-white/40 flex items-center justify-between">
          <span>{'// View and modify facts the AI assistant has learned about you'}</span>
          <button
            onClick={fetchProfile}
            className="text-white/30 hover:text-white/70 transition-colors flex items-center gap-1.5"
            title="Reload from server"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            [RELOAD]
          </button>
        </div>
      </div>

      {/* Main Terminal Window */}
      <div className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden relative">
        {/* IDE Title Bar */}
        <div className="px-5 py-4 border-b border-white/5 bg-white/3 flex items-center gap-2 select-none">
          <div className="flex gap-1.5 mr-4">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <div className="text-white/30 text-[10px] uppercase tracking-widest font-sans font-bold flex-1 text-right">
            profile/memory.md
          </div>
        </div>

        {/* Editor Body */}
        <div className="p-6 md:p-8 space-y-8">
          {/* Section: Core Profile Data */}
          <div>
            <div className="text-white/30 mb-4 select-none font-bold uppercase tracking-wider text-[11px]">
              ## core_profile_data
            </div>
            <div className="space-y-3">
              {coreFields.map((field) => (
                <div
                  key={field.key}
                  className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1"
                >
                  <div className="text-accent-violet select-none w-[180px] shrink-0 py-1.5 flex items-center font-semibold">
                    {field.label}
                    <span className="text-accent-violet/50 ml-1">:</span>
                  </div>
                  <input
                    type="text"
                    value={profile?.dataLearned[field.key] ?? ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className="bg-transparent text-white flex-1 py-1.5 min-w-0 placeholder:text-white/10 focus:bg-white/5 rounded px-2 -mx-2 transition-colors outline-none"
                    placeholder={field.placeholder}
                  />
                  {profile?.dataLearned[field.key] && (
                    <button
                      onClick={() => handleDeleteField(field.key)}
                      className="text-white/15 hover:text-red-400 p-1.5 transition-colors self-center"
                      title="Clear field"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {/* Bio block (large textarea) */}
              <div className="flex flex-col md:flex-row relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-3">
                <div className="text-accent-violet select-none w-[180px] shrink-0 py-1 flex items-center font-semibold">
                  profile_bio
                  <span className="text-accent-violet/50 ml-1">:</span>
                </div>
                <textarea
                  value={profile?.dataLearned['bio'] ?? ''}
                  onChange={(e) => handleFieldChange('bio', e.target.value)}
                  className="bg-transparent text-white flex-1 py-1 min-w-0 placeholder:text-white/10 focus:bg-white/5 rounded px-2 -mx-2 transition-colors outline-none resize-y min-h-[80px]"
                  placeholder="Describe your professional background, core skills, and goals..."
                />
              </div>
            </div>
          </div>

          {/* Section: Social & Profiles */}
          <div>
            <div className="text-white/30 mb-4 select-none font-bold uppercase tracking-wider text-[11px]">
              ## professional_networks
            </div>
            <div className="space-y-3">
              {socialFields.map((field) => (
                <div
                  key={field.key}
                  className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1"
                >
                  <div className="text-accent-violet select-none w-[180px] shrink-0 py-1.5 flex items-center font-semibold">
                    {field.label}
                    <span className="text-accent-violet/50 ml-1">:</span>
                  </div>
                  <input
                    type="url"
                    value={profile?.dataLearned[field.key] ?? ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className="bg-transparent text-white flex-1 py-1.5 min-w-0 placeholder:text-white/10 focus:bg-white/5 rounded px-2 -mx-2 transition-colors outline-none"
                    placeholder={field.placeholder}
                  />
                  {profile?.dataLearned[field.key] && (
                    <button
                      onClick={() => handleDeleteField(field.key)}
                      className="text-white/15 hover:text-red-400 p-1.5 transition-colors self-center"
                      title="Clear URL"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section: AI-Learned Facts */}
          <div>
            <div className="text-white/30 mb-4 select-none font-bold uppercase tracking-wider text-[11px]">
              ## cognitive_memory_facts
            </div>

            {customEntries.length === 0 ? (
              <div className="text-white/20 select-none py-3 px-2 border border-dashed border-white/5 rounded-lg text-center">
                // No custom or AI-extracted facts registered in memory block.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 border border-white/5 rounded-lg p-2 bg-white/[0.01]">
                {customEntries.map(([key, val]) => (
                  <div
                    key={key}
                    className="flex items-start gap-4 py-2 px-3 hover:bg-white/5 rounded transition-colors"
                  >
                    <span
                      className="text-accent-cyan font-bold select-none shrink-0 w-[160px] truncate"
                      title={key}
                    >
                      {key}
                    </span>
                    <input
                      type="text"
                      value={val ?? ''}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      className="bg-transparent text-white flex-1 min-w-0 outline-none placeholder:text-white/10"
                    />
                    <button
                      onClick={() => handleDeleteField(key)}
                      className="text-white/30 hover:text-red-400 p-1 transition-colors"
                      title="Delete fact key"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sub-form: Add Custom Memory Fact */}
          <form
            onSubmit={handleAddCustomField}
            className="border-t border-white/5 pt-6 flex flex-col sm:flex-row gap-4 items-end"
          >
            <div className="w-full sm:w-1/3">
              <label className="text-white/40 block text-[11px] mb-1 select-none font-bold uppercase tracking-wider">
                custom_key:
              </label>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="e.g. key_skills"
                className="w-full bg-transparent border border-white/10 text-white rounded p-2 focus:border-white/20 outline-none"
              />
            </div>
            <div className="w-full sm:w-1/2">
              <label className="text-white/40 block text-[11px] mb-1 select-none font-bold uppercase tracking-wider">
                fact_value:
              </label>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="React, TypeScript, Next.js"
                className="w-full bg-transparent border border-white/10 text-white rounded p-2 focus:border-white/20 outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded flex items-center gap-1.5 select-none hover:text-accent-cyan transition-colors w-full sm:w-auto justify-center font-bold"
            >
              <Plus className="w-3.5 h-3.5 text-accent-cyan" />
              [ADD]
            </button>
          </form>
        </div>

        {/* Footer controls bar */}
        <div className="px-6 py-5 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="py-2.5 px-6 bg-white/5 hover:bg-white/10 text-white rounded transition-colors flex items-center gap-2 border border-white/10 group disabled:opacity-50 select-none cursor-pointer"
            >
              <span className="text-accent-violet font-bold opacity-50 group-hover:opacity-100 transition-opacity">
                {saving ? '::' : '>'}
              </span>
              {saving ? './syncing_memory.sh...' : './save_profile.sh'}
            </button>

            {showSavedMessage && (
              <span className="text-green-400 flex items-center gap-1 animate-fade-in font-bold">
                <Check className="w-4 h-4" />
                // sync_complete_ok
              </span>
            )}
          </div>
          <div className="text-white/20 text-[10px] select-none uppercase tracking-widest hidden sm:block">
            // status: synced
          </div>
        </div>
      </div>
    </div>
  );
}
