/**
 * Unit tests for activityUtils.ts
 * Run with: node node_modules/jest/bin/jest.js src/utils/activityUtils.test.ts
 */

import {
  getColorLevel,
  getStreaks,
  getWeeklyStats,
  pluralize,
  getTrendBars,
} from './activityUtils';

// --- pluralize ---
describe('pluralize', () => {
  it('returns singular for 1', () => {
    expect(pluralize(1, 'task', 'tasks')).toBe('task');
    expect(pluralize(1, 'commit', 'commits')).toBe('commit');
  });
  it('returns plural for 0 and 2+', () => {
    expect(pluralize(0, 'task', 'tasks')).toBe('tasks');
    expect(pluralize(2, 'task', 'tasks')).toBe('tasks');
    expect(pluralize(100, 'day', 'days')).toBe('days');
  });
});

// --- getColorLevel ---
describe('getColorLevel (fixed mode)', () => {
  it('returns 0 for count 0', () => expect(getColorLevel(0)).toBe(0));
  it('returns 1 for count 1', () => expect(getColorLevel(1)).toBe(1));
  it('returns 1 for count 2', () => expect(getColorLevel(2)).toBe(1));
  it('returns 2 for count 3', () => expect(getColorLevel(3)).toBe(2));
  it('returns 2 for count 5', () => expect(getColorLevel(5)).toBe(2));
  it('returns 3 for count 6', () => expect(getColorLevel(6)).toBe(3));
  it('returns 3 for count 9', () => expect(getColorLevel(9)).toBe(3));
  it('returns 4 for count 10', () => expect(getColorLevel(10)).toBe(4));
  it('returns 4 for count 100', () => expect(getColorLevel(100)).toBe(4));
});

describe('getColorLevel (goal mode)', () => {
  const goal = 4;
  it('0 tasks → level 0', () => expect(getColorLevel(0, 'goal', goal)).toBe(0));
  it('1 task (25%) → level 1 (<50%)', () => expect(getColorLevel(1, 'goal', goal)).toBe(1));
  it('2 tasks (50%) → level 2', () => expect(getColorLevel(2, 'goal', goal)).toBe(2));
  it('3 tasks (75%) → level 2', () => expect(getColorLevel(3, 'goal', goal)).toBe(2));
  it('4 tasks (100%) → level 3', () => expect(getColorLevel(4, 'goal', goal)).toBe(3));
  it('5 tasks (125%) → level 4', () => expect(getColorLevel(5, 'goal', goal)).toBe(4));
});

// --- getStreaks ---
describe('getStreaks', () => {
  it('returns zero streak for empty map', () => {
    const result = getStreaks({}, new Date('2025-10-20'));
    expect(result.current).toBe(0);
    expect(result.longest).toBe(0);
    expect(result.daysSinceLast).toBe(Infinity);
  });

  it('counts single day as streak of 1', () => {
    const today = new Date('2025-10-20');
    const result = getStreaks({ '2025-10-20': 3 }, today);
    expect(result.current).toBe(1);
    expect(result.longest).toBe(1);
    expect(result.daysSinceLast).toBe(0);
  });

  it('counts 3 consecutive days', () => {
    const today = new Date('2025-10-20');
    const map = {
      '2025-10-18': 2,
      '2025-10-19': 5,
      '2025-10-20': 3,
    };
    const result = getStreaks(map, today);
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
    expect(result.daysSinceLast).toBe(0);
  });

  it('streak alive if today has no activity but yesterday did', () => {
    // Today is Oct 20 with no activity; yesterday had activity
    const today = new Date('2025-10-20');
    const map = {
      '2025-10-17': 2,
      '2025-10-18': 5,
      '2025-10-19': 3,
    };
    const result = getStreaks(map, today);
    // Streak should be 3 (Oct 17-19), today alive but not counted
    expect(result.current).toBe(3);
    expect(result.daysSinceLast).toBe(1);
  });

  it('detects gap in streak', () => {
    const today = new Date('2025-10-20');
    const map = {
      '2025-10-15': 4,
      '2025-10-16': 2,
      // gap: Oct 17 missing
      '2025-10-19': 3,
      '2025-10-20': 1,
    };
    const result = getStreaks(map, today);
    expect(result.current).toBe(2); // only Oct 19–20
    expect(result.longest).toBe(2); // Oct 15–16 also 2
  });

  it('longest streak spans non-recent days', () => {
    const today = new Date('2025-10-20');
    const map = {
      '2025-10-01': 1,
      '2025-10-02': 1,
      '2025-10-03': 1,
      '2025-10-04': 1,
      '2025-10-19': 1,
      '2025-10-20': 1,
    };
    const result = getStreaks(map, today);
    expect(result.longest).toBe(4);
    expect(result.current).toBe(2);
  });

  it('daysSinceLast returns days since last active', () => {
    const today = new Date('2025-10-20');
    const map = { '2025-10-15': 3 }; // 5 days ago
    const result = getStreaks(map, today);
    expect(result.daysSinceLast).toBe(5);
    expect(result.current).toBe(0);
  });
});

// --- getWeeklyStats ---
describe('getWeeklyStats', () => {
  it('handles zero last week gracefully (no division by zero)', () => {
    const today = new Date('2025-10-20'); // Monday
    const map = { '2025-10-20': 5 };
    const result = getWeeklyStats(map, today, 1);
    expect(result.lastWeek).toBe(0);
    expect(result.thisWeek).toBe(5);
    expect(result.direction).toBe('new');
    expect(isFinite(result.pct) || result.pct === Infinity).toBe(true);
  });

  it('computes correct percentage change', () => {
    const today = new Date('2025-10-20'); // Monday
    // Last week: Oct 13–19 → 8 tasks
    // This week: Oct 20– → 12 tasks
    const map: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date('2025-10-13');
      d.setDate(d.getDate() + i);
      map[d.toISOString().split('T')[0]] = i % 2 === 0 ? 2 : 1; // 2+1+2+1+2+1+2 = 11... adjust
    }
    map['2025-10-13'] = 1;
    map['2025-10-14'] = 1;
    map['2025-10-15'] = 2;
    map['2025-10-16'] = 1;
    map['2025-10-17'] = 1;
    map['2025-10-18'] = 1;
    map['2025-10-19'] = 1; // last week = 8
    map['2025-10-20'] = 12; // this week = 12
    const result = getWeeklyStats(map, today, 1);
    expect(result.lastWeek).toBe(8);
    expect(result.thisWeek).toBe(12);
    expect(result.pct).toBe(50);
    expect(result.direction).toBe('up');
  });

  it('direction is down when this week is less', () => {
    const today = new Date('2025-10-20');
    const map = {
      '2025-10-13': 5,
      '2025-10-20': 2,
    };
    const result = getWeeklyStats(map, today, 1);
    expect(result.direction).toBe('down');
  });
});

// --- getTrendBars ---
describe('getTrendBars', () => {
  it('returns N bars', () => {
    const bars = getTrendBars({}, 14, new Date('2025-10-20'));
    expect(bars).toHaveLength(14);
  });

  it('last bar is today', () => {
    const bars = getTrendBars({}, 14, new Date('2025-10-20'));
    expect(bars[bars.length - 1].isToday).toBe(true);
    expect(bars[bars.length - 1].dateStr).toBe('2025-10-20');
  });

  it('fills in count from map', () => {
    const map = { '2025-10-15': 7 };
    const bars = getTrendBars(map, 14, new Date('2025-10-20'));
    const found = bars.find(b => b.dateStr === '2025-10-15');
    expect(found?.count).toBe(7);
  });
});
