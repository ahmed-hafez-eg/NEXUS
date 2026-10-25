import { Space, Course } from '../types';

/**
 * Resolves the effective GitHub repository for a Course node.
 * Space-level repo takes precedence (strict inheritance).
 * If the Space is linked to a repo, all nodes in the Space inherit it.
 * If the Space has no repo linked, falls back to the Course node's individual repo.
 */
export function resolveRepo(space?: Space | null, course?: Course | null): string | null {
  if (space?.github_repo?.trim()) {
    return space.github_repo.trim();
  }
  if (course?.github_repo?.trim()) {
    return course.github_repo.trim();
  }
  return null;
}

/**
 * Returns true if the course node is inheriting its repo from its parent Space.
 */
export function isRepoInherited(space?: Space | null): boolean {
  return Boolean(space?.github_repo?.trim());
}
