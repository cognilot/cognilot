import { type FC, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { profileService } from '../services/profile.service';
import { profileSections } from '../utils/profileFields';
import { ProgressBar } from './ProgressBar';

export const OnboardingGuide: FC = () => {
  const router = useRouter();
  const [profileData, setProfileData] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const fullProfile = await profileService.getActiveProfile();
        // Flatten learned data for easy checking
        const flatLearned: Record<string, unknown> = {};
        if (fullProfile.data_learned) {
          Object.entries(fullProfile.data_learned).forEach(([k, v]) => {
            flatLearned[k] = v?.[0] || '';
          });
        }
        setProfileData({ ...fullProfile, ...flatLearned });
      } catch (error) {
        console.error('Error loading profile for onboarding guide:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  if (isLoading) return null;

  // Calculate standard fields list
  const standardFields = new Set<string>();
  profileSections.forEach((section) => {
    section.fields.forEach((f) => standardFields.add(f.name));
  });

  // Calculate steps completion
  const isLocationDone = !!profileData.country || !!profileData.city;
  const isExperienceDone =
    !!profileData.current_company ||
    !!profileData.current_role ||
    !!profileData.degree ||
    !!profileData.university;

  // Check for manual memory (any learned key not in standard fields)
  const isManualMemoryDone = Object.keys(profileData).some((key) => {
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

    if (standardFields.has(key) || configKeys.includes(key)) return false;

    const value = profileData[key];
    return value !== undefined && value !== null && value !== '';
  });

  const steps = [
    {
      id: 'location',
      title: 'Configurar Localización',
      iconCode: 'geo_config',
      completed: isLocationDone,
      focus: 'location',
    },
    {
      id: 'experience',
      title: 'Cargar Experiencia (CV)',
      iconCode: 'cv_parser',
      completed: isExperienceDone,
      focus: 'experience',
    },
    {
      id: 'manual',
      title: 'Probar Memoria Manual',
      iconCode: 'ai_trainer',
      completed: isManualMemoryDone,
      focus: 'custom',
    },
  ];

  const completedSteps = steps.filter((s) => s.completed).length;
  const totalSteps = steps.length;
  // Calculate a fake "AI Capacity" percentage that looks cool
  const baseCapacity = 20; // Starts at 20% just by logging in
  const aiCapacity = Math.min(
    100,
    Math.round(baseCapacity + (completedSteps / totalSteps) * (100 - baseCapacity))
  );

  if (completedSteps === totalSteps) {
    return null; // All done!
  }

  const handleStepClick = (focus: string) => {
    if (focus === 'custom') {
      router.push('/dashboard/memory?focus=custom');
    } else {
      router.push(`/dashboard/memory?focus=${focus}`);
    }
  };

  return (
    <section className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden relative mb-8 animate-scale-in">
      {/* macOS Title Bar */}
      <div className="px-5 py-4 border-b border-white/5 bg-white/5 flex items-center gap-2 select-none">
        <div className="flex gap-2 mr-4">
          <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
          <div className="w-3 h-3 rounded-full bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
        </div>
        <div className="text-white/30 text-[11px] uppercase tracking-[0.2em] font-sans font-bold flex-1 justify-end flex">
          ONBOARDING_GUIDE.MD
        </div>
      </div>

      <div className="p-6 md:p-8 font-mono text-[13px]">
        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
          <div className="flex-1">
            <div className="text-brand-secondary mb-2 flex items-center gap-2 font-bold uppercase tracking-widest text-[11px]">
              AI_CAPACITY_METER
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Desbloquea el 100% de tu Asistente
            </h2>
            <p className="text-ghost text-sm leading-relaxed max-w-xl">
              Completa estos pasos para que Cognilot pueda autocompletar cualquier formulario con
              precisión milimétrica.
            </p>
          </div>

          <div className="w-full md:w-64 bg-black/40 p-4 rounded-lg border border-white/5">
            <ProgressBar progress={aiCapacity} />
            <div className="text-right mt-3 text-[10px] text-white/40 uppercase tracking-widest font-bold">
              {completedSteps} / {totalSteps} módulos cargados
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => handleStepClick(step.focus)}
              className={`text-left p-3.5 rounded-xl border transition-all group relative overflow-hidden cursor-pointer ${
                step.completed
                  ? 'bg-success/5 border-success/20 hover:border-success/40'
                  : 'bg-white/5 border-white/10 hover:border-brand-secondary/40 hover:bg-white/10'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-secondary/0 to-brand-secondary/0 group-hover:to-brand-secondary/5 transition-all" />

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded font-mono text-[10px] uppercase font-bold shrink-0 ${
                      step.completed
                        ? 'bg-success/20 text-success'
                        : 'bg-white/10 text-white/60 group-hover:text-brand-secondary transition-colors'
                    }`}
                  >
                    {step.iconCode}
                  </div>
                  <h3
                    className={`font-bold text-[13px] leading-tight ${step.completed ? 'text-success' : 'text-white'}`}
                  >
                    {step.title}
                  </h3>
                </div>

                <div>
                  {step.completed ? (
                    <span className="text-success font-bold font-mono text-xs">[DONE]</span>
                  ) : (
                    <span className="text-white/20 group-hover:text-brand-secondary/50 font-bold font-mono text-xs transition-colors">
                      [TODO]
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
