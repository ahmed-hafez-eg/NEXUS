import React, { useState, useEffect } from 'react';
import { X, FolderGit2, Search, Layers, ChevronRight, ArrowLeft, ListTodo, Bookmark, Check, AlertCircle } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useSpaceStore } from '../../store/useSpaceStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import * as db from '../../db/client';
import { Course, Space, Section, SpaceLink } from '../../types';
import { showToast } from '../../store/useToastStore';
import { wouldCreateCircularDependency } from '../../utils/spaceLinkUtils';
import { getNodeIcon } from '../Icons/NodeIcons';

export const SpaceLinkPicker: React.FC = () => {
  const activePanel = useUIStore(s => s.activePanel);
  const closePanel = useUIStore(s => s.closePanel);
  const theme = useUIStore(s => s.theme);

  const spaces = useSpaceStore(s => s.spaces);
  const activeSpaceId = useSpaceStore(s => s.activeSpaceId);

  const createSpaceLink = useCanvasStore(s => s.createSpaceLink);
  const courses = useCanvasStore(s => s.courses);
  const spaceLinks = useCanvasStore(s => s.spaceLinks);

  const [search, setSearch] = useState('');
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [spaceCourses, setSpaceCourses] = useState<Course[]>([]);
  const [courseSections, setCourseSections] = useState<Section[]>([]);
  const [allSpaceLinks, setAllSpaceLinks] = useState<SpaceLink[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const isOpen = activePanel === 'space_link_picker';

  useEffect(() => {
    if (!isOpen) {
      setSelectedSpace(null);
      setSelectedCourse(null);
      setSpaceCourses([]);
      setCourseSections([]);
      setSearch('');
    } else {
      db.getAllSpaceLinks()
        .then(links => setAllSpaceLinks(links))
        .catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedSpace) {
      setIsLoadingCourses(true);
      db.getCoursesBySpace(selectedSpace.id)
        .then(cs => setSpaceCourses(cs))
        .catch(console.error)
        .finally(() => setIsLoadingCourses(false));
    }
  }, [selectedSpace]);

  useEffect(() => {
    if (selectedCourse) {
      setIsLoadingSections(true);
      db.getSectionsByCourse(selectedCourse.id)
        .then(secs => setCourseSections(secs))
        .catch(console.error)
        .finally(() => setIsLoadingSections(false));
    }
  }, [selectedCourse]);

  if (!isOpen) return null;

  const availableSpaces = spaces.filter(sp => sp.id !== activeSpaceId);
  const filteredSpaces = availableSpaces.filter(sp =>
    sp.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (linkedSpaceId: string, targetCourseId?: string | null, targetSectionId?: string | null) => {
    if (!activeSpaceId || isAdding) return;

    if (wouldCreateCircularDependency(activeSpaceId, linkedSpaceId, allSpaceLinks)) {
      showToast.error('Cannot link: Creates a circular dependency.');
      return;
    }

    setIsAdding(true);

    try {
      let posX = 350;
      let posY = 100;
      const allNodesCount = courses.length + spaceLinks.length;
      if (allNodesCount > 0) {
        const lastCourse = courses[courses.length - 1];
        const lastLink = spaceLinks[spaceLinks.length - 1];
        const lastX = Math.max(lastCourse?.pos_x ?? 200, lastLink?.pos_x ?? 200);
        const lastY = Math.max(lastCourse?.pos_y ?? 100, lastLink?.pos_y ?? 100);
        posX = lastX + 80;
        posY = lastY + 120;
        if (posY > 550) {
          posY = 100;
          posX += 300;
        }
      }

      await createSpaceLink(activeSpaceId, linkedSpaceId, posX, posY, targetCourseId, targetSectionId);
      showToast.success('Space link added to canvas');
      closePanel();
    } catch (err) {
      console.error('Failed to create space link', err);
    } finally {
      setIsAdding(false);
    }
  };

  const isDark = theme === 'dark';

  const modalBg = isDark
    ? 'bg-[#141414] border-[#262626] text-[#ededed] shadow-2xl'
    : 'bg-white border-slate-200 text-[#2B3674] shadow-2xl';

  const headerBg = isDark ? 'bg-[#111111] border-[#262626]' : 'bg-slate-50 border-slate-100';
  const itemBg = isDark
    ? 'bg-[#1a1a1a] hover:bg-[#202020] border-[#262626]'
    : 'bg-white hover:bg-slate-50 border-slate-200';

  const inputBg = isDark
    ? 'bg-[#141414] border-[#333333] text-[#ededed] placeholder-[#6b6b6b] focus:border-[#2CD9FF]'
    : 'bg-white border-slate-200 text-[#2B3674] placeholder-[#a1a1a1] focus:border-[#1171EE]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh] border animate-fade-in-up ${modalBg}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${headerBg}`}>
          <div className="flex items-center gap-2.5">
            {selectedCourse ? (
              <button
                onClick={() => setSelectedCourse(null)}
                className="p-1 -ml-2 mr-1 rounded-lg text-slate-400 hover:text-white transition"
                title="Back to Nodes list"
              >
                <ArrowLeft size={16} />
              </button>
            ) : selectedSpace ? (
              <button
                onClick={() => setSelectedSpace(null)}
                className="p-1 -ml-2 mr-1 rounded-lg text-slate-400 hover:text-white transition"
                title="Back to Spaces list"
              >
                <ArrowLeft size={16} />
              </button>
            ) : null}
            <div className="w-8 h-8 rounded-xl bg-gradient-argon-primary flex items-center justify-center text-white shadow-argon-primary shrink-0">
              <FolderGit2 size={16} />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm leading-tight truncate">
                {selectedCourse ? selectedCourse.name : selectedSpace ? selectedSpace.name : 'Link a Space'}
              </h2>
              <span className="text-[11px] text-[#a1a1a1]">
                {selectedCourse
                  ? 'Step 3: Pick optional Sub-task'
                  : selectedSpace
                  ? 'Step 2: Pick Node or Entire Space'
                  : 'Step 1: Select Space'}
              </span>
            </div>
          </div>
          <button
            onClick={closePanel}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* STEP 1: Select Space */}
        {!selectedSpace && (
          <>
            <div className="px-5 pt-4 pb-3">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search spaces to link..."
                  autoFocus
                  className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs outline-none transition ${inputBg}`}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
              {filteredSpaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-xs gap-2">
                  <Layers size={28} className="text-slate-600" />
                  {availableSpaces.length === 0
                    ? 'No other spaces available to link.'
                    : 'No spaces match your search.'}
                </div>
              ) : (
                filteredSpaces.map(sp => {
                  const isCircular = activeSpaceId ? wouldCreateCircularDependency(activeSpaceId, sp.id, allSpaceLinks) : false;
                  return (
                    <button
                      key={sp.id}
                      onClick={() => !isCircular && setSelectedSpace(sp)}
                      disabled={isCircular || isAdding}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition group ${
                        isCircular
                          ? isDark
                            ? 'bg-[#0a0a0a]/40 border-rose-500/20 opacity-50 cursor-not-allowed'
                            : 'bg-slate-100/60 border-rose-300/40 opacity-50 cursor-not-allowed'
                          : itemBg
                      }`}
                      title={isCircular ? 'Cannot link: Creates a circular dependency' : undefined}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isCircular
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-gradient-argon-primary text-white shadow-argon-primary'
                          }`}
                        >
                          {isCircular ? <AlertCircle size={15} /> : <Layers size={14} />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate flex items-center gap-2">
                            <span>{sp.name}</span>
                            {isCircular && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                Circular
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-[10px] mt-0.5 ${
                              isCircular ? 'text-rose-400/80 font-medium' : 'text-[#a1a1a1]'
                            }`}
                          >
                            {isCircular
                              ? 'Cannot link: Creates a circular dependency'
                              : 'Click to select container or node'}
                          </div>
                        </div>
                      </div>
                      {!isCircular && (
                        <ChevronRight
                          size={15}
                          className="text-slate-400 group-hover:text-sky-400 transition shrink-0 ml-2"
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* STEP 2: Choose Target Node or Entire Space */}
        {selectedSpace && !selectedCourse && (
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <p className="text-xs leading-relaxed text-[#a1a1a1]">
              Choose whether this node links to the entire <strong className="text-white">"{selectedSpace.name}"</strong> Space or targets a specific node inside it:
            </p>

            {/* Option A: Link Entire Space */}
            <button
              onClick={() => handleCreate(selectedSpace.id, null, null)}
              disabled={isAdding}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition bg-gradient-to-r from-sky-950/40 to-blue-950/40 hover:from-sky-950/70 hover:to-blue-950/70 border-sky-800/50 hover:border-sky-500"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                  <FolderGit2 size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-sky-200">
                    Entire Space Container
                  </div>
                  <div className="text-[10px] text-[#a1a1a1]">
                    Shows whole space roadmap ({spaceCourses.length} {spaceCourses.length === 1 ? 'node' : 'nodes'})
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-sky-500/20 text-[#2CD9FF] border border-sky-500/30">
                Link All
              </span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-2 pt-2">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Or pick a specific node
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Option B: Specific Nodes list */}
            {isLoadingCourses ? (
              <div className="py-6 text-center text-xs text-slate-500">Loading nodes...</div>
            ) : spaceCourses.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500">
                This space has no individual nodes yet. Use "Entire Space Container" above.
              </div>
            ) : (
              <div className="space-y-2">
                {spaceCourses.map(course => (
                  <button
                    key={course.id}
                    onClick={() => setSelectedCourse(course)}
                    disabled={isAdding}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition group ${itemBg}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-[#2CD9FF] flex items-center justify-center shrink-0">
                        {getNodeIcon(course.icon, 14)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{course.name}</div>
                        <div className="text-[10px] text-[#a1a1a1]">
                          Click to link node or sub-task
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 group-hover:text-sky-400 transition shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Choose Sub-Task inside Node (or Link entire Node) */}
        {selectedSpace && selectedCourse && (
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <p className="text-xs leading-relaxed text-[#a1a1a1]">
              Link the whole <strong className="text-white">"{selectedCourse.name}"</strong> node, or choose one specific sub-task inside it:
            </p>

            <button
              onClick={() => handleCreate(selectedSpace.id, selectedCourse.id, null)}
              disabled={isAdding}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition bg-gradient-to-r from-sky-950/40 to-blue-950/40 hover:from-sky-950/70 hover:to-blue-950/70 border-sky-800/50 hover:border-sky-500"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                  {getNodeIcon(selectedCourse.icon, 16)}
                </div>
                <div>
                  <div className="text-xs font-bold text-sky-200">
                    Entire Node ({selectedCourse.name})
                  </div>
                  <div className="text-[10px] text-[#a1a1a1]">
                    Links to the node level ({courseSections.length} {courseSections.length === 1 ? 'sub-task' : 'sub-tasks'})
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-sky-500/20 text-[#2CD9FF] border border-sky-500/30">
                Link Node
              </span>
            </button>

            <div className="flex items-center gap-2 pt-2">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Or link specific sub-task
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {isLoadingSections ? (
              <div className="py-6 text-center text-xs text-slate-500">Loading sub-tasks...</div>
            ) : courseSections.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500">
                No individual sub-tasks in this node. Use "Entire Node" above.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {courseSections.map(sec => (
                  <button
                    key={sec.id}
                    onClick={() => handleCreate(selectedSpace.id, selectedCourse.id, sec.id)}
                    disabled={isAdding}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition group ${itemBg}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center shrink-0 text-slate-400">
                        {sec.is_done === 1 ? <Check size={11} className="text-emerald-400" /> : <ListTodo size={11} />}
                      </div>
                      <span className="text-xs font-semibold truncate">{sec.title}</span>
                    </div>
                    {sec.is_flagged === 1 && (
                      <Bookmark size={12} className="text-amber-400 fill-amber-400 shrink-0 ml-1" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
