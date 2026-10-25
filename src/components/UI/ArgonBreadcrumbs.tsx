import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

export interface ArgonBreadcrumbsProps {
  items: BreadcrumbItem[];
  isDark?: boolean;
  className?: string;
}

export const ArgonBreadcrumbs: React.FC<ArgonBreadcrumbsProps> = ({
  items,
  isDark = true,
  className = '',
}) => {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1.5 text-xs select-none ${className}`}>
      <span title="Workspaces" className={`flex items-center cursor-default ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        <Home size={13} className="shrink-0" />
      </span>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={index}>
            <ChevronRight
              size={12}
              className={`shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
            />
            {item.onClick && !isLast ? (
              <button
                onClick={item.onClick}
                title={item.label}
                className={`flex items-center gap-1 font-medium transition hover:underline truncate max-w-[180px] sm:max-w-[280px] md:max-w-[380px] ${
                  isDark ? 'text-[#a1a1a1] hover:text-white' : 'text-[#707E94] hover:text-[#2B3674]'
                }`}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </button>
            ) : (
              <span
                title={item.label}
                className={`flex items-center gap-1 font-bold truncate max-w-[200px] sm:max-w-[320px] md:max-w-[440px] lg:max-w-[560px] ${
                  isLast
                    ? isDark
                      ? 'text-white'
                      : 'text-[#2B3674]'
                    : isDark
                    ? 'text-[#a1a1a1]'
                    : 'text-[#707E94]'
                }`}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
