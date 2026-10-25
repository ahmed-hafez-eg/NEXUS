import Database from '@tauri-apps/plugin-sql';
import { Space, SpaceFolder, Course, Section, Connection, SpaceLink, TextNode, ActivityLog, ExportData } from '../types';
import { format } from 'date-fns';

let dbInstance: any = null;
let isBrowserMode = false;

// Fallback in-memory/localStorage store for pure browser dev environment
const BROWSER_STORAGE_KEY = 'nexus_offline_db';
const LEGACY_STORAGE_KEYS = ['nodeescape_offline_db', 'roadmap_offline_db'];

interface BrowserStore {
  spaces: Space[];
  space_folders: SpaceFolder[];
  courses: Course[];
  sections: Section[];
  connections: Connection[];
  space_links: SpaceLink[];
  text_nodes: TextNode[];
  activity_log: ActivityLog[];
  settings: Record<string, string>;
}

function getBrowserStore(): BrowserStore {
  try {
    let raw = localStorage.getItem(BROWSER_STORAGE_KEY);
    // Transparently migrate from legacy storage keys so user data is preserved
    if (!raw) {
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const legacyData = localStorage.getItem(legacyKey);
        if (legacyData) {
          raw = legacyData;
          localStorage.setItem(BROWSER_STORAGE_KEY, legacyData);
          break;
        }
      }
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure new fields exist for older stores
      if (!parsed.space_folders) parsed.space_folders = [];
      if (!parsed.space_links) parsed.space_links = [];
      if (!parsed.text_nodes) parsed.text_nodes = [];
      if (!parsed.settings) parsed.settings = {};
      return parsed;
    }
  } catch (e) {
    console.error('Error reading browser storage', e);
  }
  return {
    spaces: [],
    space_folders: [],
    courses: [],
    sections: [],
    connections: [],
    space_links: [],
    text_nodes: [],
    activity_log: [],
    settings: {},
  };
}

function saveBrowserStore(store: BrowserStore) {
  try {
    localStorage.setItem(BROWSER_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Error saving browser storage', e);
  }
}

/**
 * Robust JSON array parser that handles raw strings, corrupt values, nulls, undefined, and multiple-level double-encoding.
 */
export function parseJsonArray<T = any>(val: any): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    let current: any = val.trim();
    if (!current || current === 'null' || current === 'undefined' || current === '[]') return [];

    // Recursively unwrap JSON strings up to 5 levels
    for (let depth = 0; depth < 5; depth++) {
      if (Array.isArray(current)) return current;
      if (typeof current === 'string') {
        const trimmed = current.trim();
        if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === '[]') return [];
        try {
          current = JSON.parse(trimmed);
        } catch {
          // If JSON parse fails, split by comma
          return trimmed
            .split(',')
            .map((s: string) => s.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean) as unknown as T[];
        }
      } else {
        break;
      }
    }
    if (Array.isArray(current)) return current;
  }
  return [];
}

export function normalizeCourse(row: any): Course {
  if (!row) return row;
  return {
    ...row,
    pos_x: typeof row.pos_x === 'number' ? row.pos_x : 0,
    pos_y: typeof row.pos_y === 'number' ? row.pos_y : 0,
    hashtags: parseJsonArray<string>(row.hashtags),
    links: parseJsonArray<import('../types').CourseLink>(row.links),
    github_repo: row.github_repo || null,
    icon: row.icon || null,
  };
}

export async function getDb() {
  if (dbInstance) return dbInstance;
  if (isBrowserMode) return null;

  try {
    // Check if running in Tauri environment
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (!isTauri) {
      isBrowserMode = true;
      console.info('Running in browser mode - using local storage database adapter');
      return null;
    }

    // Load Tauri SQLite plugin
    dbInstance = await Database.load('sqlite:roadmap.db');
    return dbInstance;
  } catch (err) {
    console.warn('Could not connect to Tauri SQL plugin, falling back to browser storage:', err);
    isBrowserMode = true;
    return null;
  }
}

