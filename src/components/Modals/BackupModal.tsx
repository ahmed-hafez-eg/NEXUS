import React, { useState } from 'react';
import { X, Download, Upload, Database, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useSpaceStore } from '../../store/useSpaceStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useActivityStore } from '../../store/useActivityStore';
import * as db from '../../db/client';
import { exportToObsidianVault } from '../../utils/obsidianExport';
import { ExportData } from '../../types';
import { ArgonButton } from '../UI/ArgonButton';
import { showToast } from '../../store/useToastStore';

export const BackupModal: React.FC = () => {
  const activePanel = useUIStore(s => s.activePanel);
  const closePanel = useUIStore(s => s.closePanel);
  const theme = useUIStore(s => s.theme);
  const isDark = theme === 'dark';

  const activeSpaceId = useSpaceStore(s => s.activeSpaceId);
  const loadSpaces = useSpaceStore(s => s.loadSpaces);
  const loadCanvas = useCanvasStore(s => s.loadCanvas);
  const loadActivity = useActivityStore(s => s.loadActivity);

  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const isOpen = activePanel === 'backup';
  if (!isOpen) return null;

  const handleExportObsidian = async () => {
    setIsProcessing(true);
    setStatus(null);
    try {
      const result = await exportToObsidianVault();
      if (result.cancelled) {
        return;
      }
      setStatus({
        type: 'success',
        message: `Obsidian Vault successfully exported! ${result.fileCount} files written to: ${result.folderPath}`,
      });
      showToast.success('Obsidian Vault exported!');
    } catch (err) {
      console.error('Obsidian export failed', err);
      setStatus({ type: 'error', message: 'Failed to export Obsidian vault.' });
      showToast.error('Failed to export Obsidian vault.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    setIsProcessing(true);
    setStatus(null);
    try {
      const data = await db.exportAllData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ type: 'success', message: 'Backup successfully exported and downloaded!' });
      showToast.success('Database backup exported');
    } catch (err) {
      console.error('Export failed', err);
      setStatus({ type: 'error', message: 'Failed to export backup data.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatus(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed: ExportData = JSON.parse(text);
        await db.importAllData(parsed);

        await loadSpaces();
        if (activeSpaceId) {
          await loadCanvas(activeSpaceId);
        }
        await loadActivity();

        setStatus({ type: 'success', message: 'Backup successfully restored!' });
        showToast.success('Backup successfully restored!');
      } catch (err) {
        console.error('Import failed', err);
        setStatus({ type: 'error', message: 'Invalid backup file format or corrupt data.' });
        showToast.error('Failed to restore backup');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  const modalBg = isDark
    ? 'bg-[#141414] border-[#262626] text-[#ededed] shadow-2xl'
    : 'bg-white border-slate-200 text-[#2B3674] shadow-2xl';

  const headerBg = isDark ? 'border-[#262626] bg-[#111111]' : 'border-slate-100 bg-slate-50';
  const cardBg = isDark ? 'bg-[#1a1a1a] border-[#262626]' : 'bg-slate-50/80 border-slate-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div
        className={`w-full max-w-xl border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-up ${modalBg}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${headerBg}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-argon-primary flex items-center justify-center text-white shadow-argon-primary">
              <Database size={16} />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">Backup & Data Portability</h3>
              <p className="text-[11px] text-[#a1a1a1]">Snapshot export, restore, and Obsidian sync</p>
            </div>
          </div>
          <button
            onClick={closePanel}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <p className="text-xs leading-relaxed text-[#a1a1a1]">
            All workspaces, course roadmaps, task checklists, and daily logs are stored locally offline on your device in SQLite. Keep your data portable and secure with local snapshots.
          </p>

          {status && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 ${
                status.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle size={16} className="shrink-0 text-rose-400" />
              )}
              <span>{status.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Export Card */}
            <div className={`border rounded-2xl p-4 flex flex-col justify-between ${cardBg}`}>
              <div>
                <h4 className="font-bold text-sm">Export Snapshot</h4>
                <p className="text-xs mt-1 text-[#a1a1a1]">
                  Save all workspaces, checklists, and activity history to a JSON file.
                </p>
              </div>
              <ArgonButton
                variant="success"
                size="sm"
                onClick={handleExport}
                disabled={isProcessing}
                leftIcon={<Download size={14} />}
                className="mt-4 w-full"
              >
                Export JSON
              </ArgonButton>
            </div>

            {/* Import Card */}
            <div className={`border rounded-2xl p-4 flex flex-col justify-between ${cardBg}`}>
              <div>
                <h4 className="font-bold text-sm">Restore Snapshot</h4>
                <p className="text-xs mt-1 text-[#a1a1a1]">
                  Restore local database state from an existing JSON backup.
                </p>
              </div>
              <label className="mt-4 w-full">
                <div className="w-full py-2 px-3 rounded-xl bg-[#1a1a1a] hover:bg-[#2B3674] text-white border border-white/10 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm">
                  <Upload size={14} /> Select File
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={isProcessing}
                  className="hidden"
                />
              </label>
            </div>

            {/* Obsidian Vault Export Card */}
            <div className={`sm:col-span-2 border rounded-2xl p-4 flex flex-col justify-between ${cardBg}`}>
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <FileText size={14} />
                  </div>
                  <h4 className="font-bold text-sm">Obsidian Vault Export</h4>
                </div>
                <p className="text-xs mt-2 text-[#a1a1a1] leading-relaxed">
                  Export all spaces and nodes as a structured Obsidian Vault into any folder. Includes frontmatter tags, progress checklists, and <code className="text-[#2CD9FF] font-mono">[[wikilinks]]</code> that automatically render your curriculum in Obsidian's interactive Graph View.
                </p>
              </div>
              <ArgonButton
                variant="primary"
                size="sm"
                onClick={handleExportObsidian}
                disabled={isProcessing}
                leftIcon={<Download size={14} />}
                className="mt-4 w-full"
              >
                Select Folder &amp; Export Obsidian Vault
              </ArgonButton>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex justify-end ${headerBg}`}>
          <button
            onClick={closePanel}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
