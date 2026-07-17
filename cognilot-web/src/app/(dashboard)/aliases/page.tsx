'use client';

import { useEffect, useState, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import {
  RefreshCw,
  Trash2,
  Plus,
  Edit2,
  Check,
  X,
  Square,
  CheckSquare,
  SquareMinus,
} from 'lucide-react';
import { ReadmeLayout } from '@/components/layout/ReadmeLayout';
import { Button } from '@/components/ui/button';

interface Alias {
  id: string;
  label: string;
  memoryKey: string;
  category: string;
  createdAt: string;
  /** Resolved values from profile data (populated from /api/aliases/resolve) */
  values?: string[];
}

const LIMIT = 50;

export default function AliasesPage() {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [profileData, setProfileData] = useState<Record<string, unknown>>({});
  const [newLabel, setNewLabel] = useState('');
  const [newMemoryKey, setNewMemoryKey] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [adding, setAdding] = useState(false);

  const supabase = createBrowserClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''
  );

  const fetchAliases = async (append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setSelectedIds(new Set());
        setEditingId(null);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const apiBase = process.env['NEXT_PUBLIC_API_URL'] || '';
      const offset = append ? aliases.length : 0;
      const [aliasesRes, profileRes] = await Promise.all([
        fetch(`${apiBase}/api/aliases?offset=${offset}&limit=${LIMIT}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        !append
          ? fetch(`${apiBase}/api/profile`, {
              headers: { Authorization: `Bearer ${session.access_token}` },
            })
          : null,
      ]);

      if (!aliasesRes.ok) throw new Error('Failed to load aliases');

      const data = await aliasesRes.json();

      if (profileRes?.ok) {
        const profileJson = await profileRes.json();
        setProfileData(profileJson.profile?.dataLearned || profileJson.dataLearned || {});
      }

      if (append) {
        setAliases((prev) => [...prev, ...(data.aliases || [])]);
      } else {
        setAliases(data.aliases || []);
      }
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load shortcut aliases.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void fetchAliases();
  }, []);

  const hasMore = aliases.length < total;

  const memoryKeys = useMemo(() => {
    return Object.keys(profileData).filter(
      (k) => !['data_learned'].includes(k) && Array.isArray(profileData[k])
    );
  }, [profileData]);

  const resolvedValues = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const key of memoryKeys) {
      map[key] = (profileData[key] as unknown[]).map(String);
    }
    return map;
  }, [memoryKeys, profileData]);

  const duplicates = useMemo(() => {
    const seen = new Map<string, Alias[]>();
    for (const a of aliases) {
      const key = `${a.label.toLowerCase()}|${a.memoryKey.toLowerCase()}`;
      const group = seen.get(key) || [];
      group.push(a);
      seen.set(key, group);
    }
    const dupes = new Set<string>();
    for (const group of seen.values()) {
      if (group.length > 1) {
        for (const a of group) dupes.add(a.id);
      }
    }
    return dupes;
  }, [aliases]);

  const allSelected = aliases.length > 0 && selectedIds.size === aliases.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < aliases.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(aliases.map((a) => a.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newMemoryKey) {
      toast.error('Shortcut label and memory field are required.');
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
          memoryKey: newMemoryKey.trim(),
          category: newCategory.trim() || 'general',
        }),
      });

      if (!response.ok) throw new Error('Failed to create alias');

      const data = await response.json();
      setAliases([...aliases, data.alias]);
      setNewLabel('');
      setNewMemoryKey('');
      setNewCategory('general');
      toast.success(`Alias "${data.alias.label}" created.`);
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
    setEditValue(alias.memoryKey);
    setEditCategory(alias.category || 'general');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdateAlias = async (id: string) => {
    if (!editLabel.trim() || !editValue.trim()) {
      toast.error('Label and Memory Key are required.');
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
          memoryKey: editValue.trim(),
          category: editCategory.trim() || 'general',
        }),
      });

      if (!response.ok) throw new Error('Update failed');

      const data = await response.json();
      setAliases(aliases.map((a) => (a.id === id ? data.alias : a)));
      setEditingId(null);
      toast.success('Alias updated.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update alias.');
    } finally {
      setUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected alias(es)?`)) return;

    setDeleting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const apiBase = process.env['NEXT_PUBLIC_API_URL'] || '';
      const ids = Array.from(selectedIds);

      const response = await fetch(`${apiBase}/api/aliases/batch`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ids }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Batch delete failed:', data);
        throw new Error(data.message || 'Batch delete failed');
      }

      setAliases(aliases.filter((a) => !selectedIds.has(a.id)));
      setSelectedIds(new Set());
      toast.success(`${data.deleted} alias(es) deleted.`);
    } catch (err) {
      console.error(err);
      toast.error('Bulk delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCleanDuplicates = async () => {
    if (duplicates.size === 0) return;
    if (
      !confirm(
        `Remove ${duplicates.size} duplicate alias(es)? The first occurrence of each will be kept.`
      )
    )
      return;

    setDeleting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const apiBase = process.env['NEXT_PUBLIC_API_URL'] || '';
      const idsToRemove = Array.from(duplicates);

      const response = await fetch(`${apiBase}/api/aliases/batch`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ids: idsToRemove }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Clean duplicates failed:', data);
        throw new Error(data.message || 'Clean duplicates failed');
      }

      setAliases(aliases.filter((a) => !duplicates.has(a.id)));
      setSelectedIds((prev) => {
        const n = new Set(prev);
        for (const id of duplicates) n.delete(id);
        return n;
      });
      toast.success(`${data.deleted} duplicate(s) removed.`);
    } catch (err) {
      console.error(err);
      toast.error('Clean duplicates failed.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <ReadmeLayout
        filename="aliases.md"
        description="Shortcuts that auto-expand when filling forms"
        action={
          <button
            onClick={() => fetchAliases()}
            className="text-white/30 hover:text-white/70 transition-colors flex items-center gap-1.5 text-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        }
      >
        <div className="h-64 bg-white/2 rounded-xl animate-pulse" />
      </ReadmeLayout>
    );
  }

  return (
    <ReadmeLayout
      filename="aliases.md"
      description="Shortcuts that auto-expand when filling forms"
      action={
        <button
          onClick={() => fetchAliases()}
          className="text-white/30 hover:text-white/70 transition-colors flex items-center gap-1.5 text-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      }
    >
      <div className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
        <div className="p-6 md:p-8 space-y-8">
          <div>
            <div className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-4">
              New Shortcut
            </div>

            <form onSubmit={handleAddAlias}>
              <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                <span className="text-white/60 font-medium w-[160px] md:w-[200px] shrink-0 py-1.5">
                  Shortcut
                </span>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. my_email"
                  className="bg-transparent text-white flex-1 py-1.5 outline-none placeholder:text-white/15 focus:bg-white/5 rounded px-2 -mx-2 transition-colors"
                />
              </div>

              <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                <span className="text-white/60 font-medium w-[160px] md:w-[200px] shrink-0 py-1.5">
                  Memory Field
                </span>
                <select
                  value={newMemoryKey}
                  onChange={(e) => setNewMemoryKey(e.target.value)}
                  className="bg-transparent text-white flex-1 py-1.5 outline-none focus:bg-white/5 rounded px-2 -mx-2 transition-colors"
                >
                  <option value="" className="bg-bg-primary text-white/40">
                    Select a memory field...
                  </option>
                  {memoryKeys.map((key) => (
                    <option key={key} value={key} className="bg-bg-primary text-white">
                      {key} ({resolvedValues[key]?.length || 0} value(s))
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                <span className="text-white/60 font-medium w-[160px] md:w-[200px] shrink-0 py-1.5">
                  Category
                </span>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="general"
                  className="bg-transparent text-white flex-1 py-1.5 outline-none placeholder:text-white/15 focus:bg-white/5 rounded px-2 -mx-2 transition-colors"
                />
              </div>

              <div className="pt-3">
                <Button variant="terminal" size="sm" type="submit" disabled={adding}>
                  <Plus className="w-3.5 h-3.5" />
                  {adding ? 'Adding...' : 'Add Shortcut'}
                </Button>
              </div>
            </form>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className="text-white/30 hover:text-white/70 transition-colors cursor-pointer"
                  title={allSelected ? 'Deselect all' : 'Select all'}
                >
                  {allSelected ? (
                    <CheckSquare className="w-4 h-4 text-accent-cyan" />
                  ) : someSelected ? (
                    <SquareMinus className="w-4 h-4 text-accent-cyan" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
                <div className="text-xs font-semibold text-white/30 uppercase tracking-wider">
                  Active Shortcuts ({aliases.length}/{total})
                </div>
              </div>

              {aliases.length > 0 && (
                <div className="flex items-center gap-2">
                  {duplicates.size > 0 && (
                    <button
                      onClick={handleCleanDuplicates}
                      disabled={deleting}
                      className="text-[10px] px-2 py-1 bg-accent-violet/10 hover:bg-accent-violet/20 border border-accent-violet/20 text-accent-violet rounded transition-colors cursor-pointer"
                    >
                      Clean {duplicates.size} duplicate(s)
                    </button>
                  )}

                  {selectedIds.size > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      disabled={deleting}
                      className="text-[10px] px-2 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded transition-colors cursor-pointer"
                    >
                      {deleting ? 'Deleting...' : `Delete ${selectedIds.size} selected`}
                    </button>
                  )}
                </div>
              )}
            </div>

            {aliases.length === 0 ? (
              <div className="text-white/20 py-8 border border-dashed border-white/5 rounded-lg text-center text-sm">
                No shortcuts configured yet. Add your first shortcut above.
              </div>
            ) : (
              <div className="border border-white/5 rounded-lg overflow-x-auto divide-y divide-white/5 bg-white/[0.01]">
                <div className="min-w-[600px] divide-y divide-white/5">
                  {aliases.map((alias) => {
                    const isEditing = editingId === alias.id;
                    const isSelected = selectedIds.has(alias.id);
                    const isDuplicate = duplicates.has(alias.id);

                    if (isEditing) {
                      return (
                        <div key={alias.id} className="px-4 py-3 bg-white/3 space-y-0.5">
                          <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                            <span className="text-white/60 font-medium w-[160px] md:w-[200px] shrink-0 py-1.5">
                              Shortcut
                            </span>
                            <input
                              type="text"
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              className="bg-transparent text-white flex-1 py-1.5 outline-none focus:bg-white/5 rounded px-2 -mx-2 transition-colors border-b border-accent-cyan/40"
                            />
                          </div>

                          <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                            <span className="text-white/60 font-medium w-[160px] md:w-[200px] shrink-0 py-1.5">
                              Memory Field
                            </span>
                            <select
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="bg-transparent text-white flex-1 py-1.5 outline-none focus:bg-white/5 rounded px-2 -mx-2 transition-colors border-b border-accent-cyan/40"
                            >
                              {memoryKeys.map((key) => (
                                <option key={key} value={key} className="bg-bg-primary text-white">
                                  {key} ({resolvedValues[key]?.length || 0} value(s))
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors py-1">
                            <span className="text-white/60 font-medium w-[160px] md:w-[200px] shrink-0 py-1.5">
                              Category
                            </span>
                            <input
                              type="text"
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              className="bg-transparent text-white flex-1 py-1.5 outline-none focus:bg-white/5 rounded px-2 -mx-2 transition-colors border-b border-accent-cyan/40"
                            />
                          </div>

                          <div className="flex items-center gap-2 pt-2">
                            <button
                              onClick={() => handleUpdateAlias(alias.id)}
                              disabled={updating}
                              className="p-3 bg-success/10 hover:bg-success/20 border border-success/20 text-success rounded transition-colors h-11 w-11 flex items-center justify-center cursor-pointer"
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 rounded transition-colors h-11 w-11 flex items-center justify-center cursor-pointer"
                              title="Cancel"
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
                        className={`p-3.5 flex items-center justify-between hover:bg-white/5 transition-colors group ${
                          isSelected ? 'bg-white/[0.03]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            onClick={() => toggleSelect(alias.id)}
                            className="shrink-0 text-white/30 hover:text-white/70 transition-colors cursor-pointer"
                            title={isSelected ? 'Deselect' : 'Select'}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-accent-cyan" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>

                          <div className="flex items-center gap-4 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 min-w-0">
                              <span className="text-white font-medium shrink-0">{alias.label}</span>
                              <span className="text-white/20 select-none hidden sm:inline">
                                &rarr;
                              </span>
                              <span
                                className="text-accent-cyan truncate"
                                title={
                                  resolvedValues[alias.memoryKey]?.join(', ') || alias.memoryKey
                                }
                              >
                                {resolvedValues[alias.memoryKey]?.join(', ') || (
                                  <span className="text-white/30 italic">{alias.memoryKey}</span>
                                )}
                              </span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded-full text-white/40 select-none uppercase tracking-wide">
                              {alias.category || 'general'}
                            </span>
                            {isDuplicate && (
                              <span className="text-[10px] px-2 py-0.5 bg-accent-violet/10 border border-accent-violet/20 rounded-full text-accent-violet select-none uppercase tracking-wide">
                                duplicate
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 ml-4 select-none opacity-40 group-hover:opacity-100 transition-opacity">
                          <AliasActions alias={alias} onEdit={startEdit} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={() => fetchAliases(true)}
                      disabled={loadingMore}
                      className="text-[11px] px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white/80 rounded transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {loadingMore
                        ? 'Loading...'
                        : `Load ${Math.min(LIMIT, total - aliases.length)} more (${aliases.length}/${total})`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ReadmeLayout>
  );
}

function AliasActions({ alias, onEdit }: { alias: Alias; onEdit: (alias: Alias) => void }) {
  return (
    <button
      onClick={() => onEdit(alias)}
      className="p-3 text-white/40 hover:text-white/95 hover:bg-white/5 rounded-md transition-colors h-11 w-11 flex items-center justify-center cursor-pointer"
      title="Edit"
    >
      <Edit2 className="w-4 h-4" />
    </button>
  );
}
