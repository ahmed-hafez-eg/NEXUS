/**
 * activityUtils.ts
 * Pure, timezone-safe utility functions for activity heatmap analysis.
 * No React dependencies — fully unit-testable.
 */

import { format, subDays, startOfWeek, parseISO } from 'date-fns';

export type ScaleMode = 'fixed' | 'goal';
export type RangeKey = '4w' | '12w' | '1y';

/** Pluralize helper */
export function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

/**
 * Returns the color level 0-4 for a given count.
 *
 * Fixed thresholds: 0 | 1-2 | 3-5 | 6-9 | 10+
 * Goal thresholds : 0 | <50% | 50-99% | 100% | >100%
 */
export function getColorLevel(count: number, mode: ScaleMode = 'fixed', dailyGoal = 3): number {
  if (count === 0) return 0;
  if (mode === 'goal') {
    const pct = count / dailyGoal;
    if (pct >= 1.01) return 4;
    if (pct >= 1.0) return 3;
    if (pct >= 0.5) return 2;
    return 1;
  }
  // Fixed
  if (count >= 10) return 4;
  if (count >= 6) return 3;
  if (count >= 3) return 2;
  return 1;
}

export interface StreakResult {
  current: number;   // consecutive days up to today (today counts if has activity)
  longest: number;   // longest ever streak
  daysSinceLast: number; // 0 = active today, 1 = yesterday, etc.
}

/**
 * Compute streak stats from an activity map.
 * Uses local date (YYYY-MM-DD) comparison — no UTC drift.
 */
