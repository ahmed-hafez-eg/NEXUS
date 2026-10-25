import { create } from 'zustand';
import { Course, Connection, Section, SpaceLink, TextNode, CourseLink } from '../types';
import * as db from '../db/client';
import { useActivityStore } from './useActivityStore';

interface CanvasState {
  courses: Course[];
  connections: Connection[];
  spaceLinks: SpaceLink[];
  allSpaceLinks: SpaceLink[]; // All space links across all spaces (used for backlinks & cycle detection)
  textNodes: TextNode[];
  sectionsMap: Record<string, Section[]>; // course_id -> Section[]
  allCoursesMap: Record<string, Course>; // course_id -> Course (global cache for SpaceLinks)
  coursesBySpaceId: Record<string, Course[]>; // space_id -> Course[] (global cache for SpaceLinks)
  selectedCourseId: string | null;
  pendingCanvasJump: {
    targetCourseId: string | null;
    targetSectionId?: string | null;
  } | null;
  isLoading: boolean;

  loadCanvas: (spaceId: string) => Promise<void>;
  updateCoursePosition: (id: string, x: number, y: number) => Promise<void>;
  createCourse: (spaceId: string, name: string, x: number, y: number, initialSections: string[], hashtags?: string[], icon?: string | null) => Promise<Course>;
  updateCourseName: (id: string, name: string) => Promise<void>;
  updateCourseHashtags: (id: string, hashtags: string[]) => Promise<void>;
  updateCourseLinks: (id: string, links: CourseLink[]) => Promise<void>;
  updateCourseGithubRepo: (id: string, repo: string | null) => Promise<void>;
  updateCourseIcon: (id: string, icon: string | null) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;

  createConnection: (spaceId: string, sourceCourseId: string, targetCourseId: string, sourceHandle?: string | null, targetHandle?: string | null) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;

  // Space Links
  createSpaceLink: (spaceId: string, linkedSpaceId: string, posX: number, posY: number, targetCourseId?: string | null, targetSectionId?: string | null) => Promise<SpaceLink>;
  updateSpaceLinkPosition: (id: string, posX: number, posY: number) => Promise<void>;
  deleteSpaceLink: (id: string) => Promise<void>;
  cleanUpSpaceLinksForSpace: (deletedSpaceId: string) => void;
  setPendingCanvasJump: (jump: { targetCourseId: string | null; targetSectionId?: string | null } | null) => void;
  jumpToSource: (targetSpaceId: string, targetCourseId?: string | null, targetSectionId?: string | null) => void;

  // Text Nodes
  createTextNode: (spaceId: string, text: string, color: string, x: number, y: number) => Promise<TextNode>;
  updateTextNodePosition: (id: string, x: number, y: number) => Promise<void>;
  updateTextNodeContent: (id: string, text: string, color: string) => Promise<void>;
  deleteTextNode: (id: string) => Promise<void>;

  setSelectedCourseId: (id: string | null) => void;
  toggleSection: (sectionId: string, courseId: string, isDone: boolean) => Promise<void>;
  refreshCourseSections: (courseId: string) => Promise<void>;
  refreshAllSections: () => Promise<void>;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  courses: [],
  connections: [],
  spaceLinks: [],
  allSpaceLinks: [],
  textNodes: [],
  sectionsMap: {},
  allCoursesMap: {},
  coursesBySpaceId: {},
  selectedCourseId: null,
  pendingCanvasJump: null,
  isLoading: false,