export async function initDb(): Promise<void> {
  const db = await getDb();

  if (db) {
    // Enforce foreign key constraints in SQLite
    await db.execute('PRAGMA foreign_keys = ON;');

    // Create tables
    await db.execute(`
      CREATE TABLE IF NOT EXISTS spaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        pos_x REAL NOT NULL,
        pos_y REAL NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS sections (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        is_done INTEGER NOT NULL DEFAULT 0,
        done_at TEXT,
        order_index INTEGER NOT NULL
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        source_course_id TEXT NOT NULL,
        target_course_id TEXT NOT NULL,
        source_handle TEXT,
        target_handle TEXT
      );
    `);

    // Schema migration: remove restrictive FOREIGN KEY constraints on courses from connections table
    try {
      const foreignKeys: any[] = await db.select('PRAGMA foreign_key_list(connections);');
      const hasCourseFk = Array.isArray(foreignKeys) && foreignKeys.some((fk: any) => fk.table === 'courses');
      if (hasCourseFk) {
        await db.execute('PRAGMA foreign_keys = OFF;');
        await db.execute(`
          CREATE TABLE IF NOT EXISTS connections_migration (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
            source_course_id TEXT NOT NULL,
            target_course_id TEXT NOT NULL,
            source_handle TEXT,
            target_handle TEXT
          );
        `);
        await db.execute('INSERT OR IGNORE INTO connections_migration SELECT id, space_id, source_course_id, target_course_id, source_handle, target_handle FROM connections;');
        await db.execute('DROP TABLE connections;');
        await db.execute('ALTER TABLE connections_migration RENAME TO connections;');
        await db.execute('PRAGMA foreign_keys = ON;');
      }
    } catch (e) {
      console.warn('Connections table migration check warning:', e);
    }

    // Schema migration for existing databases: ensure source_handle and target_handle exist
    try {
      await db.execute('ALTER TABLE connections ADD COLUMN source_handle TEXT;');
    } catch {
      // Column already exists
    }
    try {
      await db.execute('ALTER TABLE connections ADD COLUMN target_handle TEXT;');
    } catch {
      // Column already exists
    }

    // Schema migration: add note column to sections for existing databases
    try {
      await db.execute('ALTER TABLE sections ADD COLUMN note TEXT;');
    } catch {
      // Column already exists
    }

    // Schema migration: add is_flagged column to sections for existing databases
    try {
      await db.execute('ALTER TABLE sections ADD COLUMN is_flagged INTEGER NOT NULL DEFAULT 0;');
    } catch {
      // Column already exists
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS activity_log (
        date TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Space links table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS space_links (
        id TEXT PRIMARY KEY,
        space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        linked_space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        target_course_id TEXT,
        pos_x REAL NOT NULL,
        pos_y REAL NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // Schema migration: add target_course_id to space_links for existing databases
    try {
      await db.execute('ALTER TABLE space_links ADD COLUMN target_course_id TEXT;');
    } catch {
      // Column already exists
    }

    // Schema migration: add target_section_id to space_links for existing databases
    try {
      await db.execute('ALTER TABLE space_links ADD COLUMN target_section_id TEXT;');
    } catch {
      // Column already exists
    }

    // Schema migration: add hashtags column to courses for existing databases
    try {
      await db.execute('ALTER TABLE courses ADD COLUMN hashtags TEXT;');
    } catch {
      // Column already exists
    }

    // Schema migration: add links column to courses for existing databases
    try {
      await db.execute('ALTER TABLE courses ADD COLUMN links TEXT;');
    } catch {
      // Column already exists
    }

    // Schema migration: add focused_node_id column to spaces for existing databases
    try {
      await db.execute('ALTER TABLE spaces ADD COLUMN focused_node_id TEXT;');
    } catch {
      // Column already exists
    }

    // Schema migration: create space_folders table and add folder_id to spaces
    await db.execute(`
      CREATE TABLE IF NOT EXISTS space_folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    try {
      await db.execute('ALTER TABLE space_folders ADD COLUMN parent_folder_id TEXT;');
    } catch {
      // Column already exists
    }
    try {
      await db.execute('ALTER TABLE spaces ADD COLUMN folder_id TEXT;');
    } catch {
      // Column already exists
    }
    try {
      await db.execute('ALTER TABLE spaces ADD COLUMN github_repo TEXT;');
    } catch {
      // Column already exists
    }

    // Settings key-value store
    await db.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Text nodes table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS text_nodes (
        id TEXT PRIMARY KEY,
        space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
        text TEXT NOT NULL DEFAULT '',
        color TEXT NOT NULL DEFAULT '#475569',
        pos_x REAL NOT NULL,
        pos_y REAL NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // Schema migration: add github_repo to courses for existing databases
    try {
      await db.execute('ALTER TABLE courses ADD COLUMN github_repo TEXT;');
    } catch {
      // Column already exists
    }

    // Schema migration: add icon column to courses for existing databases
    try {
      await db.execute('ALTER TABLE courses ADD COLUMN icon TEXT;');
    } catch {
      // Column already exists
    }

    // Schema migration: add proof_url and proof_label to sections for existing databases
    try {
      await db.execute('ALTER TABLE sections ADD COLUMN proof_url TEXT;');
    } catch {
      // Column already exists
    }
    try {
      await db.execute('ALTER TABLE sections ADD COLUMN proof_label TEXT;');
    } catch {
      // Column already exists
    }

    // GitHub repo info cache table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS github_repo_cache (
        repo TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        fetched_at TEXT NOT NULL
      );
    `);

    // GitHub contributions calendar table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS github_contributions (
        date TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        fetched_at TEXT NOT NULL
      );
    `);

    // One-time data cleanup: Normalize double-encoded or legacy hashtags & links in SQLite
    try {
      const existingCourses: any[] = await db.select('SELECT id, hashtags, links FROM courses');
      for (const row of existingCourses) {
        const cleanTags = parseJsonArray<string>(row.hashtags);
        const cleanLinks = parseJsonArray<import('../types').CourseLink>(row.links);
        const serializedTags = JSON.stringify(cleanTags);
        const serializedLinks = JSON.stringify(cleanLinks);
        if (serializedTags !== row.hashtags || serializedLinks !== row.links) {
          await db.execute('UPDATE courses SET hashtags = $1, links = $2 WHERE id = $3', [
            serializedTags,
            serializedLinks,
            row.id,
          ]);
        }
      }
    } catch (e) {
      console.error('Error normalizing existing courses data in DB:', e);
    }

    // Check if spaces exist; if not, seed a friendly starter space
    const spaces: Space[] = await db.select('SELECT * FROM spaces LIMIT 1');
    if (spaces.length === 0) {
      await seedInitialData(true);
    }
  } else {
    // Browser fallback
    const store = getBrowserStore();
    if (store.spaces.length === 0) {
      await seedInitialData(false);
    }
  }
}

async function seedInitialData(useTauri: boolean) {
  const defaultSpaceId = 'space-default-1';
  const now = new Date().toISOString();
  const today = format(new Date(), 'yyyy-MM-dd');

  const defaultSpace: Space = {
    id: defaultSpaceId,
    name: 'Programming Courses',
    created_at: now,
  };

  const course1: Course = {
    id: 'course-1',
    space_id: defaultSpaceId,
    name: 'TypeScript Fundamentals',
    pos_x: 200,
    pos_y: 150,
    created_at: now,
  };

  const course2: Course = {
    id: 'course-2',
    space_id: defaultSpaceId,
    name: 'React 18 & State Management',
    pos_x: 600,
    pos_y: 120,
    created_at: now,
  };

  const course3: Course = {
    id: 'course-3',
    space_id: defaultSpaceId,
    name: 'Tauri & Desktop Architecture',
    pos_x: 600,
    pos_y: 350,
    created_at: now,
  };

  const sectionsList: Section[] = [
    { id: 'sec-1-1', course_id: 'course-1', title: 'Basic Types & Interfaces', is_done: 1, done_at: now, order_index: 0 },
    { id: 'sec-1-2', course_id: 'course-1', title: 'Generics & Utility Types', is_done: 1, done_at: now, order_index: 1 },
    { id: 'sec-1-3', course_id: 'course-1', title: 'Advanced Type Guards', is_done: 0, done_at: null, order_index: 2 },
    
    { id: 'sec-2-1', course_id: 'course-2', title: 'Component Lifecycle & Hooks', is_done: 1, done_at: now, order_index: 0 },
    { id: 'sec-2-2', course_id: 'course-2', title: 'Zustand Store Integration', is_done: 0, done_at: null, order_index: 1 },
    { id: 'sec-2-3', course_id: 'course-2', title: 'React Flow Custom Nodes', is_done: 0, done_at: null, order_index: 2 },

    { id: 'sec-3-1', course_id: 'course-3', title: 'Rust Core & Cargo Architecture', is_done: 1, done_at: now, order_index: 0 },
    { id: 'sec-3-2', course_id: 'course-3', title: 'SQLite Plugin Integration', is_done: 0, done_at: null, order_index: 1 },
  ];

  const connectionsList: Connection[] = [
    { id: 'conn-1', space_id: defaultSpaceId, source_course_id: 'course-1', target_course_id: 'course-2', source_handle: 'right', target_handle: 'left' },
    { id: 'conn-2', space_id: defaultSpaceId, source_course_id: 'course-1', target_course_id: 'course-3', source_handle: 'bottom', target_handle: 'top' },
  ];

  if (useTauri) {
    const db = await getDb();
    await db.execute('INSERT INTO spaces (id, name, created_at) VALUES ($1, $2, $3)', [defaultSpace.id, defaultSpace.name, defaultSpace.created_at]);
    for (const c of [course1, course2, course3]) {
      await db.execute('INSERT INTO courses (id, space_id, name, pos_x, pos_y, created_at) VALUES ($1, $2, $3, $4, $5, $6)', [c.id, c.space_id, c.name, c.pos_x, c.pos_y, c.created_at]);
    }
    for (const s of sectionsList) {
      await db.execute('INSERT INTO sections (id, course_id, title, is_done, done_at, order_index) VALUES ($1, $2, $3, $4, $5, $6)', [s.id, s.course_id, s.title, s.is_done, s.done_at, s.order_index]);
    }
    for (const conn of connectionsList) {
      await db.execute(
        'INSERT INTO connections (id, space_id, source_course_id, target_course_id, source_handle, target_handle) VALUES ($1, $2, $3, $4, $5, $6)',
        [conn.id, conn.space_id, conn.source_course_id, conn.target_course_id, conn.source_handle, conn.target_handle]
      );
    }
    // Seed initial activity count
    await db.execute('INSERT INTO activity_log (date, count) VALUES ($1, 4)', [today]);
  } else {
    saveBrowserStore({
      spaces: [defaultSpace],
      space_folders: [],
      courses: [course1, course2, course3],
      sections: sectionsList,
      connections: connectionsList,
      space_links: [],
      text_nodes: [],
      activity_log: [{ date: today, count: 4 }],
      settings: {},
    });
  }
}

// SPACES CRUD
export async function getSpaces(): Promise<Space[]> {
  const db = await getDb();
  if (db) {
    return await db.select('SELECT * FROM spaces ORDER BY created_at ASC');
  }
  return getBrowserStore().spaces;
}

export async function createSpace(name: string, folderId?: string | null): Promise<Space> {
  const space: Space = {
    id: 'space-' + crypto.randomUUID(),
    name,
    created_at: new Date().toISOString(),
    focused_node_id: null,
    folder_id: folderId || null,
  };

  const db = await getDb();
  if (db) {
    await db.execute('INSERT INTO spaces (id, name, created_at, focused_node_id, folder_id) VALUES ($1, $2, $3, $4, $5)', [
      space.id,
      space.name,
      space.created_at,
      null,
      space.folder_id,
    ]);
  } else {
    const store = getBrowserStore();
    store.spaces.push(space);
    saveBrowserStore(store);
  }
  return space;
}

export async function updateSpace(id: string, name: string): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute('UPDATE spaces SET name = $1 WHERE id = $2', [name, id]);
  } else {
    const store = getBrowserStore();
    const sp = store.spaces.find(s => s.id === id);
    if (sp) sp.name = name;
    saveBrowserStore(store);
  }
}

export async function updateSpaceFocus(id: string, focusedNodeId: string | null): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute('UPDATE spaces SET focused_node_id = $1 WHERE id = $2', [focusedNodeId, id]);
  } else {
    const store = getBrowserStore();
    const sp = store.spaces.find(s => s.id === id);
    if (sp) {
      sp.focused_node_id = focusedNodeId;
      saveBrowserStore(store);
    }
  }
}

export async function updateSpaceGithubRepo(id: string, repo: string | null): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute('UPDATE spaces SET github_repo = $1 WHERE id = $2', [repo, id]);
  } else {
    const store = getBrowserStore();
    const sp = store.spaces.find(s => s.id === id);
    if (sp) {
      sp.github_repo = repo;
      saveBrowserStore(store);
    }
  }
}

export async function deleteSpace(id: string): Promise<void> {
  const db = await getDb();
  if (db) {
    const relevantLinks: { id: string }[] = await db.select(
      'SELECT id FROM space_links WHERE space_id = $1 OR linked_space_id = $1',
      [id]
    );
    for (const link of relevantLinks) {
      await db.execute('DELETE FROM connections WHERE source_course_id = $1 OR target_course_id = $1', [link.id]);
    }
    await db.execute('DELETE FROM space_links WHERE space_id = $1 OR linked_space_id = $1', [id]);
    await db.execute('DELETE FROM spaces WHERE id = $1', [id]);
  } else {
    const store = getBrowserStore();
    const courseIds = store.courses.filter(c => c.space_id === id).map(c => c.id);
    const relevantLinkIds = store.space_links.filter(sl => sl.space_id === id || sl.linked_space_id === id).map(sl => sl.id);
    store.spaces = store.spaces.filter(s => s.id !== id);
    store.courses = store.courses.filter(c => c.space_id !== id);
    store.sections = store.sections.filter(s => !courseIds.includes(s.course_id));
    store.space_links = store.space_links.filter(sl => sl.space_id !== id && sl.linked_space_id !== id);
    store.connections = store.connections.filter(c =>
      c.space_id !== id &&
      !relevantLinkIds.includes(c.source_course_id) &&
      !relevantLinkIds.includes(c.target_course_id)
    );
    saveBrowserStore(store);
  }
}

// COURSES CRUD
export async function getAllCourses(): Promise<Course[]> {
  const db = await getDb();
  if (db) {
    const rows: any[] = await db.select('SELECT * FROM courses ORDER BY created_at ASC');
    return rows.map(normalizeCourse);
  }
  return getBrowserStore().courses.map(normalizeCourse);
}

export async function getCoursesBySpace(spaceId: string): Promise<Course[]> {
  const db = await getDb();
  if (db) {
    const rows: any[] = await db.select('SELECT * FROM courses WHERE space_id = $1 ORDER BY created_at ASC', [spaceId]);
    return rows.map(normalizeCourse);
  }
  return getBrowserStore().courses.filter(c => c.space_id === spaceId).map(normalizeCourse);
}

export async function createCourse(
  spaceId: string,
  name: string,
  posX: number,
  posY: number,
  initialSections: string[] = [],
  hashtags: string[] = [],
  links: import('../types').CourseLink[] = [],
  icon: string | null = null
): Promise<Course> {
  const course: Course = {
    id: 'course-' + crypto.randomUUID(),
    space_id: spaceId,
    name,
    pos_x: posX,
    pos_y: posY,
    hashtags: hashtags || [],
    links: links || [],
    created_at: new Date().toISOString(),
    icon: icon || null,
  };

  const db = await getDb();
  if (db) {
    const serializedTags = JSON.stringify(course.hashtags || []);
    const serializedLinks = JSON.stringify(course.links || []);
    await db.execute(
      'INSERT INTO courses (id, space_id, name, pos_x, pos_y, hashtags, links, created_at, icon) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [course.id, course.space_id, course.name, course.pos_x, course.pos_y, serializedTags, serializedLinks, course.created_at, course.icon]
    );
    for (let i = 0; i < initialSections.length; i++) {
      const title = initialSections[i].trim();
      if (title) {
        const secId = 'sec-' + crypto.randomUUID();
        await db.execute('INSERT INTO sections (id, course_id, title, is_done, done_at, order_index) VALUES ($1, $2, $3, 0, NULL, $4)', [secId, course.id, title, i]);
      }
    }
  } else {
    const store = getBrowserStore();
    store.courses.push(course);
    for (let i = 0; i < initialSections.length; i++) {
      const title = initialSections[i].trim();
      if (title) {
        store.sections.push({
          id: 'sec-' + crypto.randomUUID(),
          course_id: course.id,
          title,
          is_done: 0,
          done_at: null,
          order_index: i,
        });
      }
    }
    saveBrowserStore(store);
  }
  return course;
}

export async function updateCoursePosition(id: string, posX: number, posY: number): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute('UPDATE courses SET pos_x = $1, pos_y = $2 WHERE id = $3', [posX, posY, id]);
  } else {
    const store = getBrowserStore();
    const c = store.courses.find(item => item.id === id);
    if (c) {
      c.pos_x = posX;
      c.pos_y = posY;
      saveBrowserStore(store);
    }
  }
}

export async function updateCourseName(id: string, name: string): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute('UPDATE courses SET name = $1 WHERE id = $2', [name, id]);
  } else {
    const store = getBrowserStore();
    const c = store.courses.find(item => item.id === id);
    if (c) {
      c.name = name;
      saveBrowserStore(store);
    }
  }
}

export async function updateCourseHashtags(id: string, hashtags: string[]): Promise<void> {
  const db = await getDb();
  if (db) {
    const serialized = JSON.stringify(hashtags || []);
    await db.execute('UPDATE courses SET hashtags = $1 WHERE id = $2', [serialized, id]);
  } else {
    const store = getBrowserStore();
    const c = store.courses.find(item => item.id === id);
    if (c) {
      c.hashtags = hashtags;
      saveBrowserStore(store);
    }
  }
}

export async function updateCourseLinks(id: string, links: import('../types').CourseLink[]): Promise<void> {
  const db = await getDb();
  if (db) {
    const serialized = JSON.stringify(links || []);
    await db.execute('UPDATE courses SET links = $1 WHERE id = $2', [serialized, id]);
  } else {
    const store = getBrowserStore();
    const c = store.courses.find(item => item.id === id);
    if (c) {
      c.links = links;
      saveBrowserStore(store);
    }
  }
}

export async function getAllNodeHashtags(): Promise<import('../types').NodeHashtagItem[]> {
  const db = await getDb();
  if (db) {
    const rows: any[] = await db.select(`
      SELECT 
        c.id as course_id,
        c.name as course_name,
        c.space_id,
        c.hashtags,
        sp.name as space_name
      FROM courses c
      JOIN spaces sp ON c.space_id = sp.id
      ORDER BY sp.name ASC, c.name ASC
    `);

    return rows
      .map(r => ({
        course_id: r.course_id,
        course_name: r.course_name,
        space_id: r.space_id,
        space_name: r.space_name,
        hashtags: parseJsonArray<string>(r.hashtags),
      }))
      .filter(r => r.hashtags.length > 0);
  } else {
    const store = getBrowserStore();
    const results: import('../types').NodeHashtagItem[] = [];
    for (const c of store.courses) {
      const parsedTags = parseJsonArray<string>(c.hashtags);
      if (parsedTags.length > 0) {
        const sp = store.spaces.find(s => s.id === c.space_id);
        if (sp) {
          results.push({
            course_id: c.id,
            course_name: c.name,
            space_id: sp.id,
            space_name: sp.name,
            hashtags: parsedTags,
          });
        }
      }
    }
    return results;
  }
}

export async function getAllCoursesWithSpaces(): Promise<import('../types').CourseWithSpace[]> {
  const db = await getDb();
  if (db) {
    const rows: any[] = await db.select(`
      SELECT 
        c.id,
        c.name,
        c.space_id,
        c.hashtags,
        c.links,
        sp.name as space_name
      FROM courses c
      JOIN spaces sp ON c.space_id = sp.id
      ORDER BY sp.name ASC, c.name ASC
    `);
    return rows.map(r => ({
      id: r.id,
      course_id: r.id,
      name: r.name,
      course_name: r.name,
      space_id: r.space_id,
      space_name: r.space_name,
      hashtags: parseJsonArray<string>(r.hashtags),
      links: parseJsonArray<import('../types').CourseLink>(r.links),
    }));
  } else {
    const store = getBrowserStore();
    return store.courses.map(c => {
      const sp = store.spaces.find(s => s.id === c.space_id);
      return {
        id: c.id,
        course_id: c.id,
        name: c.name,
        course_name: c.name,
        space_id: c.space_id,
        space_name: sp ? sp.name : 'Unknown Space',
        hashtags: parseJsonArray<string>(c.hashtags),
        links: parseJsonArray<import('../types').CourseLink>(c.links),
      };
    });
  }
}

export async function deleteCourse(id: string): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute('UPDATE spaces SET focused_node_id = NULL WHERE focused_node_id = $1', [id]);
    // Cascade delete space_links targeting this course and their connections
    const targetedLinks: { id: string }[] = await db.select('SELECT id FROM space_links WHERE target_course_id = $1', [id]);
    for (const link of targetedLinks) {
      await db.execute('DELETE FROM connections WHERE source_course_id = $1 OR target_course_id = $1', [link.id]);
    }
    await db.execute('DELETE FROM space_links WHERE target_course_id = $1', [id]);
    await db.execute('DELETE FROM courses WHERE id = $1', [id]);
    await db.execute('DELETE FROM connections WHERE source_course_id = $1 OR target_course_id = $1', [id]);
  } else {
    const store = getBrowserStore();
    for (const s of store.spaces) {
      if (s.focused_node_id === id) {
        s.focused_node_id = null;
      }
    }
    const targetedLinkIds = store.space_links.filter(sl => sl.target_course_id === id).map(sl => sl.id);
    store.space_links = store.space_links.filter(sl => sl.target_course_id !== id);
    store.connections = store.connections.filter(c =>
      c.source_course_id !== id &&
      c.target_course_id !== id &&
      !targetedLinkIds.includes(c.source_course_id) &&
      !targetedLinkIds.includes(c.target_course_id)
    );
    store.courses = store.courses.filter(c => c.id !== id);
    store.sections = store.sections.filter(s => s.course_id !== id);
    saveBrowserStore(store);
  }
}

// SECTIONS CRUD
export async function getSectionsByCourse(courseId: string): Promise<Section[]> {
  const db = await getDb();
  if (db) {
    return await db.select('SELECT * FROM sections WHERE course_id = $1 ORDER BY order_index ASC', [courseId]);
  }
  return getBrowserStore().sections.filter(s => s.course_id === courseId).sort((a, b) => a.order_index - b.order_index);
}

export async function getAllSections(): Promise<Section[]> {
  const db = await getDb();
  if (db) {
    return await db.select('SELECT * FROM sections');
  }
  return getBrowserStore().sections;
}

export async function createSection(courseId: string, title: string, orderIndex?: number): Promise<Section> {
  let index = orderIndex;
  if (index === undefined) {
    const existing = await getSectionsByCourse(courseId);
    index = existing.length;
  }

  const section: Section = {
    id: 'sec-' + crypto.randomUUID(),
    course_id: courseId,
    title,
    is_done: 0,
    done_at: null,
    order_index: index,
    note: null,
  };

  const db = await getDb();
  if (db) {
    await db.execute('INSERT INTO sections (id, course_id, title, is_done, done_at, order_index, note) VALUES ($1, $2, $3, $4, $5, $6, $7)', [section.id, section.course_id, section.title, section.is_done, section.done_at, section.order_index, section.note]);
  } else {
    const store = getBrowserStore();
    store.sections.push(section);
    saveBrowserStore(store);
  }
  return section;
}

export async function updateSectionNote(id: string, note: string | null): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute('UPDATE sections SET note = $1 WHERE id = $2', [note, id]);
  } else {
    const store = getBrowserStore();
    const s = store.sections.find(item => item.id === id);
    if (s) {
      s.note = note;
      saveBrowserStore(store);
    }
  }
}

export async function updateSectionTitle(id: string, title: string): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute('UPDATE sections SET title = $1 WHERE id = $2', [title, id]);
  } else {
    const store = getBrowserStore();
    const s = store.sections.find(item => item.id === id);
    if (s) {
      s.title = title;
      saveBrowserStore(store);
    }
  }
}

export async function toggleSectionDone(id: string, isDone: boolean): Promise<Section | null> {
  const now = isDone ? new Date().toISOString() : null;
  const doneVal = isDone ? 1 : 0;
  const today = format(new Date(), 'yyyy-MM-dd');

  const db = await getDb();
  if (db) {
    await db.execute('UPDATE sections SET is_done = $1, done_at = $2 WHERE id = $3', [doneVal, now, id]);

    // Update activity log for today
    if (isDone) {
      await db.execute(`
        INSERT INTO activity_log (date, count) VALUES ($1, 1)
        ON CONFLICT(date) DO UPDATE SET count = count + 1
      `, [today]);
    } else {
      await db.execute(`
        UPDATE activity_log SET count = MAX(0, count - 1) WHERE date = $1
      `, [today]);
    }

    const rows: Section[] = await db.select('SELECT * FROM sections WHERE id = $1', [id]);
    return rows[0] || null;
  } else {
    const store = getBrowserStore();
    const s = store.sections.find(item => item.id === id);
    if (s) {
      s.is_done = doneVal;
      s.done_at = now;

      // Update activity log
      let act = store.activity_log.find(a => a.date === today);
      if (isDone) {
        if (!act) {
          act = { date: today, count: 0 };
          store.activity_log.push(act);
        }
        act.count += 1;
      } else if (act) {
        act.count = Math.max(0, act.count - 1);
      }
      saveBrowserStore(store);
      return s;
    }
    return null;
  }
}

export async function toggleSectionFlag(id: string, isFlagged: boolean): Promise<Section | null> {
  const flagVal = isFlagged ? 1 : 0;
  const db = await getDb();
  if (db) {
    await db.execute('UPDATE sections SET is_flagged = $1 WHERE id = $2', [flagVal, id]);
    const rows: Section[] = await db.select('SELECT * FROM sections WHERE id = $1', [id]);
    return rows[0] || null;
  } else {
    const store = getBrowserStore();
    const s = store.sections.find(item => item.id === id);
    if (s) {
      s.is_flagged = flagVal;
      saveBrowserStore(store);
      return s;
    }
    return null;
  }
}

export async function getFlaggedSections(): Promise<import('../types').FlaggedSectionItem[]> {
  const db = await getDb();
  if (db) {
    return await db.select(`
      SELECT 
        s.id, s.course_id, s.title, s.is_done, s.is_flagged, s.done_at, s.order_index, s.note,
        c.name as course_name, c.space_id,
        sp.name as space_name
      FROM sections s
      JOIN courses c ON s.course_id = c.id
      JOIN spaces sp ON c.space_id = sp.id
      WHERE s.is_flagged = 1
      ORDER BY sp.name ASC, c.name ASC, s.order_index ASC
    `);
  } else {
    const store = getBrowserStore();
    const result: import('../types').FlaggedSectionItem[] = [];
    for (const s of store.sections) {
      if (s.is_flagged === 1) {
        const c = store.courses.find(item => item.id === s.course_id);
        const sp = c ? store.spaces.find(item => item.id === c.space_id) : null;
        if (c && sp) {
          result.push({
            ...s,
            course_name: c.name,
            space_id: sp.id,
            space_name: sp.name,
            is_flagged: 1,
          });
        }
      }
    }
    return result;
  }
}

export async function deleteSection(id: string): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute('DELETE FROM sections WHERE id = $1', [id]);
  } else {
    const store = getBrowserStore();
    store.sections = store.sections.filter(s => s.id !== id);
    saveBrowserStore(store);
  }
}

// CONNECTIONS CRUD
export async function getConnectionsBySpace(spaceId: string): Promise<Connection[]> {
  const db = await getDb();
  if (db) {
    return await db.select('SELECT * FROM connections WHERE space_id = $1', [spaceId]);
  }
  return getBrowserStore().connections.filter(c => c.space_id === spaceId);
}

export async function createConnection(
  spaceId: string,
  sourceCourseId: string,
  targetCourseId: string,
  sourceHandle?: string | null,
  targetHandle?: string | null
): Promise<Connection> {
  const connId = `conn-${sourceCourseId}-${sourceHandle || 'def'}-${targetCourseId}-${targetHandle || 'def'}`;
  const conn: Connection = {
    id: connId,
    space_id: spaceId,
    source_course_id: sourceCourseId,
    target_course_id: targetCourseId,
    source_handle: sourceHandle || null,
    target_handle: targetHandle || null,
  };

  const db = await getDb();
  if (db) {
    await db.execute(`
      INSERT OR REPLACE INTO connections (id, space_id, source_course_id, target_course_id, source_handle, target_handle)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [conn.id, conn.space_id, conn.source_course_id, conn.target_course_id, conn.source_handle, conn.target_handle]);
  } else {
    const store = getBrowserStore();
    store.connections = store.connections.filter(c => c.id !== conn.id);
    store.connections.push(conn);
    saveBrowserStore(store);
  }
  return conn;
}

export async function deleteConnection(id: string): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute('DELETE FROM connections WHERE id = $1', [id]);
  } else {
    const store = getBrowserStore();
    store.connections = store.connections.filter(c => c.id !== id);
    saveBrowserStore(store);
  }
}

