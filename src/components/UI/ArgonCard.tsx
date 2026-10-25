import React from 'react';

export interface ArgonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  isDark?: boolean;
  hoverable?: boolean;
  elevation?: 'flat' | 'low' | 'medium' | 'high';
  headerBanner?: React.ReactNode;
}

export const ArgonCard: React.FC<ArgonCardProps> = ({
  children,
  isDark = true,
  hoverable = true,
  elevation = 'medium',
  headerBanner,
  className = '',
  ...rest
}) => {
  const elevationClasses = {
    flat: isDark ? 'border border-[#262626] bg-[#141414]' : 'border border-slate-200 bg-white',
    low: isDark
      ? 'border border-[#262626] bg-[#141414] shadow-md'
      : 'border border-slate-100 bg-white shadow-sm',
    medium: isDark
      ? 'border border-[#262626] bg-[#141414] shadow-argon-card-dark'
      : 'border border-slate-200/80 bg-white shadow-argon-card',
    high: isDark
      ? 'border border-[#333333] bg-[#1a1a1a] shadow-2xl'
      : 'border border-slate-200 bg-white shadow-xl',
  }[elevation];

  const hoverClass = hoverable
    ? isDark
      ? 'hover:-translate-y-1 hover:border-sky-400/40 hover:shadow-argon-hover transition-all duration-300'
      : 'hover:-translate-y-1 hover:border-sky-400/50 hover:shadow-argon-hover transition-all duration-300'
    : '';

  return (
    <div
      className={`relative rounded-2xl overflow-hidden ${elevationClasses} ${hoverClass} ${className}`}
      {...rest}
    >
      {headerBanner && <div className="w-full shrink-0">{headerBanner}</div>}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
