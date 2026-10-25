import { create } from 'zustand';
import {
  startDeviceFlow,
  pollDeviceToken,
  loadStoredToken,
  saveStoredToken,
  clearStoredToken,
  DeviceCodeResponse,
} from '../services/githubAuth';
import {
  getAuthenticatedUser,
  fetchRepoInfo,
  fetchUserContributions,
  GitHubUser,
} from '../services/githubApi';
import { GitHubRepoInfo } from '../types';
import * as db from '../db/client';

export type HeatmapSource = 'app' | 'github' | 'combined';

interface GitHubState {
  token: string;
  user: GitHubUser | null;
  isInitializing: boolean;
  isConnecting: boolean;
  deviceCodeInfo: DeviceCodeResponse | null;
  authError: string | null;

  // Heatmap source toggle
  heatmapSource: HeatmapSource;
  githubContributions: Record<string, number>;
  contributionsLastFetched: string | null;

  // Cache for repo details by repo full name
  repoCache: Record<string, GitHubRepoInfo>;

  // Actions
  initGitHub: () => Promise<void>;
  startDeviceAuth: () => Promise<void>;
  cancelDeviceAuth: () => void;
  connectWithManualToken: (token: string) => Promise<boolean>;
  disconnect: () => Promise<void>;

  setHeatmapSource: (source: HeatmapSource) => void;
  loadContributions: () => Promise<void>;
  getOrFetchRepoInfo: (repo: string) => Promise<GitHubRepoInfo | null>;
}

let pollTimer: any = null;

export const useGitHubStore = create<GitHubState>((set, get) => ({
  token: '',
  user: null,
  isInitializing: true,
  isConnecting: false,
  deviceCodeInfo: null,
  authError: null,

  heatmapSource: 'app',
  githubContributions: {},
  contributionsLastFetched: null,
  repoCache: {},

  initGitHub: async () => {
    try {
      set({ isInitializing: true });
      const savedToken = await loadStoredToken();
      const savedSource = (await db.getSetting('heatmap_source', 'app')) as HeatmapSource;

      // Load cached contributions from DB
      const cachedContribs = await db.getCachedContributions();
      const contribMap: Record<string, number> = {};
      cachedContribs.forEach(c => {
        contribMap[c.date] = c.count;
      });

      if (savedToken) {
        try {
          const user = await getAuthenticatedUser(savedToken);
          set({
            token: savedToken,
            user,
            heatmapSource: savedSource,
            githubContributions: contribMap,
            isInitializing: false,
          });
          // Refresh contributions in background if we have a user
          get().loadContributions().catch(console.error);
          return;
        } catch (err) {
          console.warn('Stored GitHub token invalid or expired:', err);
          await clearStoredToken();
        }
      }

      set({
        token: '',
        user: null,
        heatmapSource: 'app', // default to app if no token
        githubContributions: contribMap,
        isInitializing: false,
      });
    } catch (e) {
      console.error('Error initializing GitHub store:', e);
      set({ isInitializing: false });
    }
  },

  startDeviceAuth: async () => {
    if (pollTimer) clearInterval(pollTimer);
    set({ isConnecting: true, authError: null, deviceCodeInfo: null });

    const res = await startDeviceFlow();
    if (res.error) {
      let msg = res.error_description || res.error;
      if (res.error === 'device_flow_disabled') {
        msg = 'Device Flow is disabled for this OAuth App in GitHub Developer Settings. You can enable it or use a Personal Access Token below.';
      }
      set({ authError: msg, isConnecting: false });
      return;
    }

    set({ deviceCodeInfo: res });

    const intervalMs = Math.max(res.interval || 5, 5) * 1000;
    const expiresAt = Date.now() + (res.expires_in || 900) * 1000;

    pollTimer = setInterval(async () => {
      if (Date.now() > expiresAt) {
        clearInterval(pollTimer);
        pollTimer = null;
        set({
          isConnecting: false,
          authError: 'Device code expired. Please click Connect to try again.',
        });
        return;
      }

      if (!res.device_code) return;
      const pollRes = await pollDeviceToken(res.device_code);

      if (pollRes.access_token) {
        clearInterval(pollTimer);
        pollTimer = null;
        const token = pollRes.access_token;
        await saveStoredToken(token);

        try {
          const user = await getAuthenticatedUser(token);
          set({
            token,
            user,
            isConnecting: false,
            deviceCodeInfo: null,
            authError: null,
          });
          get().loadContributions();
        } catch (e: any) {
          set({
            isConnecting: false,
            authError: 'Successfully authenticated but failed to fetch user info: ' + e.message,
          });
        }
      } else if (pollRes.error && pollRes.error !== 'authorization_pending' && pollRes.error !== 'slow_down') {
        clearInterval(pollTimer);
        pollTimer = null;
        set({
          isConnecting: false,
          authError: pollRes.error_description || pollRes.error,
        });
      }
    }, intervalMs);
  },

  cancelDeviceAuth: () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    set({ isConnecting: false, deviceCodeInfo: null, authError: null });
  },

  connectWithManualToken: async (rawToken: string) => {
    const token = rawToken.trim();
    if (!token) return false;
    set({ isConnecting: true, authError: null });

    try {
      const user = await getAuthenticatedUser(token);
      await saveStoredToken(token);
      set({
        token,
        user,
        isConnecting: false,
        authError: null,
      });
      get().loadContributions();
      return true;
    } catch (e: any) {
      set({
        isConnecting: false,
        authError: 'Invalid token: ' + (e?.message || 'Could not verify token with GitHub'),
      });
      return false;
    }
  },

  disconnect: async () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    await clearStoredToken();
    db.setSetting('heatmap_source', 'app').catch(console.error);

    set({
      token: '',
      user: null,
      heatmapSource: 'app',
      isConnecting: false,
      deviceCodeInfo: null,
      authError: null,
    });
  },

  setHeatmapSource: (source: HeatmapSource) => {
    set({ heatmapSource: source });
    db.setSetting('heatmap_source', source).catch(console.error);
  },

  loadContributions: async () => {
    const { token, user } = get();
    if (!token || !user?.login) return;

    try {
      const contribMap = await fetchUserContributions(user.login, token);
      set({
        githubContributions: contribMap,
        contributionsLastFetched: new Date().toISOString(),
      });

      // Save to SQLite cache
      const list = Object.entries(contribMap).map(([date, count]) => ({ date, count }));
      await db.setCachedContributions(list);
    } catch (e) {
      console.error('Error refreshing GitHub contributions:', e);
    }
  },

  getOrFetchRepoInfo: async (repo: string) => {
    const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
    if (!cleanRepo) return null;

    const { repoCache, token } = get();
    if (repoCache[cleanRepo]) {
      return repoCache[cleanRepo];
    }

    // Check DB cache
    const dbCached = await db.getCachedRepoInfo(cleanRepo);
    if (dbCached) {
      set(state => ({ repoCache: { ...state.repoCache, [cleanRepo]: dbCached } }));
      return dbCached;
    }

    // Fetch live from GitHub
    try {
      const live = await fetchRepoInfo(cleanRepo, token || undefined);
      await db.setCachedRepoInfo(cleanRepo, live);
      set(state => ({ repoCache: { ...state.repoCache, [cleanRepo]: live } }));
      return live;
    } catch (e) {
      console.error(`Failed to fetch repo info for ${cleanRepo}:`, e);
      return null;
    }
  },
}));