// SPACE LINKS CRUD
export async function getAllSpaceLinks(): Promise<SpaceLink[]> {
  const db = await getDb();
  if (db) {
    return await db.select('SELECT * FROM space_links ORDER BY created_at ASC');
  }
  return getBrowserStore().space_links;
}

export async function getSpaceLinksBySpace(spaceId: string): Promise<SpaceLink[]> {
  const db = await getDb();
  if (db) {
    return await db.select('SELECT * FROM space_links WHERE space_id = $1', [spaceId]);
  }
  return getBrowserStore().space_links.filter(sl => sl.space_id === spaceId);
}

export async function createSpaceLink(
  spaceId: string,
  linkedSpaceId: string,
  posX: number,
  posY: number,
  targetCourseId?: string | null,
  targetSectionId?: string | null
): Promise<SpaceLink> {
  const link: SpaceLink = {
    id: 'slink-' + crypto.randomUUID(),
    space_id: spaceId,
    linked_space_id: linkedSpaceId,
    target_course_id: targetCourseId || null,
    target_section_id: targetSectionId || null,
    pos_x: posX,
    pos_y: posY,
    created_at: new Date().toISOString(),
  };

  const db = await getDb();
  if (db) {
    await db.execute(
      'INSERT INTO space_links (id, space_id, linked_space_id, target_course_id, target_section_id, pos_x, pos_y, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [link.id, link.space_id, link.linked_space_id, link.target_course_id, link.target_section_id, link.pos_x, link.pos_y, link.created_at]
    );
  } else {
    const store = getBrowserStore();
    store.space_links.push(link);
    saveBrowserStore(store);
  }
  return link;
}