export function getStreaks(
  dateMap: Record<string, number>,
  today: Date = new Date()
): StreakResult {
  const todayStr = format(today, 'yyyy-MM-dd');

  // Find all dates with activity > 0
  const activeDates = new Set(
    Object.entries(dateMap)
      .filter(([, count]) => count > 0)
      .map(([date]) => date)
  );

  if (activeDates.size === 0) {
    return { current: 0, longest: 0, daysSinceLast: Infinity };
  }

  // daysSinceLast: walk backwards from today
  let daysSinceLast = 0;
  let check = today;
  while (true) {
    const checkStr = format(check, 'yyyy-MM-dd');
    if (activeDates.has(checkStr)) break;
    daysSinceLast++;
    check = subDays(check, 1);
    if (daysSinceLast > 3650) break; // guard
  }

  // current streak: consecutive days ending at today (or yesterday if today has no activity)
  let current = 0;
  let day = today;
  while (true) {
    const dayStr = format(day, 'yyyy-MM-dd');
    if (activeDates.has(dayStr)) {
      current++;
      day = subDays(day, 1);
    } else if (dayStr === todayStr) {
      // Today has no activity yet — streak stays alive until end of day
      // (don't count today, but don't break streak either — check yesterday)
      day = subDays(day, 1);
    } else {
      break;
    }
  }

  // longest streak: sort all active dates, find max consecutive run
  const sorted = Array.from(activeDates).sort();
  let longest = 0;
  let run = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sorted) {
    const d = parseISO(dateStr);
    if (prevDate) {
      const diff = Math.round((d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        run++;
      } else {
        run = 1;
      }
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prevDate = d;
  }

  return { current, longest, daysSinceLast };
}

export interface WeeklyStats {
  thisWeek: number;
  lastWeek: number;
  pct: number;     // change percent; Infinity for "no last week data → new activity"
  direction: 'up' | 'down' | 'same' | 'new';
}

/**
 * Compute week-over-week task count comparison.
 * weekStart: 1 = Monday (default), 0 = Sunday
 */
export function getWeeklyStats(
  dateMap: Record<string, number>,
  today: Date = new Date(),
  weekStart: 0 | 1 = 1
): WeeklyStats {
  const thisWeekStart = startOfWeek(today, { weekStartsOn: weekStart });

  let thisWeek = 0;
  let lastWeek = 0;

  for (let i = 0; i < 7; i++) {
    const d = subDays(thisWeekStart, -i);
    thisWeek += dateMap[format(d, 'yyyy-MM-dd')] ?? 0;
  }
  for (let i = 0; i < 7; i++) {
    const d = subDays(thisWeekStart, 7 - i);
    lastWeek += dateMap[format(d, 'yyyy-MM-dd')] ?? 0;
  }

  let pct = 0;
  let direction: WeeklyStats['direction'] = 'same';

  if (lastWeek === 0 && thisWeek > 0) {
    pct = Infinity;
    direction = 'new';
  } else if (lastWeek === 0) {
    pct = 0;
    direction = 'same';
  } else {
    pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    direction = thisWeek > lastWeek ? 'up' : thisWeek < lastWeek ? 'down' : 'same';
  }

  return { thisWeek, lastWeek, pct, direction };
}

export interface TrendBarDay {
  date: Date;
  dateStr: string;
  label: string;   // short day label e.g. "Mon"
  count: number;
  isToday: boolean;
}

/**
 * Returns bar chart data for the last N days (default 14).
 */
export function getTrendBars(
  dateMap: Record<string, number>,
  n = 14,
  today: Date = new Date()
): TrendBarDay[] {
  const bars: TrendBarDay[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = subDays(today, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    bars.push({
      date: d,
      dateStr,
      label: format(d, 'EEE'),
      count: dateMap[dateStr] ?? 0,
      isToday: i === 0,
    });
  }
  return bars;
}

export interface SpaceBreakdownItem {
  spaceId: string;
  spaceName: string;
  count: number;
  pct: number;
}

/**
 * Returns per-space task completion counts for a date range.
 * sections: all sections with course_id and done_at
 * courses: all courses with space_id
 * spaces: all spaces
 * startDate / endDate: 'yyyy-MM-dd' strings
 */
export function getSpaceBreakdown(
  sections: Array<{ course_id: string; is_done: number; done_at: string | null }>,
  courses: Array<{ id: string; space_id: string }>,
  spaces: Array<{ id: string; name: string }>,
  startDate: string,
  endDate: string
): SpaceBreakdownItem[] {
  const courseToSpace: Record<string, string> = {};
  for (const c of courses) {
    courseToSpace[c.id] = c.space_id;
  }

  const spaceCount: Record<string, number> = {};
  for (const sec of sections) {
    if (sec.is_done !== 1 || !sec.done_at) continue;
    const doneDate = sec.done_at.split('T')[0];
    if (doneDate < startDate || doneDate > endDate) continue;
    const spaceId = courseToSpace[sec.course_id];
    if (!spaceId) continue;
    spaceCount[spaceId] = (spaceCount[spaceId] ?? 0) + 1;
  }

  const total = Object.values(spaceCount).reduce((a, b) => a + b, 0);
  const result: SpaceBreakdownItem[] = spaces
    .filter(s => spaceCount[s.id] > 0)
    .map(s => ({
      spaceId: s.id,
      spaceName: s.name,
      count: spaceCount[s.id],
      pct: total > 0 ? Math.round((spaceCount[s.id] / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return result;
}

export interface Insights {
  bestWeekday: string | null;   // e.g. "Friday"
  avgPerActiveDay: number;
  mostProductiveWeek: string | null;  // e.g. "Oct 14 – Oct 20"
  summary: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Derive insights from the date map within the range.
 * Requires at least 3 active days, otherwise returns nulls.
 */
export function getInsights(
  dateMap: Record<string, number>,
  startDate: string,
  endDate: string,
  today: Date = new Date()
): Insights {
  const entries = Object.entries(dateMap).filter(
    ([d, count]) => count > 0 && d >= startDate && d <= endDate
  );

  if (entries.length < 3) {
    return {
      bestWeekday: null,
      avgPerActiveDay: 0,
      mostProductiveWeek: null,
      summary: 'Keep going — insights will appear after 3 or more active days.',
    };
  }

  // Best weekday
  const weekdayTotals: number[] = [0, 0, 0, 0, 0, 0, 0];
  const weekdayCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
  let totalTasks = 0;

  for (const [dateStr, count] of entries) {
    const d = parseISO(dateStr);
    const dow = d.getDay();
    weekdayTotals[dow] += count;
    weekdayCounts[dow]++;
    totalTasks += count;
  }

  const weekdayAvg = weekdayTotals.map((t, i) => weekdayCounts[i] > 0 ? t / weekdayCounts[i] : 0);
  const bestDow = weekdayAvg.indexOf(Math.max(...weekdayAvg));
  const bestWeekday = weekdayAvg[bestDow] > 0 ? DAY_NAMES[bestDow] : null;

  const avgPerActiveDay = entries.length > 0 ? Math.round(totalTasks / entries.length) : 0;

  // Most productive week (ISO week sum)
  const weekSums: Record<string, { sum: number; start: string }> = {};
  for (const [dateStr, count] of entries) {
    const d = parseISO(dateStr);
    const wStart = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    if (!weekSums[wStart]) weekSums[wStart] = { sum: 0, start: wStart };
    weekSums[wStart].sum += count;
  }
  let bestWeekEntry: { sum: number; start: string } | null = null;
  for (const entry of Object.values(weekSums)) {
    if (!bestWeekEntry || entry.sum > bestWeekEntry.sum) bestWeekEntry = entry;
  }

  let mostProductiveWeek: string | null = null;
  if (bestWeekEntry) {
    const ws = parseISO(bestWeekEntry.start);
    const we = subDays(ws, -6);
    mostProductiveWeek = `${format(ws, 'MMM d')} – ${format(we, 'MMM d')}`;
  }

  // Summary — scoped to current week
  const todayStr = format(today, 'yyyy-MM-dd');
  const thisWeekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const thisWeekEntries = entries.filter(([d]) => d >= thisWeekStart && d <= todayStr);
  const thisWeekTotal = thisWeekEntries.reduce((sum, [, c]) => sum + c, 0);
  const thisWeekDays = thisWeekEntries.length;

  let summary = '';
  if (thisWeekTotal === 0) {
    summary = 'No activity recorded this week yet. Start checking off tasks!';
  } else {
    summary = `You completed ${thisWeekTotal} ${pluralize(thisWeekTotal, 'task', 'tasks')} across ${thisWeekDays} ${pluralize(thisWeekDays, 'day', 'days')} this week${bestWeekday ? `, best day is ${bestWeekday}` : ''}.`;
  }

  return { bestWeekday, avgPerActiveDay, mostProductiveWeek, summary };
}

/**
 * Get the date range boundaries for a given range key.
 * Returns { startDate, endDate } as 'yyyy-MM-dd' strings.
 * smartStart: if true and there's activity, begin at first active week + 1-2 empty buffer weeks
 */
export function getRangeBounds(
  rangeKey: RangeKey,
  dateMap: Record<string, number>,
  today: Date = new Date()
): { startDate: string; endDate: string; weeksCount: number } {
  const endDate = format(today, 'yyyy-MM-dd');
  const weeksMap: Record<RangeKey, number> = { '4w': 4, '12w': 12, '1y': 52 };
  const weeks = weeksMap[rangeKey];

  // Default start
  const defaultStart = format(subDays(today, weeks * 7 - 1), 'yyyy-MM-dd');

  // Smart start: find first active day
  const activeDates = Object.entries(dateMap)
    .filter(([, c]) => c > 0)
    .map(([d]) => d)
    .sort();

  if (activeDates.length === 0) {
    return { startDate: defaultStart, endDate, weeksCount: weeks };
  }

  const firstActive = activeDates[0];
  // 2 week buffer before first active
  const smartStart = format(
    startOfWeek(subDays(parseISO(firstActive), 14), { weekStartsOn: 1 }),
    'yyyy-MM-dd'
  );

  // Use smart start only if it would make the grid shorter (better UX for sparse data)
  const startDate = smartStart > defaultStart ? smartStart : defaultStart;

  // Recalculate actual week count
  const msInWeek = 7 * 24 * 60 * 60 * 1000;
  const startMs = parseISO(startDate).getTime();
  const endMs = parseISO(endDate).getTime();
  const actualWeeks = Math.ceil((endMs - startMs) / msInWeek) + 1;

  return { startDate, endDate, weeksCount: Math.min(actualWeeks, weeks) };
}
