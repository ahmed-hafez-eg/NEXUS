import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  Hash,
  Search,
  ExternalLink,
  ChevronRight,
  FolderGit2,
  Layers,
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useSpaceStore } from '../../store/useSpaceStore';
import { useCanvasStore } from '../../store/useCanvasStore';
import * as db from '../../db/client';
import { NodeHashtagItem } from '../../types';
import { ArgonBadge } from '../UI/ArgonBadge';

export const HashtagSearchModal: React.FC = () => {
  const activePanel = useUIStore(s => s.activePanel);
  const closePanel = useUIStore(s => s.closePanel);
  const hashtagSearchQuery = useUIStore(s => s.hashtagSearchQuery);
  const setHashtagSearchQuery = useUIStore(s => s.setHashtagSearchQuery);
  const theme = useUIStore(s => s.theme);
  const isDark = theme === 'dark';

  const setActiveSpaceId = useSpaceStore(s => s.setActiveSpaceId);
  const setSelectedCourseId = useCanvasStore(s => s.setSelectedCourseId);
  const openCourseDetail = useUIStore(s => s.openCourseDetail);

  const [items, setItems] = useState<NodeHashtagItem[]>([]);
  const [search, setSearch] = useState(hashtagSearchQuery || '');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isOpen = activePanel === 'hashtag_search';

  const loadHashtags = async () => {
    setIsLoading(true);
    try {
      const data = await db.getAllNodeHashtags();
      setItems(data);
    } catch (err) {
      console.error('Failed to load node hashtags:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSearch(hashtagSearchQuery || '');
      loadHashtags();
    }
  }, [isOpen, hashtagSearchQuery]);

  const allUniqueTags = useMemo(() => {
    const tagCountMap: Record<string, { displayTag: string; count: number }> = {};
    for (const item of items) {
      for (const t of item.hashtags) {
        const lower = t.trim().toLowerCase();
        if (!lower) continue;
        if (!tagCountMap[lower]) {
          tagCountMap[lower] = { displayTag: t.trim(), count: 0 };
        }
        tagCountMap[lower].count += 1;
      }
    }
    return Object.entries(tagCountMap)
      .map(([key, { displayTag, count }]) => ({ key, tag: displayTag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items;

    if (selectedTagFilter) {
      const filterLower = selectedTagFilter.toLowerCase();
      result = result.filter(item =>
        item.hashtags.some(t => t.toLowerCase() === filterLower)
      );
    }

    if (!search.trim()) return result;

    const q = search.trim().toLowerCase().replace(/^#+/, '');
    return result.filter(item => {
      const matchesTag = item.hashtags.some(t => t.toLowerCase().includes(q));
      const matchesNode = item.course_name.toLowerCase().includes(q);
      const matchesSpace = item.space_name.toLowerCase().includes(q);
      return matchesTag || matchesNode || matchesSpace;
    });
  }, [items, search, selectedTagFilter]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setHashtagSearchQuery(val);
  };

  const handleClearSearch = () => {
    setSearch('');
    setHashtagSearchQuery('');
  };

  const handleJumpToNode = (item: NodeHashtagItem) => {
    setActiveSpaceId(item.space_id);
    setSelectedCourseId(item.course_id);
    openCourseDetail();
  };

  const handleTagFilterClick = (tag: string) => {
    if (selectedTagFilter?.toLowerCase() === tag.toLowerCase()) {
      setSelectedTagFilter(null);
    } else {
      setSelectedTagFilter(tag);
    }
  };

  if (!isOpen) return null;

  const modalBg = isDark
    ? 'bg-[#141414] border-[#262626] text-[#ededed] shadow-2xl'
    : 'bg-white border-slate-200 text-[#2B3674] shadow-2xl';

  const headerBg = isDark ? 'bg-[#111111] border-[#262626]' : 'bg-slate-50 border-slate-100';
  const itemBg = isDark
    ? 'bg-[#1a1a1a] hover:bg-[#202020] border-[#262626]'
    : 'bg-white hover:bg-slate-50 border-slate-200';

  const inputBg = isDark
    ? 'bg-[#141414] border-[#333333] text-[#ededed] placeholder-[#6b6b6b] focus:border-[#2CD9FF]'
    : 'bg-white border-slate-200 text-[#2B3674] placeholder-[#a1a1a1] focus:border-[#1171EE]';

  const breadcrumbBg = isDark
    ? 'bg-[#141414] text-[#a1a1a1] border-[#262626]'
    : 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div
        className={`relative w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border animate-fade-in-up ${modalBg}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${headerBg}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-argon-primary flex items-center justify-center text-white shadow-argon-primary">
              <Hash size={16} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Global Hashtag Search</h2>
                <ArgonBadge variant="primary" size="xs">
                  {allUniqueTags.length} {allUniqueTags.length === 1 ? 'tag' : 'tags'}
                </ArgonBadge>
              </div>
              <p className="text-[11px] text-[#a1a1a1]">
                Search and explore nodes across all workspaces by hashtag
              </p>
            </div>
          </div>
          <button
            onClick={closePanel}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar & Tag Filter Bar */}
        <div className="p-4 border-b border-white/10 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search by #hashtag, course name, or space name..."
              autoFocus
              className={`w-full pl-9 pr-8 py-2 text-xs rounded-xl border outline-none transition ${inputBg}`}
            />
            {search && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Quick Tag Filter Pills */}
          {allUniqueTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-1">
              <span className="text-[11px] font-bold text-[#a1a1a1] mr-1">Filter:</span>
              {allUniqueTags.map(({ key, tag, count }) => {
                const isSelected = selectedTagFilter?.toLowerCase() === key.toLowerCase();
                return (
                  <button
                    key={key}
                    onClick={() => handleTagFilterClick(tag)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition ${
                      isSelected
                        ? 'bg-gradient-argon-primary text-white border-sky-400 shadow-argon-primary'
                        : isDark
                        ? 'bg-[#1a1a1a] text-slate-300 hover:text-white border-white/10'
                        : 'bg-slate-100 text-slate-700 hover:text-[#2B3674] border-slate-200'
                    }`}
                  >
                    <span>#{tag}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : isDark
                          ? 'bg-[#0a0a0a] text-slate-400'
                          : 'bg-white text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
              {selectedTagFilter && (
                <button
                  onClick={() => setSelectedTagFilter(null)}
                  className="text-[11px] underline ml-1 text-slate-400 hover:text-white"
                >
                  Clear filter
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <div className="w-6 h-6 rounded-full border-2 border-[#2CD9FF] border-t-transparent animate-spin" />
              <span className="text-xs">Loading tags...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-3">
                <Hash size={24} />
              </div>
              <h3 className="text-sm font-bold">No matching nodes found</h3>
              <p className="text-xs text-[#a1a1a1] max-w-xs mt-1">
                Try searching for a different keyword or create tags on your nodes.
              </p>
            </div>
          ) : (
            filteredItems.map(item => (
              <div
                key={item.course_id}
                className={`group p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${itemBg}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px] mb-1.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-semibold ${breadcrumbBg}`}>
                      <Layers size={10} className="text-[#2CD9FF]" />
                      <span>{item.space_name}</span>
                    </span>
                    <ChevronRight size={11} className="text-slate-400" />
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-semibold ${breadcrumbBg}`}>
                      <FolderGit2 size={10} className="text-[#2CD9FF]" />
                      <span>{item.course_name}</span>
                    </span>
                  </div>

                  <h4 className="text-sm font-bold mb-2">{item.course_name}</h4>

                  <div className="flex flex-wrap gap-1.5">
                    {item.hashtags.map(tag => (
                      <span
                        key={tag}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          isDark
                            ? 'bg-sky-500/15 text-[#2CD9FF] border-sky-500/30'
                            : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleJumpToNode(item)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition border shrink-0 ${
                    isDark
                      ? 'bg-[#1a1a1a] text-slate-200 hover:text-white border-white/10'
                      : 'bg-slate-100 text-slate-700 hover:text-[#2B3674] border-slate-200'
                  }`}
                  title="Open node"
                >
                  <span>Jump</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t flex items-center justify-between text-xs font-semibold ${headerBg}`}>
          <span className="text-[#a1a1a1]">
            {filteredItems.length} matching {filteredItems.length === 1 ? 'node' : 'nodes'}
          </span>
          <button
            onClick={closePanel}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
              isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