export async function updateSpaceLinkPosition(id: string, posX: number, posY: number): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute('UPDATE space_links SET pos_x = $1, pos_y = $2 WHERE id = $3', [posX, posY, id]);
  } else {
    const store = getBrowserStore();
    const sl = store.space_links.find(item => item.id === id);
    if (sl) {
      sl.pos_x = posX;
      sl.pos_y = posY;
      saveBrowserStore(store);
    }
  }
}

export async function deleteSpaceLink(id: string): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute('DELETE FROM space_links WHERE id = $1', [id]);
    await db.execute('DELETE FROM connections WHERE source_course_id = $1 OR target_course_id = $1', [id]);
  } else {
    const store = getBrowserStore();
    store.space_links = store.space_links.filter(sl => sl.id !== id);
    store.connections = store.connections.filter(c => c.source_course_id !== id && c.target_course_id !== id);
    saveBrowserStore(store);
  }
}

// SETTINGS KEY-VALUE STORE
export async function getSetting(key: string, defaultValue: string = ''): Promise<string> {
  const db = await getDb();
  if (db) {
    const rows: { key: string; value: string }[] = await db.select(
      'SELECT value FROM settings WHERE key = $1',
      [key]
    );
    return rows.length > 0 ? rows[0].value : defaultValue;
  }
  const store = getBrowserStore();
  return store.settings[key] ?? defaultValue;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2',
      [key, value]
    );
  } else {
    const store = getBrowserStore();
    store.settings[key] = value;
    saveBrowserStore(store);
  }
}

