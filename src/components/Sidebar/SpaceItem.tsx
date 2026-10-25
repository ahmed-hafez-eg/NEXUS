import React, { useState } from 'react';
import { Space } from '../../types';
import { Layers, Trash2, Edit2, Check, X, FolderInput, Github } from 'lucide-react';
import { useSpaceStore } from '../../store/useSpaceStore';
import { useUIStore } from '../../store/useUIStore';
import { showToast } from '../../store/useToastStore';

interface SpaceItemProps {
  space: Space;
  isActive: boolean;
  onMove?: (space: Space) => void;
}

export const SpaceItem: React.FC<SpaceItemProps> = ({ space, isActive, onMove }) => {
  const setActiveSpaceId = useSpaceStore(s => s.setActiveSpaceId);
  const renameSpace = useSpaceStore(s => s.renameSpace);
  const deleteSpace = useSpaceStore(s => s.deleteSpace);
  const openConfirm = useUIStore(s => s.openConfirm);
  const theme = useUIStore(s => s.theme);
  const isDark = theme === 'dark';

  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(space.name);

  const handleSelect = () => {
    if (!isEditing) {
      setActiveSpaceId(space.id);
    }
  };

  const handleSaveRename = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (nameInput.trim() && nameInput.trim() !== space.name) {
      await renameSpace(space.id, nameInput.trim());
      showToast.success(`Renamed space to "${nameInput.trim()}"`);
    }
    setIsEditing(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    openConfirm(
      'Delete Space',
      `Delete space "${space.name}" and all its courses? This cannot be undone.`,
      async () => {
        await deleteSpace(space.id);
        showToast.warning(`Deleted space "${space.name}"`);
      }
    );
  };

  // Argon active vs inactive classes
  const activeClass = isDark
    ? 'bg-[#1a1a1a] text-[#ededed] font-bold border-l-4 border-[#2CD9FF] shadow-sm'
    : 'bg-gradient-to-r from-sky-500/15 to-blue-500/5 text-[#2B3674] font-bold border-l-4 border-[#1171EE] shadow-sm';

  const inactiveClass = isDark
    ? 'text-[#a1a1a1] hover:text-[#ededed] hover:bg-white/5 border-l-4 border-transparent font-medium'
    : 'text-[#707E94] hover:text-[#2B3674] hover:bg-slate-100 border-l-4 border-transparent font-medium';

  const inputClass = isDark
    ? 'bg-[#141414] border-[#2CD9FF] text-[#ededed]'
    : 'bg-white border-[#1171EE] text-[#2B3674]';

  const actionBtnClass = isDark
    ? 'text-[#a1a1a1] hover:text-white hover:bg-white/10'
    : 'text-[#707E94] hover:text-[#2B3674] hover:bg-slate-200';

  const deleteBtnClass = isDark
    ? 'text-[#a1a1a1] hover:text-rose-400 hover:bg-rose-500/15'
    : 'text-[#707E94] hover:text-rose-600 hover:bg-rose-50';

  return (
    <div
      onClick={handleSelect}
      className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all duration-150 cursor-pointer select-none ${
        isActive ? activeClass : inactiveClass
      }`}
    >
      {isEditing ? (
        <form onSubmit={handleSaveRename} className="flex items-center gap-1.5 flex-1 mr-1">
          <input
            type="text"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            autoFocus
            className={`border rounded-lg px-2 py-1 text-xs flex-1 focus:outline-none ${inputClass}`}
          />
          <button type="submit" className="p-1 text-sky-400 hover:text-sky-300">
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              setNameInput(space.name);
              setIsEditing(false);
            }}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X size={14} />
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              isActive
                ? 'bg-gradient-argon-primary text-white shadow-argon-primary'
                : isDark
                ? 'bg-[#1a1a1a] text-[#a1a1a1] group-hover:text-white'
                : 'bg-slate-100 text-[#707E94] group-hover:text-[#2B3674]'
            }`}
          >
            <Layers size={14} />
          </div>
          <span className="truncate" title={space.name}>{space.name}</span>
          {space.github_repo && (
            <span title={`Linked to GitHub: ${space.github_repo}`} className="shrink-0">
              <Github size={12} className="text-[#2CD9FF]" />
            </span>
          )}
        </div>
      )}

      {!isEditing && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onMove && (
            <button
              onClick={e => {
                e.stopPropagation();
                onMove(space);
              }}
              className={`p-1.5 rounded-lg transition ${actionBtnClass}`}
              title="Move Space to Folder..."
            >
              <FolderInput size={13} />
            </button>
          )}
          <button
            onClick={e => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className={`p-1.5 rounded-lg transition ${actionBtnClass}`}
            title="Rename Space"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={handleDelete}
            className={`p-1.5 rounded-lg transition ${deleteBtnClass}`}
            title="Delete Space"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
};
