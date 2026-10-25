import React, { forwardRef, useState } from 'react';

export interface ArgonInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  isDark?: boolean;
}

export const ArgonInput = forwardRef<HTMLInputElement, ArgonInputProps>(
  ({ label, leftIcon, rightIcon, error, isDark = true, className = '', id, ...rest }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputId = id || (label ? `argon-input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    const inputBg = isDark
      ? 'bg-[#141414] text-[#ededed] placeholder-[#6b6b6b] border-[#333333]'
      : 'bg-white text-[#2B3674] placeholder-[#a1a1a1] border-slate-200';

    const focusBorder = isDark
      ? 'focus:border-[#2CD9FF] focus:ring-4 focus:ring-[#2CD9FF]/15'
      : 'focus:border-[#1171EE] focus:ring-4 focus:ring-[#1171EE]/15';

    const errorBorder = 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20';

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={`block text-xs font-bold uppercase tracking-wider mb-1.5 transition-colors duration-150 ${
              isFocused
                ? isDark
                  ? 'text-[#2CD9FF]'
                  : 'text-[#1171EE]'
                : isDark
                ? 'text-[#a1a1a1]'
                : 'text-[#707E94]'
            }`}
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <span
              className={`absolute left-3.5 transition-colors pointer-events-none ${
                isFocused
                  ? isDark
                    ? 'text-[#2CD9FF]'
                    : 'text-[#1171EE]'
                  : isDark
                  ? 'text-slate-400'
                  : 'text-slate-400'
              }`}
            >
              {leftIcon}
            </span>
          )}

          <input
            id={inputId}
            ref={ref}
            onFocus={(e) => {
              setIsFocused(true);
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              rest.onBlur?.(e);
            }}
            className={`w-full rounded-xl border text-sm font-medium transition-all duration-200 outline-none ${
              leftIcon ? 'pl-10' : 'pl-3.5'
            } ${rightIcon ? 'pr-10' : 'pr-3.5'} py-2.5 ${inputBg} ${
              error ? errorBorder : focusBorder
            } ${className}`}
            {...rest}
          />

          {rightIcon && <span className="absolute right-3.5 flex items-center">{rightIcon}</span>}
        </div>

        {error && <p className="mt-1 text-xs text-rose-500 font-medium">{error}</p>}
      </div>
    );
  }
);

ArgonInput.displayName = 'ArgonInput';