  loadCanvas: async (spaceId: string) => {
    set({ isLoading: true });
    try {
      const [courses, connections, spaceLinks, textNodes, allSections, allCourses, allSpaceLinks] = await Promise.all([
        db.getCoursesBySpace(spaceId),
        db.getConnectionsBySpace(spaceId),
        db.getSpaceLinksBySpace(spaceId),
        db.getTextNodesBySpace(spaceId),
        db.getAllSections(),
        db.getAllCourses(),
        db.getAllSpaceLinks(),
      ]);

      const sectionsMap: Record<string, Section[]> = {};
      for (const sec of allSections) {
        if (!sectionsMap[sec.course_id]) {
          sectionsMap[sec.course_id] = [];
        }
        sectionsMap[sec.course_id].push(sec);
      }

      const allCoursesMap: Record<string, Course> = {};
      const coursesBySpaceId: Record<string, Course[]> = {};
      for (const c of allCourses) {
        allCoursesMap[c.id] = c;
        if (!coursesBySpaceId[c.space_id]) {
          coursesBySpaceId[c.space_id] = [];
        }
        coursesBySpaceId[c.space_id].push(c);
      }

      // Check for and silently cleanup orphaned space_links referencing deleted target courses
      const validSpaceLinks: SpaceLink[] = [];
      for (const sl of spaceLinks) {
        if (sl.target_course_id && !allCoursesMap[sl.target_course_id]) {
          db.deleteSpaceLink(sl.id).catch(console.error);
        } else {
          validSpaceLinks.push(sl);
        }
      }

      set({
        courses,
        connections,
        spaceLinks: validSpaceLinks,
        allSpaceLinks,
        textNodes,
        sectionsMap,
        allCoursesMap,
        coursesBySpaceId,
        isLoading: false,
      });
    } catch (err) {
      console.error('Failed to load canvas data', err);
      set({ isLoading: false });
    }
  },

  updateCoursePosition: async (id: string, x: number, y: number) => {
    // Optimistic UI update
    set(state => ({
      courses: state.courses.map(c => (c.id === id ? { ...c, pos_x: x, pos_y: y } : c)),
    }));
    await db.updateCoursePosition(id, x, y);
  },

  createCourse: async (spaceId: string, name: string, x: number, y: number, initialSections: string[], hashtags: string[] = [], icon: string | null = null) => {
    const course = await db.createCourse(spaceId, name, x, y, initialSections, hashtags, [], icon);
    const sections = await db.getSectionsByCourse(course.id);

    set(state => ({
      courses: [...state.courses, course],
      sectionsMap: {
        ...state.sectionsMap,
        [course.id]: sections,
      },
    }));
    return course;
  },

  updateCourseName: async (id: string, name: string) => {
    await db.updateCourseName(id, name);
    set(state => ({
      courses: state.courses.map(c => (c.id === id ? { ...c, name } : c)),
    }));
  },

  updateCourseHashtags: async (id: string, hashtags: string[]) => {
    await db.updateCourseHashtags(id, hashtags);
    set(state => ({
      courses: state.courses.map(c => (c.id === id ? { ...c, hashtags } : c)),
    }));
  },

  updateCourseLinks: async (id: string, links: import('../types').CourseLink[]) => {
    await db.updateCourseLinks(id, links);
    set(state => ({
      courses: state.courses.map(c => (c.id === id ? { ...c, links } : c)),
    }));
  },

  updateCourseGithubRepo: async (id: string, repo: string | null) => {
    await db.updateCourseGithubRepo(id, repo);
    set(state => ({
      courses: state.courses.map(c => (c.id === id ? { ...c, github_repo: repo } : c)),
    }));
  },

  updateCourseIcon: async (id: string, icon: string | null) => {
    await db.updateCourseIcon(id, icon);
    set(state => ({
      courses: state.courses.map(c => (c.id === id ? { ...c, icon } : c)),
      allCoursesMap: {
        ...state.allCoursesMap,
        ...(state.allCoursesMap[id] ? { [id]: { ...state.allCoursesMap[id], icon } } : {}),
      },
    }));
  },

