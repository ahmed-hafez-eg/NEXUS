import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  BarChart3,
  Github,
  ArrowLeft,
  RefreshCw,
  Flame,
  Trophy,
  CalendarDays,
  Sparkles,
  TrendingUp,
  Compass,
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useActivityStore } from '../../store/useActivityStore';
import { useGitHubStore } from '../../store/useGitHubStore';
import { useSpaceStore } from '../../store/useSpaceStore';
import { ContributionHeatmap } from '../Heatmap/ContributionHeatmap';
import { DayDetailPanel } from './DayDetailPanel';
import { TrendBarChart } from './TrendBarChart';
import { SpaceBreakdown } from './SpaceBreakdown';
import * as db from '../../db/client';
import { Section } from '../../types';
import {
  RangeKey,
  ScaleMode,
  getStreaks,
  getWeeklyStats,
  getTrendBars,
  getSpaceBreakdown,
  getInsights,
  pluralize,
} from '../../utils/activityUtils';

export const AnalysisPanel: React.FC = () => {
  const activePanel = useUIStore(s => s.activePanel);
  const closePanel = useUIStore(s => s.closePanel);
  const setActivePanel = useUIStore(s => s.setActivePanel);
  const theme = useUIStore(s => s.theme);
  const isDark = theme === 'dark';

  const activityMap = useActivityStore(s => s.activityMap);
  const githubToken = useGitHubStore(s => s.token);
  const githubContributions = useGitHubStore(s => s.githubContributions);
  const loadContributions = useGitHubStore(s => s.loadContributions);

  const spaces = useSpaceStore(s => s.spaces);

  // Local State with persistence
  const [rangeKey, setRangeKey] = useState<RangeKey>('12w');
  const [sourceMode, setSourceMode] = useState<'all' | 'tasks' | 'github'>('all');
  const [scaleMode, setScaleMode] = useState<ScaleMode>('fixed');
  const [dailyGoal, setDailyGoal] = useState<number>(3);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

  // Day detail modal state
  const [detailDateInfo, setDetailDateInfo] = useState<{
    date: string;
    taskCount: number;
    githubCount: number;
  } | null>(null);

  // All completed sections for space breakdown and space filtering
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [allCourses, setAllCourses] = useState<{ id: string; space_id: string }[]>([]);

  const isOpen = activePanel === 'heatmap';
  const isGitHubConnected = Boolean(githubToken && githubToken.trim() !== '');

  // Load preferences from settings on mount
  useEffect(() => {
    let isMounted = true;
    db.getSetting('analysis_range', '12w').then(val => {
      if (isMounted && (val === '4w' || val === '12w' || val === '1y')) {
        setRangeKey(val as RangeKey);
      }
    });
    db.getSetting('analysis_scale_mode', 'fixed').then(val => {
      if (isMounted && (val === 'fixed' || val === 'goal')) {
        setScaleMode(val as ScaleMode);
      }
    });
    db.getSetting('analysis_daily_goal', '3').then(val => {
      if (isMounted) {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num > 0) setDailyGoal(num);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Load sections and courses for space breakdown
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    Promise.all([db.getAllSections(), db.getAllCourses()]).then(([secs, crs]) => {
      if (isMounted) {
        setAllSections(secs);
        setAllCourses(crs.map(c => ({ id: c.id, space_id: c.space_id })));
      }
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Persist range change
  const handleRangeChange = (key: RangeKey) => {
    setRangeKey(key);
    db.setSetting('analysis_range', key).catch(console.error);
  };

  // Persist scale mode change
  const handleScaleModeToggle = () => {
    const next: ScaleMode = scaleMode === 'fixed' ? 'goal' : 'fixed';
    setScaleMode(next);
    db.setSetting('analysis_scale_mode', next).catch(console.error);
  };

  // Persist daily goal
  const handleDailyGoalChange = (newGoal: number) => {
    const clamped = Math.max(1, Math.min(newGoal, 50));
    setDailyGoal(clamped);
    db.setSetting('analysis_daily_goal', clamped.toString()).catch(console.error);
  };

  // Derived Task Map filtered by space if a space is selected
  const filteredTaskMap = useMemo(() => {
    if (!selectedSpaceId) return activityMap;

    // Filter sections belonging to selected space
    const courseIdsInSpace = new Set(
      allCourses.filter(c => c.space_id === selectedSpaceId).map(c => c.id)
    );

    const map: Record<string, number> = {};
    for (const sec of allSections) {
      if (sec.is_done === 1 && sec.done_at && courseIdsInSpace.has(sec.course_id)) {
        const dateStr = sec.done_at.split('T')[0];
        map[dateStr] = (map[dateStr] ?? 0) + 1;
      }
    }
    return map;
  }, [activityMap, selectedSpaceId, allCourses, allSections]);

  // Combined Active Map for Range and Summary Calculations
  const combinedMap = useMemo(() => {
    const map: Record<string, number> = {};
    const taskMap = filteredTaskMap;
    const ghMap = isGitHubConnected ? githubContributions : {};

    if (sourceMode === 'tasks') {
      return taskMap;
    }
    if (sourceMode === 'github') {
      return ghMap;
    }

    // All mode: sum both
    const allKeys = new Set([...Object.keys(taskMap), ...Object.keys(ghMap)]);
    allKeys.forEach(k => {
      map[k] = (taskMap[k] || 0) + (ghMap[k] || 0);
    });
    return map;
  }, [filteredTaskMap, githubContributions, sourceMode, isGitHubConnected]);

  // Date Calculations: Today & Start Date
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);

  const rangeStartStr = useMemo(() => {
    const d = new Date(today);
    const weeks = rangeKey === '4w' ? 4 : rangeKey === '12w' ? 12 : 52;
    d.setDate(d.getDate() - (weeks * 7 - 1));
    return d.toISOString().split('T')[0];
  }, [today, rangeKey]);

  // Streak & Goal Calculations
  const streaks = useMemo(() => getStreaks(combinedMap, today), [combinedMap, today]);
  const weeklyStats = useMemo(() => getWeeklyStats(combinedMap, today, 1), [combinedMap, today]);
  const trendBars = useMemo(() => getTrendBars(combinedMap, 14, today), [combinedMap, today]);

  // Space Breakdown Data
  const spaceBreakdown = useMemo(() => {
    return getSpaceBreakdown(allSections, allCourses, spaces, rangeStartStr, todayStr);
  }, [allSections, allCourses, spaces, rangeStartStr, todayStr]);

  // Local Insights
  const insights = useMemo(() => {
    return getInsights(combinedMap, rangeStartStr, todayStr, today);
  }, [combinedMap, rangeStartStr, todayStr, today]);

  // Today's Progress against Daily Goal
  const todayActivityCount = combinedMap[todayStr] || 0;
  const todayGoalPercent = Math.min(100, Math.round((todayActivityCount / dailyGoal) * 100));

  // Range filtered counts for summary tiles
  const { rangeTotal, rangeActiveDays, rangePeakDay } = useMemo(() => {
    let total = 0;
    let active = 0;
    let peak = 0;

    Object.entries(combinedMap).forEach(([d, count]) => {
      if (d >= rangeStartStr && d <= todayStr) {
        total += count;
        if (count > 0) active++;
        if (count > peak) peak = count;
      }
    });

    return {
      rangeTotal: total,
      rangeActiveDays: active,
      rangePeakDay: peak,
    };
  }, [combinedMap, rangeStartStr, todayStr]);

  if (!isOpen) return null;

  const bgPage = isDark ? 'bg-[#0a0a0a] text-[#ededed]' : 'bg-[#F4F7FE] text-[#2B3674]';
  const headerBg = isDark ? 'bg-[#111111]/90 border-[#262626]' : 'bg-white/90 border-slate-200';
  const cardBg = isDark ? 'bg-[#141414] border-[#262626]' : 'bg-white border-slate-200';

  const itemNoun = sourceMode === 'github' ? 'commit' : 'task';
  const itemsNoun = sourceMode === 'github' ? 'commits' : 'tasks';

  return (
    <div
      className={`absolute inset-0 z-40 flex flex-col overflow-y-auto select-none animate-in fade-in duration-200 ${bgPage}`}
      role="region"
      aria-label="Activity Analysis"
    >
      {/* Top Header */}
      <header
        className={`sticky top-0 z-30 px-6 py-4 border-b flex items-center justify-between backdrop-blur-md transition-colors ${headerBg}`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={closePanel}
            className={`p-2 rounded-xl transition border ${
              isDark
                ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
            }`}
            title="Back to Canvas"
            aria-label="Back to Canvas"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-argon-primary flex items-center justify-center text-white shadow-argon-primary">
              <BarChart3 size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Activity Analysis</h2>
              <p className="text-xs text-[#a1a1a1]">
                Task velocity, goal tracking, and progress timelines
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isGitHubConnected && (
            <button
              onClick={() => loadContributions()}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                isDark
                  ? 'bg-white/5 border-white/10 hover:bg-white/10 text-[#2CD9FF]'
                  : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-sky-700'
              }`}
              title="Refresh GitHub Contributions"
              aria-label="Refresh GitHub Contributions"
            >
              <RefreshCw size={13} />
              <span className="hidden sm:inline">Sync GitHub</span>
            </button>
          )}

          <button
            onClick={closePanel}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="Close"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-6 max-w-5xl w-full mx-auto space-y-6 pb-16">
        {/* Unified Activity Card */}
        <div className={`p-6 rounded-2xl border shadow-xl transition-colors ${cardBg}`}>
          {/* Top Control Bar: Source Filter + Range Selector + Scale Toggle */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
            {/* Source Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/20 border border-white/5">
              <button
                onClick={() => setSourceMode('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  sourceMode === 'all'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-[#a1a1a1] hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSourceMode('tasks')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  sourceMode === 'tasks'
                    ? 'bg-sky-500/20 text-[#2CD9FF] border border-sky-500/30'
                    : 'text-[#a1a1a1] hover:text-white'
                }`}
              >
                Tasks
              </button>
              {isGitHubConnected ? (
                <button
                  onClick={() => setSourceMode('github')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    sourceMode === 'github'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'text-[#a1a1a1] hover:text-white'
                  }`}
                >
                  <Github size={12} />
                  <span>GitHub</span>
                </button>
              ) : (
                <button
                  onClick={() => setActivePanel('github' as any)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-purple-400 hover:text-purple-300 transition flex items-center gap-1"
                  title="Connect GitHub to track commit activity"
                >
                  <Github size={11} />
                  <span>+ Connect GitHub</span>
                </button>
              )}
            </div>

            {/* Time Range Selector & Scale Toggle */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Range Selector */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-black/20 border border-white/5">
                {(['4w', '12w', '1y'] as RangeKey[]).map(r => (
                  <button
                    key={r}
                    onClick={() => handleRangeChange(r)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      rangeKey === r
                        ? 'bg-gradient-argon-primary text-white shadow-argon-primary'
                        : 'text-[#a1a1a1] hover:text-white'
                    }`}
                  >
                    {r === '4w' ? '4 weeks' : r === '12w' ? '12 weeks' : '1 year'}
                  </button>
                ))}
              </div>

              {/* Scale Mode Toggle */}
              <button
                onClick={handleScaleModeToggle}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  scaleMode === 'goal'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    : isDark
                    ? 'bg-white/5 border-white/10 text-[#a1a1a1] hover:text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
                title="Toggle between fixed count scale and relative daily goal scale"
              >
                Scale: <span className="font-extrabold">{scaleMode === 'fixed' ? 'Fixed' : 'Goal'}</span>
              </button>
            </div>
          </div>

          {/* Honest Computed Summary Insight Line */}
          <div className="py-3.5 px-4 my-4 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2.5 text-xs">
            <Sparkles size={15} className="text-[#2CD9FF] shrink-0" />
            <span className="text-slate-300 leading-relaxed font-medium">
              {insights.summary}
            </span>
          </div>

          {/* Metric Tiles: Total, Active Days, Peak Day, Streaks, Daily Goal */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {/* 1: Total Activity */}
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                isDark ? 'bg-[#1a1a1a]/70 border-white/5' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-argon-primary flex items-center justify-center text-white shadow-argon-primary shrink-0">
                <CalendarDays size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-[#a1a1a1] truncate">
                  Total in range
                </div>
                <div className="text-sm font-extrabold truncate">
                  {rangeTotal} {pluralize(rangeTotal, itemNoun, itemsNoun)}
                </div>
              </div>
            </div>

            {/* 2: Active Days */}
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                isDark ? 'bg-[#1a1a1a]/70 border-white/5' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-argon-success flex items-center justify-center text-white shadow-argon-success shrink-0">
                <TrendingUp size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-[#a1a1a1] truncate">
                  Active Days
                </div>
                <div className="text-sm font-extrabold truncate">
                  {rangeActiveDays} {pluralize(rangeActiveDays, 'day', 'days')}
                </div>
              </div>
            </div>

            {/* 3: Peak Day */}
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                isDark ? 'bg-[#1a1a1a]/70 border-white/5' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-argon-warning flex items-center justify-center text-white shadow-argon-warning shrink-0">
                <Trophy size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-[#a1a1a1] truncate">
                  Peak Day
                </div>
                <div className="text-sm font-extrabold truncate">
                  {rangePeakDay} {pluralize(rangePeakDay, itemNoun, itemsNoun)}
                </div>
              </div>
            </div>

            {/* 4: Current & Longest Streak */}
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                isDark ? 'bg-[#1a1a1a]/70 border-white/5' : 'bg-slate-50 border-slate-200'
              }`}
              title={
                streaks.daysSinceLast === 0
                  ? 'Active today! Streak is progressing.'
                  : streaks.daysSinceLast === 1
                  ? 'Streak is alive! Complete a task today to continue.'
                  : `${streaks.daysSinceLast} days since last activity.`
              }
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shrink-0">
                <Flame size={17} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-[#a1a1a1] truncate">
                  Current Streak
                </div>
                <div className="text-sm font-extrabold flex items-center gap-1.5 truncate">
                  <span>{streaks.current} {pluralize(streaks.current, 'day', 'days')}</span>
                  {streaks.longest > 0 && (
                    <span className="text-[10px] text-[#a1a1a1] font-normal">
                      (best {streaks.longest})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 5: Today's Goal Ring */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-2.5 col-span-2 sm:col-span-1 ${
                isDark ? 'bg-[#1a1a1a]/70 border-white/5' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Compact Progress Ring SVG */}
                <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
                  <svg className="w-9 h-9 -rotate-90">
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      stroke={isDark ? '#262626' : '#E2E8F0'}
                      strokeWidth="3"
                      fill="transparent"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      stroke="#2CD9FF"
                      strokeWidth="3"
                      fill="transparent"
                      strokeDasharray="88"
                      strokeDashoffset={88 - (88 * todayGoalPercent) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-bold font-mono">
                    {todayActivityCount}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-[#a1a1a1] truncate">
                    Daily Goal
                  </div>
                  <div className="text-xs font-extrabold truncate">
                    {todayActivityCount}/{dailyGoal} tasks
                  </div>
                </div>
              </div>

              {/* Goal Quick Adjust Stepper */}
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => handleDailyGoalChange(dailyGoal + 1)}
                  className="w-5 h-3.5 rounded bg-white/5 hover:bg-white/15 text-[9px] font-bold flex items-center justify-center text-slate-300 transition"
                  title="Increase daily goal"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => handleDailyGoalChange(dailyGoal - 1)}
                  className="w-5 h-3.5 rounded bg-white/5 hover:bg-white/15 text-[9px] font-bold flex items-center justify-center text-slate-300 transition"
                  title="Decrease daily goal"
                >
                  -
                </button>
              </div>
            </div>
          </div>

          {/* Empty State vs Heatmap Grid */}
          {rangeTotal === 0 ? (
            <div className="p-10 text-center border border-dashed rounded-2xl flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-[#2CD9FF]">
                <Compass size={24} />
              </div>
              <h4 className="text-sm font-bold">No activity in this time range</h4>
              <p className="text-xs text-[#a1a1a1] max-w-sm">
                Complete sub-tasks on your canvas or push commits to GitHub to start filling in your performance heatmap!
              </p>
              <button
                onClick={closePanel}
                className="mt-2 px-4 py-2 bg-gradient-argon-primary text-white text-xs font-bold rounded-xl shadow-argon-primary transition hover:brightness-105"
              >
                Go to Canvas Nodes
              </button>
            </div>
          ) : (
            <ContributionHeatmap
              taskActivityMap={filteredTaskMap}
              githubActivityMap={githubContributions}
              sourceMode={sourceMode}
              rangeKey={rangeKey}
              scaleMode={scaleMode}
              dailyGoal={dailyGoal}
              weekStart={1}
              selectedDate={detailDateInfo?.date || null}
              onSelectDate={(date, tCount, ghCount) => {
                setDetailDateInfo({ date, taskCount: tCount, githubCount: ghCount });
              }}
              itemNoun={itemNoun}
              itemsNoun={itemsNoun}
            />
          )}
        </div>

        {/* 14-Day Trend Bar Chart with Week-over-Week Comparison */}
        <TrendBarChart
          bars={trendBars}
          dailyGoal={dailyGoal}
          weeklyStats={weeklyStats}
          isDark={isDark}
          itemNoun={itemNoun}
          itemsNoun={itemsNoun}
        />

        {/* Breakdown by Workspace */}
        <SpaceBreakdown
          items={spaceBreakdown}
          selectedSpaceId={selectedSpaceId}
          onSelectSpace={setSelectedSpaceId}
          isDark={isDark}
          itemNoun={itemNoun}
          itemsNoun={itemsNoun}
        />
      </main>

      {/* Day Details Modal / Popover */}
      {detailDateInfo && (
        <DayDetailPanel
          date={detailDateInfo.date}
          taskCount={detailDateInfo.taskCount}
          githubCount={detailDateInfo.githubCount}
          onClose={() => setDetailDateInfo(null)}
          isDark={isDark}
        />
      )}
    </div>
  );
};
