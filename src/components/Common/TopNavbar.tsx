import React, { useEffect, useRef, useState } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Calendar,
  Database,
  FolderGit2,
  Sun,
  Moon,
  Bookmark,
  Type,
  ChevronDown,
  Hash,
  Target,
  X,
  MoreHorizontal,
  Github,
  Search,
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useSpaceStore } from '../../store/useSpaceStore';
import { useActivityStore } from '../../store/useActivityStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useGitHubStore } from '../../store/useGitHubStore';
import { ArgonBreadcrumbs, BreadcrumbItem } from '../UI/ArgonBreadcrumbs';
import { ArgonButton } from '../UI/ArgonButton';
import { showToast } from '../../store/useToastStore';
import * as db from '../../db/client';

export const TopNavbar: React.FC = () => {
  const isSidebarCollapsed = useUIStore(s => s.isSidebarCollapsed);
  const toggleSidebar = useUIStore(s => s.toggleSidebar);
  const openAddCourse = useUIStore(s => s.openAddCourse);
  const openHeatmap = useUIStore(s => s.openHeatmap);
  const openBackup = useUIStore(s => s.openBackup);
  const openSpaceLinkPicker = useUIStore(s => s.openSpaceLinkPicker);
  const openFlags = useUIStore(s => s.openFlags);
  const openHashtagSearch = useUIStore(s => s.openHashtagSearch);
  const openFocusPicker = useUIStore(s => s.openFocusPicker);
  const openCourseDetail = useUIStore(s => s.openCourseDetail);
  const theme = useUIStore(s => s.theme);
  const toggleTheme = useUIStore(s => s.toggleTheme);
  const activePanel = useUIStore(s => s.activePanel);
  const setActivePanel = useUIStore(s => s.setActivePanel);

  const githubToken = useGitHubStore(s => s.token);
  const activeSpaceId = useSpaceStore(s => s.activeSpaceId);
  const spaces = useSpaceStore(s => s.spaces);
  const folders = useSpaceStore(s => s.folders);
  const setSpaceFocus = useSpaceStore(s => s.setSpaceFocus);
  const activeSpace = spaces.find(s => s.id === activeSpaceId);

  const focusedNodeId = activeSpace?.focused_node_id ?? null;
  const createTextNode = useCanvasStore(s => s.createTextNode);
  const courses = useCanvasStore(s => s.courses);
  const setSelectedCourseId = useCanvasStore(s => s.setSelectedCourseId);
  const totalLastYear = useActivityStore(s => s.totalLastYear);

  const [flagCount, setFlagCount] = useState(0);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    db.getFlaggedSections()
      .then(items => setFlagCount(items.length))
      .catch(console.error);
  }, [activePanel]);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!showAddMenu && !showMoreMenu) return;
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddMenu, showMoreMenu]);

  const handleAddTextNode = async () => {
    setShowAddMenu(false);
    if (!activeSpaceId) return;
    await createTextNode(activeSpaceId, '', '#475569', 200, 200);
    showToast.info('Text note added to canvas');
  };

  const focusedCourse = courses.find(c => c.id === focusedNodeId);

  const handleJumpToFocused = () => {
    if (focusedCourse) {
      setSelectedCourseId(focusedCourse.id);
      openCourseDetail();
    }
  };

  const handleClearFocus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeSpaceId) {
      setSpaceFocus(activeSpaceId, null);
      showToast.info('Space focus cleared');
    }
  };

  const isDark = theme === 'dark';

  // Breadcrumbs data (real hierarchy: Parent Folder -> Active Space)
  const breadcrumbItems: BreadcrumbItem[] = [];
  if (activeSpace) {
    if (activeSpace.folder_id) {
      const parentFolder = folders.find(f => f.id === activeSpace.folder_id);
      if (parentFolder) {
        breadcrumbItems.push({ label: parentFolder.name });
      }
    }
    breadcrumbItems.push({ label: activeSpace.name });
  }

  // Argon Navbar Styles
  const navClass = isDark
    ? 'bg-[#111111]/90 border-[rgba(255,255,255,0.08)] text-white shadow-argon-card-dark backdrop-blur-md'
    : 'bg-white/90 border-slate-200 text-[#2B3674] shadow-argon-card backdrop-blur-md';

  const iconBtnClass = isDark
    ? 'text-[#a1a1a1] hover:text-white hover:bg-white/5 active:bg-white/10'
    : 'text-[#707E94] hover:text-[#2B3674] hover:bg-slate-100 active:bg-slate-200';

  const dropdownClass = isDark
    ? 'bg-[#111111] border-[rgba(255,255,255,0.12)] text-slate-200 shadow-2xl'
    : 'bg-white border-slate-200 text-slate-800 shadow-2xl';

  const dropdownItemClass = isDark
    ? 'text-[#a1a1a1] hover:text-white hover:bg-[#1a1a1a]'
    : 'text-slate-700 hover:text-[#2B3674] hover:bg-slate-50';

  return (
    <header
      className={`h-14 ${navClass} border-b px-4 flex items-center justify-between select-none z-30 shrink-0 transition-colors duration-200`}
    >
      {/* Left section: Sidebar toggle, Logo brand, Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-xl transition ${iconBtnClass}`}
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label="Toggle Sidebar"
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>

        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl overflow-hidden shadow-sm flex items-center justify-center border border-white/10 dark:border-white/10 bg-[#111111]">
              <img src="/favicon.png" className="w-8 h-8 object-cover rounded-xl" alt="NEXUS" />
            </div>
            <span className="font-extrabold text-sm tracking-wider hidden sm:inline bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
              NEXUS
            </span>
          </div>

          {activeSpace && (
            <div className="hidden md:flex items-center pl-3 border-l border-white/10 dark:border-white/10 min-w-0">
              <ArgonBreadcrumbs items={breadcrumbItems} isDark={isDark} />
            </div>
          )}
        </div>
      </div>

      {/* Center section: Modern Search Command trigger */}
      <div className="hidden lg:flex items-center flex-1 max-w-xs mx-6">
        <button
          onClick={() => openHashtagSearch()}
          className={`w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl border text-xs transition duration-150 ${
            isDark
              ? 'bg-[#0a0a0a]/90 border-[rgba(255,255,255,0.08)] hover:border-sky-400/50 text-[#a1a1a1]'
              : 'bg-slate-50 border-slate-200 hover:border-sky-400 text-slate-500'
          }`}
          title="Search hashtags & nodes (Ctrl+K)"
        >
          <div className="flex items-center gap-2">
            <Search size={14} className="text-[#2CD9FF]" />
            <span>Search #tags, nodes...</span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 dark:bg-white/10">
            #
          </span>
        </button>
      </div>

      {/* Right section: Focus, Link Space, Add Node, Quick Actions, More Menu */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Per-Space Focus Indicator Badge */}
        {focusedCourse ? (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition shadow-md ${
              isDark
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            <button
              onClick={handleJumpToFocused}
              className="flex items-center gap-1.5 hover:brightness-110 transition cursor-pointer"
              title={`Active Space Focus: ${focusedCourse.name}. Click to view details.`}
            >
              <Target size={14} className="text-amber-400 fill-amber-400 shrink-0 animate-pulse" />
              <span className="truncate max-w-[90px] md:max-w-[130px] font-bold">
                {focusedCourse.name}
              </span>
            </button>
            <button
              onClick={() => openFocusPicker()}
              className="p-0.5 rounded hover:bg-amber-400/20 transition text-amber-400"
              title="Change Focus Node"
            >
              <ChevronDown size={13} />
            </button>
            <button
              onClick={handleClearFocus}
              className="p-0.5 rounded hover:bg-rose-500/20 hover:text-rose-400 transition opacity-70 hover:opacity-100"
              title="Clear Focus"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={openFocusPicker}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
              isDark
                ? 'bg-[#1a1a1a] border-[rgba(255,255,255,0.1)] text-[#a1a1a1] hover:text-white hover:border-amber-400/40'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-[#2B3674] hover:border-amber-400'
            }`}
            title="Set Focus Node for this Space"
          >
            <Target size={14} className="text-amber-400" />
            <span className="hidden sm:inline">Focus</span>
          </button>
        )}

        {/* Link Space Button */}
        <ArgonButton
          variant="secondary"
          size="sm"
          disabled={!activeSpaceId}
          onClick={openSpaceLinkPicker}
          leftIcon={<FolderGit2 size={14} className="text-sky-400" />}
          title="Link another Space onto canvas"
        >
          <span className="hidden sm:inline">Link Space</span>
        </ArgonButton>

        {/* Add Node Split Button with Argon Gradient */}
        <div ref={addMenuRef} className="relative flex">
          <button
            onClick={openAddCourse}
            disabled={!activeSpaceId}
            className="flex items-center gap-1.5 pl-3.5 pr-2.5 py-1.5 bg-gradient-argon-primary hover:brightness-105 disabled:opacity-50 text-white rounded-l-xl text-xs font-semibold shadow-argon-primary transition active:scale-95"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Add Node</span>
          </button>
          <button
            onClick={() => setShowAddMenu(prev => !prev)}
            disabled={!activeSpaceId}
            className="flex items-center px-2 py-1.5 bg-gradient-argon-primary hover:brightness-105 disabled:opacity-50 text-white rounded-r-xl text-xs font-semibold shadow-argon-primary transition active:scale-95 border-l border-white/20"
            title="More node types"
          >
            <ChevronDown
              size={13}
              strokeWidth={2.5}
              className={`transition-transform duration-200 ${showAddMenu ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Add Menu Dropdown */}
          {showAddMenu && (
            <div
              className={`absolute right-0 top-full mt-2 rounded-2xl shadow-2xl border z-50 py-1.5 min-w-[170px] animate-fade-in-up ${dropdownClass}`}
            >
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  openAddCourse();
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold transition ${dropdownItemClass}`}
              >
                <div className="w-6 h-6 rounded-lg bg-sky-500/15 flex items-center justify-center text-sky-400">
                  <Plus size={13} strokeWidth={2.5} />
                </div>
                <span>Node</span>
              </button>
              <button
                onClick={handleAddTextNode}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold transition ${dropdownItemClass}`}
              >
                <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                  <Type size={13} strokeWidth={2.5} />
                </div>
                <span>Text Note</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-xl transition ${iconBtnClass}`}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? (
            <Sun size={17} className="text-amber-400 transition-transform hover:rotate-45" />
          ) : (
            <Moon size={17} className="text-indigo-500 transition-transform hover:-rotate-12" />
          )}
        </button>

        {/* Overflow "More Actions" Menu (⋯) */}
        <div ref={moreMenuRef} className="relative flex items-center">
          <button
            onClick={() => setShowMoreMenu(prev => !prev)}
            className={`p-2 rounded-xl transition relative border ${
              isDark
                ? 'bg-[#1a1a1a] border-[rgba(255,255,255,0.1)] text-[#a1a1a1] hover:text-white'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-[#2B3674]'
            }`}
            title="More features and settings"
          >
            <MoreHorizontal size={17} />
            {flagCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-[#111111] animate-pulse" />
            )}
          </button>

          {showMoreMenu && (
            <div
              className={`absolute right-0 top-full mt-2 rounded-2xl shadow-2xl border z-50 py-2 min-w-[220px] animate-fade-in-up ${dropdownClass}`}
            >
              {/* Hashtag Search */}
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  openHashtagSearch();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium transition ${dropdownItemClass}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-sky-500/15 flex items-center justify-center text-sky-400">
                    <Hash size={13} strokeWidth={2.5} />
                  </div>
                  <span>Hashtag Search</span>
                </div>
              </button>

              {/* Flags list */}
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  openFlags();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium transition ${dropdownItemClass}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
                    <Bookmark size={13} className="fill-amber-400" />
                  </div>
                  <span>Flagged Sub-Tasks</span>
                </div>
                {flagCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {flagCount}
                  </span>
                )}
              </button>

              {/* Heatmap */}
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  openHeatmap();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium transition ${dropdownItemClass}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <Calendar size={13} />
                  </div>
                  <span>Activity Heatmap</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {totalLastYear}
                </span>
              </button>

              {/* GitHub Integration */}
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  setActivePanel('github' as any);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium transition ${dropdownItemClass}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400">
                    <Github size={13} />
                  </div>
                  <span>GitHub Integration</span>
                </div>
                {githubToken ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" title="Connected" />
                ) : (
                  <span className="text-[10px] text-slate-500">Connect</span>
                )}
              </button>

              {/* Backup */}
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  openBackup();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium transition ${dropdownItemClass}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-400">
                    <Database size={13} />
                  </div>
                  <span>Backup & Export</span>
                </div>
              </button>

              <div className={`my-1.5 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`} />

              {/* Theme toggle option */}
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  toggleTheme();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium transition ${dropdownItemClass}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
                    {isDark ? <Sun size={13} /> : <Moon size={13} />}
                  </div>
                  <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