// ACTIVITY LOG
export async function getActivityLogs(): Promise<ActivityLog[]> {
  const db = await getDb();
  if (db) {
    return await db.select('SELECT * FROM activity_log ORDER BY date ASC');
  }
  return getBrowserStore().activity_log;
}

// BACKUP / EXPORT / IMPORT
export async function exportAllData(): Promise<ExportData> {
  const db = await getDb();
  if (db) {
    const spaces: Space[] = await db.select('SELECT * FROM spaces');
    const space_folders: SpaceFolder[] = await db.select('SELECT * FROM space_folders');
    const rawCourses: any[] = await db.select('SELECT * FROM courses');
    const courses: Course[] = rawCourses.map(normalizeCourse);
    const sections: Section[] = await db.select('SELECT * FROM sections');
    const connections: Connection[] = await db.select('SELECT * FROM connections');
    const space_links: SpaceLink[] = await db.select('SELECT * FROM space_links');
    const text_nodes: TextNode[] = await db.select('SELECT * FROM text_nodes');
    const activity_log: ActivityLog[] = await db.select('SELECT * FROM activity_log');
    return {
      version: '1.2.0',
      exported_at: new Date().toISOString(),
      spaces,
      space_folders,
      courses,
      sections,
      connections,
      space_links,
      text_nodes,
      activity_log,
    };
  } else {
    const store = getBrowserStore();
    return {
      version: '1.2.0',
      exported_at: new Date().toISOString(),
      spaces: store.spaces,
      space_folders: store.space_folders,
      courses: store.courses.map(normalizeCourse),
      sections: store.sections,
      connections: store.connections,
      space_links: store.space_links,
      text_nodes: store.text_nodes,
      activity_log: store.activity_log,
    };
  }
}

