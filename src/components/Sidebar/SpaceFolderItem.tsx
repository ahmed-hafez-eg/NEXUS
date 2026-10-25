import React, { useState } from 'react';
import {
  ChevronRight,
  Folder,
  FolderOpen,
  Trash2,
  Edit2,
  Check,
  X,
  Plus,
  FolderPlus,
  Layers,
  FolderInput,
} from 'lucide-react';
import { SpaceFolder, Space } from '../../types';
import { useSpaceStore } from '../../store/useSpaceStore';
import { useUIStore } from '../../store/useUIStore';
import { SpaceItem } from './SpaceItem';
import { showToast } from '../../store/useToastStore';

interface SpaceFolderItemProps {
  folder: SpaceFolder;
  allFolders: SpaceFolder[];
  allSpaces: Space[];
  activeSpaceId: string | null;
  depth?: number;
  onMoveSpace?: (space: Space) => void;
  onMoveFolder?: (folder: SpaceFolder) => void;
}

export const SpaceFolderItem: React.FC<SpaceFolderItemProps> = ({
  folder,
  allFolders,
  allSpaces,
  activeSpaceId,
  depth = 0,
  onMoveSpace,
  onMoveFolder,
}) => {
  const renameFolder = useSpaceStore(s => s.renameFolder);
  const deleteFolder = useSpaceStore(s => s.deleteFolder);
  const createSpace = useSpaceStore(s => s.createSpace);
  const createFolder = useSpaceStore(s => s.createFolder);
  const openConfirm = useUIStore(s => s.openConfirm);
  const theme = useUIStore(s => s.theme);
  const isDark = theme === 'dark';

  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(folder.name);

  // "+" Menu state (popover with "New Space" / "New Folder")
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [isCreatingSubFolder, setIsCreatingSubFolder] = useState(false);
  const [newSubFolderName, setNewSubFolderName] = useState('');

  // Immediate child spaces and immediate child folders
  const childSpaces = allSpaces.filter(s => s.folder_id === folder.id);
  const childFolders = allFolders.filter(f => f.parent_folder_id === folder.id);
  const totalDirectItems = childSpaces.length + childFolders.length;

  const handleSaveRename = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (nameInput.trim() && nameInput.trim() !== folder.name) {
      await renameFolder(folder.id, nameInput.trim());
      showToast.success(`Renamed folder to "${nameInput.trim()}"`);
    }
    setIsEditing(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    openConfirm(
      'Delete Folder',
      `Delete folder "${folder.name}"? Spaces and sub-folders inside will be moved to the parent level.`,
      async () => {
        await deleteFolder(folder.id);
        showToast.warning(`Deleted folder "${folder.name}"`);
      }
    );
  };

  const handleCreateSpaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSpaceName.trim()) {
      await createSpace(newSpaceName.trim(), folder.id);
      showToast.success(`Created space "${newSpaceName.trim()}" in ${folder.name}`);
      setNewSpaceName('');
      setIsCreatingSpace(false);
      setIsExpanded(true);
    }
  };

  const handleCreateSubFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubFolderName.trim()) {
      await createFolder(newSubFolderName.trim(), folder.id);
      showToast.success(`Created folder "${newSubFolderName.trim()}" in ${folder.name}`);
      setNewSubFolderName('');
      setIsCreatingSubFolder(false);
      setIsExpanded(true);
    }
  };

  const folderRowClass = isDark
    ? 'text-[#a1a1a1] hover:text-[#ededed] hover:bg-white/5 border border-transparent'
    : 'text-[#707E94] hover:text-[#2B3674] hover:bg-slate-100 border border-transparent';

  const inputClass = isDark
    ? 'bg-[#141414] border-[#2CD9FF] text-[#ededed]'
    : 'bg-white border-[#1171EE] text-[#2B3674]';

  const actionBtnClass = isDark
    ? 'text-[#a1a1a1] hover:text-[#ededed] hover:bg-white/10'
    : 'text-[#707E94] hover:text-[#2B3674] hover:bg-slate-200';

  const plusBtnClass = isDark
    ? 'text-[#2CD9FF] hover:text-[#ededed] hover:bg-[#1a1a1a]'
    : 'text-[#1171EE] hover:text-sky-700 hover:bg-slate-100';

  const deleteBtnClass = isDark
    ? 'text-[#a1a1a1] hover:text-rose-400 hover:bg-rose-500/15'
    : 'text-[#707E94] hover:text-rose-600 hover:bg-rose-50';

  const menuCardClass = isDark
    ? 'bg-[#141414] border-[#262626] shadow-2xl text-[#ededed]'
    : 'bg-white border-slate-200 shadow-2xl text-[#2B3674]';

  return (
    <div className="relative">
      {/* Folder Header Row */}
      <div
        className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer select-none ${folderRowClass}`}
        style={{ paddingLeft: `${Math.max(10, 10 + depth * 14)}px` }}
      >
        {isEditing ? (
          <form
            onSubmit={handleSaveRename}
            className="flex items-center gap-1.5 flex-1 mr-1"
            onClick={e => e.stopPropagation()}
          >
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              autoFocus
              className={`border rounded-lg px-2 py-0.5 text-xs flex-1 focus:outline-none ${inputClass}`}
            />
            <button type="submit" className="p-1 text-sky-400 hover:text-sky-300">
              <Check size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                setNameInput(folder.name);
                setIsEditing(false);
              }}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X size={13} />
            </button>
          </form>
        ) : (
          <div
            className="flex items-center gap-2 flex-1 min-w-0"
            onClick={() => setIsExpanded(e => !e)}
          >
            <ChevronRight
              size={13}
              className={`shrink-0 transition-transform text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}
            />
            <div className="w-5 h-5 rounded-md bg-amber-500/15 flex items-center justify-center shrink-0 text-amber-400">
              {isExpanded ? (
                <FolderOpen size={12} className="shrink-0" />
              ) : (
                <Folder size={12} className="shrink-0" />
              )}
            </div>
            <span className="truncate uppercase tracking-wider text-[11px] font-bold" title={folder.name}>{folder.name}</span>
            {totalDirectItems > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isDark ? 'bg-[#1a1a1a] text-[#a1a1a1]' : 'bg-slate-200 text-[#707E94]'
                }`}
              >
                {totalDirectItems}
              </span>
            )}
          </div>
        )}

        {!isEditing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Explicit "+" Button for Folder actions */}
            <div className="relative">
              <button
                onClick={e => {
                  e.stopPropagation();
                  setShowAddMenu(prev => !prev);
                }}
                className={`p-1 rounded-lg transition ${plusBtnClass}`}
                title="Add to this folder..."
              >
                <Plus size={13} strokeWidth={2.5} />
              </button>

              {/* Popover menu for New Space / New Folder */}
              {showAddMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={e => {
                      e.stopPropagation();
                      setShowAddMenu(false);
                    }}
                  />
                  <div
                    className={`absolute right-0 top-full mt-1.5 w-36 py-1.5 border rounded-2xl z-40 animate-fade-in-up text-xs font-semibold ${menuCardClass}`}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMenu(false);
                        setIsCreatingSpace(true);
                        setIsCreatingSubFolder(false);
                        setIsExpanded(true);
                      }}
                      className={`w-full px-3 py-1.5 flex items-center gap-2 text-left transition ${
                        isDark ? 'hover:bg-[#1a1a1a] text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Layers size={13} className="text-sky-400 shrink-0" />
                      <span>New Space</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMenu(false);
                        setIsCreatingSubFolder(true);
                        setIsCreatingSpace(false);
                        setIsExpanded(true);
                      }}
                      className={`w-full px-3 py-1.5 flex items-center gap-2 text-left transition ${
                        isDark ? 'hover:bg-[#1a1a1a] text-slate-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <FolderPlus size={13} className="text-amber-400 shrink-0" />
                      <span>New Folder</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Move Folder Action */}
            {onMoveFolder && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onMoveFolder(folder);
                }}
                className={`p-1 rounded-lg transition ${actionBtnClass}`}
                title="Move Folder..."
              >
                <FolderInput size={12} />
              </button>
            )}

            {/* Rename Folder */}
            <button
              onClick={e => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className={`p-1 rounded-lg transition ${actionBtnClass}`}
              title="Rename Folder"
            >
              <Edit2 size={11} />
            </button>

            {/* Delete Folder */}
            <button
              onClick={handleDelete}
              className={`p-1 rounded-lg transition ${deleteBtnClass}`}
              title="Delete Folder"
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Inline Create Space Form inside this folder */}
      {isCreatingSpace && (
        <form
          onSubmit={handleCreateSpaceSubmit}
          className={`p-2.5 border rounded-2xl my-1.5 ml-4 animate-fade-in-up ${
            isDark ? 'bg-[#0a0a0a] border-sky-500/50' : 'bg-sky-50 border-sky-400'
          }`}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Layers size={12} className="text-sky-400 shrink-0" />
            <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              New Space in "{folder.name}"
            </span>
          </div>
          <input
            type="text"
            value={newSpaceName}
            onChange={e => setNewSpaceName(e.target.value)}
            placeholder="Space name..."
            autoFocus
            className={`w-full bg-transparent border-none text-xs placeholder-slate-500 focus:outline-none mb-2 ${
              isDark ? 'text-white' : 'text-[#2B3674]'
            }`}
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => {
                setNewSpaceName('');
                setIsCreatingSpace(false);
              }}
              className="px-2 py-0.5 text-[10px] font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newSpaceName.trim()}
              className="px-2.5 py-1 bg-gradient-argon-primary disabled:opacity-40 text-white text-[10px] font-bold rounded-lg transition shadow-argon-primary"
            >
              Create
            </button>
          </div>
        </form>
      )}

      {/* Inline Create Sub-Folder Form inside this folder */}
      {isCreatingSubFolder && (
        <form
          onSubmit={handleCreateSubFolderSubmit}
          className={`p-2.5 border rounded-2xl my-1.5 ml-4 animate-fade-in-up ${
            isDark ? 'bg-[#0a0a0a] border-amber-500/50' : 'bg-amber-50/50 border-amber-400'
          }`}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <FolderPlus size={12} className="text-amber-400 shrink-0" />
            <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              New Sub-Folder in "{folder.name}"
            </span>
          </div>
          <input
            type="text"
            value={newSubFolderName}
            onChange={e => setNewSubFolderName(e.target.value)}
            placeholder="Sub-folder name..."
            autoFocus
            className={`w-full bg-transparent border-none text-xs placeholder-slate-500 focus:outline-none mb-2 ${
              isDark ? 'text-white' : 'text-[#2B3674]'
            }`}
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => {
                setNewSubFolderName('');
                setIsCreatingSubFolder(false);
              }}
              className="px-2 py-0.5 text-[10px] font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newSubFolderName.trim()}
              className="px-2.5 py-1 bg-gradient-argon-warning disabled:opacity-40 text-white text-[10px] font-bold rounded-lg transition shadow-argon-warning"
            >
              Create
            </button>
          </div>
        </form>
      )}

      {/* Expanded Content: Sub-folders and Child Spaces */}
      {isExpanded && (
        <div
          className={`ml-2 mt-0.5 space-y-0.5 border-l border-dashed pl-2 rounded-r-lg transition ${
            isDark ? 'border-white/10' : 'border-slate-300'
          }`}
        >
          {/* Render Nested Sub-Folders Recursively */}
          {childFolders.map(subFolder => (
            <SpaceFolderItem
              key={subFolder.id}
              folder={subFolder}
              allFolders={allFolders}
              allSpaces={allSpaces}
              activeSpaceId={activeSpaceId}
              depth={depth + 1}
              onMoveSpace={onMoveSpace}
              onMoveFolder={onMoveFolder}
            />
          ))}

          {/* Render Child Spaces */}
          {childSpaces.map(space => (
            <SpaceItem
              key={space.id}
              space={space}
              isActive={space.id === activeSpaceId}
              onMove={onMoveSpace}
            />
          ))}

          {/* Empty Folder State */}
          {totalDirectItems === 0 && !isCreatingSpace && !isCreatingSubFolder && (
            <div className="py-2 px-3 text-[10px] italic text-slate-500">
              Empty folder. Click "+" above to add items.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
