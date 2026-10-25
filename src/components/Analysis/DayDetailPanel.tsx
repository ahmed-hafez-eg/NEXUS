import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, GitCommit, Calendar, Layers } from 'lucide-react';
import { getSectionsDoneOnDate, SectionDoneOnDate } from '../../db/client';
import { getNodeIcon } from '../Icons/NodeIcons';
import { useCanvasStore } from '../../store/useCanvasStore';
import { format, parseISO } from 'date-fns';
import { pluralize } from '../../utils/activityUtils';

interface DayDetailPanelProps {
  date: string; // 'yyyy-MM-dd'
  taskCount: number;
  githubCount: number;
  onClose: () => void;
  isDark: boolean;
}

export const DayDetailPanel: React.FC<DayDetailPanelProps> = ({
  date,
  taskCount,
  githubCount,
  onClose,
  isDark,
}) => {
  const [sections, setSections] = useState<SectionDoneOnDate[]>([]);
  const [loading, setLoading] = useState(true);
  const allCoursesMap = useCanvasStore(s => s.allCoursesMap);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getSectionsDoneOnDate(date)
      .then(res => {
        if (isMounted) {
          setSections(res);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load sections for date', date, err);
        if (isMounted) setLoading(false);
      });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [date, onClose]);

  let formattedDate = date;
  try {
    formattedDate = format(parseISO(date), 'EEEE, MMMM d, yyyy');
  } catch {
    // Keep date as is
  }

  const total = taskCount + githubCount;

  const bgModal = isDark
    ? 'bg-[#141414] border-[#262626] text-[#ededed]'
    : 'bg-white border-slate-200 text-[#2B3674]';

  const itemBg = isDark
    ? 'bg-[#1a1a1a] border-[#262626]'
    : 'bg-slate-50 border-slate-200';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-detail-title"
    >
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in ${bgModal}`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'border-[#262626] bg-[#111111]' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-argon-primary flex items-center justify-center text-white shadow-argon-primary">
              <Calendar size={18} />
            </div>
            <div>
              <h3 id="day-detail-title" className="text-sm font-bold tracking-tight">
                {formattedDate}
              </h3>
              <p className="text-xs text-[#a1a1a1]">
                {total === 0
                  ? 'No activity recorded'
                  : `${total} total ${pluralize(total, 'activity', 'activities')} (${taskCount} ${pluralize(
                      taskCount,
                      'task',
                      'tasks'
                    )}${githubCount > 0 ? `, ${githubCount} ${pluralize(githubCount, 'commit', 'commits')}` : ''})`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
            aria-label="Close details"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Section 1: Completed Tasks */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#a1a1a1] flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-[#2CD9FF]" />
                Completed Tasks ({taskCount})
              </span>
            </div>

            {loading ? (
              <div className="p-4 text-center text-xs text-[#a1a1a1]">Loading completed tasks...</div>
            ) : sections.length === 0 ? (
              <div className={`p-4 rounded-xl border text-center text-xs text-[#a1a1a1] ${itemBg}`}>
                No specific task details recorded on this date.
              </div>
            ) : (
              <div className="space-y-2">
                {sections.map(s => {
                  const course = allCoursesMap[s.course_id];
                  const timeStr = s.done_at
                    ? (() => {
                        try {
                          return format(parseISO(s.done_at), 'h:mm a');
                        } catch {
                          return '';
                        }
                      })()
                    : '';

                  return (
                    <div
                      key={s.section_id}
                      className={`p-3 rounded-xl border flex items-start gap-3 transition ${itemBg}`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-[#2CD9FF] flex items-center justify-center shrink-0 mt-0.5">
                        {getNodeIcon(course?.icon, 14)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">{s.section_title}</div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#a1a1a1]">
                          <span className="font-semibold truncate">{s.course_name}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 truncate text-slate-400">
                            <Layers size={10} />
                            {s.space_name}
                          </span>
                          {timeStr && (
                            <>
                              <span>•</span>
                              <span className="text-[10px] text-slate-500">{timeStr}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: GitHub Commits */}
          {githubCount > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <GitCommit size={14} />
                  GitHub Commits ({githubCount})
                </span>
              </div>
              <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${itemBg}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {githubCount} {pluralize(githubCount, 'commit', 'commits')} recorded on GitHub
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    GitHub Activity
                  </span>
                </div>
                <p className="text-[11px] text-[#a1a1a1] mt-1">
                  Synced from your connected GitHub account timeline.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-6 py-3 border-t flex justify-end ${
            isDark ? 'border-[#262626] bg-[#111111]' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
              isDark
                ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
