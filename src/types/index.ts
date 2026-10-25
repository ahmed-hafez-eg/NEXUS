export interface Space {
  id: string;
  name: string;
  created_at: string;
  focused_node_id?: string | null;
  folder_id?: string | null;
  github_repo?: string | null;
}

export interface SpaceFolder {
  id: string;
  name: string;
  created_at: string;
  parent_folder_id?: string | null;
}

export interface CourseLink {
  id: string;
  url: string;
  title?: string;
}

export interface Course {
  id: string;
  space_id: string;
  name: string;
  pos_x: number;
  pos_y: number;
  hashtags?: string[];
  links?: CourseLink[];
  created_at: string;
  github_repo?: string | null;
  icon?: string | null; // node icon id, e.g. 'node-graph', 'brain', 'book', etc.
}

export interface CourseWithSpace {
  id: string;
  name: string;
  space_id: string;
  space_name: string;
  hashtags?: string[];
  links?: CourseLink[];
  course_id?: string;
  course_name?: string;
  github_repo?: string | null;
}

export interface Section {
  id: string;
  course_id: string;
  title: string;
  is_done: number; // 0 or 1
  is_flagged?: number; // 0 or 1
  done_at: string | null;
  order_index: number;
  note?: string | null;
  proof_url?: string | null;
  proof_label?: string | null;
}

export interface GitHubRepoInfo {
  full_name: string;
  description?: string;
  stars: number;
  issues: number;
  forks: number;
  pushed_at: string;
  html_url: string;
  default_branch?: string;
  fetchedAt?: string;
}

export interface GitHubCommitItem {
  sha: string;
  shortSha: string;
  message: string;
  html_url: string;
  date: string;
  authorName: string;
}

export interface FlaggedSectionItem extends Section {
  course_name: string;
  space_id: string;
  space_name: string;
}

export interface NodeHashtagItem {
  course_id: string;
  course_name: string;
  space_id: string;
  space_name: string;
  hashtags: string[];
}

export interface Connection {
  id: string;
  space_id: string;
  source_course_id: string;
  target_course_id: string;
  source_handle?: string | null;
  target_handle?: string | null;
}

export interface SpaceLink {
  id: string;
  space_id: string;
  linked_space_id: string;
  target_course_id?: string | null;
  target_section_id?: string | null;
  pos_x: number;
  pos_y: number;
  created_at: string;
}

export interface TextNode {
  id: string;
  space_id: string;
  text: string;
  color: string; // hex, e.g. "#475569"
  pos_x: number;
  pos_y: number;
  created_at: string;
}

export interface ActivityLog {
  date: string; // 'YYYY-MM-DD'
  count: number;
}

export interface CourseStats {
  total: number;
  done: number;
}

export interface ExportData {
  version: string;
  exported_at: string;
  spaces: Space[];
  space_folders?: SpaceFolder[];
  courses: Course[];
  sections: Section[];
  connections: Connection[];
  space_links?: SpaceLink[];
  text_nodes?: TextNode[];
  activity_log: ActivityLog[];
}