  deleteCourse: async (id: string) => {
    await db.deleteCourse(id);
    set(state => {
      const nextCourses = state.courses.filter(c => c.id !== id);
      const nextAllCoursesMap = { ...state.allCoursesMap };
      delete nextAllCoursesMap[id];

      const nextCoursesBySpaceId: Record<string, Course[]> = {};
      for (const [sId, cList] of Object.entries(state.coursesBySpaceId)) {
        nextCoursesBySpaceId[sId] = cList.filter(c => c.id !== id);
      }

      const removedLinkIds = new Set(state.spaceLinks.filter(sl => sl.target_course_id === id).map(sl => sl.id));
      const nextSpaceLinks = state.spaceLinks.filter(sl => sl.target_course_id !== id);
      const nextAllSpaceLinks = state.allSpaceLinks.filter(sl => sl.target_course_id !== id);
      const nextConnections = state.connections.filter(
        c =>
          c.source_course_id !== id &&
          c.target_course_id !== id &&
          !removedLinkIds.has(c.source_course_id) &&
          !removedLinkIds.has(c.target_course_id)
      );

      const nextSections = { ...state.sectionsMap };
      delete nextSections[id];

      return {
        courses: nextCourses,
        allCoursesMap: nextAllCoursesMap,
        coursesBySpaceId: nextCoursesBySpaceId,
        spaceLinks: nextSpaceLinks,
        allSpaceLinks: nextAllSpaceLinks,
        connections: nextConnections,
        sectionsMap: nextSections,
        selectedCourseId: state.selectedCourseId === id ? null : state.selectedCourseId,
      };
    });
  },

  createConnection: async (
    spaceId: string,
    sourceCourseId: string,
    targetCourseId: string,
    sourceHandle?: string | null,
    targetHandle?: string | null
  ) => {
    if (sourceCourseId === targetCourseId) return; // Prevent self-loop

    // Avoid duplicate connection with the exact same handles
    const existing = get().connections.find(
      c =>
        c.source_course_id === sourceCourseId &&
        c.target_course_id === targetCourseId &&
        (c.source_handle || null) === (sourceHandle || null) &&
        (c.target_handle || null) === (targetHandle || null)
    );
    if (existing) return;

    try {
      const conn = await db.createConnection(
        spaceId,
        sourceCourseId,
        targetCourseId,
        sourceHandle,
        targetHandle
      );
      set(state => ({
        connections: [...state.connections, conn],
      }));
    } catch (err) {
      console.error('Failed to create connection between', sourceCourseId, 'and', targetCourseId, err);
    }
  },

  deleteConnection: async (id: string) => {
    await db.deleteConnection(id);
    set(state => ({
      connections: state.connections.filter(c => c.id !== id),
    }));
  },

  // Space Link actions
  createSpaceLink: async (
    spaceId: string,
    linkedSpaceId: string,
    posX: number,
    posY: number,
    targetCourseId?: string | null,
    targetSectionId?: string | null
  ) => {
    const link = await db.createSpaceLink(spaceId, linkedSpaceId, posX, posY, targetCourseId, targetSectionId);
    set(state => ({
      spaceLinks: [...state.spaceLinks, link],
      allSpaceLinks: [...state.allSpaceLinks, link],
    }));
    return link;
  },

  updateSpaceLinkPosition: async (id: string, posX: number, posY: number) => {
    set(state => ({
      spaceLinks: state.spaceLinks.map(sl => (sl.id === id ? { ...sl, pos_x: posX, pos_y: posY } : sl)),
      allSpaceLinks: state.allSpaceLinks.map(sl => (sl.id === id ? { ...sl, pos_x: posX, pos_y: posY } : sl)),
    }));
    await db.updateSpaceLinkPosition(id, posX, posY);
  },

  deleteSpaceLink: async (id: string) => {
    await db.deleteSpaceLink(id);
    set(state => ({
      spaceLinks: state.spaceLinks.filter(sl => sl.id !== id),
      allSpaceLinks: state.allSpaceLinks.filter(sl => sl.id !== id),
      connections: state.connections.filter(c => c.source_course_id !== id && c.target_course_id !== id),
    }));
  },