export async function importAllData(data: ExportData): Promise<void> {
  if (!data || !Array.isArray(data.spaces)) {
    throw new Error('Invalid backup file format');
  }

  const db = await getDb();
  if (db) {
    await db.execute('DELETE FROM space_links');
    await db.execute('DELETE FROM text_nodes');
    await db.execute('DELETE FROM connections');
    await db.execute('DELETE FROM sections');
    await db.execute('DELETE FROM courses');
    await db.execute('DELETE FROM spaces');
    await db.execute('DELETE FROM space_folders');
    await db.execute('DELETE FROM activity_log');

    if (data.space_folders) {
      for (const f of data.space_folders) {
        await db.execute('INSERT INTO space_folders (id, name, created_at, parent_folder_id) VALUES ($1, $2, $3, $4)', [
          f.id,
          f.name,
          f.created_at,
          f.parent_folder_id || null,
        ]);
      }
    }
    for (const s of data.spaces) {
      await db.execute('INSERT INTO spaces (id, name, created_at, focused_node_id, folder_id, github_repo) VALUES ($1, $2, $3, $4, $5, $6)', [
        s.id,
        s.name,
        s.created_at,
        s.focused_node_id || null,
        s.folder_id || null,
        s.github_repo || null,
      ]);
    }
    for (const c of data.courses) {
      const serializedTags = c.hashtags ? JSON.stringify(c.hashtags) : JSON.stringify([]);
      const serializedLinks = c.links ? JSON.stringify(c.links) : JSON.stringify([]);
      await db.execute(
        'INSERT INTO courses (id, space_id, name, pos_x, pos_y, hashtags, links, created_at, github_repo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [c.id, c.space_id, c.name, c.pos_x, c.pos_y, serializedTags, serializedLinks, c.created_at, c.github_repo || null]
      );
    }
    for (const sec of data.sections) {
      await db.execute(
        'INSERT INTO sections (id, course_id, title, is_done, is_flagged, done_at, order_index, note, proof_url, proof_label) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [sec.id, sec.course_id, sec.title, sec.is_done, sec.is_flagged || 0, sec.done_at, sec.order_index, sec.note || null, sec.proof_url || null, sec.proof_label || null]
      );
    }
    for (const conn of data.connections) {
      await db.execute(
        'INSERT INTO connections (id, space_id, source_course_id, target_course_id, source_handle, target_handle) VALUES ($1, $2, $3, $4, $5, $6)',
        [conn.id, conn.space_id, conn.source_course_id, conn.target_course_id, conn.source_handle || null, conn.target_handle || null]
      );
    }
    if (data.space_links) {
      for (const sl of data.space_links) {
        await db.execute(
          'INSERT INTO space_links (id, space_id, linked_space_id, target_course_id, target_section_id, pos_x, pos_y, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [sl.id, sl.space_id, sl.linked_space_id, sl.target_course_id || null, sl.target_section_id || null, sl.pos_x, sl.pos_y, sl.created_at]
        );
      }
    }
    if (data.text_nodes) {
      for (const tn of data.text_nodes) {
        await db.execute(
          'INSERT INTO text_nodes (id, space_id, text, color, pos_x, pos_y, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [tn.id, tn.space_id, tn.text, tn.color, tn.pos_x, tn.pos_y, tn.created_at]
        );
      }
    }
    for (const act of data.activity_log) {
      await db.execute('INSERT INTO activity_log (date, count) VALUES ($1, $2)', [act.date, act.count]);
    }
  } else {
    saveBrowserStore({
      spaces: data.spaces,
      space_folders: data.space_folders || [],
      courses: data.courses,
      sections: data.sections,
      connections: data.connections,
      space_links: data.space_links || [],
      text_nodes: data.text_nodes || [],
      activity_log: data.activity_log,
      settings: {},
    });
  }
}

