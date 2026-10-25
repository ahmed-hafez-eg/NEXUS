import React, { useRef } from 'react';

export interface ArgonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'secondary' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  pill?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
}

export const ArgonButton: React.FC<ArgonButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  pill = false,
  leftIcon,
  rightIcon,
  isLoading = false,
  className = '',
  disabled,
  onClick,
  ...rest
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = buttonRef.current;
    if (button) {
      const circle = document.createElement('span');
      const diameter = Math.max(button.clientWidth, button.clientHeight);
      const radius = diameter / 2;
      const rect = button.getBoundingClientRect();

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - radius}px`;
      circle.style.top = `${e.clientY - rect.top - radius}px`;
      circle.classList.add('argon-ripple-effect');

      const existingRipple = button.getElementsByClassName('argon-ripple-effect')[0];
      if (existingRipple) {
        existingRipple.remove();
      }

      button.appendChild(circle);
      setTimeout(() => {
        circle.remove();
      }, 600);
    }

    if (onClick && !disabled && !isLoading) {
      onClick(e);
    }
  };

  // Base styling
  const baseClasses =
    'relative overflow-hidden font-semibold inline-flex items-center justify-center transition-all duration-200 active:scale-[0.98] select-none disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none cursor-pointer';

  // Size styling
  const sizeClasses = {
    xs: 'px-2.5 py-1 text-[11px] gap-1.5',
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-xs gap-2',
    lg: 'px-5 py-2.5 text-sm gap-2.5',
  }[size];

  // Rounded geometry
  const radiusClass = pill ? 'rounded-full' : 'rounded-xl';

  // Variants with Argon gradients & shadows
  const variantClasses = {
    primary:
      'bg-gradient-argon-primary text-white shadow-argon-primary hover:shadow-lg hover:brightness-105 border border-sky-400/20',
    success:
      'bg-gradient-argon-success text-white shadow-argon-success hover:shadow-lg hover:brightness-105 border border-emerald-400/20',
    warning:
      'bg-gradient-argon-warning text-white shadow-argon-warning hover:shadow-lg hover:brightness-105 border border-amber-400/20',
    danger:
      'bg-gradient-argon-error text-white shadow-argon-error hover:shadow-lg hover:brightness-105 border border-red-400/20',
    secondary:
      'bg-[#1a1a1a] dark:bg-[#1a1a1a] text-[#ededed] hover:text-white hover:bg-[#262626] border border-[#333333]',
    outline:
      'bg-transparent border border-sky-500/40 text-sky-400 hover:bg-sky-500/10 active:bg-sky-500/20',
    ghost:
      'bg-transparent text-slate-400 hover:text-slate-100 hover:bg-white/5 dark:hover:bg-white/5 active:bg-white/10',
  }[variant];

  return (
    <button
      ref={buttonRef}
      disabled={disabled || isLoading}
      onClick={handleRipple}
      className={`${baseClasses} ${sizeClasses} ${radiusClass} ${variantClasses} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
