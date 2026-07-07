import { type FC } from 'react';
import { Save, Sparkles } from 'lucide-react';
import { profileSections, areRequiredFieldsComplete } from '../../utils/profileFields';
import { CVUploader } from '../CVUploader';

interface MemorySidebarProps {
  isSaving: boolean;
  hasChanges: boolean;
  formData: Record<string, unknown>;
  handleCVUpload: (parsedData: any) => void;
  handleSubmit: () => void;
}

export const MemorySidebar: FC<MemorySidebarProps> = ({
  isSaving,
  hasChanges,
  formData,
  handleCVUpload,
  handleSubmit,
}) => {
  // Calculate standard fields list
  const standardFields = new Set<string>();
  profileSections.forEach((section) => {
    section.fields.forEach((f) => standardFields.add(f.name));
  });

  // Calculate steps completion (Onboarding Logic)
  const isLocationDone = !!formData.country || !!formData.city;
  const isExperienceDone =
    !!formData.current_company ||
    !!formData.current_role ||
    !!formData.degree ||
    !!formData.university;

  // Check for manual memory
  const isManualMemoryDone = Object.keys(formData).some((key) => {
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
    const value = formData[key];
    return value !== undefined && value !== null && value !== '';
  });

  const steps = [
    {
      id: 'location',
      title: 'CONFIGURANDO LOCALIZACIÓN',
      completed: isLocationDone,
    },
    {
      id: 'experience',
      title: 'CARGANDO EXPERIENCIA',
      completed: isExperienceDone,
    },
    {
      id: 'manual',
      title: 'ENTRENANDO MEMORIA',
      completed: isManualMemoryDone,
    },
  ];

  const currentStepIndex = steps.findIndex((s) => !s.completed);
  const activeStep = currentStepIndex === -1 ? steps[steps.length - 1] : steps[currentStepIndex];
  const stepNumber = currentStepIndex === -1 ? steps.length : currentStepIndex + 1;

  const onboardCompletedSteps =
    (isLocationDone ? 1 : 0) + (isExperienceDone ? 1 : 0) + (isManualMemoryDone ? 1 : 0);
  const aiCapacity = Math.min(100, Math.round(20 + (onboardCompletedSteps / 3) * 80));

  // Circular Progress SVG params
  const radius = 60;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (aiCapacity / 100) * circumference;

  return (
    <div className="space-y-6 lg:sticky lg:top-8 h-fit font-mono text-[13px] animate-fade-in">
      {/* Main Navigation Panel */}
      <div className="bg-surface/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden relative">
        <div className="p-6 md:p-8">
          {/* Circular Progress Indicator */}
          <div className="mb-8 flex flex-col items-center">
            <div className="relative w-30 h-30">
              <svg
                height={radius * 2}
                width={radius * 2}
                className="transform -rotate-90 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible"
              >
                <circle
                  stroke="rgba(255,255,255,0.05)"
                  fill="transparent"
                  strokeWidth={stroke}
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                />
                <circle
                  stroke="currentColor"
                  fill="transparent"
                  strokeWidth={stroke}
                  strokeDasharray={circumference + ' ' + circumference}
                  style={{
                    strokeDashoffset,
                    transition: 'stroke-dashoffset 1s ease-in-out',
                  }}
                  strokeLinecap="round"
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                  className="text-brand-secondary drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center -mt-1">
                <span className="text-4xl font-bold text-white tracking-tighter drop-shadow-md">
                  {aiCapacity}%
                </span>
                <span className="text-[9px] text-white/50 font-bold tracking-widest uppercase mt-1">
                  Complete
                </span>
              </div>
            </div>

            <div className="text-center space-y-2 mt-4 w-full">
              <div className="text-ghost text-[10px] font-sans font-bold uppercase tracking-widest bg-white/5 py-1 px-3 rounded-full inline-block">
                PASO {stepNumber} DE {steps.length}
              </div>
              <div className="text-brand-secondary font-bold text-xs tracking-widest uppercase px-4 leading-tight">
                {activeStep.title}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-white/5">
            <button
              onClick={handleSubmit}
              disabled={isSaving || !hasChanges || !areRequiredFieldsComplete(formData)}
              className="w-full py-3 px-4 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-sans font-bold uppercase tracking-widest rounded-lg border border-brand-primary/20 transition-all flex items-center justify-center gap-3 disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed group/save shadow-lg shadow-brand-primary/5"
            >
              <Save className="w-4 h-4 group-hover/save:scale-110 transition-transform" />
              {isSaving ? 'Guardando...' : './save_changes.sh'}
            </button>

            {!hasChanges && (
              <div className="text-center mt-3 text-white/20 text-[10px] italic">
                No detected changes
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Magic Upload Terminal Block */}
      <div className="bg-surface/90 backdrop-blur-2xl border border-dashed border-brand-secondary/20 rounded-xl p-6 relative group hover:border-brand-secondary/50 transition-colors">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          <Sparkles className="w-20 h-20 text-brand-secondary transform rotate-12" />
        </div>

        <div className="text-brand-secondary mb-2 flex items-center gap-2 font-bold">
          <span className="text-white/30">$</span> ./auto-fill-cv.sh
        </div>
        <p className="text-ghost text-[11px] mb-6 leading-relaxed">
          ¿Tienes prisa? Sube tu CV y nuestra IA extraerá tus datos automáticamente en segundos.
        </p>

        <div className="grayscale group-hover:grayscale-0 transition-all opacity-80 group-hover:opacity-100 relative z-10">
          <CVUploader onUploadSuccess={handleCVUpload} />
        </div>
      </div>
    </div>
  );
};
