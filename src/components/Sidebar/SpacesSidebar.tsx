import React, { useState } from 'react';
import { Plus, Calendar, Database, Sun, Moon, Bookmark, Hash, Search, FolderPlus, Compass } from 'lucide-react';
import { useSpaceStore } from '../../store/useSpaceStore';
import { useUIStore } from '../../store/useUIStore';
import { SpaceItem } from './SpaceItem';
import { SpaceFolderItem } from './SpaceFolderItem';
import { MoveItemModal } from './MoveItemModal';
import { Space, SpaceFolder } from '../../types';
import { showToast } from '../../store/useToastStore';

export const SpacesSidebar: React.FC = () => {
  const isSidebarCollapsed = useUIStore(s => s.isSidebarCollapsed);
  const openHeatmap = useUIStore(s => s.openHeatmap);
  const openBackup = useUIStore(s => s.openBackup);
  const openFlags = useUIStore(s => s.openFlags);
  const openHashtagSearch = useUIStore(s => s.openHashtagSearch);
  const hashtagSearchQuery = useUIStore(s => s.hashtagSearchQuery);
  const theme = useUIStore(s => s.theme);
  const toggleTheme = useUIStore(s => s.toggleTheme);

  const spaces = useSpaceStore(s => s.spaces);
  const folders = useSpaceStore(s => s.folders);
  const activeSpaceId = useSpaceStore(s => s.activeSpaceId);
  const createSpace = useSpaceStore(s => s.createSpace);
  const createFolder = useSpaceStore(s => s.createFolder);

  const [isCreating, setIsCreating] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Move Modal State
  const [moveModalItem, setMoveModalItem] = useState<
    { type: 'space'; space: Space } | { type: 'folder'; folder: SpaceFolder } | null
  >(null);

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

  if (isSidebarCollapsed) {
    return null;
  }

  const isDark = theme === 'dark';

  const sidebarClass = isDark
    ? 'bg-[#111111] border-[#262626]'
    : 'bg-white border-slate-200 shadow-sm';

  const headerClass = isDark
    ? 'border-[#262626] text-[#a1a1a1]'
    : 'border-slate-100 text-[#707E94]';

  const footerClass = isDark
    ? 'border-[#262626] bg-[#0a0a0a]'
    : 'border-slate-100 bg-slate-50';

  const footerBtnClass = isDark
    ? 'text-[#a1a1a1] hover:text-[#ededed] hover:bg-white/5 active:bg-white/10'
    : 'text-[#707E94] hover:text-[#2B3674] hover:bg-slate-200 active:bg-slate-300';

  const newSpaceFormClass = isDark
    ? 'bg-[#1a1a1a] border-sky-500/50'
    : 'bg-sky-50/50 border-sky-400';

  const newSpaceInputClass = isDark
    ? 'text-[#ededed] placeholder-[#6b6b6b]'
    : 'text-[#2B3674] placeholder-[#a1a1a1]';

  const newSpaceDashedBtn = isDark
    ? 'border-[#333333] hover:border-sky-400 text-[#a1a1a1] hover:text-[#ededed] hover:bg-white/5'
    : 'border-slate-300 hover:border-sky-500 text-[#707E94] hover:text-[#2B3674] hover:bg-slate-50';

  const searchBarClass = isDark
    ? 'bg-[#1a1a1a] border-[#262626] hover:border-[#333333] text-[#ededed]'
    : 'bg-slate-50 border-slate-200 hover:border-[#1171EE]/50 text-[#2B3674]';

  const topLevelFolders = folders.filter(f => !f.parent_folder_id);
  const topLevelSpaces = spaces.filter(s => !s.folder_id);

  return (
    <>
      <aside
        className={`w-72 ${sidebarClass} border-r flex flex-col h-full shrink-0 select-none z-20 transition-all duration-200`}
      >
        {/* Sidebar Header */}
        <div className={`p-4 pb-3 border-b ${headerClass}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <div className="w-5 h-5 rounded-md bg-gradient-argon-primary flex items-center justify-center text-white shadow-argon-primary">
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
                title="Create New Folder at Top Level"
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
                title="Create New Space at Top Level"
              >
                <Plus size={16} strokeWidth={2.5} />
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

          {/* Top-level Spaces List */}
          {spaces.length === 0 && !isCreating ? (
            <div className="text-center py-8 text-xs text-[#707E94]">
              No spaces found. Click "+" to create one.
            </div>
          ) : (
            <div className="space-y-1">
              {topLevelSpaces.map(space => (
                <SpaceItem
                  key={space.id}
                  space={space}
                  isActive={space.id === activeSpaceId}
                  onMove={s => setMoveModalItem({ type: 'space', space: s })}
                />
              ))}
            </div>
          )}

          {/* Big + New Space Button at bottom of list */}
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className={`w-full mt-3 py-2 px-3 border border-dashed rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${newSpaceDashedBtn}`}
            >
              <Plus size={14} strokeWidth={2.5} /> New Space
            </button>
          )}
        </div>

        {/* Sidebar Footer Quick Nav */}
        <div className={`p-3 border-t ${footerClass} space-y-1`}>
          <button
            onClick={() => openHashtagSearch()}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition text-left ${footerBtnClass}`}
          >
            <div className="w-5 h-5 rounded-md bg-sky-500/15 flex items-center justify-center text-[#2CD9FF]">
              <Hash size={13} strokeWidth={2.5} />
            </div>
            <span>Hashtag Search</span>
          </button>
          <button
            onClick={openFlags}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition text-left ${footerBtnClass}`}
          >
            <div className="w-5 h-5 rounded-md bg-amber-500/15 flex items-center justify-center text-amber-400">
              <Bookmark size={13} className="fill-amber-400" />
            </div>
            <span>Flagged Sub-Tasks</span>
          </button>
          <button
            onClick={openHeatmap}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition text-left ${footerBtnClass}`}
          >
            <div className="w-5 h-5 rounded-md bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <Calendar size={13} />
            </div>
            <span>Activity Heatmap</span>
          </button>
          <button
            onClick={openBackup}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition text-left ${footerBtnClass}`}
          >
            <div className="w-5 h-5 rounded-md bg-blue-500/15 flex items-center justify-center text-blue-400">
              <Database size={13} />
            </div>
            <span>Backup &amp; Export</span>
          </button>
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition text-left ${footerBtnClass}`}
          >
            <div className="w-5 h-5 rounded-md bg-amber-500/15 flex items-center justify-center text-amber-400">
              {isDark ? <Sun size={13} /> : <Moon size={13} />}
            </div>
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </aside>

      {/* Move Item Modal */}
      <MoveItemModal
        isOpen={Boolean(moveModalItem)}
        onClose={() => setMoveModalItem(null)}
        item={moveModalItem}
      />
    </>
  );
};
