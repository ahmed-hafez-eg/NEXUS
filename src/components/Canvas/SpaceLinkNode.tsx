import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FolderGit2, Trash2, ExternalLink, Target, CheckCircle2, ListTodo, Bookmark, Check } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useUIStore } from '../../store/useUIStore';
import { useSpaceStore } from '../../store/useSpaceStore';
import { ArgonProgressBar } from '../UI/ArgonProgressBar';
import { showToast } from '../../store/useToastStore';
import { getNodeIcon } from '../Icons/NodeIcons';

export interface SpaceLinkNodeData {
  id: string; // space_link id
  linked_space_id: string;
  space_id: string;
  target_course_id?: string | null;
  target_section_id?: string | null;
}

export const SpaceLinkNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const nodeData = data as unknown as SpaceLinkNodeData;

  const spaces = useSpaceStore(s => s.spaces);
  const setActiveSpaceId = useSpaceStore(s => s.setActiveSpaceId);
  const theme = useUIStore(s => s.theme);
  const linkedSpace = spaces.find(sp => sp.id === nodeData.linked_space_id);

  const deleteSpaceLink = useCanvasStore(s => s.deleteSpaceLink);
  const setPendingCanvasJump = useCanvasStore(s => s.setPendingCanvasJump);
  const openConfirm = useUIStore(s => s.openConfirm);
  const openMiniSpace = useUIStore(s => s.openMiniSpace);

  // Global store selectors to eliminate N+1 queries
  const allCoursesMap = useCanvasStore(s => s.allCoursesMap);
  const coursesBySpaceId = useCanvasStore(s => s.coursesBySpaceId);
  const sectionsMap = useCanvasStore(s => s.sectionsMap);
  const toggleSection = useCanvasStore(s => s.toggleSection);

  const targetCourse = nodeData.target_course_id ? allCoursesMap[nodeData.target_course_id] || null : null;
  const sections = targetCourse ? sectionsMap[targetCourse.id] || [] : [];
  const courseCount = (coursesBySpaceId[nodeData.linked_space_id] || []).length;

  const targetSection = nodeData.target_section_id
    ? sections.find(s => s.id === nodeData.target_section_id)
    : null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (linkedSpace) {
      openMiniSpace(linkedSpace.id);
    }
  };

  const handleJumpToSource = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeData.linked_space_id) {
      setPendingCanvasJump({
        targetCourseId: nodeData.target_course_id || null,
        targetSectionId: nodeData.target_section_id || null,
      });
      setActiveSpaceId(nodeData.linked_space_id);
      showToast.info(`Teleported to "${linkedSpace?.name ?? 'source space'}"`);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    openConfirm(
      'Remove Space Link',
      `Remove the link to "${linkedSpace?.name ?? 'this space'}" from the canvas? The space itself will not be deleted.`,
      async () => {
        await deleteSpaceLink(nodeData.id);
        showToast.info('Removed Space link');
      },
      'Remove'
    );
  };

  const isDark = theme === 'dark';
  const handleStyle =
    '!w-3.5 !h-3.5 !bg-[#2CD9FF] !border-2 !border-[#0a0a0a] opacity-60 group-hover:opacity-100 z-30 transition-all hover:scale-135 hover:!bg-[#05CD99] shadow-md';

  const activeSpaceId = useSpaceStore(s => s.activeSpaceId);
  const activeSpace = spaces.find(s => s.id === (nodeData.space_id || activeSpaceId));
  const isBlurred = !!(activeSpace?.focused_node_id);

  const totalSections = sections.length;
  const doneSections = sections.filter(s => s.is_done === 1).length;
  const percent = totalSections > 0 ? Math.round((doneSections / totalSections) * 100) : 0;
  const isComplete = totalSections > 0 && doneSections === totalSections;

  return (
    <div
      onClick={handleClick}
      data-node-id={nodeData.id}
      className={`group relative w-[280px] min-w-[260px] max-w-[320px] rounded-2xl border p-5 transition-all duration-200 cursor-pointer select-none ${
        isDark
          ? 'bg-[#141414] text-[#ededed] shadow-argon-card-dark'
          : 'bg-gradient-to-b from-sky-50/90 to-blue-50/90 text-[#2B3674] shadow-argon-card backdrop-blur-md'
      } ${
        selected
          ? 'border-[#2CD9FF] ring-4 ring-[#2CD9FF]/25 shadow-argon-primary'
          : isDark
          ? 'border-[#262626] hover:border-[#333333] hover:-translate-y-1 hover:shadow-argon-hover'
          : 'border-sky-200 hover:border-sky-400 hover:-translate-y-1 hover:shadow-argon-hover'
      } ${
        isBlurred
          ? 'opacity-65 filter blur-[0.8px] hover:filter-none hover:opacity-100 transition-all duration-300'
          : ''
      }`}
    >
      {/* 4 Connection Handles */}
      <Handle type="source" position={Position.Top} id="top" className={handleStyle} />
      <Handle type="source" position={Position.Right} id="right" className={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={handleStyle} />
      <Handle type="source" position={Position.Left} id="left" className={handleStyle} />

      {/* Header */}
      <div className="flex items-start justify-between gap-3.5">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-argon-primary text-white flex items-center justify-center shrink-0 shadow-argon-primary">
            <FolderGit2 size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              title={linkedSpace?.name ?? 'Unknown Space'}
              className={`font-bold text-sm leading-snug line-clamp-2 ${
                isDark ? 'text-[#ededed]' : 'text-[#2B3674]'
              }`}
            >
              {linkedSpace?.name ?? 'Unknown Space'}
            </h3>
            <div className="flex items-center gap-1 mt-1">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border leading-none ${
                  isDark
                    ? 'bg-sky-500/20 text-[#2CD9FF] border-sky-500/30'
                    : 'bg-sky-100 text-sky-800 border-sky-300'
                }`}
              >
                {nodeData.target_section_id
                  ? 'Targeted Sub-task'
                  : nodeData.target_course_id
                  ? 'Targeted Node'
                  : 'Linked Space'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleJumpToSource}
            className={`p-1.5 rounded-lg transition-all ${
              isDark
                ? 'text-sky-400 hover:text-white hover:bg-sky-500/20'
                : 'text-sky-600 hover:text-sky-900 hover:bg-sky-100'
            }`}
            title="Jump to Source Node"
          >
            <ExternalLink size={14} />
          </button>
          <button
            onClick={handleDelete}
            className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition shrink-0 ${
              isDark
                ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/15'
                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
            }`}
            title="Remove Space Link"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Targeted Sub-Task or Targeted Node Info */}
      {nodeData.target_course_id && targetCourse ? (
        <div
          className={`mt-3 p-3 rounded-xl border ${
            isDark ? 'bg-[#1a1a1a] border-[#262626]' : 'bg-white/80 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400 mb-1.5">
            <Target size={13} className="shrink-0 text-sky-400" />
            <span
              className={`line-clamp-1 ${
                isDark ? 'text-sky-200' : 'text-sky-900'
              }`}
            >
              {targetCourse.name}
            </span>
          </div>

          {targetSection ? (
            <div
              className={`mt-2 p-2.5 rounded-xl border flex items-start gap-2.5 ${
                isDark ? 'bg-[#141414] border-[#262626]' : 'bg-white border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (targetCourse && targetSection) {
                    toggleSection(targetSection.id, targetCourse.id, targetSection.is_done !== 1);
                  }
                }}
                className={`mt-0.5 w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer ${
                  targetSection.is_done === 1
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : isDark
                    ? 'bg-[#111111] border border-[#333333] hover:border-emerald-400 text-slate-400'
                    : 'bg-white border border-slate-300 hover:border-emerald-500 text-slate-400'
                }`}
                title={targetSection.is_done === 1 ? 'Mark incomplete' : 'Mark complete'}
              >
                {targetSection.is_done === 1 ? <Check size={11} strokeWidth={3} /> : null}
              </button>
              <div className="min-w-0 flex-1">
                <span
                  className={`text-[11px] font-semibold leading-tight line-clamp-2 ${
                    targetSection.is_done === 1
                      ? isDark
                        ? 'text-[#6b6b6b] line-through'
                        : 'text-slate-400 line-through'
                      : isDark
                      ? 'text-[#ededed]'
                      : 'text-[#2B3674]'
                  }`}
                >
                  {targetSection.title}
                </span>
                {targetSection.is_flagged === 1 && (
                  <div className="flex items-center gap-1 text-[9px] text-amber-400 font-bold mt-0.5">
                    <Bookmark size={9} className="fill-amber-400" />
                    <span>Flagged Sub-Task</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-[11px] font-semibold mt-1.5">
                <span className="flex items-center gap-1">
                  {isComplete ? (
                    <CheckCircle2 size={12} className="text-emerald-400" />
                  ) : (
                    <ListTodo size={12} className="text-slate-400" />
                  )}
                  <span className={isDark ? 'text-[#a1a1a1]' : 'text-[#707E94]'}>
                    {totalSections === 0 ? 'No sections' : `${doneSections}/${totalSections} done`}
                  </span>
                </span>
                <span
                  className={
                    isComplete
                      ? 'text-emerald-400 font-bold'
                      : isDark
                      ? 'text-[#ededed]'
                      : 'text-[#2B3674]'
                  }
                >
                  {percent}%
                </span>
              </div>

              {totalSections > 0 && (
                <ArgonProgressBar
                  value={percent}
                  variant={isComplete ? 'success' : 'primary'}
                  height={4}
                  className="mt-1.5"
                  isDark={isDark}
                />
              )}

              {/* Interactive sub-tasks checklist directly on target node */}
              {totalSections > 0 && (
                <div className="mt-2.5 pt-2 border-t border-[#262626] space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {sections.map(sec => (
                    <div
                      key={sec.id}
                      className={`flex items-center gap-2 p-1.5 rounded-lg border text-left transition ${
                        isDark
                          ? 'bg-[#141414] border-[#262626] hover:border-[#333333]'
                          : 'bg-white/90 border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSection(sec.id, targetCourse.id, sec.is_done !== 1);
                        }}
                        className={`w-3.5 h-3.5 rounded-md flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer ${
                          sec.is_done === 1
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : isDark
                            ? 'bg-[#111111] border border-[#333333] hover:border-emerald-400 text-slate-400'
                            : 'bg-white border border-slate-300 hover:border-emerald-500 text-slate-400'
                        }`}
                        title={sec.is_done === 1 ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {sec.is_done === 1 ? <Check size={10} strokeWidth={3} /> : null}
                      </button>
                      <span
                        className={`text-[11px] font-medium leading-tight truncate flex-1 ${
                          sec.is_done === 1
                            ? isDark
                              ? 'text-[#6b6b6b] line-through'
                              : 'text-slate-400 line-through'
                            : isDark
                            ? 'text-[#ededed]'
                            : 'text-[#2B3674]'
                        }`}
                      >
                        {sec.title}
                      </span>
                      {sec.is_flagged === 1 && (
                        <Bookmark size={9} className="text-amber-400 fill-amber-400 shrink-0 ml-1" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="mt-3 text-xs flex items-center gap-1.5 font-medium">
          <span className={isDark ? 'text-[#a1a1a1]' : 'text-[#707E94]'}>
            {courseCount === 1 ? '1 node inside' : `${courseCount} nodes inside`}
          </span>
        </div>
      )}

      {/* Footer hint */}
      <div
        className={`mt-3.5 pt-2.5 border-t flex items-center justify-between text-xs font-semibold ${
          isDark ? 'border-[#262626] text-[#a1a1a1]' : 'border-sky-200 text-sky-800'
        }`}
      >
        <div className="flex items-center gap-1.5">
          {getNodeIcon(targetCourse?.icon, 13)}
          <span>Click to explore</span>
        </div>
        <button
          type="button"
          onClick={handleJumpToSource}
          className="flex items-center gap-1.5 text-[11px] font-bold text-[#2CD9FF] hover:underline transition-all"
          title="Jump to Source Node"
        >
          <span>Jump to Source</span>
          <ExternalLink size={12} />
        </button>
      </div>
    </div>
  );
});

SpaceLinkNode.displayName = 'SpaceLinkNode';
