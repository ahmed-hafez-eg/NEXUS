import { SpaceLink } from '../types';

/**
 * Checks if creating a link from `fromSpaceId` to `toSpaceId` would create a circular dependency.
 * A circular dependency exists if there is already a directed path from `toSpaceId` back to `fromSpaceId`.
 */
export function wouldCreateCircularDependency(
  fromSpaceId: string,
  toSpaceId: string,
  allLinks: SpaceLink[]
): boolean {
  if (!fromSpaceId || !toSpaceId) return false;
  if (fromSpaceId === toSpaceId) return true;

  // Build adjacency list: space_id -> array of linked_space_ids
  const adj = new Map<string, string[]>();
  for (const link of allLinks) {
    const list = adj.get(link.space_id) || [];
    list.push(link.linked_space_id);
    adj.set(link.space_id, list);
  }

  // BFS from toSpaceId to check if fromSpaceId is reachable
  const queue: string[] = [toSpaceId];
  const visited = new Set<string>([toSpaceId]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === fromSpaceId) {
      return true; // Path exists, adding fromSpaceId -> toSpaceId completes a cycle!
    }

    const neighbors = adj.get(current) || [];
    for (const next of neighbors) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  return false;
}
