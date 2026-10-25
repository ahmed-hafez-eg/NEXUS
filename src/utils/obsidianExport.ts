import JSZip from 'jszip';
import * as db from '../db/client';
import { ExportData, Course, Section, TextNode, SpaceFolder } from '../types';

/**
 * Sanitize strings for safe filesystem paths and Obsidian file names
 */
function sanitizeFileName(name: string): string {
  if (!name) return 'Untitled';
  return name.replace(/[\\/:*?"<>|]/g, '_').trim();
}

/**
 * Generates an Obsidian-compatible Markdown string for a course node
 */
function generateCourseMarkdown(
  course: Course,
  spaceName: string,
  folderName: string | undefined,
  sections: Section[],
  outgoingConnections: { targetName: string }[],
  incomingConnections: { sourceName: string }[]
): string {
  const totalSections = sections.length;
  const completedSections = sections.filter(s => s.is_done === 1).length;
  const progressPercent = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

  const safeHashtags = Array.isArray(course.hashtags) ? course.hashtags : [];
  const tags = safeHashtags.map(t => t.replace(/^#/, '')).filter(Boolean);

  // Frontmatter
  let md = '---\n';
  md += `id: "${course.id}"\n`;
  md += `title: "${course.name.replace(/"/g, '\\"')}"\n`;
  md += `space: "${spaceName.replace(/"/g, '\\"')}"\n`;
  if (folderName) {
    md += `folder: "${folderName.replace(/"/g, '\\"')}"\n`;
  }
  md += `progress: ${progressPercent}%\n`;
  md += `completed_tasks: ${completedSections}\n`;
  md += `total_tasks: ${totalSections}\n`;
  md += `created_at: "${course.created_at}"\n`;

  if (tags.length > 0) {
    md += 'tags:\n';
    tags.forEach(tag => {
      md += `  - ${tag}\n`;
    });
  }
  md += '---\n\n';

  // Heading
  md += `# ${course.name}\n\n`;

  // Progress Bar / Summary
  md += `> **Progress**: ${progressPercent}% (${completedSections}/${totalSections} completed)\n`;
  md += `> **Space**: [[${spaceName}]]\n\n`;

  // Sub-tasks section
  md += `## Sub-Tasks\n\n`;
  if (sections.length === 0) {
    md += `_No sub-tasks defined._\n\n`;
  } else {
    sections.forEach(sec => {
      const check = sec.is_done === 1 ? 'x' : ' ';
      const flag = sec.is_flagged === 1 ? ' 🚩' : '';
      md += `- [${check}] ${sec.title}${flag}\n`;
      if (sec.note && sec.note.trim()) {
        const noteLines = sec.note.trim().split('\n');
        noteLines.forEach(line => {
          md += `  > ${line}\n`;
        });
      }
    });
    md += '\n';
  }

  // Links section
  const safeLinks = Array.isArray(course.links) ? course.links : [];
  if (safeLinks.length > 0) {
    md += `## Links & Resources\n\n`;
    safeLinks.forEach(link => {
      const title = link.title && link.title.trim() ? link.title.trim() : link.url;
      md += `- [${title}](${link.url})\n`;
    });
    md += '\n';
  }

  // Connections (Obsidian graph [[wikilinks]])
  if (outgoingConnections.length > 0 || incomingConnections.length > 0) {
    md += `## Connected Nodes (Graph)\n\n`;
    if (outgoingConnections.length > 0) {
      md += `### Next Steps / Outgoing\n`;
      outgoingConnections.forEach(c => {
        md += `- [[${sanitizeFileName(c.targetName)}]]\n`;
      });
      md += '\n';
    }
    if (incomingConnections.length > 0) {
      md += `### Prerequisites / Incoming\n`;
      incomingConnections.forEach(c => {
        md += `- [[${sanitizeFileName(c.sourceName)}]]\n`;
      });
      md += '\n';
    }
  }

  return md;
}

/**
 * Generates an Obsidian note for a TextNode
 */
function generateTextNodeMarkdown(
  textNode: TextNode,
  spaceName: string,
  folderName: string | undefined
): string {
  let md = '---\n';
  md += `id: "${textNode.id}"\n`;
  md += `space: "${spaceName.replace(/"/g, '\\"')}"\n`;
  if (folderName) {
    md += `folder: "${folderName.replace(/"/g, '\\"')}"\n`;
  }
  md += `type: text_note\n`;
  md += `created_at: "${textNode.created_at}"\n`;
  md += '---\n\n';

  md += `# Note (${spaceName})\n\n`;
  md += `${textNode.text}\n`;
  return md;
}

export interface ObsidianExportResult {
  cancelled?: boolean;
  folderPath: string;
  fileCount: number;
}

/**
 * Helper to compute full relative folder path for a space based on nested folder hierarchy
 */
function getSpaceFolderRelativePath(
  space: import('../types').Space,
  foldersMap: Map<string, SpaceFolder>
): string {
  if (!space.folder_id) return '';
  const pathParts: string[] = [];
  let currentFolderId: string | null | undefined = space.folder_id;
  const visited = new Set<string>();

  while (currentFolderId && foldersMap.has(currentFolderId) && !visited.has(currentFolderId)) {
    visited.add(currentFolderId);
    const folder: SpaceFolder = foldersMap.get(currentFolderId)!;
    pathParts.unshift(sanitizeFileName(folder.name));
    currentFolderId = folder.parent_folder_id;
  }

  return pathParts.join('/');
}

/**
 * Exports all data from the database into an Obsidian-ready Vault.
 * Prompts user with native folder picker when running under Tauri,
 * remembers the destination folder in settings, and writes files directly.
 * Falls back to browser .zip download if running in dev web mode.
 */
export async function exportToObsidianVault(): Promise<ObsidianExportResult> {
  const data: ExportData = await db.exportAllData();

  // Create folder lookups
  const foldersMap = new Map<string, SpaceFolder>();
  (data.space_folders || []).forEach(f => foldersMap.set(f.id, f));

  const coursesById = new Map<string, Course>();
  data.courses.forEach(c => coursesById.set(c.id, c));

  // Build list of relative files
  const fileList: { relative_path: string; content: string }[] = [];

  // Build root index
  let rootIndex = `# Kolo_Tamam5 Obsidian Vault\n\n`;
  rootIndex += `Exported on: ${new Date().toLocaleString()}\n\n`;
  rootIndex += `## Spaces Overview\n\n`;

  for (const space of data.spaces) {
    const spaceFolderPath = getSpaceFolderRelativePath(space, foldersMap);
    const safeSpaceName = sanitizeFileName(space.name);

    const spaceBasePath = spaceFolderPath
      ? `${spaceFolderPath}/${safeSpaceName}`
      : safeSpaceName;

    const spaceFolder = space.folder_id ? foldersMap.get(space.folder_id) : undefined;
    rootIndex += `- **[[${safeSpaceName}]]** (${spaceFolderPath ? `Folder: _${spaceFolderPath}_` : 'Root'})\n`;

    // Gather courses in space
    const spaceCourses = data.courses.filter(c => c.space_id === space.id);
    const spaceConnections = (data.connections || []).filter(c => c.space_id === space.id);
    const spaceTextNodes = (data.text_nodes || []).filter(t => t.space_id === space.id);
    const spaceLinks = (data.space_links || []).filter(l => l.space_id === space.id);

    // Create space index note
    let spaceIndex = `# ${space.name}\n\n`;
    if (spaceFolderPath) {
      spaceIndex += `> Folder Hierarchy: **${spaceFolderPath}**\n\n`;
    }
    spaceIndex += `## Nodes in this Space\n\n`;

    if (spaceCourses.length === 0) {
      spaceIndex += `_No course nodes in this space yet._\n\n`;
    } else {
      spaceCourses.forEach(c => {
        const cSections = data.sections.filter(s => s.course_id === c.id);
        const doneCount = cSections.filter(s => s.is_done === 1).length;
        const pct = cSections.length > 0 ? Math.round((doneCount / cSections.length) * 100) : 0;
        spaceIndex += `- [[${sanitizeFileName(c.name)}]] — ${pct}% (${doneCount}/${cSections.length})\n`;
      });
      spaceIndex += '\n';
    }

    if (spaceTextNodes.length > 0) {
      spaceIndex += `## Notes & Sticky Notes\n\n`;
      spaceTextNodes.forEach((tn, idx) => {
        const preview = tn.text ? tn.text.slice(0, 40).replace(/\n/g, ' ') : `Note ${idx + 1}`;
        spaceIndex += `- [[Note - ${sanitizeFileName(preview)}]]\n`;
      });
      spaceIndex += '\n';
    }

    if (spaceLinks.length > 0) {
      spaceIndex += `## Space Links (Portals)\n\n`;
      spaceLinks.forEach(sl => {
        const targetSp = data.spaces.find(s => s.id === sl.linked_space_id);
        if (targetSp) {
          spaceIndex += `- Portal to Space: [[${sanitizeFileName(targetSp.name)}]]\n`;
        }
      });
      spaceIndex += '\n';
    }

    fileList.push({
      relative_path: `${spaceBasePath}/${safeSpaceName}.md`,
      content: spaceIndex,
    });

    // Save courses
    const seenFileNames = new Set<string>();
    for (const course of spaceCourses) {
      let fileName = sanitizeFileName(course.name);
      if (seenFileNames.has(fileName.toLowerCase())) {
        fileName = `${fileName}_${course.id.slice(0, 6)}`;
      }
      seenFileNames.add(fileName.toLowerCase());

      const courseSections = data.sections
        .filter(s => s.course_id === course.id)
        .sort((a, b) => a.order_index - b.order_index);

      // Outgoing & incoming connections
      const outgoing = spaceConnections
        .filter(c => c.source_course_id === course.id)
        .map(c => {
          const targetCourse = coursesById.get(c.target_course_id);
          return { targetName: targetCourse ? targetCourse.name : 'Unknown Node' };
        });

      const incoming = spaceConnections
        .filter(c => c.target_course_id === course.id)
        .map(c => {
          const srcCourse = coursesById.get(c.source_course_id);
          return { sourceName: srcCourse ? srcCourse.name : 'Unknown Node' };
        });

      const mdContent = generateCourseMarkdown(
        course,
        space.name,
        spaceFolder?.name,
        courseSections,
        outgoing,
        incoming
      );

      fileList.push({
        relative_path: `${spaceBasePath}/${fileName}.md`,
        content: mdContent,
      });
    }

    // Save text notes
    spaceTextNodes.forEach((tn, idx) => {
      const preview = tn.text ? tn.text.slice(0, 30).replace(/\n/g, ' ') : `Note_${idx + 1}`;
      const noteFileName = `Note - ${sanitizeFileName(preview)}`;
      const noteContent = generateTextNodeMarkdown(tn, space.name, spaceFolder?.name);
      fileList.push({
        relative_path: `${spaceBasePath}/${noteFileName}.md`,
        content: noteContent,
      });
    });
  }

  fileList.push({
    relative_path: 'Vault_Index.md',
    content: rootIndex,
  });

  // Check if running in Tauri environment
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  if (isTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');

      // Retrieve last used export directory
      const lastDir = await db.getSetting('last_obsidian_export_path', '');

      // Open native folder dialog
      const selectedPath: string = await invoke('pick_folder', {
        defaultPath: lastDir || undefined,
      });

      if (!selectedPath || !selectedPath.trim()) {
        return { cancelled: true, folderPath: '', fileCount: 0 };
      }

      const cleanDestination = selectedPath.trim();

      // Persist chosen folder path
      await db.setSetting('last_obsidian_export_path', cleanDestination);

      // Write files directly to chosen destination
      const writtenCount: number = await invoke('write_obsidian_vault', {
        destination: cleanDestination,
        files: fileList,
      });

      return {
        folderPath: cleanDestination,
        fileCount: writtenCount,
      };
    } catch (tauriErr) {
      console.warn('Tauri native folder export failed, falling back to .zip download:', tauriErr);
    }
  }

  // Fallback: browser .zip download
  const zip = new JSZip();
  for (const item of fileList) {
    zip.file(item.relative_path, item.content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `Kolo_Tamam5_Obsidian_Vault_${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);

  return {
    folderPath: 'Downloads (.zip archive)',
    fileCount: fileList.length,
  };
}
