import { create } from 'zustand';
import { Section } from '../types';
import * as db from '../db/client';
import { useCanvasStore } from './useCanvasStore';
import { useActivityStore } from './useActivityStore';

interface SectionState {
  sections: Section[];
  courseId: string | null;
  isLoading: boolean;

  loadSections: (courseId: string) => Promise<void>;
  toggleSection: (id: string, isDone: boolean) => Promise<void>;
  toggleSectionFlag: (id: string, isFlagged: boolean) => Promise<void>;
  addSection: (title: string) => Promise<void>;
  updateTitle: (id: string, title: string) => Promise<void>;
  updateSectionNote: (id: string, note: string | null) => Promise<void>;
  updateSectionProof: (id: string, proofUrl: string | null, proofLabel: string | null) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
}

export const useSectionStore = create<SectionState>((set, get) => ({
  sections: [],
  courseId: null,
  isLoading: false,

  loadSections: async (courseId: string) => {
    set({ courseId, isLoading: true });
    try {
      const sections = await db.getSectionsByCourse(courseId);
      set({ sections, isLoading: false });
    } catch (err) {
      console.error('Failed to load sections for course', courseId, err);
      set({ isLoading: false });
    }
  },

  toggleSection: async (id: string, isDone: boolean) => {
    const { courseId } = get();
    // Optimistic update
    set(state => ({
      sections: state.sections.map(s =>
        s.id === id ? { ...s, is_done: isDone ? 1 : 0, done_at: isDone ? new Date().toISOString() : null } : s
      ),
    }));

    await db.toggleSectionDone(id, isDone);

    if (courseId) {
      useCanvasStore.getState().refreshCourseSections(courseId);
    }
    useActivityStore.getState().loadActivity();
  },

  toggleSectionFlag: async (id: string, isFlagged: boolean) => {
    const { courseId } = get();
    // Optimistic update
    set(state => ({
      sections: state.sections.map(s =>
        s.id === id ? { ...s, is_flagged: isFlagged ? 1 : 0 } : s
      ),
    }));

    await db.toggleSectionFlag(id, isFlagged);

    if (courseId) {
      useCanvasStore.getState().refreshCourseSections(courseId);
    }
  },

  addSection: async (title: string) => {
    const { courseId, sections } = get();
    if (!courseId || !title.trim()) return;

    const newSec = await db.createSection(courseId, title.trim(), sections.length);
    set(state => ({
      sections: [...state.sections, newSec],
    }));

    useCanvasStore.getState().refreshCourseSections(courseId);
  },

  updateTitle: async (id: string, title: string) => {
    const { courseId } = get();
    set(state => ({
      sections: state.sections.map(s => (s.id === id ? { ...s, title } : s)),
    }));
    await db.updateSectionTitle(id, title);
    if (courseId) {
      useCanvasStore.getState().refreshCourseSections(courseId);
    }
  },

  updateSectionNote: async (id: string, note: string | null) => {
    // Optimistic update
    set(state => ({
      sections: state.sections.map(s => (s.id === id ? { ...s, note } : s)),
    }));
    await db.updateSectionNote(id, note);
  },

  updateSectionProof: async (id: string, proofUrl: string | null, proofLabel: string | null) => {
    set(state => ({
      sections: state.sections.map(s => (s.id === id ? { ...s, proof_url: proofUrl, proof_label: proofLabel } : s)),
    }));
    await db.updateSectionProof(id, proofUrl, proofLabel);
  },

  deleteSection: async (id: string) => {
    const { courseId } = get();
    set(state => ({
      sections: state.sections.filter(s => s.id !== id),
    }));
    await db.deleteSection(id);
    if (courseId) {
      useCanvasStore.getState().refreshCourseSections(courseId);
    }
  },
}));
