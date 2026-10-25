import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { ArgonButton } from '../UI/ArgonButton';

export const ConfirmModal: React.FC = () => {
  const confirmModal = useUIStore(s => s.confirmModal);
  const closeConfirm = useUIStore(s => s.closeConfirm);
  const theme = useUIStore(s => s.theme);
  const isDark = theme === 'dark';

  if (!confirmModal.isOpen) return null;

  const handleConfirm = () => {
    confirmModal.onConfirm();
    closeConfirm();
  };

  const modalBg = isDark
    ? 'bg-[#141414] border-[#262626] text-[#ededed] shadow-2xl'
    : 'bg-white border-slate-200 text-[#2B3674] shadow-2xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div
        className={`w-full max-w-md border rounded-2xl shadow-2xl p-6 animate-fade-in-up ${modalBg}`}
      >
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-argon-error text-white flex items-center justify-center shrink-0 shadow-argon-error">
            <AlertTriangle size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold tracking-tight">
              {confirmModal.title}
            </h3>
            <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-[#a1a1a1]' : 'text-[#707E94]'}`}>
              {confirmModal.message}
            </p>
          </div>
          <button
            onClick={closeConfirm}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            onClick={closeConfirm}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
              isDark
                ? 'bg-white/5 hover:bg-white/10 text-slate-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Cancel
          </button>
          <ArgonButton
            variant="danger"
            size="sm"
            onClick={handleConfirm}
          >
            {confirmModal.confirmText || 'Delete'}
          </ArgonButton>
        </div>
      </div>
    </div>
  );
};
