import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  Target,
  Search,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useSpaceStore } from '../../store/useSpaceStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { ArgonBadge } from '../UI/ArgonBadge';
import { showToast } from '../../store/useToastStore';

export const FocusPickerModal: React.FC = () => {
  const activePanel = useUIStore(s => s.activePanel);
  const closePanel = useUIStore(s => s.closePanel);
  const theme = useUIStore(s => s.theme);
  const isDark = theme === 'dark';

  const activeSpaceId = useSpaceStore(s => s.activeSpaceId);
  const spaces = useSpaceStore(s => s.spaces);
  const setSpaceFocus = useSpaceStore(s => s.setSpaceFocus);
  const openCourseDetail = useUIStore(s => s.openCourseDetail);

  const activeSpace = spaces.find(s => s.id === activeSpaceId);
  const focusedNodeId = activeSpace?.focused_node_id ?? null;

  const courses = useCanvasStore(s => s.courses);
  const setSelectedCourseId = useCanvasStore(s => s.setSelectedCourseId);

  const [search, setSearch] = useState('');

  const isOpen = activePanel === 'focus_picker';

  useEffect(() => {
    if (isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  const focusedCourse = useMemo(
    () => (focusedNodeId ? courses.find(c => c.id === focusedNodeId) ?? null : null),
    [courses, focusedNodeId]
  );

  const filteredCourses = useMemo(() => {
    if (!search.trim()) return courses;
    const q = search.trim().toLowerCase().replace(/^#+/, '');
    return courses.filter(c => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchTags = c.hashtags?.some(t => t.toLowerCase().includes(q)) ?? false;
      return matchName || matchTags;
    });
  }, [courses, search]);

  const handleSetFocus = async (courseId: string) => {
    if (!activeSpaceId) return;
    await setSpaceFocus(activeSpaceId, courseId);
    showToast.success('Updated space focus target');
  };

  const handleClearFocus = async () => {
    if (!activeSpaceId) return;
    await setSpaceFocus(activeSpaceId, null);
    showToast.info('Cleared space focus target');
  };

  const handleJumpToNode = (courseId: string) => {
    setSelectedCourseId(courseId);
    openCourseDetail();
    closePanel();
  };

  if (!isOpen) return null;

  const modalBg = isDark
    ? 'bg-[#141414] border-[#262626] text-[#ededed] shadow-2xl'
    : 'bg-white border-slate-200 text-[#2B3674] shadow-2xl';

  const headerBg = isDark ? 'bg-[#111111] border-[#262626]' : 'bg-slate-50 border-slate-100';
  const itemBg = isDark
    ? 'bg-[#1a1a1a] hover:bg-[#202020] border-[#262626]'
    : 'bg-white hover:bg-slate-50 border-slate-200';

  const inputBg = isDark
    ? 'bg-[#141414] border-[#333333] text-[#ededed] placeholder-[#6b6b6b] focus:border-amber-400'
    : 'bg-white border-slate-200 text-[#2B3674] placeholder-[#a1a1a1] focus:border-amber-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div
        className={`relative w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border animate-fade-in-up ${modalBg}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${headerBg}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-argon-warning flex items-center justify-center text-white shadow-argon-warning">
              <Target size={16} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Space Focus Target</h2>
                <ArgonBadge variant="warning" size="xs">
                  {activeSpace?.name ?? 'Current Space'}
                </ArgonBadge>
              </div>
              <p className="text-[11px] text-[#a1a1a1]">
                Pin a primary target node to spotlight your current focus
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

        {/* Current Active Focus Banner */}
        <div className={`px-6 py-3 border-b ${isDark ? 'bg-[#0a0a0a]/60 border-white/10' : 'bg-amber-50/50 border-amber-200'}`}>
          {focusedCourse ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Sparkles size={14} />
                </div>
                <div className="min-w-0 text-xs">
                  <span className="text-[#a1a1a1] mr-1.5 font-semibold">Active Focus:</span>
                  <span className="font-extrabold text-amber-400">{focusedCourse.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleJumpToNode(focusedCourse.id)}
                  className="px-3 py-1 text-xs font-bold rounded-xl bg-gradient-argon-warning text-white shadow-argon-warning transition flex items-center gap-1"
                >
                  <span>Go to Node</span>
                  <ChevronRight size={13} />
                </button>
                <button
                  onClick={handleClearFocus}
                  className="px-3 py-1 text-xs font-semibold rounded-xl border border-white/10 hover:bg-rose-500/15 hover:text-rose-400 hover:border-rose-500/30 transition text-slate-300"
                >
                  Clear Focus
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs font-medium text-[#a1a1a1]">
              <span>No focus target selected for this space yet. Choose one below!</span>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-white/10 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search nodes by name or hashtag..."
              className={`w-full border rounded-xl pl-9 pr-9 py-2 text-xs outline-none transition ${inputBg}`}
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Nodes List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredCourses.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#707E94]">
              {search ? 'No matching nodes found.' : 'No nodes in this workspace yet.'}
            </div>
          ) : (
            filteredCourses.map(item => {
              const isSelectedFocus = item.id === focusedNodeId;
              const hasTags = item.hashtags && item.hashtags.length > 0;

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                    isSelectedFocus
                      ? 'bg-amber-950/30 border-amber-500/50 shadow-argon-warning'
                      : itemBg
                  }`}
                >
                  <div
                    onClick={() => handleJumpToNode(item.id)}
                    className="flex-1 min-w-0 cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-bold truncate ${
                          isSelectedFocus ? 'text-amber-400' : isDark ? 'text-white' : 'text-[#2B3674]'
                        }`}
                      >
                        {item.name}
                      </span>
                      {isSelectedFocus && (
                        <ArgonBadge variant="warning" size="xs">
                          Active Focus
                        </ArgonBadge>
                      )}
                    </div>

                    {hasTags && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.hashtags?.map((t: string) => (
                          <span
                            key={t}
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                              isDark
                                ? 'bg-sky-500/10 text-[#2CD9FF] border-sky-500/20'
                                : 'bg-sky-50 text-sky-700 border-sky-200'
                            }`}
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSelectedFocus ? (
                      <button
                        onClick={handleClearFocus}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/5 hover:bg-rose-500/15 hover:text-rose-400 transition"
                      >
                        Unpin
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSetFocus(item.id)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#1a1a1a] hover:bg-gradient-argon-warning hover:text-white text-[#a1a1a1] border border-white/10 transition shadow-sm"
                      >
                        Set as Focus
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t flex justify-end ${headerBg}`}>
          <button
            onClick={closePanel}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
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
