import { create } from 'zustand';
import { ActivityLog } from '../types';
import * as db from '../db/client';
import { subYears, parseISO, isAfter } from 'date-fns';

interface ActivityState {
  activityLogs: ActivityLog[];
  activityMap: Record<string, number>; // 'YYYY-MM-DD' -> count
  totalLastYear: number;
  isLoading: boolean;
  loadActivity: () => Promise<void>;
}

export const useActivityStore = create<ActivityState>((set) => ({
  activityLogs: [],
  activityMap: {},
  totalLastYear: 0,
  isLoading: false,

  loadActivity: async () => {
    try {
      const logs = await db.getActivityLogs();
      const map: Record<string, number> = {};
      const oneYearAgo = subYears(new Date(), 1);
      let total = 0;

      for (const log of logs) {
        map[log.date] = log.count;
        try {
          const d = parseISO(log.date);
          if (isAfter(d, oneYearAgo) || log.date === oneYearAgo.toISOString().split('T')[0]) {
            total += log.count;
          }
        } catch {
          // Ignore invalid date strings
        }
      }

      set({
        activityLogs: logs,
        activityMap: map,
        totalLastYear: total,
      });
    } catch (err) {
      console.error('Failed to load activity logs', err);
    }
  },
}));
