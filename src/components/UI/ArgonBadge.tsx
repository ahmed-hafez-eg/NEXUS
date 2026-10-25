import React from 'react';

export interface ArgonBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gradient';
  size?: 'xs' | 'sm' | 'md';
  hasDot?: boolean;
  icon?: React.ReactNode;
}

export const ArgonBadge: React.FC<ArgonBadgeProps> = ({
  children,
  variant = 'primary',
  size = 'sm',
  hasDot = false,
  icon,
  className = '',
  ...rest
}) => {
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px] gap-1',
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-xs gap-2',
  }[size];

  const variantClasses = {
    primary:
      'bg-sky-500/15 text-sky-400 border border-sky-500/30 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40',
    success:
      'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40',
    warning:
      'bg-amber-500/15 text-amber-600 border border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40',
    danger:
      'bg-rose-500/15 text-rose-600 border border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/40',
    info:
      'bg-blue-500/15 text-blue-600 border border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40',
    neutral:
      'bg-slate-200/80 text-slate-700 border border-slate-300 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/60',
    gradient:
      'bg-gradient-argon-primary text-white shadow-sm border border-white/20',
  }[variant];

  const dotColorClasses = {
    primary: 'bg-sky-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    info: 'bg-blue-400',
    neutral: 'bg-slate-400',
    gradient: 'bg-white',
  }[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold select-none leading-none tracking-tight transition-colors duration-150 ${sizeClasses} ${variantClasses} ${className}`}
      {...rest}
    >
      {hasDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 animate-pulse ${dotColorClasses}`}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
