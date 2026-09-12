'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocLayout } from '@/components/layout/DocLayout';
import { OverviewHub } from '@/components/overview/OverviewHub';
import { MemoryDrawer } from '@/components/memory/MemoryDrawer';
import { flattenDataLearned, normalizeDataLearned, promoteLearnedValue } from '@/utils/dataLearned';
import { memoryService } from '@/services/memory.service';
import { extensionBridge } from '@/utils/extensionBridge';

interface UserInfo {
  id: string;
  email: string;
  plan: string;
}

interface MemoryData {
  data: Record<string, string[]>;
  dataLearned?: Record<string, string[]>;
  onboardingCompleted: boolean | null;
}

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const searchParams = useSearchParams();

  // Open drawer if requested via URL query params
  useEffect(() => {
    if (searchParams.get('drawer') === 'open' || searchParams.get('focus')) {
      setIsDrawerOpen(true);
    }
  }, [searchParams]);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const apiBase = process.env['NEXT_PUBLIC_API_URL'] || '';
      const response = await fetch(`${apiBase}/api/memory`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const data = await response.json();
      setUser(data.user);

      const memRecord = (data.memory || data.profile) as MemoryData;
      const memoryData = memRecord?.data || memRecord?.dataLearned || {};

      const flatLearned = flattenDataLearned(memoryData);

      // Seed standard metadata if not present
      const seedKeys = {
        email: data.user?.email || '',
        display_name: data.user?.email ? data.user.email.split('@')[0] : '',
      };

      Object.entries(seedKeys).forEach(([k, v]) => {
        if (v && (!memoryData[k] || memoryData[k].length === 0)) {
          memoryData[k] = [v];
          flatLearned[k] = v;
        }
      });

      const initialForm = {
        ...flatLearned,
        data_learned: memoryData,
      };

      setFormData(initialForm);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load memory profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  // Real-time Sync with Extension Messages
  useEffect(() => {
    let syncTimeout: NodeJS.Timeout | null = null;
    const handleSync = (event: MessageEvent) => {
      if (event.data?.type === 'Cognilot_CACHE_UPDATED') {
        const keys = event.data.keys || [];
        if (keys.includes('Cognilot_memory_cache')) {
          if (syncTimeout) clearTimeout(syncTimeout);
          syncTimeout = setTimeout(() => {
            memoryService.clearCache();
            void fetchProfile();
          }, 300);
        }
      }
    };

    window.addEventListener('message', handleSync);
    return () => {
      window.removeEventListener('message', handleSync);
      if (syncTimeout) clearTimeout(syncTimeout);
    };
  }, [fetchProfile]);

  const saveProfile = async (
    data: Record<string, unknown>,
    silent = false,
    extraLearnedData: Record<string, string[]> = {}
  ) => {
    if (!silent) setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data_learned, ...formFields } = data;

      let learnedPayload: Record<string, string[]> = {
        ...normalizeDataLearned((data_learned as Record<string, string[]>) || {}),
        ...extraLearnedData,
      };

      const configKeys = [
        'preferences',
        'data_learned',
        'id',
        'user_id',
        'created_at',
        'updated_at',
        'onboarding_completed',
        'avatar_url',
        'display_name',
        'google_id',
        'is_active',
        'last_login',
        'plan',
        'provider',
        'cv_url',
        'email',
        'given_name',
        'family_name',
      ];

      for (const [key, value] of Object.entries(formFields)) {
        if (!configKeys.includes(key)) {
          const stringValue = String(value ?? '').trim();
          if (stringValue) {
            learnedPayload = promoteLearnedValue(learnedPayload, key, stringValue);
          }
        }
      }

      const apiBase = process.env['NEXT_PUBLIC_API_URL'] || '';
      const response = await fetch(`${apiBase}/api/memory`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          data: learnedPayload,
        }),
      });

      if (!response.ok) {
        throw new Error('Save failed');
      }

      const updatedFormData = {
        ...data,
        data_learned: learnedPayload,
      };

      setFormData(updatedFormData);

      // Sync extension cache
      if (typeof window !== 'undefined') {
        await memoryService.updateMemory({
          data: learnedPayload,
          preferences: {},
        });
        extensionBridge.refreshProfileCache();
      }

      if (!silent) {
        toast.success('Cognilot memory synchronized.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to sync changes with the cloud.');
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const handleUpdateDataLearned = async (updated: Record<string, string[]>) => {
    const flat = flattenDataLearned(updated);
    const newData = {
      ...formData,
      ...flat,
      data_learned: updated,
    };
    await saveProfile(newData, false);
  };

  const handleAddQuickKey = async (key: string, val: string) => {
    const currentLearned = (formData['data_learned'] as Record<string, string[]>) || {};
    const updated = {
      ...currentLearned,
      [key]: [val],
    };
    const newData = {
      ...formData,
      [key]: val,
      data_learned: updated,
    };
    await saveProfile(newData, false, { [key]: [val] });
  };

  const handleCVUpload = async (parsedData: unknown) => {
    if (!parsedData || typeof parsedData !== 'object') return;
    try {
      const cvLearned: Record<string, string[]> = {};
      Object.entries(parsedData as Record<string, unknown>).forEach(([k, v]) => {
        if (v) {
          cvLearned[k] = Array.isArray(v) ? (v as string[]) : [String(v)];
        }
      });

      const flatCV = flattenDataLearned(cvLearned);
      const currentLearned = (formData['data_learned'] as Record<string, string[]>) || {};
      const newData = {
        ...formData,
        ...flatCV,
        data_learned: {
          ...normalizeDataLearned(currentLearned),
          ...cvLearned,
        },
      };

      setFormData(newData);
      await saveProfile(newData, true, cvLearned);
      toast.success('CV import completed and memory updated.');
    } catch (error) {
      console.error('Error handling CV upload:', error);
    }
  };

  const handleDetectLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&email=support@cognilot.app`
          );

          if (!response.ok) throw new Error('Location service error');

          const data = await response.json();
          const addr = data.address;

          if (addr) {
            const updates: Record<string, string> = {};
            if (addr.country) updates['country'] = addr.country;
            if (addr.city || addr.town || addr.village || addr.state) {
              updates['city'] = addr.city || addr.town || addr.village || addr.state;
            }
            if (addr.road) {
              updates['address'] = `${addr.road} ${addr.house_number || ''}`.trim();
            }
            if (addr.postcode || addr.postal_code) {
              updates['postal_code'] = addr.postcode || addr.postal_code;
            }

            const newData = {
              ...formData,
              ...updates,
            };

            setFormData(newData);
            await saveProfile(newData, true);
            toast.success('Location detected and saved.');
          } else {
            toast.warning('Could not pinpoint exact address');
          }
        } catch (error) {
          console.error('Error detecting location:', error);
          toast.error('Failed to resolve location details.');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error(error.message || 'Location permission denied');
        setIsLocating(false);
      },
      { timeout: 10000 }
    );
  };

  const learnedMap = (formData['data_learned'] as Record<string, string[]>) || {};
  const totalLearnedCount = Object.keys(learnedMap).length;

  if (loading) {
    return (
      <DocLayout
        filename="Overview"
        description="Central intelligence hub and persistent cognitive profile memory"
        className="max-w-5xl"
      >
        <div className="space-y-6 animate-pulse">
          <div className="h-64 bg-white/[0.02] border border-white/5 rounded-2xl" />
        </div>
      </DocLayout>
    );
  }

  return (
    <DocLayout
      filename="Overview"
      description="Central intelligence hub and persistent cognitive profile memory"
      className="max-w-5xl"
      action={
        <Button
          variant="terminal"
          size="sm"
          onClick={() => setIsDrawerOpen(true)}
          className="text-xs"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-accent-cyan" />
          <span>Open Memory Drawer</span>
        </Button>
      }
    >
      {/* ── Single Unified Overview Panel ───────────────────────────────────── */}
      <OverviewHub
        totalLearnedCount={totalLearnedCount}
        userPlan={user?.plan?.toUpperCase() || 'FREE'}
        onDetectLocation={handleDetectLocation}
        isLocating={isLocating}
        onCVUpload={handleCVUpload}
        onAddQuickKey={handleAddQuickKey}
        onOpenDrawer={() => setIsDrawerOpen(true)}
      />

      {/* ── Slide-over Memory Drawer ────────────────────────────────────────── */}
      <MemoryDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        dataLearned={learnedMap}
        onUpdateDataLearned={handleUpdateDataLearned}
        isSaving={saving}
      />
    </DocLayout>
  );
}
