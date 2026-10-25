import React, { useState } from 'react';
import { X, Plus, Trash2, Hash } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useSpaceStore } from '../../store/useSpaceStore';
import { ArgonButton } from '../UI/ArgonButton';
import { ArgonInput } from '../UI/ArgonInput';
import { showToast } from '../../store/useToastStore';
import { NodeGraphIcon, NodeIconPicker, NodeIconId } from '../Icons/NodeIcons';

const NAME_PLACEHOLDERS = [
  'e.g. Distributed Systems Architecture',
  'e.g. Launch checklist',
  'e.g. Weekly review',
  'e.g. Frontend performance audit',
  'e.g. System design notes',
];

export const AddCoursePanel: React.FC = () => {
  const activePanel = useUIStore(s => s.activePanel);
  const closePanel = useUIStore(s => s.closePanel);
  const activeSpaceId = useSpaceStore(s => s.activeSpaceId);
  const courses = useCanvasStore(s => s.courses);
  const createCourse = useCanvasStore(s => s.createCourse);
  const updateCourseIcon = useCanvasStore(s => s.updateCourseIcon);
  const theme = useUIStore(s => s.theme);
  const isDark = theme === 'dark';

  const [courseName, setCourseName] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [sections, setSections] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<NodeIconId>('node-graph');
  const [placeholderIdx] = useState(() => Math.floor(Math.random() * NAME_PLACEHOLDERS.length));

  const isOpen = activePanel === 'add_course';

  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#+/, '').trim();
    if (clean && !hashtags.some(t => t.toLowerCase() === clean.toLowerCase())) {
      setHashtags([...hashtags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setHashtags(hashtags.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase()));
  };

  const handleAddSectionRow = () => {
    setSections([...sections, '']);
  };

  const handleSectionChange = (index: number, val: string) => {
    const updated = [...sections];
    updated[index] = val;
    setSections(updated);
  };

  const handleRemoveSectionRow = (index: number) => {
    if (sections.length === 1) {
      setSections(['']);
    } else {
      setSections(sections.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) {
      setError('Please enter a node name');
      return;
    }
    if (!activeSpaceId) {
      setError('Please select or create a space first');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let posX = 260;
      let posY = 160;
      if (courses.length > 0) {
        const last = courses[courses.length - 1];
        posX = last.pos_x + 60;
        posY = last.pos_y + 120;
        if (posY > 600) {
          posY = 120;
          posX += 340;
        }
      }

      let finalTags = [...hashtags];
      const pendingTag = tagInput.trim().replace(/^#+/, '').trim();
      if (pendingTag && !finalTags.some(t => t.toLowerCase() === pendingTag.toLowerCase())) {
        finalTags.push(pendingTag);
      }

      const validSections = sections.map(s => s.trim()).filter(s => s.length > 0);
      const newCourse = await createCourse(activeSpaceId, courseName.trim(), posX, posY, validSections, finalTags);

      // Save chosen icon
      if (selectedIcon !== 'node-graph' && updateCourseIcon) {
        await updateCourseIcon(newCourse.id, selectedIcon);
      }

      showToast.success(`Created node "${courseName.trim()}"`);

      // Reset and close
      setCourseName('');
      setHashtags([]);
      setTagInput('');
      setSections(['']);
      setSelectedIcon('node-graph');
      closePanel();
    } catch (err) {
      console.error('Failed to create node', err);
      setError('Failed to save node. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const panelBg = isDark
    ? 'bg-[#141414] border-[#262626] text-[#ededed] shadow-2xl'
    : 'bg-white border-slate-200 text-[#2B3674] shadow-2xl';

  const headerBg = isDark
    ? 'border-[#262626] bg-[#111111]'
    : 'border-slate-100 bg-slate-50';

  const footerBg = isDark
    ? 'border-[#262626] bg-[#111111]'
    : 'border-slate-100 bg-slate-50';

  const rowInputBg = isDark
    ? 'bg-[#111111] border-[#333333] text-[#ededed] placeholder-[#6b6b6b] focus:border-[#2CD9FF]'
    : 'bg-white border-slate-200 text-[#2B3674] placeholder-[#a1a1a1] focus:border-[#1171EE]';

  return (
    <div
      className={`fixed inset-y-0 right-0 z-40 w-96 border-l flex flex-col transition-all duration-350 ease-out animate-slide-in-right ${panelBg}`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${headerBg}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-argon-primary flex items-center justify-center text-white shadow-argon-primary">
            <NodeGraphIcon size={16} />
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-tight">Add Node</h2>
            <p className="text-[11px] text-[#a1a1a1]">Name it, tag it, and add a checklist</p>
          </div>
        </div>
        <button
          onClick={closePanel}
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-medium">
              {error}
            </div>
          )}

          {/* Node Name Input */}
          <div>
            <ArgonInput
              label="Node Name"
              value={courseName}
              onChange={e => setCourseName(e.target.value)}
              placeholder={NAME_PLACEHOLDERS[placeholderIdx]}
              autoFocus
              isDark={isDark}
            />
          </div>

          {/* Icon Picker */}
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-[#a1a1a1]' : 'text-[#707E94]'}`}>
              Node Icon
            </label>
            <NodeIconPicker value={selectedIcon} onChange={setSelectedIcon} isDark={isDark} />
          </div>

          {/* Hashtags */}
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-[#a1a1a1]' : 'text-[#707E94]'}`}>
              Hashtags (Optional)
            </label>

            {/* Tag Pills */}
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {hashtags.map(tag => (
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
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-rose-400 p-0.5 rounded transition"
                      title="Remove tag"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Hash
                  size={14}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                    isDark ? 'text-slate-400' : 'text-slate-400'
                  }`}
                />
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="e.g. backend, priority"
                  className={`w-full border rounded-xl pl-8 pr-3 py-2 text-xs outline-none transition ${rowInputBg}`}
                />
              </div>
              <button
                type="button"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition border disabled:opacity-40 ${
                  isDark
                    ? 'bg-[#1a1a1a] text-slate-200 border-white/10 hover:border-sky-400'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-sky-400'
                }`}
              >
                + Add
              </button>
            </div>
          </div>

          {/* Sub-Tasks Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#a1a1a1]' : 'text-[#707E94]'}`}>
                Sub-Tasks
              </label>
              <button
                type="button"
                onClick={handleAddSectionRow}
                className="text-xs flex items-center gap-1 font-bold text-[#2CD9FF] hover:text-sky-300 transition"
              >
                <Plus size={14} strokeWidth={2.5} /> Add row
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {sections.map((sec, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-bold w-5 text-right ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={sec}
                    onChange={e => handleSectionChange(idx, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSectionRow();
                      }
                    }}
                    placeholder={`Sub-task ${idx + 1} title`}
                    className={`flex-1 border rounded-xl px-3 py-2 text-xs outline-none transition ${rowInputBg}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSectionRow(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Remove row"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddSectionRow}
              className={`mt-3 w-full py-2.5 border border-dashed rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                isDark
                  ? 'border-white/15 text-[#a1a1a1] hover:text-white hover:border-sky-400'
                  : 'border-slate-300 text-[#707E94] hover:text-[#2B3674] hover:border-sky-500'
              }`}
            >
              <Plus size={14} strokeWidth={2.5} /> Add Another Sub-Task
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`p-4 border-t flex items-center gap-3 shrink-0 ${footerBg}`}>
          <button
            type="button"
            onClick={closePanel}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold transition ${
              isDark ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Cancel
          </button>
          <ArgonButton
            variant="primary"
            size="md"
            type="submit"
            disabled={isSubmitting || !courseName.trim()}
            isLoading={isSubmitting}
            className="flex-1"
          >
            Save Node
          </ArgonButton>
        </div>
      </form>
    </div>
  );
};