  cleanUpSpaceLinksForSpace: (deletedSpaceId: string) => {
    set(state => {
      const removedLinkIds = new Set(
        state.allSpaceLinks
          .filter(sl => sl.linked_space_id === deletedSpaceId || sl.space_id === deletedSpaceId)
          .map(sl => sl.id)
      );
      if (removedLinkIds.size === 0) return state;
      return {
        spaceLinks: state.spaceLinks.filter(sl => !removedLinkIds.has(sl.id)),
        allSpaceLinks: state.allSpaceLinks.filter(sl => !removedLinkIds.has(sl.id)),
        connections: state.connections.filter(
          c => !removedLinkIds.has(c.source_course_id) && !removedLinkIds.has(c.target_course_id)
        ),
      };
    });
  },

  setPendingCanvasJump: (jump: { targetCourseId: string | null; targetSectionId?: string | null } | null) => {
    set({ pendingCanvasJump: jump });
  },

  jumpToSource: (targetSpaceId: string, targetCourseId?: string | null, targetSectionId?: string | null) => {
    set({
      pendingCanvasJump: {
        targetCourseId: targetCourseId || null,
        targetSectionId: targetSectionId || null,
      },
    });
    import('./useSpaceStore').then(m => {
      m.useSpaceStore.getState().setActiveSpaceId(targetSpaceId);
    });
  },

  // Text Node actions
  createTextNode: async (spaceId: string, text: string, color: string, x: number, y: number) => {
    const node = await db.createTextNode(spaceId, text, color, x, y);
    set(state => ({
      textNodes: [...state.textNodes, node],
    }));
    return node;
  },

  updateTextNodePosition: async (id: string, x: number, y: number) => {
    set(state => ({
      textNodes: state.textNodes.map(n => (n.id === id ? { ...n, pos_x: x, pos_y: y } : n)),
    }));
    await db.updateTextNodePosition(id, x, y);
  },

  updateTextNodeContent: async (id: string, text: string, color: string) => {
    set(state => ({
      textNodes: state.textNodes.map(n => (n.id === id ? { ...n, text, color } : n)),
    }));
    await db.updateTextNodeContent(id, text, color);
  },

  deleteTextNode: async (id: string) => {
    await db.deleteTextNode(id);
    set(state => ({
      textNodes: state.textNodes.filter(n => n.id !== id),
      connections: state.connections.filter(c => c.source_course_id !== id && c.target_course_id !== id),
    }));
  },

  setSelectedCourseId: (id: string | null) => {
    set({ selectedCourseId: id });
  },

  toggleSection: async (sectionId: string, courseId: string, isDone: boolean) => {
    const doneVal = isDone ? 1 : 0;
    const now = isDone ? new Date().toISOString() : null;

    set(state => {
      const list = state.sectionsMap[courseId] || [];
      const updatedList = list.map(s => (s.id === sectionId ? { ...s, is_done: doneVal, done_at: now } : s));
      return {
        sectionsMap: {
          ...state.sectionsMap,
          [courseId]: updatedList,
        },
      };
    });

    try {
      await db.toggleSectionDone(sectionId, isDone);
      useActivityStore.getState().loadActivity();
    } catch (err) {
      console.error('Failed to toggle section in canvas store:', err);
    }
  },

  refreshCourseSections: async (courseId: string) => {
    const sections = await db.getSectionsByCourse(courseId);
    set(state => ({
      sectionsMap: {
        ...state.sectionsMap,
        [courseId]: sections,
      },
    }));
  },

  refreshAllSections: async () => {
    const all = await db.getAllSections();
    const map: Record<string, Section[]> = {};
    for (const sec of all) {
      if (!map[sec.course_id]) {
        map[sec.course_id] = [];
      }
      map[sec.course_id].push(sec);
    }
    set({ sectionsMap: map });
  },
}));

