import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Sparkles } from 'lucide-react';
import { TrendBarDay, WeeklyStats, pluralize } from '../../utils/activityUtils';

interface TrendBarChartProps {
  bars: TrendBarDay[];
  dailyGoal: number;
  weeklyStats: WeeklyStats;
  isDark: boolean;
  itemNoun?: string;
  itemsNoun?: string;
}

export const TrendBarChart: React.FC<TrendBarChartProps> = ({
  bars,
  dailyGoal,
  weeklyStats,
  isDark,
  itemNoun = 'task',
  itemsNoun = 'tasks',
}) => {
  const maxBarCount = Math.max(...bars.map(b => b.count), dailyGoal, 4);
  const chartHeight = 110;
  const chartWidth = 600;
  const barGap = 8;
  const leftPadding = 30;
  const rightPadding = 15;
  const availableWidth = chartWidth - leftPadding - rightPadding;
  const barWidth = Math.max(12, Math.floor((availableWidth - (bars.length - 1) * barGap) / bars.length));

  // Y coordinate for daily goal dashed line
  const goalY = Math.round(chartHeight - (dailyGoal / maxBarCount) * (chartHeight - 24));

  const pctDisplay =
    weeklyStats.pct === Infinity
      ? '+100%'
      : weeklyStats.pct > 0
      ? `+${weeklyStats.pct}%`
      : `${weeklyStats.pct}%`;

  return (
    <div
      className={`p-5 rounded-2xl border transition-colors ${
        isDark ? 'bg-[#141414] border-[#262626] text-white' : 'bg-white border-slate-200 text-[#2B3674]'
      }`}
    >
      {/* Title & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h4 className="text-sm font-bold tracking-tight">Recent Trend (Last 14 Days)</h4>
          <p className="text-[11px] text-[#a1a1a1]">Daily completion velocity with goal target</p>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-[#a1a1a1]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#2CD9FF]" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 border-t-2 border-dashed border-amber-400" />
            <span>Daily Goal ({dailyGoal})</span>
          </div>
        </div>
      </div>

      {/* SVG Bar Chart */}
      <div className="w-full overflow-x-auto pb-1">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight + 25}`}
          className="w-full h-auto min-w-[500px]"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Dashed line for daily goal */}
          <line
            x1={leftPadding}
            y1={goalY}
            x2={chartWidth - rightPadding}
            y2={goalY}
            stroke="#F59E0B"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            strokeOpacity="0.8"
          />
          <text
            x={leftPadding - 6}
            y={goalY + 3}
            textAnchor="end"
            className="text-[9px] font-bold fill-amber-400 font-mono"
          >
            {dailyGoal}
          </text>

          {/* Baseline */}
          <line
            x1={leftPadding}
            y1={chartHeight}
            x2={chartWidth - rightPadding}
            y2={chartHeight}
            stroke={isDark ? '#262626' : '#E2E8F0'}
            strokeWidth="1"
          />

          {/* Bars */}
          {bars.map((bar, idx) => {
            const x = leftPadding + idx * (barWidth + barGap);
            const barH = bar.count === 0 ? 3 : Math.max(4, Math.round((bar.count / maxBarCount) * (chartHeight - 24)));
            const y = chartHeight - barH;

            const isMet = bar.count >= dailyGoal;
            const barFill = bar.isToday
              ? '#2CD9FF'
              : isMet
              ? isDark
                ? '#05CD99'
                : '#059669'
              : bar.count > 0
              ? isDark
                ? '#38BDF8'
                : '#0284C7'
              : isDark
              ? '#262626'
              : '#E2E8F0';

            return (
              <g key={bar.dateStr} className="group cursor-pointer">
                <title>{`${bar.dateStr}: ${bar.count} ${pluralize(bar.count, itemNoun, itemsNoun)}`}</title>

                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx={3}
                  ry={3}
                  fill={barFill}
                  className="transition-all duration-200 hover:brightness-125"
                />

                {/* Count label above bar */}
                {bar.count > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 4}
                    textAnchor="middle"
                    className={`text-[9px] font-bold ${
                      bar.isToday ? 'fill-[#2CD9FF]' : isDark ? 'fill-[#ededed]' : 'fill-[#2B3674]'
                    }`}
                  >
                    {bar.count}
                  </text>
                )}

                {/* Day label underneath */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 15}
                  textAnchor="middle"
                  className={`text-[9px] font-bold ${
                    bar.isToday
                      ? 'fill-[#2CD9FF]'
                      : isDark
                      ? 'fill-[#a1a1a1]'
                      : 'fill-[#707E94]'
                  }`}
                >
                  {bar.isToday ? 'Today' : bar.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Week-over-Week Comparison Banner */}
      <div
        className={`mt-3.5 pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
          isDark ? 'border-[#262626]' : 'border-slate-100'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-[#a1a1a1]">Week-over-week:</span>
          <span className="font-semibold">
            This week <strong className="font-bold">{weeklyStats.thisWeek}</strong> {pluralize(weeklyStats.thisWeek, itemNoun, itemsNoun)} vs last week{' '}
            <strong className="font-bold">{weeklyStats.lastWeek}</strong>
          </span>
        </div>

        <div
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition ${
            weeklyStats.direction === 'up'
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : weeklyStats.direction === 'down'
              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              : weeklyStats.direction === 'new'
              ? 'bg-sky-500/15 text-[#2CD9FF] border-sky-500/30'
              : isDark
              ? 'bg-white/5 text-[#a1a1a1] border-white/10'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          {weeklyStats.direction === 'up' ? (
            <ArrowUpRight size={13} strokeWidth={2.5} />
          ) : weeklyStats.direction === 'down' ? (
            <ArrowDownRight size={13} strokeWidth={2.5} />
          ) : weeklyStats.direction === 'new' ? (
            <Sparkles size={12} />
          ) : (
            <Minus size={13} />
          )}
          <span>{weeklyStats.direction === 'new' ? 'New Pace' : pctDisplay}</span>
        </div>
      </div>
    </div>
  );
};