// TEXT NODES CRUD
export async function getTextNodesBySpace(spaceId: string): Promise<TextNode[]> {
  const db = await getDb();
  if (db) {
    return await db.select('SELECT * FROM text_nodes WHERE space_id = $1 ORDER BY created_at ASC', [spaceId]);
  }
  return getBrowserStore().text_nodes.filter(n => n.space_id === spaceId);
}

export async function createTextNode(
  spaceId: string,
  text: string,
  color: string,
  posX: number,
  posY: number
): Promise<TextNode> {
  const node: TextNode = {
    id: 'tnode-' + crypto.randomUUID(),
    space_id: spaceId,
    text,
    color,
    pos_x: posX,
    pos_y: posY,
    created_at: new Date().toISOString(),
  };

  const db = await getDb();
  if (db) {
    await db.execute(
      'INSERT INTO text_nodes (id, space_id, text, color, pos_x, pos_y, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [node.id, node.space_id, node.text, node.color, node.pos_x, node.pos_y, node.created_at]
    );
  } else {
    const store = getBrowserStore();
    store.text_nodes.push(node);
    saveBrowserStore(store);
  }
  return node;
}

export async function updateTextNodePosition(id: string, posX: number, posY: number): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute('UPDATE text_nodes SET pos_x = $1, pos_y = $2 WHERE id = $3', [posX, posY, id]);
  } else {
    const store = getBrowserStore();
    const n = store.text_nodes.find(item => item.id === id);
    if (n) {
      n.pos_x = posX;
      n.pos_y = posY;
      saveBrowserStore(store);
    }
  }
}

export async function updateTextNodeContent(id: string, text: string, color: string): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute('UPDATE text_nodes SET text = $1, color = $2 WHERE id = $3', [text, color, id]);
  } else {
    const store = getBrowserStore();
    const n = store.text_nodes.find(item => item.id === id);
    if (n) {
      n.text = text;
      n.color = color;
      saveBrowserStore(store);
    }
  }
}

export async function deleteTextNode(id: string): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute('DELETE FROM text_nodes WHERE id = $1', [id]);
    await db.execute('DELETE FROM connections WHERE source_course_id = $1 OR target_course_id = $1', [id]);
  } else {
    const store = getBrowserStore();
    store.text_nodes = store.text_nodes.filter(n => n.id !== id);
    store.connections = store.connections.filter(c => c.source_course_id !== id && c.target_course_id !== id);
    saveBrowserStore(store);
  }
}

// SPACE FOLDERS CRUD
export async function getFolders(): Promise<SpaceFolder[]> {
  const db = await getDb();
  if (db) {
    return await db.select('SELECT * FROM space_folders ORDER BY created_at ASC');
  }
  return getBrowserStore().space_folders;
}

export async function createFolder(name: string, parentFolderId?: string | null): Promise<SpaceFolder> {
  const folder: SpaceFolder = {
    id: 'folder-' + crypto.randomUUID(),
    name,
    created_at: new Date().toISOString(),
    parent_folder_id: parentFolderId || null,
  };
  const db = await getDb();
  if (db) {
    await db.execute('INSERT INTO space_folders (id, name, created_at, parent_folder_id) VALUES ($1, $2, $3, $4)', [
      folder.id,
      folder.name,
      folder.created_at,
      folder.parent_folder_id,
    ]);
  } else {
    const store = getBrowserStore();
    store.space_folders.push(folder);
    saveBrowserStore(store);
  }
  return folder;
}

export async function updateFolder(id: string, name: string): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute('UPDATE space_folders SET name = $1 WHERE id = $2', [name, id]);
  } else {
    const store = getBrowserStore();
    const f = store.space_folders.find(x => x.id === id);
    if (f) { f.name = name; saveBrowserStore(store); }
  }
}

export async function moveFolder(folderId: string, parentFolderId: string | null): Promise<void> {
  // Prevent moving into itself
  if (folderId === parentFolderId) return;

  const db = await getDb();
  if (db) {
    await db.execute('UPDATE space_folders SET parent_folder_id = $1 WHERE id = $2', [parentFolderId, folderId]);
  } else {
    const store = getBrowserStore();
    const f = store.space_folders.find(x => x.id === folderId);
    if (f) {
      f.parent_folder_id = parentFolderId;
      saveBrowserStore(store);
    }
  }
}

