import React, { useEffect } from 'react';
import { SideRail } from './components/Navigation/SideRail';
import { TopPillBar } from './components/Navigation/TopPillBar';
import { SpacesFlyout } from './components/Sidebar/SpacesFlyout';
import { CourseCanvas } from './components/Canvas/CourseCanvas';
import { AddCoursePanel } from './components/AddCoursePanel/AddCoursePanel';
import { CourseDetailPanel } from './components/CourseDetailPanel/CourseDetailPanel';
import { HeatmapModal } from './components/Heatmap/HeatmapModal';
import { BackupModal } from './components/Modals/BackupModal';
import { ConfirmModal } from './components/Modals/ConfirmModal';
import { SpaceLinkPicker } from './components/Canvas/SpaceLinkPicker';
import { MiniSpaceView } from './components/Canvas/MiniSpaceView';
import { FlagsModal } from './components/Flags/FlagsModal';
import { HashtagSearchModal } from './components/Hashtags/HashtagSearchModal';
import { FocusPickerModal } from './components/Focus/FocusPickerModal';
import { GitHubModal } from './components/GitHub/GitHubModal';
import { ArgonToastContainer } from './components/UI/ArgonToastContainer';
import { useSpaceStore } from './store/useSpaceStore';
import { useActivityStore } from './store/useActivityStore';
import { useUIStore } from './store/useUIStore';
import { useGitHubStore } from './store/useGitHubStore';

export const App: React.FC = () => {
  const loadSpaces = useSpaceStore(s => s.loadSpaces);
  const loadActivity = useActivityStore(s => s.loadActivity);
  const initGitHub = useGitHubStore(s => s.initGitHub);
  const initTheme = useUIStore(s => s.initTheme);
  const initPanelWidth = useUIStore(s => s.initPanelWidth);
  const theme = useUIStore(s => s.theme);

  useEffect(() => {
    // Apply the dark class immediately before any async init to avoid FOUC
    document.documentElement.classList.add('dark');

    // Then load saved preferences from DB
    initTheme();
    initPanelWidth();
    loadSpaces();
    loadActivity();
    initGitHub();
  }, [initTheme, initPanelWidth, loadSpaces, loadActivity, initGitHub]);

  const isDark = theme === 'dark';
  const bgClass = isDark ? 'bg-[#0a0a0a] text-[#ededed]' : 'bg-[#F4F7FE] text-[#2B3674]';

  return (
    <div className={`flex h-screen w-screen overflow-hidden select-none font-sans ${bgClass}`}>
      {/* Slim Icon-Only Left Side Rail */}
      <SideRail />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full overflow-hidden relative">
        {/* Floating Top Pill Bar */}
        <TopPillBar />

        {/* Canvas Area */}
        <main className="flex-1 h-full w-full relative overflow-hidden">
          <CourseCanvas />
        </main>

        {/* Floating Workspaces & Folders Flyout Drawer */}
        <SpacesFlyout />

        {/* Slide-in Panels */}
        <AddCoursePanel />
        <CourseDetailPanel />

        {/* Modals */}
        <HeatmapModal />
        <BackupModal />
        <ConfirmModal />
        <FlagsModal />
        <HashtagSearchModal />
        <FocusPickerModal />
        <GitHubModal />

        {/* Space Link Picker Modal */}
        <SpaceLinkPicker />

        {/* Mini Space View Modal */}
        <MiniSpaceView />

        {/* Toast Notifications */}
        <ArgonToastContainer />
      </div>
    </div>
  );
};

export default App;
