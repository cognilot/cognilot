import { type FC } from 'react';
import { Save, Sparkles } from 'lucide-react';
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
  const isLocationDone = !!formData.country || !!formData.city || !!formData.location;
  const isExperienceDone =
    !!formData.current_company ||
    !!formData.current_role ||
    !!formData.degree ||
    !!formData.university;

  const systemKeys = new Set([
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
  ]);

  const isManualMemoryDone = Object.keys(formData).some((key) => {
    if (systemKeys.has(key)) return false;
    const value = formData[key];
    return value !== undefined && value !== null && value !== '';
  });

  const steps = [
    { id: 'location', title: 'Set Location', completed: isLocationDone },
    { id: 'experience', title: 'Add Experience', completed: isExperienceDone },
    { id: 'manual', title: 'Custom Data', completed: isManualMemoryDone },
  ];

  const currentStepIndex = steps.findIndex((s) => !s.completed);
  const activeStep = currentStepIndex === -1 ? steps[steps.length - 1] : currentStepIndex;
  const stepNumber = currentStepIndex === -1 ? steps.length : currentStepIndex + 1;

  const onboardCompletedSteps =
    (isLocationDone ? 1 : 0) + (isExperienceDone ? 1 : 0) + (isManualMemoryDone ? 1 : 0);
  const aiCapacity = Math.min(100, Math.round(20 + (onboardCompletedSteps / 3) * 80));

  const radius = 60;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (aiCapacity / 100) * circumference;

  return (
    <div className="space-y-6 lg:sticky lg:top-8 h-fit animate-fade-in">
      <div className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden relative">
        <div className="p-6 md:p-8">
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
                  className="text-accent-cyan"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center -mt-1">
                <span className="text-4xl font-bold text-white tracking-tighter">
                  {aiCapacity}%
                </span>
                <span className="text-[9px] text-white/40 font-medium tracking-wider uppercase mt-1">
                  Complete
                </span>
              </div>
            </div>

            <div className="text-center space-y-2 mt-4 w-full">
              <div className="text-white/30 text-[10px] font-medium uppercase tracking-wider bg-white/5 py-1 px-3 rounded-full inline-block">
                Step {stepNumber} of {steps.length}
              </div>
              <div className="text-white/70 font-medium text-xs tracking-wide px-4 leading-tight">
                {typeof activeStep === 'object' ? activeStep.title : ''}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5">
            <button
              onClick={handleSubmit}
              disabled={isSaving || !hasChanges}
              className="w-full py-3 px-4 bg-accent-violet/10 hover:bg-accent-violet/20 text-accent-violet text-xs font-semibold uppercase tracking-wider rounded-lg border border-accent-violet/20 transition-all flex items-center justify-center gap-3 disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed group shadow-lg shadow-accent-violet/5"
            >
              <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>

            {!hasChanges && (
              <div className="text-center mt-3 text-white/20 text-[10px]">No changes detected</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-bg-primary/90 backdrop-blur-2xl border border-dashed border-accent-cyan/20 rounded-xl p-6 relative group hover:border-accent-cyan/50 transition-colors">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
          <Sparkles className="w-20 h-20 text-accent-cyan transform rotate-12" />
        </div>

        <div className="text-accent-cyan mb-2 flex items-center gap-2 font-medium text-sm">
          Auto-fill from CV
        </div>
        <p className="text-white/30 text-[11px] mb-6 leading-relaxed">
          Upload your CV and our AI will extract your data automatically in seconds.
        </p>

        <div className="grayscale group-hover:grayscale-0 transition-all opacity-80 group-hover:opacity-100 relative z-10">
          <CVUploader onUploadSuccess={handleCVUpload} />
        </div>
      </div>
    </div>
  );
};
