import { create } from 'zustand';
import { Space, SpaceFolder } from '../types';
import * as db from '../db/client';
import { useCanvasStore } from './useCanvasStore';

interface SpaceState {
  spaces: Space[];
  folders: SpaceFolder[];
  activeSpaceId: string | null;
  isLoading: boolean;
  loadSpaces: () => Promise<void>;
  setActiveSpaceId: (id: string) => void;
  createSpace: (name: string, folderId?: string | null) => Promise<Space>;
  renameSpace: (id: string, name: string) => Promise<void>;
  deleteSpace: (id: string) => Promise<void>;
  setSpaceFocus: (spaceId: string, nodeId: string | null) => Promise<void>;
  updateSpaceGithubRepo: (id: string, repo: string | null) => Promise<void>;
  // Folder actions
  createFolder: (name: string, parentFolderId?: string | null) => Promise<SpaceFolder>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  moveFolder: (folderId: string, parentFolderId: string | null) => Promise<void>;
  moveSpaceToFolder: (spaceId: string, folderId: string | null) => Promise<void>;
}

export const useSpaceStore = create<SpaceState>((set, get) => ({
  spaces: [],
  folders: [],
  activeSpaceId: null,
  isLoading: false,

  loadSpaces: async () => {
    set({ isLoading: true });
    try {
      await db.initDb();
      const [spaces, folders] = await Promise.all([db.getSpaces(), db.getFolders()]);
      let activeId = get().activeSpaceId;
      if (!activeId || !spaces.find(s => s.id === activeId)) {
        activeId = spaces.length > 0 ? spaces[0].id : null;
      }
      set({ spaces, folders, activeSpaceId: activeId, isLoading: false });
    } catch (err) {
      console.error('Failed to load spaces', err);
      set({ isLoading: false });
    }
  },

  setActiveSpaceId: (id: string) => {
    set({ activeSpaceId: id });
  },

  createSpace: async (name: string, folderId?: string | null) => {
    const space = await db.createSpace(name, folderId);
    set(state => ({
      spaces: [...state.spaces, space],
      activeSpaceId: space.id,
    }));
    return space;
  },

  renameSpace: async (id: string, name: string) => {
    await db.updateSpace(id, name);
    set(state => ({
      spaces: state.spaces.map(s => (s.id === id ? { ...s, name } : s)),
    }));
  },

  deleteSpace: async (id: string) => {
    await db.deleteSpace(id);
    useCanvasStore.getState().cleanUpSpaceLinksForSpace(id);
    set(state => {
      const remaining = state.spaces.filter(s => s.id !== id);
      const nextActive = state.activeSpaceId === id ? (remaining[0]?.id || null) : state.activeSpaceId;
      return {
        spaces: remaining,
        activeSpaceId: nextActive,
      };
    });
  },

  setSpaceFocus: async (spaceId: string, nodeId: string | null) => {
    await db.updateSpaceFocus(spaceId, nodeId);
    set(state => ({
      spaces: state.spaces.map(s => (s.id === spaceId ? { ...s, focused_node_id: nodeId } : s)),
    }));
  },

  updateSpaceGithubRepo: async (id: string, repo: string | null) => {
    await db.updateSpaceGithubRepo(id, repo);
    set(state => ({
      spaces: state.spaces.map(s => (s.id === id ? { ...s, github_repo: repo } : s)),
    }));
  },

  // Folder actions
  createFolder: async (name: string, parentFolderId?: string | null) => {
    const folder = await db.createFolder(name, parentFolderId);
    set(state => ({ folders: [...state.folders, folder] }));
    return folder;
  },

  renameFolder: async (id: string, name: string) => {
    await db.updateFolder(id, name);
    set(state => ({
      folders: state.folders.map(f => (f.id === id ? { ...f, name } : f)),
    }));
  },

  deleteFolder: async (id: string) => {
    const targetFolder = get().folders.find(f => f.id === id);
    const parentId = targetFolder ? (targetFolder.parent_folder_id || null) : null;
    await db.deleteFolder(id);
    set(state => ({
      folders: state.folders
        .filter(f => f.id !== id)
        .map(f => f.parent_folder_id === id ? { ...f, parent_folder_id: parentId } : f),
      spaces: state.spaces.map(s => s.folder_id === id ? { ...s, folder_id: parentId } : s),
    }));
  },

  moveFolder: async (folderId: string, parentFolderId: string | null) => {
    await db.moveFolder(folderId, parentFolderId);
    set(state => ({
      folders: state.folders.map(f => f.id === folderId ? { ...f, parent_folder_id: parentFolderId } : f),
    }));
  },

  moveSpaceToFolder: async (spaceId: string, folderId: string | null) => {
    await db.moveSpaceToFolder(spaceId, folderId);
    set(state => ({
      spaces: state.spaces.map(s => (s.id === spaceId ? { ...s, folder_id: folderId } : s)),
    }));
  },
}));
