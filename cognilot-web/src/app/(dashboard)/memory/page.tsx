'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import { MapPin } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MemoryForm } from '@/components/memory/MemoryForm';
import { MemorySidebar } from '@/components/memory/MemorySidebar';
import { flattenDataLearned, normalizeDataLearned, promoteLearnedValue } from '@/utils/dataLearned';
import { profileService } from '@/services/profile.service';
import { extensionBridge } from '@/utils/extensionBridge';
import { ReadmeLayout } from '@/components/layout/ReadmeLayout';

interface UserInfo {
  id: string;
  email: string;
  plan: string;
}

interface ProfileData {
  dataLearned: Record<string, string[]>;
  onboardingCompleted: boolean | null;
}

/**
 * Memory Page Component
 * Renders the terminal-style interface to view and edit the user's AI-learned brain profile.
 */
export default function MemoryPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [originalData, setOriginalData] = useState<Record<string, unknown>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const searchParams = useSearchParams();
  const focusParam = searchParams.get('focus');

  const supabase = createBrowserClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '',
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? ''
  );

  const fetchProfile = useCallback(async () => {
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

      const dbProfile = data.profile as ProfileData;
      const dataLearned = dbProfile?.dataLearned || {};

      // Flatten learned data for easy form binding
      const flatLearned = flattenDataLearned(dataLearned);

      // Seed standard metadata if not present
      const seedKeys = {
        email: data.user?.email || '',
        display_name: data.user?.email ? data.user.email.split('@')[0] : '',
      };

      Object.entries(seedKeys).forEach(([k, v]) => {
        if (v && (!dataLearned[k] || dataLearned[k].length === 0)) {
          dataLearned[k] = [v];
          flatLearned[k] = v;
        }
      });

      const initialForm = {
        ...flatLearned,
        data_learned: dataLearned,
      };

      setFormData(initialForm);
      setOriginalData(initialForm);
      setHasChanges(false);

      // Update local first-class extension cache too
      if (typeof window !== 'undefined') {
        await profileService.updateProfile({
          data_learned: dataLearned,
          preferences: {},
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load profile memory.');
    } finally {
      setLoading(false);
    }
  }, [supabase.auth]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  // Real-time Sync with Extension Messages
  useEffect(() => {
    const handleSync = (event: MessageEvent) => {
      if (event.data.type === 'Cognilot_CACHE_UPDATED') {
        const keys = event.data.keys || [];
        if (keys.includes('Cognilot_profile_cache') || keys.includes('Cognilot_alias_cache')) {
          console.log('🔄 [Memory Page] Extension cache updated, refreshing view...');
          profileService.clearCache();
          void fetchProfile();
        }
      }
    };

    window.addEventListener('message', handleSync);
    return () => window.removeEventListener('message', handleSync);
  }, [fetchProfile]);

  // Track Form Changes
  useEffect(() => {
    const checkChanges = () => {
      const allKeys = new Set([...Object.keys(formData), ...Object.keys(originalData)]);
      for (const key of allKeys) {
        const val1 = formData[key];
        const val2 = originalData[key];
        if (val1 === val2) continue;
        const v1 = val1 === null || val1 === undefined ? '' : val1;
        const v2 = val2 === null || val2 === undefined ? '' : val2;
        if (v1 === v2) continue;
        if (typeof v1 === 'object' && typeof v2 === 'object') {
          if (JSON.stringify(v1) !== JSON.stringify(v2)) return true;
          continue;
        }
        return true;
      }
      return false;
    };

    setHasChanges(checkChanges());
  }, [formData, originalData]);

  const handleFieldChange = (name: string, value: unknown) => {
    setFormData((prev) => {
      const newData = { ...prev };
      if (value === undefined) {
        delete newData[name];
      } else {
        newData[name] = value;
      }
      return newData;
    });
  };

  const saveProfile = async (
    data: Record<string, any>,
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

      // Build updated learned map
      let learnedPayload: Record<string, string[]> = {
        ...normalizeDataLearned(data_learned || {}),
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
      const response = await fetch(`${apiBase}/api/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          dataLearned: learnedPayload,
        }),
      });

      if (!response.ok) {
        throw new Error('Save failed');
      }

      const responseData = await response.json();
      const updatedFormData = {
        ...data,
        data_learned: learnedPayload,
      };

      setFormData(updatedFormData);
      setOriginalData(updatedFormData);
      setHasChanges(false);

      // Sync extension cache
      if (typeof window !== 'undefined') {
        await profileService.updateProfile({
          data_learned: learnedPayload,
          preferences: {},
        });
        extensionBridge.refreshProfileCache();
      }

      if (!silent) {
        setShowSaveSuccess(true);
        toast.success('Cognilot memory synced successfully.');
        setTimeout(() => setShowSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to sync changes with the cloud.');
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const handleSaveClick = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const apiBase = process.env['NEXT_PUBLIC_API_URL'] || '';
      // Sync onboarding completion status too
      await fetch(`${apiBase}/api/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          onboardingCompleted: new Date().toISOString(),
        }),
      });

      await saveProfile(formData, false);
    } catch (error) {
      console.error('Error completing profile:', error);
    }
  };

  const handleCVUpload = async (parsedData: any) => {
    if (!parsedData) return;
    try {
      const cvLearned: Record<string, string[]> = {};
      Object.entries(parsedData).forEach(([k, v]) => {
        if (v) {
          cvLearned[k] = Array.isArray(v) ? v : [String(v)];
        }
      });

      const flatCV = flattenDataLearned(cvLearned);
      const newData = {
        ...formData,
        ...flatCV,
        data_learned: {
          ...normalizeDataLearned(formData.data_learned || {}),
          ...cvLearned,
        },
      };

      setFormData(newData);
      await saveProfile(newData, true, cvLearned);
      toast.success('CV import completed and saved successfully.');
    } catch (error) {
      console.error('Error handling CV upload:', error);
    }
  };

  const handleDetectLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('La geolocalización no es compatible con este navegador.');
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

          if (!response.ok) throw new Error('Error al conectar con el servicio de mapas');

          const data = await response.json();
          const addr = data.address;

          if (addr) {
            const updates: Record<string, string> = {};
            if (addr.country) updates.country = addr.country;
            if (addr.city || addr.town || addr.village || addr.state) {
              updates.city = addr.city || addr.town || addr.village || addr.state;
            }
            if (addr.road) {
              updates.address = `${addr.road} ${addr.house_number || ''}`.trim();
            }

            const newData = {
              ...formData,
              ...updates,
            };

            setFormData(newData);
            await saveProfile(newData, true);
            toast.success('Ubicación autocompletada con éxito');
          } else {
            toast.warning('No se pudo determinar una dirección exacta');
          }
        } catch (error) {
          console.error('Error detecting location:', error);
          toast.error('Hubo un fallo al obtener los detalles de ubicación');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let msg = 'Error de ubicación desconocido';
        if (error.code === error.PERMISSION_DENIED)
          msg = 'Permiso de ubicación denegado por el usuario';
        if (error.code === error.POSITION_UNAVAILABLE)
          msg = 'La información de ubicación no está disponible';
        if (error.code === error.TIMEOUT) msg = 'Tiempo de espera agotado al obtener la ubicación';

        toast.error(msg);
        setIsLocating(false);
      },
      { timeout: 10000 }
    );
  };

  if (loading) {
    return (
      <ReadmeLayout
        filename="memory.md"
        description="Profile data and context learned by your AI assistant"
        className="max-w-7xl"
      >
        <div className="h-64 bg-white/2 rounded-xl animate-pulse" />
      </ReadmeLayout>
    );
  }

  return (
    <ReadmeLayout
      filename="memory.md"
      description="Profile data and context learned by your AI assistant"
      className="max-w-7xl"
      action={
        <Button variant="terminal" size="sm" onClick={handleDetectLocation} disabled={isLocating}>
          <MapPin
            className={`w-3.5 h-3.5 text-accent-cyan ${isLocating ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`}
          />
          <span>{isLocating ? 'Detecting...' : 'Autocomplete Location'}</span>
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <MemoryForm
            formData={formData}
            onFieldChange={handleFieldChange}
            isSaving={saving}
            showSaveSuccess={showSaveSuccess}
            focusField={focusParam}
          />
        </div>
        <div>
          <MemorySidebar
            isSaving={saving}
            hasChanges={hasChanges}
            formData={formData}
            handleCVUpload={handleCVUpload}
            handleSubmit={handleSaveClick}
          />
        </div>
      </div>
    </ReadmeLayout>
  );
}
