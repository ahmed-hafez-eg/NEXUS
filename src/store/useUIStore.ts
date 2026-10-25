import { create } from 'zustand';
import * as db from '../db/client';

export type ActivePanel = 'none' | 'add_course' | 'course_detail' | 'heatmap' | 'backup' | 'space_link_picker' | 'flags' | 'hashtag_search' | 'focus_picker';
export type Theme = 'dark' | 'light';

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
}

interface UIState {
  isSidebarCollapsed: boolean;
  activePanel: ActivePanel;
  confirmModal: ConfirmModalState;

  // Theme
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  initTheme: () => Promise<void>;

  // Panel Width (Resizable Node Detail Panel)
  panelWidth: number;
  setPanelWidth: (width: number) => void;
  initPanelWidth: () => Promise<void>;

  // Mini Space View (embedded linked-space canvas)
  activeMiniSpaceId: string | null;
  openMiniSpace: (spaceId: string) => void;
  closeMiniSpace: () => void;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActivePanel: (panel: ActivePanel) => void;
  openAddCourse: () => void;
  openCourseDetail: () => void;
  openHeatmap: () => void;
  openBackup: () => void;
  openSpaceLinkPicker: () => void;
  openFocusPicker: () => void;
  hashtagSearchQuery: string;
  openFlags: () => void;
  openHashtagSearch: (initialQuery?: string) => void;
  setHashtagSearchQuery: (query: string) => void;
  closePanel: () => void;

  openConfirm: (title: string, message: string, onConfirm: () => void, confirmText?: string) => void;
  closeConfirm: () => void;
}

function applyTheme(theme: Theme) {
  if (theme === 'light') {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }
}

export const useUIStore = create<UIState>((set, get) => ({
  isSidebarCollapsed: true,
  activePanel: 'none',
  confirmModal: {
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Delete',
    onConfirm: () => {},
  },

  theme: 'dark',
  panelWidth: 384,
  activeMiniSpaceId: null,
  hashtagSearchQuery: '',

  initTheme: async () => {
    const savedTheme = (await db.getSetting('theme', 'dark')) as Theme;
    applyTheme(savedTheme);
    set({ theme: savedTheme });
  },

  initPanelWidth: async () => {
    try {
      const val = await db.getSetting('panel_width', '384');
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 300 && num <= 1000) {
        set({ panelWidth: num });
      }
    } catch (e) {
      console.error('Failed to load panel width', e);
    }
  },

  setPanelWidth: (width: number) => {
    set({ panelWidth: width });
    db.setSetting('panel_width', width.toString()).catch(console.error);
  },

  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    set({ theme: next });
    db.setSetting('theme', next).catch(console.error);
  },

  setTheme: (theme: Theme) => {
    applyTheme(theme);
    set({ theme });
    db.setSetting('theme', theme).catch(console.error);
  },

  openMiniSpace: (spaceId: string) => set({ activeMiniSpaceId: spaceId }),
  closeMiniSpace: () => set({ activeMiniSpaceId: null }),

  toggleSidebar: () => set(state => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  setActivePanel: (panel) => set({ activePanel: panel }),
  openAddCourse: () => set({ activePanel: 'add_course' }),
  openCourseDetail: () => set({ activePanel: 'course_detail' }),
  openHeatmap: () => set({ activePanel: 'heatmap' }),
  openBackup: () => set({ activePanel: 'backup' }),
  openSpaceLinkPicker: () => set({ activePanel: 'space_link_picker' }),
  openFocusPicker: () => set({ activePanel: 'focus_picker' }),
  openFlags: () => set({ activePanel: 'flags' }),
  openHashtagSearch: (initialQuery?: string) =>
    set({
      activePanel: 'hashtag_search',
      hashtagSearchQuery: initialQuery !== undefined ? initialQuery : get().hashtagSearchQuery,
    }),
  setHashtagSearchQuery: (query: string) => set({ hashtagSearchQuery: query }),
  closePanel: () => set({ activePanel: 'none' }),

  openConfirm: (title, message, onConfirm, confirmText = 'Delete') =>
    set({
      confirmModal: {
        isOpen: true,
        title,
        message,
        confirmText,
        onConfirm,
      },
    }),

  closeConfirm: () =>
    set(state => ({
      confirmModal: { ...state.confirmModal, isOpen: false },
    })),
}));
