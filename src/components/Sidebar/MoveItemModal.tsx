import React, { useState } from 'react';
import { Folder, X, ArrowRight, Home } from 'lucide-react';
import { SpaceFolder, Space } from '../../types';
import { useSpaceStore } from '../../store/useSpaceStore';
import { useUIStore } from '../../store/useUIStore';
import { ArgonButton } from '../UI/ArgonButton';
import { showToast } from '../../store/useToastStore';

interface MoveItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: { type: 'space'; space: Space } | { type: 'folder'; folder: SpaceFolder } | null;
}

export const MoveItemModal: React.FC<MoveItemModalProps> = ({ isOpen, onClose, item }) => {
  const folders = useSpaceStore(s => s.folders);
  const moveSpaceToFolder = useSpaceStore(s => s.moveSpaceToFolder);
  const moveFolder = useSpaceStore(s => s.moveFolder);
  const theme = useUIStore(s => s.theme);
  const isDark = theme === 'dark';

  const [selectedTargetFolderId, setSelectedTargetFolderId] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const getDescendantFolderIds = (folderId: string): Set<string> => {
    const descendants = new Set<string>();
    const stack = [folderId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      descendants.add(current);
      const children = folders.filter(f => f.parent_folder_id === current);
      for (const child of children) {
        stack.push(child.id);
      }
    }
    return descendants;
  };

  const forbiddenFolderIds = item.type === 'folder' ? getDescendantFolderIds(item.folder.id) : new Set<string>();
  const currentParentId = item.type === 'space' ? item.space.folder_id || null : item.folder.parent_folder_id || null;

  const handleConfirm = async () => {
    if (item.type === 'space') {
      await moveSpaceToFolder(item.space.id, selectedTargetFolderId);
      showToast.success(`Moved space "${item.space.name}"`);
    } else {
      await moveFolder(item.folder.id, selectedTargetFolderId);
      showToast.success(`Moved folder "${item.folder.name}"`);
    }
    onClose();
  };

  const renderFolderOptions = (parentId: string | null = null, depth: number = 0): React.ReactNode => {
    const children = folders.filter(f => (f.parent_folder_id || null) === parentId);
    if (children.length === 0) return null;

    return (
      <div className="space-y-1">
        {children.map(folder => {
          const isForbidden = forbiddenFolderIds.has(folder.id);
          const isCurrentParent = currentParentId === folder.id;
          const isSelected = selectedTargetFolderId === folder.id;

          return (
            <div key={folder.id}>
              <button
                type="button"
                disabled={isForbidden}
                onClick={() => setSelectedTargetFolderId(folder.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                  isForbidden
                    ? 'opacity-30 cursor-not-allowed text-slate-500'
                    : isSelected
                    ? 'bg-gradient-argon-primary text-white shadow-argon-primary'
                    : isDark
                    ? 'text-slate-300 hover:bg-[#1a1a1a]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                style={{ paddingLeft: `${Math.max(12, 12 + depth * 16)}px` }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Folder size={14} className={isSelected ? 'text-white' : 'text-amber-400'} />
                  <span className="truncate">{folder.name}</span>
                  {isCurrentParent && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/20 text-white font-normal">
                      (Current)
                    </span>
                  )}
                  {isForbidden && (
                    <span className="text-[10px] text-rose-400 font-normal">
                      (Cannot move into self/child)
                    </span>
                  )}
                </div>
                {isSelected && <ArrowRight size={13} className="text-white shrink-0" />}
              </button>
              {renderFolderOptions(folder.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  const isRootSelected = selectedTargetFolderId === null;
  const isCurrentRoot = currentParentId === null;

  const modalBg = isDark
    ? 'bg-[#141414] border-[#262626] text-[#ededed] shadow-2xl'
    : 'bg-white border-slate-200 text-[#2B3674] shadow-2xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl p-5 overflow-hidden flex flex-col max-h-[85vh] animate-fade-in-up ${modalBg}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3.5 border-b ${isDark ? 'border-[#262626]' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Folder size={16} />
            </div>
            <h3 className="font-bold text-sm">
              Move {item.type === 'space' ? 'Space' : 'Folder'}:{' '}
              <span className="text-[#2CD9FF]">"{item.type === 'space' ? item.space.name : item.folder.name}"</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs mt-3 mb-3 text-[#a1a1a1]">
          Select a destination folder, or choose "Top Level (Root)" to un-group this item:
        </p>

        {/* Folder Picker List */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-72">
          <button
            type="button"
            onClick={() => setSelectedTargetFolderId(null)}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
              isRootSelected
                ? 'bg-gradient-argon-primary text-white shadow-argon-primary'
                : isDark
                ? 'text-slate-300 hover:bg-[#1a1a1a]'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Home size={14} className={isRootSelected ? 'text-white' : 'text-slate-400'} />
              <span>Top Level (Root / Ungrouped)</span>
              {isCurrentRoot && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/20 text-white font-normal">
                  (Current)
                </span>
              )}
            </div>
            {isRootSelected && <ArrowRight size={13} className="text-white shrink-0" />}
          </button>

          {renderFolderOptions(null, 0)}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-4 pt-3.5 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <ArgonButton
            variant="primary"
            size="sm"
            onClick={handleConfirm}
          >
            Move Here
          </ArgonButton>
        </div>
      </div>
    </div>
  );
};
