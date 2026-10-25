import React, { useRef, useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Target,
  FolderGit2,
  ChevronDown,
  X,
  Type,
} from 'lucide-react';
import { useSpaceStore } from '../../store/useSpaceStore';
import { useUIStore } from '../../store/useUIStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { showToast } from '../../store/useToastStore';

export const TopPillBar: React.FC = () => {
  const theme = useUIStore(s => s.theme);
  const openAddCourse = useUIStore(s => s.openAddCourse);
  const openSpaceLinkPicker = useUIStore(s => s.openSpaceLinkPicker);
  const openHashtagSearch = useUIStore(s => s.openHashtagSearch);
  const openFocusPicker = useUIStore(s => s.openFocusPicker);
  const openCourseDetail = useUIStore(s => s.openCourseDetail);

  const spaces = useSpaceStore(s => s.spaces);
  const activeSpaceId = useSpaceStore(s => s.activeSpaceId);
  const setActiveSpaceId = useSpaceStore(s => s.setActiveSpaceId);
  const createSpace = useSpaceStore(s => s.createSpace);
  const setSpaceFocus = useSpaceStore(s => s.setSpaceFocus);

  const activeSpace = spaces.find(s => s.id === activeSpaceId);
  const focusedNodeId = activeSpace?.focused_node_id ?? null;

  const courses = useCanvasStore(s => s.courses);
  const createTextNode = useCanvasStore(s => s.createTextNode);
  const setSelectedCourseId = useCanvasStore(s => s.setSelectedCourseId);

  const focusedCourse = courses.find(c => c.id === focusedNodeId);

  const [isAddingSpace, setIsAddingSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);

  const addMenuRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAddMenu) return;
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddMenu]);

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSpaceName.trim()) {
      await createSpace(newSpaceName.trim());
      showToast.success(`Created space "${newSpaceName.trim()}"`);
      setNewSpaceName('');
      setIsAddingSpace(false);
    }
  };

  const handleAddTextNode = async () => {
    setShowAddMenu(false);
    if (!activeSpaceId) return;
    await createTextNode(activeSpaceId, '', '#475569', 200, 200);
    showToast.info('Text note added to canvas');
  };

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

  const handleTabsWheel = (e: React.WheelEvent) => {
    if (tabsRef.current) {
      tabsRef.current.scrollLeft += e.deltaY;
    }
  };

  const isDark = theme === 'dark';

  const pillContainerClass = isDark
    ? 'bg-[#111111] border-[#262626] shadow-md text-[#ededed]'
    : 'bg-white border-slate-200/90 shadow-sm text-[#2B3674]';

  const dropdownClass = isDark
    ? 'bg-[#111111] border-[#333333] text-[#ededed] shadow-2xl'
    : 'bg-white border-slate-200 text-slate-800 shadow-2xl';

  const dropdownItemClass = isDark
    ? 'text-[#a1a1a1] hover:text-[#ededed] hover:bg-[#1a1a1a]'
    : 'text-slate-700 hover:text-[#2B3674] hover:bg-slate-50';

  return (
    <header
      className="h-14 px-4 flex items-center justify-between select-none z-30 shrink-0 pointer-events-none transition-colors duration-200"
      aria-label="Top Navigation Bar"
    >
      {/* Left Pill: Space Navigation Tabs */}
      <div
        className={`flex items-center gap-1.5 p-2 rounded-2xl border pointer-events-auto max-w-[50vw] transition-colors duration-200 ${pillContainerClass}`}
      >
        <div
          ref={tabsRef}
          onWheel={handleTabsWheel}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[calc(50vw-60px)] px-0.5 py-0.5"
          role="tablist"
          aria-label="Workspaces"
        >
          {spaces.map(space => {
            const isActive = space.id === activeSpaceId;
            return (
              <button
                key={space.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveSpaceId(space.id)}
                title={space.name}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 max-w-[150px] truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  isActive
                    ? isDark
                      ? 'bg-gradient-to-r from-sky-500 to-cyan-400 text-white shadow-sm'
                      : 'bg-[#2B3674] text-white shadow-sm'
                    : isDark
                    ? 'text-[#a1a1a1] hover:text-white hover:bg-white/5'
                    : 'text-slate-600 hover:text-[#2B3674] hover:bg-slate-100'
                }`}
              >
                {space.name}
              </button>
            );
          })}
        </div>

        {/* Quick New Space Action */}
        {isAddingSpace ? (
          <form onSubmit={handleCreateSpace} className="flex items-center gap-1.5 pl-1 pr-0.5">
            <input
              type="text"
              autoFocus
              value={newSpaceName}
              onChange={e => setNewSpaceName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') setIsAddingSpace(false);
              }}
              placeholder="Space name..."
              className={`px-2.5 py-1 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-sky-400 ${
                isDark
                  ? 'bg-[#0a0a0a] border-sky-400/50 text-white'
                  : 'bg-slate-50 border-sky-400 text-[#2B3674]'
              }`}
            />
            <button
              type="submit"
              disabled={!newSpaceName.trim()}
              className="px-2.5 py-1 text-xs font-bold text-white bg-gradient-argon-primary rounded-lg disabled:opacity-40"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAddingSpace(false)}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X size={13} />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingSpace(true)}
            className={`p-1.5 rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              isDark
                ? 'text-[#a1a1a1] hover:text-white hover:bg-white/5'
                : 'text-slate-500 hover:text-[#2B3674] hover:bg-slate-100'
            }`}
            title="Create New Space"
            aria-label="Create New Space"
          >
            <Plus size={15} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Right Pills: Search Pill & Action Pills */}
      <div className="flex items-center gap-2.5 pointer-events-auto">
        {/* Search Pill Button */}
        <button
          onClick={() => openHashtagSearch()}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${pillContainerClass} ${
            isDark
              ? 'hover:border-sky-400/50 text-[#a1a1a1]'
              : 'hover:border-sky-400 text-slate-600'
          }`}
          title="Search hashtags & nodes (Ctrl+K)"
          aria-label="Search hashtags and nodes"
        >
          <Search size={14} className="text-[#2CD9FF]" />
          <span className="hidden sm:inline">Search #tags, nodes...</span>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 dark:bg-white/10 text-slate-500 dark:text-slate-300">
            #
          </kbd>
        </button>

        {/* Actions Pill Container */}
        <div
          className={`flex items-center gap-2 p-2 rounded-2xl border transition-colors duration-200 ${pillContainerClass}`}
        >
          {/* Per-Space Focus Indicator / Button */}
          {focusedCourse ? (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition ${
                isDark
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <button
                onClick={handleJumpToFocused}
                className="flex items-center gap-1.5 hover:brightness-110 transition cursor-pointer focus-visible:outline-none"
                title={`Active Space Focus: ${focusedCourse.name}. Click to view details.`}
              >
                <Target size={13} className="text-amber-400 fill-amber-400 shrink-0 animate-pulse" />
                <span className="truncate max-w-[90px] md:max-w-[120px] font-bold">
                  {focusedCourse.name}
                </span>
              </button>
              <button
                onClick={() => openFocusPicker()}
                className="p-0.5 rounded hover:bg-amber-400/20 transition text-amber-400"
                title="Change Focus Node"
                aria-label="Change Focus Node"
              >
                <ChevronDown size={12} />
              </button>
              <button
                onClick={handleClearFocus}
                className="p-0.5 rounded hover:bg-rose-500/20 hover:text-rose-400 transition opacity-70 hover:opacity-100"
                title="Clear Focus"
                aria-label="Clear Focus"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            courses.length > 0 && (
              <button
                onClick={openFocusPicker}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  isDark
                    ? 'bg-[#1a1a1a] border-[rgba(255,255,255,0.1)] text-[#a1a1a1] hover:text-white hover:border-amber-400/40'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-[#2B3674] hover:border-amber-400'
                }`}
                title="Set Focus Node for this Space"
                aria-label="Set Focus Node for this Space"
              >
                <Target size={13} className="text-amber-400" />
                <span className="hidden md:inline">Focus</span>
              </button>
            )
          )}

          {/* Link Space Button */}
          <button
            disabled={!activeSpaceId}
            onClick={openSpaceLinkPicker}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition border disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              isDark
                ? 'bg-[#1a1a1a] border-[rgba(255,255,255,0.1)] text-[#a1a1a1] hover:text-white'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-[#2B3674]'
            }`}
            title="Link another Space onto canvas"
            aria-label="Link another Space onto canvas"
          >
            <FolderGit2 size={13} className="text-sky-400" />
            <span className="hidden md:inline">Link Space</span>
          </button>

          {/* Add Node Split Button */}
          <div ref={addMenuRef} className="relative flex">
            <button
              onClick={openAddCourse}
              disabled={!activeSpaceId}
              className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-gradient-argon-primary hover:brightness-105 disabled:opacity-50 text-white rounded-l-xl text-xs font-semibold shadow-argon-primary transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              title="Add Node"
              aria-label="Add Node"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Add Node</span>
            </button>
            <button
              onClick={() => setShowAddMenu(prev => !prev)}
              disabled={!activeSpaceId}
              className="flex items-center px-1.5 py-1.5 bg-gradient-argon-primary hover:brightness-105 disabled:opacity-50 text-white rounded-r-xl text-xs font-semibold shadow-argon-primary transition active:scale-95 border-l border-white/20 focus-visible:outline-none"
              title="More node types"
              aria-label="More node types"
            >
              <ChevronDown
                size={12}
                strokeWidth={2.5}
                className={`transition-transform duration-200 ${showAddMenu ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Add Node Dropdown */}
            {showAddMenu && (
              <div
                className={`absolute right-0 top-full mt-2 rounded-2xl shadow-2xl border z-50 py-1.5 min-w-[160px] animate-fade-in-up ${dropdownClass}`}
              >
                <button
                  onClick={() => {
                    setShowAddMenu(false);
                    openAddCourse();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition ${dropdownItemClass}`}
                >
                  <div className="w-5 h-5 rounded-lg bg-sky-500/15 flex items-center justify-center text-sky-400">
                    <Plus size={12} strokeWidth={2.5} />
                  </div>
                  <span>Node</span>
                </button>
                <button
                  onClick={handleAddTextNode}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition ${dropdownItemClass}`}
                >
                  <div className="w-5 h-5 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                    <Type size={12} strokeWidth={2.5} />
                  </div>
                  <span>Text Note</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
