import React, { useMemo, useRef, useCallback } from 'react';
import {
  eachDayOfInterval,
  format,
  startOfWeek,
  endOfWeek,
  parseISO,
  subDays,
} from 'date-fns';
import { useUIStore } from '../../store/useUIStore';
import { RangeKey, ScaleMode, getColorLevel, pluralize } from '../../utils/activityUtils';

export interface DayCell {
  date: Date;
  dateStr: string;
  formattedDate: string;
  tooltipText: string;
  taskCount: number;
  githubCount: number;
  totalCount: number;
  level: number;
  dayOfWeek: number;
  hasBothSources: boolean;
  colIdx: number;
  rowIdx: number;
}

export interface ContributionHeatmapProps {
  taskActivityMap: Record<string, number>;
  githubActivityMap?: Record<string, number>;
  sourceMode: 'all' | 'tasks' | 'github';
  rangeKey: RangeKey;
  scaleMode: ScaleMode;
  dailyGoal: number;
  weekStart?: 0 | 1;
  selectedDate: string | null;
  onSelectDate: (date: string, taskCount: number, githubCount: number) => void;
  itemNoun?: string;
  itemsNoun?: string;
}

export const ContributionHeatmap: React.FC<ContributionHeatmapProps> = ({
  taskActivityMap,
  githubActivityMap = {},
  sourceMode,
  rangeKey,
  scaleMode,
  dailyGoal,
  weekStart = 1, // Default Mon
  selectedDate,
  onSelectDate,
  itemNoun = 'task',
  itemsNoun = 'tasks',
}) => {
  const theme = useUIStore(s => s.theme);
  const isDark = theme === 'dark';

  // Floating Tooltip DOM Refs for high performance
  const tooltipRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  const showTooltip = useCallback((e: React.MouseEvent<SVGElement> | React.FocusEvent<SVGElement>, cell: DayCell) => {
    if (!tooltipRef.current || !titleRef.current || !dateRef.current) return;
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    tooltipRef.current.style.left = `${rect.left + rect.width / 2}px`;
    tooltipRef.current.style.top = `${rect.top - 10}px`;
    titleRef.current.textContent = cell.tooltipText;
    dateRef.current.textContent = cell.formattedDate;
    tooltipRef.current.style.opacity = '1';
    tooltipRef.current.style.visibility = 'visible';
  }, []);

  const hideTooltip = useCallback(() => {
    if (!tooltipRef.current) return;
    tooltipRef.current.style.opacity = '0';
    tooltipRef.current.style.visibility = 'hidden';
  }, []);

  // Compute dynamic cell sizes based on range
  const { cellSize, cellGap, rx } = useMemo(() => {
    if (rangeKey === '4w') return { cellSize: 24, cellGap: 5, rx: 5 };
    if (rangeKey === '12w') return { cellSize: 18, cellGap: 4, rx: 4 };
    return { cellSize: 12, cellGap: 3.5, rx: 3 };
  }, [rangeKey]);

  // Unified color palette
  const getColor = useCallback(
    (level: number, onlyGithub = false) => {
      if (level === 0) return isDark ? '#1f1f1f' : '#E2E8F0';

      if (sourceMode === 'github' || onlyGithub) {
        // Purple hue
        const purpleDark = ['#1f1f1f', '#3B1A78', '#6366F1', '#8B5CF6', '#C084FC'];
        const purpleLight = ['#E2E8F0', '#E0E7FF', '#C7D2FE', '#818CF8', '#6366F1'];
        return (isDark ? purpleDark : purpleLight)[level] ?? (isDark ? '#C084FC' : '#6366F1');
      }

      // Default Cyan / Sky hue
      const cyanDark = ['#1f1f1f', '#004B7A', '#0075FF', '#00C6FF', '#05CD99'];
      const cyanLight = ['#E2E8F0', '#BAE6FD', '#38BDF8', '#0284C7', '#01B574'];
      return (isDark ? cyanDark : cyanLight)[level] ?? (isDark ? '#05CD99' : '#01B574');
    },
    [isDark, sourceMode]
  );

  // Compute Grid Data with Smart Start
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const weeksCountMap: Record<RangeKey, number> = { '4w': 4, '12w': 12, '1y': 52 };
    const maxWeeks = weeksCountMap[rangeKey];

    // Combined active dates for smart start
    const allDatesWithActivity = new Set<string>();
    Object.entries(taskActivityMap).forEach(([d, c]) => {
      if (c > 0) allDatesWithActivity.add(d);
    });
    if (sourceMode === 'all' || sourceMode === 'github') {
      Object.entries(githubActivityMap).forEach(([d, c]) => {
        if (c > 0) allDatesWithActivity.add(d);
      });
    }

    const sortedActive = Array.from(allDatesWithActivity).sort();
    const defaultStart = startOfWeek(subDays(today, maxWeeks * 7 - 1), { weekStartsOn: weekStart });

    let calculatedStart = defaultStart;
    // Smart Start: if sparse data and active history starts later, buffer with 1-2 empty weeks
    if (sortedActive.length > 0 && rangeKey !== '4w') {
      const earliestActive = parseISO(sortedActive[0]);
      const smartCandidate = startOfWeek(subDays(earliestActive, 14), { weekStartsOn: weekStart });
      if (smartCandidate > defaultStart) {
        calculatedStart = smartCandidate;
      }
    }

    const calculatedEnd = endOfWeek(today, { weekStartsOn: weekStart });
    const allDays = eachDayOfInterval({ start: calculatedStart, end: calculatedEnd });

    const weekCols: DayCell[][] = [];
    const flatCells: DayCell[] = [];
    let currentWeek: DayCell[] = [];
    let sumTotal = 0;
    let daysWithActivity = 0;
    let maxDayCount = 0;

    let colCounter = 0;

    allDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const taskVal = taskActivityMap[dateStr] || 0;
      const ghVal = githubActivityMap[dateStr] || 0;

      let displayCount = 0;
      if (sourceMode === 'tasks') displayCount = taskVal;
      else if (sourceMode === 'github') displayCount = ghVal;
      else displayCount = taskVal + ghVal;

      sumTotal += displayCount;
      if (displayCount > 0) daysWithActivity++;
      if (displayCount > maxDayCount) maxDayCount = displayCount;

      const level = getColorLevel(displayCount, scaleMode, dailyGoal);
      const hasBoth = sourceMode === 'all' && taskVal > 0 && ghVal > 0;

      const formattedDate = format(day, 'EEE, d MMM yyyy');
      let tooltipText = '';
      if (displayCount === 0) {
        tooltipText = `${formattedDate} · No activity`;
      } else if (sourceMode === 'all') {
        const parts: string[] = [];
        if (taskVal > 0) parts.push(`${taskVal} ${pluralize(taskVal, 'task', 'tasks')}`);
        if (ghVal > 0) parts.push(`${ghVal} ${pluralize(ghVal, 'commit', 'commits')}`);
        tooltipText = `${formattedDate} · ${parts.join(', ')}`;
      } else {
        tooltipText = `${formattedDate} · ${displayCount} ${pluralize(displayCount, itemNoun, itemsNoun)}`;
      }

      const cell: DayCell = {
        date: day,
        dateStr,
        formattedDate,
        tooltipText,
        taskCount: taskVal,
        githubCount: ghVal,
        totalCount: displayCount,
        level,
        dayOfWeek: day.getDay(),
        hasBothSources: hasBoth,
        colIdx: colCounter,
        rowIdx: currentWeek.length,
      };

      currentWeek.push(cell);
      flatCells.push(cell);

      if (currentWeek.length === 7) {
        weekCols.push(currentWeek);
        currentWeek = [];
        colCounter++;
      }
    });

    if (currentWeek.length > 0) {
      weekCols.push(currentWeek);
    }

    // Month labels: aligned to the exact column where each month starts
    const rawMonths: { label: string; colIndex: number }[] = [];
    weekCols.forEach((week, colIdx) => {
      const firstOfMonth = week.find(d => d.date.getDate() === 1);
      if (firstOfMonth) {
        rawMonths.push({ label: format(firstOfMonth.date, 'MMM'), colIndex: colIdx });
      }
    });

    if (weekCols[0] && weekCols[0][0]) {
      const firstMonth = format(weekCols[0][0].date, 'MMM');
      if (rawMonths.length === 0 || rawMonths[0].colIndex >= 3) {
        rawMonths.unshift({ label: firstMonth, colIndex: 0 });
      }
    }

    // Filter overlapping month labels
    const filteredMonths: { label: string; colIndex: number }[] = [];
    for (let i = 0; i < rawMonths.length; i++) {
      const curr = rawMonths[i];
      const next = rawMonths[i + 1];
      if (next && next.colIndex - curr.colIndex < 3) {
        continue;
      }
      filteredMonths.push(curr);
    }

    return {
      weeks: weekCols,
      monthLabels: filteredMonths,
    };
  }, [
    taskActivityMap,
    githubActivityMap,
    sourceMode,
    rangeKey,
    scaleMode,
    dailyGoal,
    weekStart,
    itemNoun,
    itemsNoun,
  ]);

  const leftPadding = 34;
  const topPadding = 24;
  const totalSvgWidth = leftPadding + weeks.length * (cellSize + cellGap) + 16;
  const totalSvgHeight = topPadding + 7 * (cellSize + cellGap) + 12;

  const textColor = isDark ? 'fill-[#a1a1a1]' : 'fill-[#707E94]';
  const cellBorderColor = isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0';

  // Weekday axis labels
  const weekdayLabels = useMemo(() => {
    if (weekStart === 1) {
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    }
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }, [weekStart]);

  // Keyboard navigation between cells
  const handleCellKeyDown = (e: React.KeyboardEvent<SVGRectElement>, cell: DayCell) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectDate(cell.dateStr, cell.taskCount, cell.githubCount);
      return;
    }

    let targetCol = cell.colIdx;
    let targetRow = cell.rowIdx;

    if (e.key === 'ArrowUp') targetRow = Math.max(0, targetRow - 1);
    else if (e.key === 'ArrowDown') targetRow = Math.min(6, targetRow + 1);
    else if (e.key === 'ArrowLeft') targetCol = Math.max(0, targetCol - 1);
    else if (e.key === 'ArrowRight') targetCol = Math.min(weeks.length - 1, targetCol + 1);
    else return;

    e.preventDefault();
    const nextCell = weeks[targetCol]?.[targetRow];
    if (nextCell) {
      const el = document.getElementById(`cell-${nextCell.dateStr}`);
      if (el) (el as HTMLElement).focus();
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Scrollable Container on small screens */}
      <div className="w-full overflow-x-auto pb-2 flex justify-start sm:justify-center">
        <svg
          width={totalSvgWidth}
          height={totalSvgHeight}
          className="overflow-visible select-none"
          role="grid"
          aria-label="Activity heatmap"
        >
          {/* 7 Localized Weekday Labels */}
          {weekdayLabels.map((lbl, rowIdx) => (
            <text
              key={lbl}
              x={0}
              y={topPadding + rowIdx * (cellSize + cellGap) + (cellSize * 0.72)}
              className={`text-[9px] font-sans font-semibold ${textColor}`}
            >
              {lbl}
            </text>
          ))}

          {/* Month Labels Aligned to actual start columns */}
          {monthLabels.map((m, i) => (
            <text
              key={i}
              x={leftPadding + m.colIndex * (cellSize + cellGap)}
              y={14}
              className={`text-[10px] font-sans font-bold ${textColor}`}
            >
              {m.label}
            </text>
          ))}

          {/* Grid Cells */}
          {weeks.map((week, colIdx) => (
            <g
              key={colIdx}
              transform={`translate(${leftPadding + colIdx * (cellSize + cellGap)}, ${topPadding})`}
            >
              {week.map((cell, rowIdx) => {
                const isSelected = selectedDate === cell.dateStr;
                const x = 0;
                const y = rowIdx * (cellSize + cellGap);

                return (
                  <g key={cell.dateStr} className="focus:outline-none">
                    <rect
                      id={`cell-${cell.dateStr}`}
                      tabIndex={0}
                      role="button"
                      aria-label={cell.tooltipText}
                      aria-pressed={isSelected}
                      x={x}
                      y={y}
                      width={cellSize}
                      height={cellSize}
                      rx={rx}
                      ry={rx}
                      fill={getColor(cell.level, sourceMode === 'github')}
                      stroke={
                        isSelected
                          ? '#2CD9FF'
                          : cell.level === 0
                          ? cellBorderColor
                          : 'transparent'
                      }
                      strokeWidth={isSelected ? 2 : 1}
                      className={`cursor-pointer transition-all duration-75 outline-none hover:stroke-white focus:stroke-[#2CD9FF] focus:stroke-2 ${
                        isSelected ? 'ring-2 ring-[#2CD9FF]' : ''
                      }`}
                      onClick={() => onSelectDate(cell.dateStr, cell.taskCount, cell.githubCount)}
                      onMouseEnter={e => showTooltip(e, cell)}
                      onMouseLeave={hideTooltip}
                      onFocus={e => showTooltip(e, cell)}
                      onBlur={hideTooltip}
                      onKeyDown={e => handleCellKeyDown(e, cell)}
                    />

                    {/* Split Indicator: tiny purple triangle in top-right corner if both task & github activity */}
                    {cell.hasBothSources && (
                      <polygon
                        points={`${x + cellSize - Math.round(cellSize * 0.45)},${y} ${x + cellSize},${y} ${x + cellSize},${y + Math.round(cellSize * 0.45)}`}
                        fill="#C084FC"
                        className="pointer-events-none"
                      />
                    )}
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>

      {/* Legend with Real Numbers */}
      <div className="w-full flex flex-wrap items-center justify-between text-xs pt-3.5 border-t border-white/10 mt-2 gap-3 px-2">
        <span className="text-[11px] text-[#a1a1a1]">
          {rangeKey === '4w'
            ? 'Last 4 weeks'
            : rangeKey === '12w'
            ? 'Last 12 weeks'
            : 'Last 52 weeks'} activity
        </span>

        {/* Level Legend */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-[#a1a1a1] mr-1">Less</span>
          {[0, 1, 2, 3, 4].map(lvl => (
            <div key={lvl} className="flex items-center gap-1">
              <div
                className="w-3.5 h-3.5 rounded-md border border-white/10 shadow-sm"
                style={{ backgroundColor: getColor(lvl) }}
                title={
                  scaleMode === 'goal'
                    ? lvl === 0
                      ? '0'
                      : lvl === 1
                      ? '<50% of goal'
                      : lvl === 2
                      ? '50-99% of goal'
                      : lvl === 3
                      ? '100% of goal'
                      : '>100% of goal'
                    : lvl === 0
                    ? '0'
                    : lvl === 1
                    ? '1-2'
                    : lvl === 2
                    ? '3-5'
                    : lvl === 3
                    ? '6-9'
                    : '10+'
                }
              />
              <span className="text-[10px] text-[#a1a1a1] font-mono mr-1">
                {scaleMode === 'goal'
                  ? lvl === 0
                    ? '0'
                    : lvl === 1
                    ? '<50%'
                    : lvl === 2
                    ? '50%'
                    : lvl === 3
                    ? '100%'
                    : '>100%'
                  : lvl === 0
                  ? '0'
                  : lvl === 1
                  ? '1-2'
                  : lvl === 2
                  ? '3-5'
                  : lvl === 3
                  ? '6-9'
                  : '10+'}
              </span>
            </div>
          ))}
          <span className="text-[11px] font-bold text-[#a1a1a1] ml-1">More</span>
        </div>
      </div>

      {/* Floating Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          left: '0px',
          top: '0px',
          transform: 'translate(-50%, -100%)',
          pointerEvents: 'none',
          opacity: 0,
          visibility: 'hidden',
          transition: 'opacity 0.08s ease',
        }}
        className={`z-50 px-3 py-2 border rounded-xl text-xs shadow-2xl whitespace-nowrap ${
          isDark
            ? 'bg-[#0a0a0a]/95 border-white/20 text-white'
            : 'bg-white/95 border-slate-300 text-[#2B3674]'
        }`}
      >
        <div ref={titleRef} className="font-bold text-[#2CD9FF]" />
        <div ref={dateRef} className="text-[10px] text-[#a1a1a1] mt-0.5" />
      </div>
    </div>
  );
};
