import React, { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { CheckCircle2, ListTodo, Trash2, Target, Link2 } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useSpaceStore } from '../../store/useSpaceStore';
import { useUIStore } from '../../store/useUIStore';
import { parseJsonArray } from '../../db/client';
import { ArgonProgressBar } from '../UI/ArgonProgressBar';
import { showToast } from '../../store/useToastStore';
import { getNodeIcon } from '../Icons/NodeIcons';

export interface CourseNodeData {
  id: string;
  name: string;
  space_id: string;
  hashtags?: string[];
  icon?: string | null;
}

export const CourseNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const nodeData = data as unknown as CourseNodeData;
  const sectionsMap = useCanvasStore(s => s.sectionsMap);
  const allSpaceLinks = useCanvasStore(s => s.allSpaceLinks);
  const setSelectedCourseId = useCanvasStore(s => s.setSelectedCourseId);
  const deleteCourse = useCanvasStore(s => s.deleteCourse);
  const spaces = useSpaceStore(s => s.spaces);
  const activeSpaceId = useSpaceStore(s => s.activeSpaceId);
  const openCourseDetail = useUIStore(s => s.openCourseDetail);
  const openConfirm = useUIStore(s => s.openConfirm);
  const theme = useUIStore(s => s.theme);
  const isDark = theme === 'dark';

  // Derived backlink calculation: find any SpaceLinks in other spaces referencing this node
  const referencingSpaces = useMemo(() => {
    const matchingLinks = (allSpaceLinks || []).filter(
      sl => sl.target_course_id === nodeData.id && sl.space_id !== nodeData.space_id
    );
    const names = matchingLinks
      .map(sl => spaces.find(s => s.id === sl.space_id)?.name)
      .filter((name): name is string => Boolean(name));
    return Array.from(new Set(names));
  }, [allSpaceLinks, nodeData.id, nodeData.space_id, spaces]);

  const activeSpace = spaces.find(s => s.id === (nodeData.space_id || activeSpaceId));
  const focusedNodeId = activeSpace?.focused_node_id ?? null;
  const isFocused = !!(focusedNodeId && focusedNodeId === nodeData.id);
  const isBlurred = !!(focusedNodeId && focusedNodeId !== nodeData.id);

  const sections = sectionsMap[nodeData.id] || [];
  const totalSections = sections.length;
  const doneSections = sections.filter(s => s.is_done === 1).length;
  const percent = totalSections > 0 ? Math.round((doneSections / totalSections) * 100) : 0;
  const isComplete = totalSections > 0 && doneSections === totalSections;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCourseId(nodeData.id);
    openCourseDetail();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    openConfirm(
      'Delete Node',
      `Are you sure you want to delete "${nodeData.name}" and all of its sub-tasks and connections?`,
      async () => {
        await deleteCourse(nodeData.id);
        showToast.warning(`Deleted "${nodeData.name}"`);
      }
    );
  };

  const handleStyle =
    '!w-3.5 !h-3.5 !bg-[#2CD9FF] !border-2 !border-[#0a0a0a] opacity-60 group-hover:opacity-100 z-30 transition-all hover:scale-135 hover:!bg-[#05CD99] shadow-md';

  const rawHashtags: string[] = parseJsonArray<string>(nodeData.hashtags);
  const hasHashtags = rawHashtags.length > 0;

  return (
    <div
      onClick={handleClick}
      data-node-id={nodeData.id}
      className={`group relative w-[280px] min-w-[260px] max-w-[320px] rounded-2xl border p-5 transition-all duration-200 cursor-pointer select-none ${
        isDark
          ? 'bg-[#141414] text-[#ededed] shadow-argon-card-dark'
          : 'bg-gradient-to-b from-white to-slate-50/90 text-[#2B3674] shadow-argon-card backdrop-blur-md'
      } ${
        isFocused
          ? 'border-amber-400 ring-4 ring-amber-400/30 shadow-[0_0_20px_rgba(255,181,71,0.25)]'
          : selected
          ? 'border-[#2CD9FF] ring-4 ring-[#2CD9FF]/25 shadow-argon-primary'
          : isDark
          ? 'border-[#262626] hover:border-[#333333] hover:-translate-y-1 hover:shadow-argon-hover'
          : 'border-slate-200/90 hover:border-sky-400 hover:-translate-y-1 hover:shadow-argon-hover'
      } ${
        isBlurred
          ? 'opacity-65 filter blur-[0.8px] hover:filter-none hover:opacity-100 transition-all duration-300'
          : ''
      }`}
    >
      {/* Focus Pill Badge */}
      {isFocused && (
        <div className="absolute -top-3 left-4 px-3 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider bg-gradient-argon-warning text-white shadow-argon-warning flex items-center gap-1.5 z-30 animate-pulse border border-amber-300/40">
          <Target size={11} strokeWidth={3} />
          <span>FOCUS TARGET</span>
        </div>
      )}

      {/* 4 Connection Handles (Loose Mode handles both incoming and outgoing) */}
      <Handle type="source" position={Position.Top} id="top" className={handleStyle} />
      <Handle type="source" position={Position.Right} id="right" className={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={handleStyle} />
      <Handle type="source" position={Position.Left} id="left" className={handleStyle} />

      {/* Header & Category Icon */}
      <div className="flex items-start justify-between gap-3.5">
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          {/* Node Category Icon Badge */}
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm transition-transform group-hover:scale-105 ${
              isComplete
                ? 'bg-gradient-argon-success text-white shadow-argon-success'
                : 'bg-gradient-argon-primary text-white shadow-argon-primary'
            }`}
          >
            {isComplete ? <CheckCircle2 size={16} strokeWidth={2.5} /> : getNodeIcon(nodeData.icon, 16)}
          </div>

          <div className="min-w-0 flex-1">
            <h3
              title={nodeData.name}
              className={`font-bold text-sm leading-snug line-clamp-2 ${
                isDark ? 'text-[#ededed]' : 'text-[#2B3674]'
              }`}
            >
              {nodeData.name}
            </h3>

            {hasHashtags && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {rawHashtags.map((tag: string) => (
                  <span
                    key={tag}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md leading-none border transition ${
                      isDark
                        ? 'bg-sky-500/15 text-[#2CD9FF] border-sky-500/30'
                        : 'bg-sky-50 text-sky-700 border-sky-200'
                    }`}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions & Badges container */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Linked From Backlink Badge */}
          {referencingSpaces.length > 0 && (
            <div
              className={`group/backlink relative flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-default ${
                isDark
                  ? 'bg-sky-500/15 text-[#2CD9FF] border-sky-500/30 hover:bg-sky-500/25 hover:border-sky-400 shadow-[0_0_10px_rgba(44,217,255,0.15)]'
                  : 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100 hover:border-sky-400 shadow-sm'
              }`}
              onClick={e => e.stopPropagation()}
              title={`Linked from: ${referencingSpaces.join(', ')}`}
            >
              <Link2 size={11} className="rotate-45 shrink-0 text-[#2CD9FF]" />
              <span>{referencingSpaces.length}</span>

              {/* Floating Tooltip */}
              <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden group-hover/backlink:flex flex-col z-50 min-w-[190px] max-w-[260px] p-2.5 rounded-xl text-[11px] shadow-2xl border bg-[#1a1a1a] text-[#ededed] border-[#333333] backdrop-blur-md animate-in fade-in zoom-in-95">
                <div className="text-[10px] uppercase font-bold text-sky-400 tracking-wider mb-1 flex items-center gap-1.5">
                  <Link2 size={10} className="rotate-45" />
                  <span>Referenced By SpaceLink</span>
                </div>
                <div className="text-[#a1a1a1] text-[11px] leading-relaxed">
                  Linked from:{' '}
                  <span className="text-[#ededed] font-semibold">{referencingSpaces.join(', ')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Delete action button */}
          <button
            onClick={handleDelete}
            className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all shrink-0 ${
              isDark
                ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/15'
                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
            }`}
            title="Delete Node"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Sub-tasks Progress Section with Argon Progress Bar */}
      <div
        className={`mt-4 pt-3 border-t flex flex-col gap-2 ${
          isDark ? 'border-[#262626]' : 'border-slate-100'
        }`}
      >
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="flex items-center gap-1.5">
            {isComplete ? (
              <CheckCircle2 size={13} className="text-emerald-400" />
            ) : (
              <ListTodo size={13} className={isDark ? 'text-[#a1a1a1]' : 'text-[#707E94]'} />
            )}
            <span className={isDark ? 'text-[#a1a1a1]' : 'text-[#707E94]'}>
              {totalSections === 0 ? 'No sub-tasks' : `${doneSections}/${totalSections} done`}
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

        {/* Progress Bar */}
        {totalSections > 0 && (
          <ArgonProgressBar
            value={percent}
            variant={isComplete ? 'success' : 'primary'}
            height={5}
            isDark={isDark}
          />
        )}
      </div>
    </div>
  );
});

CourseNode.displayName = 'CourseNode';
