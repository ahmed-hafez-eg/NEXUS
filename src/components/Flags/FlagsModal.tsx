import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  Bookmark,
  Search,
  ExternalLink,
  ChevronRight,
  FolderGit2,
  Layers,
  StickyNote,
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useSpaceStore } from '../../store/useSpaceStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useSectionStore } from '../../store/useSectionStore';
import * as db from '../../db/client';
import { FlaggedSectionItem } from '../../types';
import { ArgonBadge } from '../UI/ArgonBadge';

export const FlagsModal: React.FC = () => {
  const activePanel = useUIStore(s => s.activePanel);
  const closePanel = useUIStore(s => s.closePanel);
  const theme = useUIStore(s => s.theme);
  const isDark = theme === 'dark';

  const setActiveSpaceId = useSpaceStore(s => s.setActiveSpaceId);
  const setSelectedCourseId = useCanvasStore(s => s.setSelectedCourseId);
  const openCourseDetail = useUIStore(s => s.openCourseDetail);
  const toggleSection = useSectionStore(s => s.toggleSection);
  const toggleSectionFlag = useSectionStore(s => s.toggleSectionFlag);

  const [items, setItems] = useState<FlaggedSectionItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isOpen = activePanel === 'flags';

  const loadFlags = async () => {
    setIsLoading(true);
    try {
      const data = await db.getFlaggedSections();
      setItems(data);
    } catch (err) {
      console.error('Failed to load flagged sections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFlags();
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        item.course_name.toLowerCase().includes(q) ||
        item.space_name.toLowerCase().includes(q) ||
        (item.note && item.note.toLowerCase().includes(q))
    );
  }, [items, search]);

  const handleToggleDone = async (item: FlaggedSectionItem) => {
    const nextDone = item.is_done !== 1;
    setItems(prev =>
      prev.map(i => (i.id === item.id ? { ...i, is_done: nextDone ? 1 : 0 } : i))
    );
    await toggleSection(item.id, nextDone);
  };

  const handleUnflag = async (item: FlaggedSectionItem) => {
    setItems(prev => prev.filter(i => i.id !== item.id));
    await toggleSectionFlag(item.id, false);
  };

  const handleJumpToNode = (item: FlaggedSectionItem) => {
    setActiveSpaceId(item.space_id);
    setSelectedCourseId(item.course_id);
    openCourseDetail();
  };

  if (!isOpen) return null;

  const modalBg = isDark
    ? 'bg-[#141414] border-[#262626] text-[#ededed] shadow-2xl'
    : 'bg-white border-slate-200 text-[#2B3674] shadow-2xl';

  const headerBg = isDark ? 'bg-[#111111] border-[#262626]' : 'bg-slate-50 border-slate-100';
  const itemBg = isDark
    ? 'bg-[#1a1a1a] hover:bg-[#202020] border-[#262626]'
    : 'bg-white hover:bg-slate-50 border-slate-200';

  const doneItemBg = isDark
    ? 'bg-[#141414]/50 border-emerald-500/20 opacity-70'
    : 'bg-slate-50 border-slate-100 opacity-70';

  const inputBg = isDark
    ? 'bg-[#141414] border-[#333333] text-[#ededed] placeholder-[#6b6b6b] focus:border-amber-400'
    : 'bg-white border-slate-200 text-[#2B3674] placeholder-[#a1a1a1] focus:border-amber-500';

  const breadcrumbBg = isDark
    ? 'bg-[#141414] text-[#a1a1a1] border-[#262626]'
    : 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div
        className={`relative w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border animate-fade-in-up ${modalBg}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${headerBg}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-argon-warning flex items-center justify-center text-white shadow-argon-warning">
              <Bookmark size={16} className="fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Flagged Sub-Tasks</h2>
                <ArgonBadge variant="warning" size="xs">
                  {items.length}
                </ArgonBadge>
              </div>
              <p className="text-[11px] text-[#a1a1a1]">
                Quick access to bookmarked items across all spaces
              </p>
            </div>
          </div>
          <button
            onClick={closePanel}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-white/10 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by sub-task, node, or space name..."
              className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border outline-none transition ${inputBg}`}
            />
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <div className="w-6 h-6 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              <span className="text-xs">Loading flagged items...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                <Bookmark size={24} />
              </div>
              <h3 className="text-sm font-bold">
                {search ? 'No matches found' : 'No flagged sub-tasks yet'}
              </h3>
              <p className="text-xs text-[#a1a1a1] max-w-xs mt-1">
                {search
                  ? 'Try searching with a different keyword.'
                  : 'Click the bookmark icon on any sub-task to pin it here.'}
              </p>
            </div>
          ) : (
            filteredItems.map(item => {
              const isDone = item.is_done === 1;
              const hasNote = !!(item.note && item.note.trim());

              return (
                <div
                  key={item.id}
                  className={`group p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                    isDone ? doneItemBg : itemBg
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => handleToggleDone(item)}
                      className="mt-0.5 w-4 h-4 rounded-md border-sky-400 text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      {/* Breadcrumbs */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px] mb-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-semibold ${breadcrumbBg}`}>
                          <Layers size={10} className="text-[#2CD9FF]" />
                          <span>{item.space_name}</span>
                        </span>
                        <ChevronRight size={11} className="text-slate-400" />
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-semibold ${breadcrumbBg}`}>
                          <FolderGit2 size={10} className="text-[#2CD9FF]" />
                          <span>{item.course_name}</span>
                        </span>
                      </div>

                      {/* Title */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold leading-snug ${
                            isDone ? 'line-through text-slate-500' : isDark ? 'text-white' : 'text-[#2B3674]'
                          }`}
                        >
                          {item.title}
                        </span>
                        {hasNote && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[#2CD9FF] bg-sky-500/10 px-1.5 py-0.5 rounded-md border border-sky-500/20 font-semibold">
                            <StickyNote size={10} />
                            <span>Note</span>
                          </span>
                        )}
                      </div>

                      {hasNote && (
                        <p className="text-xs mt-1 text-[#a1a1a1] line-clamp-1 italic">
                          "{item.note}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleUnflag(item)}
                      className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/15 transition"
                      title="Unflag sub-task"
                    >
                      <Bookmark size={15} className="fill-amber-400" />
                    </button>

                    <button
                      onClick={() => handleJumpToNode(item)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                        isDark
                          ? 'bg-[#1a1a1a] text-slate-200 hover:text-white border-white/10'
                          : 'bg-slate-100 text-slate-700 hover:text-[#2B3674] border-slate-200'
                      }`}
                      title="Jump to this node on canvas"
                    >
                      <span>Jump</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t flex items-center justify-between text-xs font-semibold ${headerBg}`}>
          <span className="text-[#a1a1a1]">
            {items.filter(i => i.is_done === 1).length} of {items.length} completed
          </span>
          <button
            onClick={closePanel}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
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
