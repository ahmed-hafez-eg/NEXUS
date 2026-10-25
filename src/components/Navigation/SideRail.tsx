import React, { useEffect, useState } from 'react';
import {
  LayoutGrid,
  Hash,
  Bookmark,
  Calendar,
  Github,
  Database,
  Sun,
  Moon,
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useGitHubStore } from '../../store/useGitHubStore';
import { useActivityStore } from '../../store/useActivityStore';
import * as db from '../../db/client';

export const SideRail: React.FC = () => {
  const isSidebarCollapsed = useUIStore(s => s.isSidebarCollapsed);
  const toggleSidebar = useUIStore(s => s.toggleSidebar);
  const openHashtagSearch = useUIStore(s => s.openHashtagSearch);
  const openFlags = useUIStore(s => s.openFlags);
  const openHeatmap = useUIStore(s => s.openHeatmap);
  const openBackup = useUIStore(s => s.openBackup);
  const setActivePanel = useUIStore(s => s.setActivePanel);
  const activePanel = useUIStore(s => s.activePanel);
  const theme = useUIStore(s => s.theme);
  const toggleTheme = useUIStore(s => s.toggleTheme);

  const githubToken = useGitHubStore(s => s.token);
  const totalLastYear = useActivityStore(s => s.totalLastYear);

  const [flagCount, setFlagCount] = useState(0);

  useEffect(() => {
    db.getFlaggedSections()
      .then(items => setFlagCount(items.length))
      .catch(console.error);
  }, [activePanel]);

  const isDark = theme === 'dark';

  // Base pill style classes
  const pillContainerClass = isDark
    ? 'bg-[#111111] border-[#262626] shadow-md'
    : 'bg-white border-slate-200/90 shadow-sm';

  const getButtonClass = (isActive: boolean) => {
    if (isActive) {
      return isDark
        ? 'bg-gradient-to-r from-sky-500 to-cyan-400 text-white shadow-md'
        : 'bg-[#2B3674] text-white shadow-sm';
    }
    return isDark
      ? 'text-[#a1a1a1] hover:text-[#ededed] hover:bg-white/5 active:bg-white/10'
      : 'text-slate-500 hover:text-[#2B3674] hover:bg-slate-100 active:bg-slate-200';
  };

  return (
    <aside
      className="w-[70px] h-full flex flex-col items-center justify-between py-3 px-2 select-none shrink-0 z-30 transition-colors duration-200"
      aria-label="Side Navigation Rail"
    >
      {/* Top Group: Logo & Theme Toggle */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        {/* Logo Pill */}
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${pillContainerClass}`}
          title="NEXUS - Knowledge Connected"
          aria-label="NEXUS Logo"
        >
          <img src="/favicon.png" alt="NEXUS" className="w-8 h-8 object-contain rounded-xl" />
        </div>

        {/* Sun / Moon Theme Toggle Pill */}
        <div
          className={`flex flex-col items-center gap-1.5 p-1.5 rounded-2xl border transition-colors duration-200 ${pillContainerClass}`}
          role="group"
          aria-label="Theme selector"
        >
          <button
            onClick={() => isDark && toggleTheme()}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              !isDark
                ? 'bg-[#2B3674] text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-amber-400 hover:bg-white/5'
            }`}
            title="Switch to Light Mode"
            aria-label="Light mode"
          >
            <Sun size={15} />
          </button>
          <button
            onClick={() => !isDark && toggleTheme()}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              isDark
                ? 'bg-gradient-to-r from-sky-500 to-cyan-400 text-white shadow-sm'
                : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
            }`}
            title="Switch to Dark Mode"
            aria-label="Dark mode"
          >
            <Moon size={15} />
          </button>
        </div>
      </div>

      {/* Middle Group: Feature Icons Pill */}
      <div
        className={`flex flex-col items-center gap-2 p-2 rounded-3xl border transition-colors duration-200 ${pillContainerClass}`}
      >
        {/* Workspaces Toggle */}
        <button
          onClick={toggleSidebar}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${getButtonClass(
            !isSidebarCollapsed
          )}`}
          title={!isSidebarCollapsed ? 'Close Workspaces' : 'Open Workspaces'}
          aria-label="Workspaces and Folders"
        >
          <LayoutGrid size={18} strokeWidth={2} />
        </button>

        {/* Hashtag Search */}
        <button
          onClick={() => openHashtagSearch()}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${getButtonClass(
            false
          )}`}
          title="Hashtag Search (Ctrl+K)"
          aria-label="Search hashtags"
        >
          <Hash size={18} strokeWidth={2} />
        </button>

        {/* Flagged Sub-Tasks */}
        <button
          onClick={openFlags}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${getButtonClass(
            false
          )}`}
          title={flagCount > 0 ? `Flagged Sub-Tasks (${flagCount})` : 'Flagged Sub-Tasks'}
          aria-label="Flagged sub-tasks"
        >
          <Bookmark size={18} strokeWidth={2} />
          {flagCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
              {flagCount}
            </span>
          )}
        </button>

        {/* Activity Heatmap / Analysis Page */}
        <button
          onClick={openHeatmap}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${getButtonClass(
            activePanel === 'heatmap'
          )}`}
          title={
            totalLastYear > 0
              ? `Analysis & Activity (${totalLastYear} actions)`
              : 'Analysis & Activity'
          }
          aria-label="Analysis and activity"
        >
          <Calendar size={18} strokeWidth={2} />
          {totalLastYear > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-sky-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
              {totalLastYear > 99 ? '99+' : totalLastYear}
            </span>
          )}
        </button>

        {/* GitHub Integration */}
        <button
          onClick={() => setActivePanel('github' as any)}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center relative transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${getButtonClass(
            false
          )}`}
          title={githubToken ? 'GitHub Integration (Connected)' : 'GitHub Integration'}
          aria-label="GitHub integration"
        >
          <Github size={18} strokeWidth={2} />
          {githubToken && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#111111] dark:ring-[#111111]" />
          )}
        </button>

        {/* Backup & Export */}
        <button
          onClick={openBackup}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${getButtonClass(
            false
          )}`}
          title="Backup & Export"
          aria-label="Backup and export"
        >
          <Database size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Spacer to balance bottom */}
      <div className="w-10 h-2" />
    </aside>
  );
};
