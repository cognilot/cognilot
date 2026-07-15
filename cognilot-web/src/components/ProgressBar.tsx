import React from 'react';

interface ProgressBarProps {
  progress: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  // Determine color based on progress

  // Custom styles for the gradient colors since we're using standard CSS
  const getGradient = (p: number) => {
    if (p >= 80) return 'linear-gradient(90deg, var(--color-success), var(--color-accent-cyan))';
    if (p >= 50) return 'linear-gradient(90deg, var(--color-warning), var(--color-success))';
    return 'linear-gradient(90deg, var(--color-error), var(--color-warning))';
  };

  return (
    <div className="w-full">
      <div className="flex justify-end mb-1">
        <span className="text-sm font-medium text-main">{progress}%</span>
      </div>
      <div className="w-full bg-surface-elevated rounded-full h-2.5 overflow-hidden">
        <div
          className="h-2.5 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            background: getGradient(progress),
            boxShadow: '0 0 10px rgba(0,0,0,0.3)',
          }}
        ></div>
      </div>
    </div>
  );
};
