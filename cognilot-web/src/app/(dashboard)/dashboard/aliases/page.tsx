'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import { RefreshCw, Trash2, Plus, Edit2, Check, X, Save } from 'lucide-react';

interface Alias {
  id: string;
  label: string;
  value: string;
  category: string;
  createdAt: string;
}

export default function AliasesPage() {
  const [loading, setLoading] = useState(true);
  const [aliases, setAliases] = useState<Alias[]>([]);

  // States for adding a new alias
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [adding, setAdding] = useState(false);

  // States for editing an existing alias
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [updating, setUpdating] = useState(false);

  const supabase = createBrowserClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''
  );

  const fetchAliases = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const apiBase = process.env['NEXT_PUBLIC_API_URL'] || '';
      const response = await fetch(`${apiBase}/api/aliases`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load aliases');
      }

      const data = await response.json();
      setAliases(data.aliases || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load shortcut aliases.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAliases();
  }, []);

  const handleAddAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newValue.trim()) {
      toast.error('Shortcut label and replacement value are required.');
      return;
    }

    setAdding(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const apiBase = process.env['NEXT_PUBLIC_API_URL'] || '';
      const response = await fetch(`${apiBase}/api/aliases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          label: newLabel.trim().toLowerCase().replace(/\s+/g, '_'),
          value: newValue.trim(),
          category: newCategory.trim() || 'general',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create alias');
      }

      const data = await response.json();
      setAliases([...aliases, data.alias]);
      setNewLabel('');
      setNewValue('');
      setNewCategory('general');
      toast.success(`Alias "${data.alias.label}" created successfully.`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create shortcut alias.');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (alias: Alias) => {
    setEditingId(alias.id);
    setEditLabel(alias.label);
    setEditValue(alias.value);
    setEditCategory(alias.category || 'general');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdateAlias = async (id: string) => {
    if (!editLabel.trim() || !editValue.trim()) {
      toast.error('Label and Value are required.');
      return;
    }

    setUpdating(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const apiBase = process.env['NEXT_PUBLIC_API_URL'] || '';
      const response = await fetch(`${apiBase}/api/aliases/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          label: editLabel.trim().toLowerCase().replace(/\s+/g, '_'),
          value: editValue.trim(),
          category: editCategory.trim() || 'general',
        }),
      });

      if (!response.ok) {
        throw new Error('Update failed');
      }

      const data = await response.json();
      setAliases(aliases.map((a) => (a.id === id ? data.alias : a)));
      setEditingId(null);
      toast.success('Alias shortcut updated.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update alias.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAlias = async (id: string, label: string) => {
    if (!confirm(`Are you sure you want to delete alias "${label}"?`)) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const apiBase = process.env['NEXT_PUBLIC_API_URL'] || '';
      const response = await fetch(`${apiBase}/api/aliases/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setAliases(aliases.filter((a) => a.id !== id));
      toast.success(`Alias "${label}" removed.`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete alias.');
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto font-mono text-[13px] text-white/30 space-y-6 animate-pulse">
        <div>// reading_aliases_config.sh...</div>
        <div className="h-64 bg-white/2 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in font-mono text-[13px]">
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-accent-violet">#</span> aliases.md
        </h1>
        <div className="text-white/40 flex items-center justify-between">
          <span>{'// Shorthands and shortcuts that auto-expand when filling forms'}</span>
          <button
            onClick={fetchAliases}
            className="text-white/30 hover:text-white/70 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            [RELOAD]
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden relative">
        {/* Title bar */}
        <div className="px-5 py-4 border-b border-white/5 bg-white/5 flex items-center gap-2 select-none">
          <div className="flex gap-2 mr-4">
            <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
            <div className="w-3 h-3 rounded-full bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
          </div>
          <div className="text-white/30 text-[11px] uppercase tracking-[0.2em] font-sans font-bold flex-1 text-right">
            CONFIG/ALIASES.ENV
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-8">
          {/* Section: Add new Alias */}
          <div>
            <div className="text-white/30 mb-4 select-none font-bold uppercase tracking-wider text-[11px]">
              ## add_alias_shortcut
            </div>

            <form onSubmit={handleAddAlias}>
              {/* shortcut_key row */}
              <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                <span className="text-accent-violet font-semibold w-[160px] md:w-[200px] shrink-0 py-1.5">
                  shortcut_key<span className="text-accent-violet/50">:</span>
                </span>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. my_email"
                  className="bg-transparent text-white flex-1 py-1.5 outline-none placeholder:text-white/10 focus:bg-white/5 rounded px-2 -mx-2 transition-colors"
                />
              </div>

              {/* expanded_value row */}
              <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                <span className="text-accent-violet font-semibold w-[160px] md:w-[200px] shrink-0 py-1.5">
                  expanded_value<span className="text-accent-violet/50">:</span>
                </span>
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="john.doe@example.com"
                  className="bg-transparent text-white flex-1 py-1.5 outline-none placeholder:text-white/10 focus:bg-white/5 rounded px-2 -mx-2 transition-colors"
                />
              </div>

              {/* category row */}
              <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                <span className="text-accent-violet font-semibold w-[160px] md:w-[200px] shrink-0 py-1.5">
                  category<span className="text-accent-violet/50">:</span>
                </span>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="general"
                  className="bg-transparent text-white flex-1 py-1.5 outline-none placeholder:text-white/10 focus:bg-white/5 rounded px-2 -mx-2 transition-colors"
                />
              </div>

              {/* [ADD] button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={adding}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded flex items-center gap-1.5 transition-colors font-bold shrink-0 disabled:opacity-50 select-none cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-accent-cyan" />
                  {adding ? '...' : '[ADD]'}
                </button>
              </div>
            </form>
          </div>

          {/* Section: Alias List */}
          <div>
            <div className="text-white/30 mb-4 select-none font-bold uppercase tracking-wider text-[11px]">
              ## active_aliases_mappings
            </div>

            {aliases.length === 0 ? (
              <div className="text-white/20 select-none py-8 border border-dashed border-white/5 rounded-lg text-center">
                // No alias shortcuts configured. Add your first shortcut above.
              </div>
            ) : (
              <div className="border border-white/5 rounded-lg overflow-x-auto divide-y divide-white/5 bg-white/[0.01]">
                <div className="min-w-[600px] divide-y divide-white/5">
                  {aliases.map((alias) => {
                    const isEditing = editingId === alias.id;

                    if (isEditing) {
                      return (
                        <div key={alias.id} className="px-4 py-3 bg-white/3 space-y-0.5">
                          {/* Edit label row */}
                          <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                            <span className="text-accent-violet font-semibold w-[160px] md:w-[200px] shrink-0 py-1.5">
                              shortcut_key<span className="text-accent-violet/50">:</span>
                            </span>
                            <input
                              type="text"
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              className="bg-transparent text-white flex-1 py-1.5 outline-none placeholder:text-white/10 focus:bg-white/5 rounded px-2 -mx-2 transition-colors border-b border-accent-cyan/40"
                            />
                          </div>

                          {/* Edit value row */}
                          <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                            <span className="text-accent-violet font-semibold w-[160px] md:w-[200px] shrink-0 py-1.5">
                              expanded_value<span className="text-accent-violet/50">:</span>
                            </span>
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="bg-transparent text-white flex-1 py-1.5 outline-none placeholder:text-white/10 focus:bg-white/5 rounded px-2 -mx-2 transition-colors border-b border-accent-cyan/40"
                            />
                          </div>

                          {/* Edit category row */}
                          <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                            <span className="text-accent-violet font-semibold w-[160px] md:w-[200px] shrink-0 py-1.5">
                              category<span className="text-accent-violet/50">:</span>
                            </span>
                            <input
                              type="text"
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              className="bg-transparent text-white flex-1 py-1.5 outline-none placeholder:text-white/10 focus:bg-white/5 rounded px-2 -mx-2 transition-colors border-b border-accent-cyan/40"
                            />
                          </div>

                          {/* Save / Cancel */}
                          <div className="flex items-center gap-2 pt-2">
                            <button
                              onClick={() => handleUpdateAlias(alias.id)}
                              disabled={updating}
                              className="p-3 bg-success/10 hover:bg-success/20 border border-success/20 text-success rounded transition-colors h-11 w-11 flex items-center justify-center cursor-pointer"
                              title="Save updates"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 rounded transition-colors h-11 w-11 flex items-center justify-center cursor-pointer"
                              title="Cancel editing"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={alias.id}
                        className="p-3.5 flex items-center justify-between hover:bg-white/5 transition-colors group"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <span className="text-white/20 select-none text-[12px] shrink-0">
                            {'>'}
                          </span>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 min-w-0">
                            <span className="text-accent-violet font-semibold shrink-0">
                              {alias.label}
                            </span>
                            <span className="text-white/30 select-none hidden sm:inline">=</span>
                            <span
                              className="text-accent-cyan font-mono truncate"
                              title={alias.value}
                            >
                              &quot;{alias.value}&quot;
                            </span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded-full text-white/40 select-none uppercase tracking-wide">
                            {alias.category || 'general'}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 ml-4 select-none opacity-40 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(alias)}
                            className="p-3 text-white/40 hover:text-white/95 hover:bg-white/5 rounded-md transition-colors h-11 w-11 flex items-center justify-center cursor-pointer"
                            title="Edit alias"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAlias(alias.id, alias.label)}
                            className="p-3 text-white/40 hover:text-red-400 hover:bg-white/5 rounded-md transition-colors h-11 w-11 flex items-center justify-center cursor-pointer"
                            title="Delete alias"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between text-[11px] text-white/20">
          <div>// Total loaded: {aliases.length} aliases</div>
          <div>// scope: form_autofill</div>
        </div>
      </div>
    </div>
  );
}
