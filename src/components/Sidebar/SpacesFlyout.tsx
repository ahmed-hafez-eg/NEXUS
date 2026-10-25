import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, FolderPlus, Compass, X } from 'lucide-react';
import { useSpaceStore } from '../../store/useSpaceStore';
import { useUIStore } from '../../store/useUIStore';
import { SpaceItem } from './SpaceItem';
import { SpaceFolderItem } from './SpaceFolderItem';
import { MoveItemModal } from './MoveItemModal';
import { Space, SpaceFolder } from '../../types';
import { showToast } from '../../store/useToastStore';

export const SpacesFlyout: React.FC = () => {
  const isSidebarCollapsed = useUIStore(s => s.isSidebarCollapsed);
  const setSidebarCollapsed = useUIStore(s => s.setSidebarCollapsed);
  const openHashtagSearch = useUIStore(s => s.openHashtagSearch);
  const hashtagSearchQuery = useUIStore(s => s.hashtagSearchQuery);
  const theme = useUIStore(s => s.theme);

  const spaces = useSpaceStore(s => s.spaces);
  const folders = useSpaceStore(s => s.folders);
  const activeSpaceId = useSpaceStore(s => s.activeSpaceId);
  const createSpace = useSpaceStore(s => s.createSpace);
  const createFolder = useSpaceStore(s => s.createFolder);

  const [isCreating, setIsCreating] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [moveModalItem, setMoveModalItem] = useState<
    { type: 'space'; space: Space } | { type: 'folder'; folder: SpaceFolder } | null
  >(null);

  const flyoutRef = useRef<HTMLDivElement>(null);

  // Close when pressing Escape key
  useEffect(() => {
    if (isSidebarCollapsed) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarCollapsed, setSidebarCollapsed]);

  if (isSidebarCollapsed) {
    return null;
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSpaceName.trim()) {
      await createSpace(newSpaceName.trim());
      showToast.success(`Created space "${newSpaceName.trim()}"`);
      setNewSpaceName('');
      setIsCreating(false);
    }
  };

  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      await createFolder(newFolderName.trim());
      showToast.success(`Created folder "${newFolderName.trim()}"`);
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const isDark = theme === 'dark';

  const flyoutClass = isDark
    ? 'bg-[#111111] border-[#262626] text-[#ededed] shadow-2xl'
    : 'bg-white border-slate-200 text-[#2B3674] shadow-2xl';

  const headerClass = isDark
    ? 'border-[#262626] text-[#a1a1a1]'
    : 'border-slate-100 text-[#707E94]';

  const newSpaceFormClass = isDark
    ? 'bg-[#1a1a1a] border-sky-500/50'
    : 'bg-sky-50/50 border-sky-400';

  const newSpaceInputClass = isDark
    ? 'text-[#ededed] placeholder-[#6b6b6b]'
    : 'text-[#2B3674] placeholder-[#a1a1a1]';

  const searchBarClass = isDark
    ? 'bg-[#1a1a1a] border-[#262626] hover:border-[#333333] text-[#ededed]'
    : 'bg-slate-50 border-slate-200 hover:border-[#1171EE]/50 text-[#2B3674]';

  const topLevelFolders = folders.filter(f => !f.parent_folder_id);
  const topLevelSpaces = spaces.filter(s => !s.folder_id);

  return (
    <>
      <div
        ref={flyoutRef}
        className={`absolute left-[78px] top-3 bottom-3 w-80 rounded-3xl border flex flex-col z-40 select-none animate-fade-in-up transition-colors duration-200 ${flyoutClass}`}
        role="dialog"
        aria-label="Workspaces & Folders"
      >
        {/* Flyout Header */}
        <div className={`p-4 pb-3 border-b ${headerClass}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <div className="w-5 h-5 rounded-lg bg-gradient-argon-primary flex items-center justify-center text-white shadow-argon-primary">
                <Compass size={12} strokeWidth={2.5} />
              </div>
              <span className={isDark ? 'text-white' : 'text-[#2B3674]'}>Workspaces</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsCreatingFolder(true)}
                className={`p-1.5 rounded-lg transition ${
                  isDark
                    ? 'text-amber-400 hover:text-white hover:bg-white/5'
                    : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                }`}
                title="Create New Folder"
                aria-label="Create New Folder"
              >
                <FolderPlus size={15} />
              </button>
              <button
                onClick={() => setIsCreating(true)}
                className={`p-1.5 rounded-lg transition ${
                  isDark
                    ? 'text-[#2CD9FF] hover:text-white hover:bg-white/5'
                    : 'text-[#1171EE] hover:text-sky-700 hover:bg-sky-50'
                }`}
                title="Create New Space"
                aria-label="Create New Space"
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition"
                title="Close"
                aria-label="Close Workspaces"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Search Bar Across All Spaces */}
          <div
            onClick={() => openHashtagSearch()}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs cursor-pointer transition-all duration-200 ${searchBarClass}`}
            title="Search hashtags across all spaces"
          >
            <Search size={13} className="text-[#2CD9FF] shrink-0" />
            <input
              type="text"
              placeholder="Filter #tags, spaces..."
              value={hashtagSearchQuery}
              onChange={e => openHashtagSearch(e.target.value)}
              onClick={e => {
                e.stopPropagation();
                openHashtagSearch();
              }}
              className="w-full bg-transparent border-none p-0 text-xs focus:outline-none placeholder-[#707E94] cursor-pointer"
            />
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/20">
              #
            </span>
          </div>
        </div>

        {/* Spaces & Folders List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Inline Create Folder Form */}
          {isCreatingFolder && (
            <form
              onSubmit={handleCreateFolderSubmit}
              className={`p-2.5 border rounded-2xl mb-2.5 animate-fade-in-up ${newSpaceFormClass}`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <FolderPlus size={13} className="text-amber-400 shrink-0" />
                <span className={`text-[11px] font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  New Folder
                </span>
              </div>
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                autoFocus
                className={`w-full bg-transparent border-none text-xs focus:outline-none mb-2 ${newSpaceInputClass}`}
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setNewFolderName('');
                    setIsCreatingFolder(false);
                  }}
                  className="px-2 py-1 text-[11px] text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="px-3 py-1 bg-gradient-argon-warning disabled:opacity-40 text-white text-[11px] font-bold rounded-lg transition shadow-argon-warning"
                >
                  Create
                </button>
              </div>
            </form>
          )}

          {/* Inline Create Space Form */}
          {isCreating && (
            <form
              onSubmit={handleCreateSubmit}
              className={`p-2.5 border rounded-2xl mb-2.5 animate-fade-in-up ${newSpaceFormClass}`}
            >
              <input
                type="text"
                value={newSpaceName}
                onChange={e => setNewSpaceName(e.target.value)}
                placeholder="Space name..."
                autoFocus
                className={`w-full bg-transparent border-none text-xs focus:outline-none mb-2 ${newSpaceInputClass}`}
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setNewSpaceName('');
                    setIsCreating(false);
                  }}
                  className="px-2 py-1 text-[11px] text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newSpaceName.trim()}
                  className="px-3 py-1 bg-gradient-argon-primary disabled:opacity-40 text-white text-[11px] font-bold rounded-lg transition shadow-argon-primary"
                >
                  Create
                </button>
              </div>
            </form>
          )}

          {/* Top-level Folders (Rendered Recursively) */}
          {topLevelFolders.map(folder => (
            <SpaceFolderItem
              key={folder.id}
              folder={folder}
              allFolders={folders}
              allSpaces={spaces}
              activeSpaceId={activeSpaceId}
              depth={0}
              onMoveSpace={space => setMoveModalItem({ type: 'space', space })}
              onMoveFolder={f => setMoveModalItem({ type: 'folder', folder: f })}
            />
          ))}

          {/* Top-level (Ungrouped) Spaces Label */}
          {topLevelSpaces.length > 0 && folders.length > 0 && (
            <div
              className={`text-[10px] font-bold uppercase tracking-wider px-2 pt-3 pb-1 ${
                isDark ? 'text-[#707E94]' : 'text-slate-400'
              }`}
            >
              Ungrouped Spaces
            </div>
          )}

          {/* Top-level Spaces (Unorganized) */}
          {topLevelSpaces.map(space => (
            <SpaceItem
              key={space.id}
              space={space}
              isActive={space.id === activeSpaceId}
              onMove={s => setMoveModalItem({ type: 'space', space: s })}
            />
          ))}

          {spaces.length === 0 && folders.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-400">
              No spaces yet. Create one to get started!
            </div>
          )}
        </div>
      </div>

      {/* Move Item Modal */}
      <MoveItemModal
        isOpen={Boolean(moveModalItem)}
        onClose={() => setMoveModalItem(null)}
        item={moveModalItem}
      />
    </>
  );
};
