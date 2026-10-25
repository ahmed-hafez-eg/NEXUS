import React from 'react';

export interface ArgonProgressBarProps {
  value: number; // 0 to 100
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  height?: number; // in px
  showLabel?: boolean;
  className?: string;
  isDark?: boolean;
}

export const ArgonProgressBar: React.FC<ArgonProgressBarProps> = ({
  value,
  variant = 'primary',
  height = 6,
  showLabel = false,
  className = '',
  isDark = true,
}) => {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  const gradientMap = {
    primary: 'bg-gradient-argon-primary shadow-[0_0_12px_rgba(44,217,255,0.5)]',
    success: 'bg-gradient-argon-success shadow-[0_0_12px_rgba(5,205,153,0.5)]',
    warning: 'bg-gradient-argon-warning shadow-[0_0_12px_rgba(255,181,71,0.5)]',
    danger: 'bg-gradient-argon-error shadow-[0_0_12px_rgba(238,93,80,0.5)]',
    info: 'bg-gradient-argon-primary shadow-[0_0_12px_rgba(17,113,238,0.5)]',
  }[variant];

  const trackBg = isDark ? 'bg-[#1a1a1a]/80' : 'bg-slate-200';

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Progress</span>
          <span className={isDark ? 'text-white' : 'text-slate-800'}>{clampedValue}%</span>
        </div>
      )}
      <div
        className={`w-full rounded-full overflow-hidden ${trackBg} p-[1px]`}
        style={{ height: `${height}px` }}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${gradientMap}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
};