export async function deleteFolder(id: string): Promise<void> {
  const db = await getDb();
  if (db) {
    // Find the folder's parent so children can be moved up
    const existing: any[] = await db.select('SELECT parent_folder_id FROM space_folders WHERE id = $1', [id]);
    const parentId = existing && existing.length > 0 ? existing[0].parent_folder_id : null;

    // Move spaces in this folder to the parent folder
    await db.execute('UPDATE spaces SET folder_id = $1 WHERE folder_id = $2', [parentId, id]);
    // Move nested sub-folders in this folder to the parent folder
    await db.execute('UPDATE space_folders SET parent_folder_id = $1 WHERE parent_folder_id = $2', [parentId, id]);
    // Delete the folder itself
    await db.execute('DELETE FROM space_folders WHERE id = $1', [id]);
  } else {
    const store = getBrowserStore();
    const targetFolder = store.space_folders.find(f => f.id === id);
    const parentId = targetFolder ? (targetFolder.parent_folder_id || null) : null;

    store.space_folders = store.space_folders
      .filter(f => f.id !== id)
      .map(f => f.parent_folder_id === id ? { ...f, parent_folder_id: parentId } : f);

    store.spaces = store.spaces.map(s => s.folder_id === id ? { ...s, folder_id: parentId } : s);
    saveBrowserStore(store);
  }
}

export async function moveSpaceToFolder(spaceId: string, folderId: string | null): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute('UPDATE spaces SET folder_id = $1 WHERE id = $2', [folderId, spaceId]);
  } else {
    const store = getBrowserStore();
    const sp = store.spaces.find(s => s.id === spaceId);
    if (sp) { sp.folder_id = folderId; saveBrowserStore(store); }
  }
}

// GITHUB INTEGRATION HELPERS
export async function updateCourseGithubRepo(id: string, repo: string | null): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute('UPDATE courses SET github_repo = $1 WHERE id = $2', [repo, id]);
  } else {
    const store = getBrowserStore();
    const c = store.courses.find(item => item.id === id);
    if (c) {
      c.github_repo = repo;
      saveBrowserStore(store);
    }
  }
}

export async function updateSectionProof(
  id: string,
  proofUrl: string | null,
  proofLabel: string | null
): Promise<Section | null> {
  const db = await getDb();
  if (db) {
    await db.execute('UPDATE sections SET proof_url = $1, proof_label = $2 WHERE id = $3', [proofUrl, proofLabel, id]);
    const rows: Section[] = await db.select('SELECT * FROM sections WHERE id = $1', [id]);
    return rows[0] || null;
  } else {
    const store = getBrowserStore();
    const s = store.sections.find(item => item.id === id);
    if (s) {
      s.proof_url = proofUrl;
      s.proof_label = proofLabel;
      saveBrowserStore(store);
      return s;
    }
    return null;
  }
}

export async function getCachedRepoInfo(repo: string): Promise<import('../types').GitHubRepoInfo | null> {
  const db = await getDb();
  if (db) {
    const rows: { data: string }[] = await db.select(
      'SELECT data FROM github_repo_cache WHERE repo = $1',
      [repo]
    );
    if (rows.length > 0) {
      try { return JSON.parse(rows[0].data); } catch { return null; }
    }
    return null;
  }
  const store = getBrowserStore();
  const cached = (store as any).github_repo_cache?.[repo];
  if (cached) {
    try { return JSON.parse(cached.data); } catch { return null; }
  }
  return null;
}

export async function setCachedRepoInfo(repo: string, data: import('../types').GitHubRepoInfo): Promise<void> {
  const now = new Date().toISOString();
  const json = JSON.stringify(data);
  const db = await getDb();
  if (db) {
    await db.execute(
      'INSERT INTO github_repo_cache (repo, data, fetched_at) VALUES ($1, $2, $3) ON CONFLICT(repo) DO UPDATE SET data = $2, fetched_at = $3',
      [repo, json, now]
    );
  } else {
    const store = getBrowserStore();
    if (!(store as any).github_repo_cache) (store as any).github_repo_cache = {};
    (store as any).github_repo_cache[repo] = { data: json, fetched_at: now };
    saveBrowserStore(store);
  }
}

export async function getCachedContributions(): Promise<{ date: string; count: number }[]> {
  const db = await getDb();
  if (db) {
    const rows: { date: string; count: number }[] = await db.select(
      'SELECT date, count FROM github_contributions ORDER BY date ASC'
    );
    return rows;
  }
  const store = getBrowserStore();
  return (store as any).github_contributions || [];
}

export async function setCachedContributions(contributions: { date: string; count: number }[]): Promise<void> {
  const now = new Date().toISOString();
  const db = await getDb();
  if (db) {
    await db.execute('DELETE FROM github_contributions');
    for (const item of contributions) {
      await db.execute(
        'INSERT INTO github_contributions (date, count, fetched_at) VALUES ($1, $2, $3)',
        [item.date, item.count, now]
      );
    }
  } else {
    const store = getBrowserStore();
    (store as any).github_contributions = contributions.map(c => ({ ...c, fetched_at: now }));
    saveBrowserStore(store);
  }
}

// COURSE ICON
export async function updateCourseIcon(id: string, icon: string | null): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.execute('UPDATE courses SET icon = $1 WHERE id = $2', [icon, id]);
  } else {
    const store = getBrowserStore();
    const c = store.courses.find(item => item.id === id);
    if (c) {
      (c as any).icon = icon;
      saveBrowserStore(store);
    }
  }
}

// ACTIVITY DETAIL: Get sections done on a specific date (with node and space context)
export interface SectionDoneOnDate {
  section_id: string;
  section_title: string;
  course_id: string;
  course_name: string;
  space_id: string;
  space_name: string;
  done_at: string;
}

export async function getSectionsDoneOnDate(date: string): Promise<SectionDoneOnDate[]> {
  const db = await getDb();
  const dateLike = `${date}%`;
  if (db) {
    return await db.select(`
      SELECT
        s.id as section_id,
        s.title as section_title,
        s.course_id,
        s.done_at,
        c.name as course_name,
        c.space_id,
        sp.name as space_name
      FROM sections s
      JOIN courses c ON s.course_id = c.id
      JOIN spaces sp ON c.space_id = sp.id
      WHERE s.is_done = 1 AND s.done_at LIKE $1
      ORDER BY s.done_at ASC
    `, [dateLike]);
  } else {
    const store = getBrowserStore();
    const result: SectionDoneOnDate[] = [];
    for (const s of store.sections) {
      if (s.is_done !== 1 || !s.done_at) continue;
      const sDate = s.done_at.split('T')[0];
      if (sDate !== date) continue;
      const c = store.courses.find(item => item.id === s.course_id);
      const sp = c ? store.spaces.find(item => item.id === c.space_id) : null;
      if (c && sp) {
        result.push({
          section_id: s.id,
          section_title: s.title,
          course_id: c.id,
          course_name: c.name,
          space_id: sp.id,
          space_name: sp.name,
          done_at: s.done_at || date,
        });
      }
    }
    return result;
  }
}
