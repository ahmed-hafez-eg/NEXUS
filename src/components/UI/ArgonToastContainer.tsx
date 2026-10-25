import React from 'react';
import { useToastStore, ToastItem } from '../../store/useToastStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ArgonToastContainer: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none">
      {toasts.map((toast: ToastItem) => {
        const iconMap = {
          success: <CheckCircle2 size={16} className="text-emerald-400" />,
          info: <Info size={16} className="text-sky-400" />,
          warning: <AlertTriangle size={16} className="text-amber-400" />,
          error: <AlertCircle size={16} className="text-rose-400" />,
        }[toast.type];

        const borderMap = {
          success: 'border-emerald-500/40 bg-[#141414] text-[#ededed]',
          info: 'border-sky-500/40 bg-[#141414] text-[#ededed]',
          warning: 'border-amber-500/40 bg-[#141414] text-[#ededed]',
          error: 'border-rose-500/40 bg-[#141414] text-[#ededed]',
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-2xl border shadow-2xl backdrop-blur-md flex items-start gap-3 transition-all duration-300 animate-slide-in-right ${borderMap}`}
          >
            <div className="shrink-0 mt-0.5">{iconMap}</div>
            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className="text-xs font-bold leading-tight mb-0.5 tracking-tight">
                  {toast.title}
                </h4>
              )}
              <p className="text-xs text-slate-300 leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
