import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  ListTodo,
  Edit2,
  Check,
  StickyNote,
  Bookmark,
  Hash,
  Link2,
  ExternalLink,
  Target,
  Github,
  GitCommit,
  Lock,
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useSpaceStore } from '../../store/useSpaceStore';
import { useSectionStore } from '../../store/useSectionStore';
import { openExternalUrl } from '../../utils/opener';
import { resolveRepo, isRepoInherited } from '../../utils/repoResolver';
import { Course, CourseLink, Section } from '../../types';
import { parseJsonArray } from '../../db/client';
import { RepoStatusBadge } from '../GitHub/RepoStatusBadge';
import { ProofOfWorkBadge } from '../GitHub/ProofOfWorkBadge';
import { ProofOfWorkModal } from '../GitHub/ProofOfWorkModal';
import { ArgonProgressBar } from '../UI/ArgonProgressBar';
import { ArgonButton } from '../UI/ArgonButton';
import { showToast } from '../../store/useToastStore';
import { getNodeIcon, NodeIconPicker, NodeIconId } from '../Icons/NodeIcons';

export const CourseDetailPanel: React.FC = () => {
  const activePanel = useUIStore(s => s.activePanel);
  const closePanel = useUIStore(s => s.closePanel);
  const panelWidth = useUIStore(s => s.panelWidth);
  const setPanelWidth = useUIStore(s => s.setPanelWidth);
  const theme = useUIStore(s => s.theme);
  const isDark = theme === 'dark';

  const selectedCourseId = useCanvasStore(s => s.selectedCourseId);
  const courses = useCanvasStore(s => s.courses);
  const updateCourseName = useCanvasStore(s => s.updateCourseName);
  const updateCourseHashtags = useCanvasStore(s => s.updateCourseHashtags);
  const updateCourseLinks = useCanvasStore(s => s.updateCourseLinks);
  const updateCourseGithubRepo = useCanvasStore(s => s.updateCourseGithubRepo);
  const updateCourseIcon = useCanvasStore(s => s.updateCourseIcon);

  const spaces = useSpaceStore(s => s.spaces);
  const activeSpaceId = useSpaceStore(s => s.activeSpaceId);
  const setSpaceFocus = useSpaceStore(s => s.setSpaceFocus);

  const sections = useSectionStore(s => s.sections);
  const loadSections = useSectionStore(s => s.loadSections);
  const toggleSection = useSectionStore(s => s.toggleSection);
  const toggleSectionFlag = useSectionStore(s => s.toggleSectionFlag);
  const addSection = useSectionStore(s => s.addSection);
  const updateTitle = useSectionStore(s => s.updateTitle);
  const updateSectionNote = useSectionStore(s => s.updateSectionNote);
  const deleteSection = useSectionStore(s => s.deleteSection);

  const [newTitle, setNewTitle] = useState('');
  const [editingCourseName, setEditingCourseName] = useState(false);
  const [courseNameInput, setCourseNameInput] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [editingSecId, setEditingSecId] = useState<string | null>(null);
  const [editingSecTitle, setEditingSecTitle] = useState('');

  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const [githubRepoInput, setGithubRepoInput] = useState('');
  const [proofModalSection, setProofModalSection] = useState<Section | null>(null);

  const isOpen = activePanel === 'course_detail' && !!selectedCourseId;
  const currentCourse = courses.find(c => c.id === selectedCourseId);
  const activeSpace = spaces.find(s => s.id === (currentCourse?.space_id || activeSpaceId));
  const isFocused = !!(currentCourse && activeSpace && activeSpace.focused_node_id === currentCourse.id);

  useEffect(() => {
    if (selectedCourseId) {
      loadSections(selectedCourseId);
      setOpenNoteId(null);
      setNoteDrafts({});
      setShowAddLinkForm(false);
    }
  }, [selectedCourseId, loadSections]);

  useEffect(() => {
    if (currentCourse) {
      setCourseNameInput(currentCourse.name);
      setGithubRepoInput(currentCourse.github_repo || '');
    }
  }, [currentCourse]);

  const handleSaveGithubRepo = async (val: string) => {
    if (!currentCourse) return;
    const clean = val.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
    await updateCourseGithubRepo(currentCourse.id, clean || null);
    setGithubRepoInput(clean);
    showToast.success(clean ? `Linked GitHub repo ${clean}` : 'Unlinked GitHub repo');
  };

  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const sec of sections) {
      if (!(sec.id in noteDrafts)) {
        initial[sec.id] = sec.note ?? '';
      }
    }
    if (Object.keys(initial).length > 0) {
      setNoteDrafts(prev => ({ ...initial, ...prev }));
    }
  }, [sections]);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = window.innerWidth - moveEvent.clientX;
      const clamped = Math.min(Math.max(newWidth, 320), Math.min(window.innerWidth * 0.85, 900));
      setPanelWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (!isOpen || !currentCourse) return null;

  const total = sections.length;
  const doneCount = sections.filter(s => s.is_done === 1).length;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const isComplete = total > 0 && doneCount === total;

  const handleSaveCourseName = async () => {
    if (courseNameInput.trim() && courseNameInput.trim() !== currentCourse.name) {
      await updateCourseName(currentCourse.id, courseNameInput.trim());
      showToast.success('Updated node name');
    }
    setEditingCourseName(false);
  };

  const getSafeHashtags = (course: Course): string[] => parseJsonArray<string>(course?.hashtags);
  const getSafeLinks = (course: Course): CourseLink[] => parseJsonArray<CourseLink>(course?.links);

  const handleAddHashtag = async () => {
    const clean = tagInput.trim().replace(/^#+/, '').trim();
    if (!clean) return;
    const existing = getSafeHashtags(currentCourse);
    if (!existing.some(t => t.toLowerCase() === clean.toLowerCase())) {
      const updated = [...existing, clean];
      await updateCourseHashtags(currentCourse.id, updated);
      showToast.info(`Added hashtag #${clean}`);
    }
    setTagInput('');
  };

  const handleRemoveHashtag = async (tagToRemove: string) => {
    const existing = getSafeHashtags(currentCourse);
    const updated = existing.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase());
    await updateCourseHashtags(currentCourse.id, updated);
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawUrl = linkUrl.trim();
    if (!rawUrl) return;

    let cleanUrl = rawUrl;
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }

    let displayTitle = linkTitle.trim();
    if (!displayTitle) {
      try {
        const parsed = new URL(cleanUrl);
        displayTitle = parsed.hostname.replace(/^www\./, '');
      } catch {
        displayTitle = cleanUrl;
      }
    }

    const newLink: CourseLink = {
      id: 'link-' + crypto.randomUUID(),
      url: cleanUrl,
      title: displayTitle,
    };

    const existing = getSafeLinks(currentCourse);
    await updateCourseLinks(currentCourse.id, [...existing, newLink]);
    setLinkUrl('');
    setLinkTitle('');
    setShowAddLinkForm(false);
    showToast.success('Added external link');
  };

  const handleRemoveLink = async (linkId: string) => {
    const existing = currentCourse.links || [];
    await updateCourseLinks(currentCourse.id, existing.filter(l => l.id !== linkId));
  };

  const handleOpenLink = (url: string) => {
    openExternalUrl(url);
  };

  const handleToggleFocus = async () => {
    if (!currentCourse || !activeSpace) return;
    if (isFocused) {
      await setSpaceFocus(activeSpace.id, null);
      showToast.info('Cleared space focus');
    } else {
      await setSpaceFocus(activeSpace.id, currentCourse.id);
      showToast.success(`Set "${currentCourse.name}" as focus target`);
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      await addSection(newTitle.trim());
      setNewTitle('');
    }
  };

  const handleSaveSectionTitle = async (secId: string) => {
    if (editingSecTitle.trim()) {
      await updateTitle(secId, editingSecTitle.trim());
    }
    setEditingSecId(null);
  };

  const handleNoteChange = (secId: string, value: string) => {
    setNoteDrafts(prev => ({ ...prev, [secId]: value }));
  };

  const handleNoteSave = async (secId: string) => {
    const note = (noteDrafts[secId] ?? '').trim() || null;
    await updateSectionNote(secId, note);
    showToast.info('Note auto-saved');
  };

  const toggleNotePanel = (secId: string, currentNote: string | null | undefined) => {
    if (openNoteId === secId) {
      setOpenNoteId(null);
    } else {
      setNoteDrafts(prev => ({ ...prev, [secId]: currentNote ?? '' }));
      setOpenNoteId(secId);
    }
  };

  const panelBg = isDark
    ? 'bg-[#141414] border-[#262626] text-[#ededed] shadow-2xl'
    : 'bg-white border-slate-200 text-[#2B3674] shadow-2xl';

  const headerBg = isDark
    ? 'border-[#262626] bg-[#111111]'
    : 'border-slate-100 bg-slate-50';

  const cardSectionBg = isDark
    ? 'bg-[#1a1a1a] border-[#262626]'
    : 'bg-slate-50/80 border-slate-100';

  const inputBg = isDark
    ? 'bg-[#111111] border-[#333333] text-[#ededed] placeholder-[#6b6b6b] focus:border-[#2CD9FF]'
    : 'bg-white border-slate-200 text-[#2B3674] placeholder-[#a1a1a1] focus:border-[#1171EE]';

  return (
    <div
      style={{ width: `${panelWidth}px`, maxWidth: '90vw' }}
      className={`fixed inset-y-0 right-0 z-40 border-l flex flex-col transition-all duration-350 ease-out animate-slide-in-right ${panelBg}`}
    >
      {/* Resizing Edge Bar */}
      <div
        onMouseDown={handleMouseDownResize}
        className={`absolute -left-2 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center group z-50 select-none ${
          isDragging ? 'opacity-100' : 'opacity-0 hover:opacity-100'
        }`}
        title="Drag left/right to resize panel"
      >
        <div
          className={`w-1 h-14 rounded-full transition-all ${
            isDragging
              ? 'bg-[#2CD9FF] w-1.5 shadow-[0_0_12px_rgba(44,217,255,0.6)]'
              : 'bg-slate-500 group-hover:bg-[#2CD9FF]'
          }`}
        />
      </div>

      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${headerBg}`}>
        <div className="flex items-center gap-3 flex-1 mr-2 min-w-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowIconPicker(!showIconPicker)}
              className="w-8 h-8 rounded-xl bg-gradient-argon-primary flex items-center justify-center text-white shrink-0 shadow-argon-primary hover:scale-105 active:scale-95 transition"
              title="Click to change node icon"
              aria-label="Change node icon"
            >
              {getNodeIcon(currentCourse.icon, 16)}
            </button>
            {showIconPicker && (
              <div
                className={`absolute left-0 top-10 z-50 p-2.5 rounded-2xl border shadow-2xl w-[190px] ${
                  isDark ? 'bg-[#141414] border-[#333333]' : 'bg-white border-slate-200'
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider mb-2 text-[#a1a1a1]">
                  Choose Icon
                </div>
                <NodeIconPicker
                  value={currentCourse.icon}
                  onChange={async (newIcon: NodeIconId) => {
                    await updateCourseIcon(currentCourse.id, newIcon);
                    setShowIconPicker(false);
                    showToast.info('Updated node icon');
                  }}
                  isDark={isDark}
                />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            {editingCourseName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={courseNameInput}
                  onChange={e => setCourseNameInput(e.target.value)}
                  onBlur={handleSaveCourseName}
                  onKeyDown={e => e.key === 'Enter' && handleSaveCourseName()}
                  autoFocus
                  className={`border rounded-lg px-2 py-1 text-sm font-bold w-full focus:outline-none ${inputBg}`}
                />
                <button onClick={handleSaveCourseName} className="p-1 text-sky-400 hover:text-sky-300">
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 group cursor-pointer"
                onClick={() => setEditingCourseName(true)}
              >
                <h2 className="text-sm font-bold truncate">
                  {currentCourse.name}
                </h2>
                <Edit2 size={13} className="opacity-0 group-hover:opacity-100 transition text-[#a1a1a1]" />
              </div>
            )}
            <span className="text-[11px] text-[#a1a1a1]">Node Checklist & Progress</span>
          </div>
        </div>

        {/* Focus Target Button & Close */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleToggleFocus}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              isFocused
                ? 'bg-gradient-argon-warning text-white shadow-argon-warning border-amber-300/40 animate-pulse'
                : isDark
                ? 'bg-[#1a1a1a] text-[#a1a1a1] hover:text-white border-white/10 hover:border-amber-400/50'
                : 'bg-slate-100 text-slate-700 hover:text-[#2B3674] border-slate-200 hover:border-amber-400'
            }`}
            title={isFocused ? 'Click to clear space focus' : 'Set as space focus target'}
          >
            <Target size={13} strokeWidth={2.5} />
            <span>{isFocused ? 'Focused' : 'Set Focus'}</span>
          </button>
          <button
            onClick={closePanel}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Progress Card Section */}
      <div className={`p-5 border-b shrink-0 ${cardSectionBg}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            {isComplete ? (
              <CheckCircle2 size={16} className="text-emerald-400" />
            ) : (
              <ListTodo size={16} className="text-[#2CD9FF]" />
            )}
            <span>{doneCount} of {total} sub-tasks completed</span>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              isComplete
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-sky-500/15 text-[#2CD9FF] border border-sky-500/30'
            }`}
          >
            {percent}%
          </span>
        </div>
        <ArgonProgressBar
          value={percent}
          variant={isComplete ? 'success' : 'primary'}
          height={6}
          isDark={isDark}
        />
      </div>

      {/* Scrollable Center Body: Tags, Links, GitHub, Checklist */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Hashtags Card */}
        <div className={`p-4 rounded-2xl border ${cardSectionBg}`}>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#a1a1a1]">
              Hashtags
            </label>
          </div>

          {(() => {
            const safeTags = getSafeHashtags(currentCourse);
            return safeTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {safeTags.map(tag => (
                  <span
                    key={tag}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      isDark
                        ? 'bg-sky-500/15 text-[#2CD9FF] border-sky-500/30'
                        : 'bg-sky-50 text-sky-700 border-sky-200'
                    }`}
                  >
                    <span>#{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveHashtag(tag)}
                      className="hover:text-rose-400 p-0.5 rounded transition"
                      title="Remove tag"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-[#707E94] mb-3">No hashtags attached yet.</p>
            );
          })()}

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Hash size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleAddHashtag();
                  }
                }}
                placeholder="Add hashtag (e.g. backend, priority)..."
                className={`w-full border rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none transition ${inputBg}`}
              />
            </div>
            <button
              type="button"
              onClick={handleAddHashtag}
              disabled={!tagInput.trim()}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border disabled:opacity-40 ${
                isDark
                  ? 'bg-[#1a1a1a] text-slate-200 border-white/10 hover:border-sky-400'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-sky-400'
              }`}
            >
              + Add
            </button>
          </div>
        </div>

        {/* Links Card */}
        <div className={`p-4 rounded-2xl border ${cardSectionBg}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Link2 size={13} className="text-[#2CD9FF]" />
              <label className="text-xs font-bold uppercase tracking-wider text-[#a1a1a1]">
                External Links
              </label>
            </div>
            <button
              type="button"
              onClick={() => setShowAddLinkForm(!showAddLinkForm)}
              className="text-xs font-bold text-[#2CD9FF] hover:text-sky-300 transition flex items-center gap-1"
            >
              {showAddLinkForm ? <X size={13} /> : <Plus size={13} strokeWidth={2.5} />}
              <span>{showAddLinkForm ? 'Cancel' : 'Add Link'}</span>
            </button>
          </div>

          {(() => {
            const safeLinks = getSafeLinks(currentCourse);
            return safeLinks.length > 0 ? (
              <div className="space-y-1.5 mb-2.5">
                {safeLinks.map(link => (
                  <div
                    key={link.id}
                    className={`group flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs transition ${
                      isDark
                        ? 'bg-[#111111] hover:bg-[#1a1a1a] border-white/10 text-white'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-[#2B3674]'
                    }`}
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => {
                        e.preventDefault();
                        handleOpenLink(link.url);
                      }}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left hover:text-[#2CD9FF] transition cursor-pointer"
                      title={`Open ${link.url}`}
                    >
                      <ExternalLink size={13} className="text-[#2CD9FF] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{link.title || link.url}</div>
                        <div className="text-[10px] truncate text-[#707E94]">{link.url}</div>
                      </div>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleRemoveLink(link.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 transition"
                      title="Delete link"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : !showAddLinkForm ? (
              <p className="text-xs italic text-[#707E94] mb-2">No links added yet.</p>
            ) : null;
          })()}

          {showAddLinkForm && (
            <form onSubmit={handleAddLink} className="space-y-2 mt-2 pt-2 border-t border-white/10">
              <input
                type="text"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="URL (e.g. docs.github.com or https://...)"
                autoFocus
                className={`w-full border rounded-xl px-3 py-1.5 text-xs outline-none transition ${inputBg}`}
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={linkTitle}
                  onChange={e => setLinkTitle(e.target.value)}
                  placeholder="Label (optional)"
                  className={`flex-1 border rounded-xl px-3 py-1.5 text-xs outline-none transition ${inputBg}`}
                />
                <button
                  type="submit"
                  disabled={!linkUrl.trim()}
                  className="px-3 py-1.5 bg-gradient-argon-primary disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-argon-primary transition"
                >
                  Save Link
                </button>
              </div>
            </form>
          )}
        </div>

        {/* GitHub Repository Card */}
        {(() => {
          const isInherited = isRepoInherited(activeSpace);
          const effectiveRepo = resolveRepo(activeSpace, currentCourse);

          return (
            <div className={`p-4 rounded-2xl border ${cardSectionBg}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Github size={13} className="text-[#2CD9FF]" />
                  <label className="text-xs font-bold uppercase tracking-wider text-[#a1a1a1]">
                    GitHub Repository
                  </label>
                </div>
                {!isInherited && currentCourse.github_repo && (
                  <button
                    onClick={() => handleSaveGithubRepo('')}
                    className="text-[11px] text-slate-400 hover:text-rose-400 transition"
                  >
                    Unlink
                  </button>
                )}
              </div>

              {isInherited ? (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                    isDark ? 'bg-sky-500/10 border-sky-500/20 text-sky-200' : 'bg-sky-50 border-sky-200 text-sky-900'
                  }`}
                  title={`Inherited from Space "${activeSpace?.name || 'Current Space'}". To change this repository, update the Space settings in GitHub Integration.`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Lock size={14} className="text-[#2CD9FF] shrink-0" />
                    <div className="truncate">
                      <span className="font-semibold text-[11px] opacity-75 mr-1">Inherited from Space:</span>
                      <span className="font-bold font-mono">{effectiveRepo}</span>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">
                    Locked
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={githubRepoInput}
                    onChange={e => setGithubRepoInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveGithubRepo(githubRepoInput)}
                    placeholder="owner/repository..."
                    className={`flex-1 border rounded-xl px-3 py-1.5 text-xs outline-none transition ${inputBg}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveGithubRepo(githubRepoInput)}
                    disabled={githubRepoInput.trim() === (currentCourse.github_repo || '')}
                    className="px-3 py-1.5 bg-gradient-argon-primary disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-argon-primary transition"
                  >
                    Save
                  </button>
                </div>
              )}

              {effectiveRepo && (
                <div className="mt-2.5">
                  <RepoStatusBadge repo={effectiveRepo} isDark={isDark} />
                </div>
              )}
            </div>
          );
        })()}

        {/* Sub-Tasks Checklist */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-[#a1a1a1]">
              Sub-Tasks ({doneCount}/{total})
            </span>
          </div>

          {sections.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#707E94] border border-dashed rounded-2xl">
              No sub-tasks yet. Use the field below to add your first checklist item.
            </div>
          ) : (
            <div className="space-y-2">
              {sections.map(sec => {
                const isFlagged = sec.is_flagged === 1;
                const isNoteOpen = openNoteId === sec.id;
                const hasNote = Boolean(sec.note && sec.note.trim());
                const draftNote = noteDrafts[sec.id] ?? sec.note ?? '';

                return (
                  <div key={sec.id} className="group flex flex-col">
                    <div
                      className={`flex items-center justify-between gap-2.5 p-3 rounded-2xl border transition-all ${
                        sec.is_done === 1
                          ? isDark
                            ? 'bg-[#111111]/50 border-emerald-500/20 text-slate-400'
                            : 'bg-emerald-50/50 border-emerald-200 text-slate-500'
                          : isDark
                          ? 'bg-[#1a1a1a] border-white/10 text-white hover:border-sky-400/40'
                          : 'bg-white border-slate-200 text-[#2B3674] hover:border-sky-300'
                      }`}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={sec.is_done === 1}
                        onChange={() => toggleSection(sec.id, sec.is_done !== 1)}
                        className="w-4 h-4 rounded-md border-sky-400 text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500 shrink-0"
                      />

                      {/* Title or inline edit */}
                      <div className="flex-1 min-w-0">
                        {editingSecId === sec.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingSecTitle}
                              onChange={e => setEditingSecTitle(e.target.value)}
                              onBlur={() => handleSaveSectionTitle(sec.id)}
                              onKeyDown={e => e.key === 'Enter' && handleSaveSectionTitle(sec.id)}
                              autoFocus
                              className={`border rounded-lg px-2 py-0.5 text-xs w-full outline-none ${inputBg}`}
                            />
                            <button
                              onClick={() => handleSaveSectionTitle(sec.id)}
                              className="p-1 text-sky-400"
                            >
                              <Check size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              onClick={() => {
                                setEditingSecId(sec.id);
                                setEditingSecTitle(sec.title);
                              }}
                              className={`text-xs font-semibold cursor-pointer truncate hover:underline ${
                                sec.is_done === 1
                                  ? 'line-through text-slate-500'
                                  : isDark
                                  ? 'text-white'
                                  : 'text-[#2B3674]'
                              }`}
                              title="Click to rename"
                            >
                              {sec.title}
                            </span>
                            {sec.proof_url && (
                              <ProofOfWorkBadge proofUrl={sec.proof_url} proofLabel={sec.proof_label} />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action buttons: Proof, Flag, Note, Delete */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => setProofModalSection(sec)}
                          className={`p-1.5 rounded-lg transition ${
                            sec.proof_url
                              ? 'text-[#2CD9FF]'
                              : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-[#2CD9FF]'
                          }`}
                          title={sec.proof_url ? 'Edit Proof of Work' : 'Attach Proof of Work'}
                        >
                          <GitCommit size={14} />
                        </button>

                        <button
                          onClick={() => toggleSectionFlag(sec.id, !isFlagged)}
                          className={`p-1.5 rounded-lg transition ${
                            isFlagged
                              ? 'text-amber-400'
                              : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-400'
                          }`}
                          title={isFlagged ? 'Unflag sub-task' : 'Flag sub-task'}
                        >
                          <Bookmark size={14} className={isFlagged ? 'fill-amber-400' : ''} />
                        </button>

                        <button
                          onClick={() => toggleNotePanel(sec.id, sec.note)}
                          className={`relative flex items-center gap-0.5 p-1.5 rounded-lg transition ${
                            hasNote
                              ? 'text-[#2CD9FF]'
                              : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white'
                          }`}
                          title={hasNote ? 'View/edit note' : 'Add note'}
                        >
                          <StickyNote size={14} />
                          {hasNote && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#2CD9FF] rounded-full" />
                          )}
                        </button>

                        <button
                          onClick={() => deleteSection(sec.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition"
                          title="Delete Sub-task"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Note Editor */}
                    {isNoteOpen && (
                      <div className={`border border-t-0 rounded-b-2xl p-3.5 ml-2 mr-2 animate-fade-in-up ${cardSectionBg}`}>
                        <textarea
                          value={draftNote}
                          onChange={e => handleNoteChange(sec.id, e.target.value)}
                          onBlur={() => handleNoteSave(sec.id)}
                          placeholder="Add note, code snippet, or reminder..."
                          rows={3}
                          className={`w-full text-xs rounded-xl p-2.5 outline-none resize-none transition ${inputBg}`}
                        />
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-[#707E94]">Auto-saves on blur</span>
                          <button
                            onClick={() => handleNoteSave(sec.id)}
                            className="text-[11px] font-bold px-3 py-1 bg-gradient-argon-primary text-white rounded-lg shadow-argon-primary transition"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add New Section Footer Form */}
      <form onSubmit={handleAddSection} className={`p-4 border-t shrink-0 ${cardSectionBg}`}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Add new sub-task..."
            className={`flex-1 border rounded-xl px-3.5 py-2 text-xs outline-none transition ${inputBg}`}
          />
          <ArgonButton
            variant="primary"
            size="sm"
            type="submit"
            disabled={!newTitle.trim()}
            leftIcon={<Plus size={15} strokeWidth={2.5} />}
          >
            Add
          </ArgonButton>
        </div>
      </form>

      {/* Proof of Work Modal */}
      {proofModalSection && (
        <ProofOfWorkModal
          isOpen={!!proofModalSection}
          onClose={() => setProofModalSection(null)}
          section={proofModalSection}
          courseRepo={resolveRepo(activeSpace, currentCourse)}
        />
      )}
    </div>
  );
};
