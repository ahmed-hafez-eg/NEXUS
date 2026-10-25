import React, { useState, useEffect } from 'react';
import { X, Github, Layers, Trash2, ExternalLink } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useSpaceStore } from '../../store/useSpaceStore';
import { GitHubConnectPanel } from './GitHubConnectPanel';
import { showToast } from '../../store/useToastStore';
import { openExternalUrl } from '../../utils/opener';

export const GitHubModal: React.FC = () => {
  const activePanel = useUIStore(s => s.activePanel);
  const closePanel = useUIStore(s => s.closePanel);
  const theme = useUIStore(s => s.theme);
  const isDark = theme === 'dark';

  const spaces = useSpaceStore(s => s.spaces);
  const updateSpaceGithubRepo = useSpaceStore(s => s.updateSpaceGithubRepo);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);

  useEffect(() => {
    const init: Record<string, string> = {};
    spaces.forEach(s => {
      init[s.id] = s.github_repo || '';
    });
    setDrafts(init);
  }, [spaces]);

  const isOpen = activePanel === ('github' as any);
  if (!isOpen) return null;

  const bgModal = isDark
    ? 'bg-[#141414] border-[#262626] text-[#ededed] shadow-2xl'
    : 'bg-white border-slate-200 text-[#2B3674] shadow-2xl';

  const cardBg = isDark
    ? 'bg-[#1a1a1a] border-[#262626]'
    : 'bg-slate-50 border-slate-200';

  const inputBg = isDark
    ? 'bg-[#111111] border-[#333333] text-[#ededed] placeholder-[#6b6b6b] focus:border-[#2CD9FF]'
    : 'bg-white border-slate-200 text-[#2B3674] placeholder-[#a1a1a1] focus:border-[#1171EE]';

  const handleSaveSpaceRepo = async (spaceId: string) => {
    const raw = (drafts[spaceId] || '').trim();
    const clean = raw.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
    await updateSpaceGithubRepo(spaceId, clean || null);
    setEditingSpaceId(null);
    showToast.success(clean ? `Linked space to "${clean}"` : 'Cleared space GitHub repository');
  };

  const handleClearSpaceRepo = async (spaceId: string) => {
    setDrafts(prev => ({ ...prev, [spaceId]: '' }));
    await updateSpaceGithubRepo(spaceId, null);
    showToast.info('Unlinked space repository');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in select-none">
      <div className={`w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden animate-fade-in-up ${bgModal}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4.5 border-b shrink-0 ${isDark ? 'border-[#262626] bg-[#111111]' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-argon-primary text-white flex items-center justify-center shadow-argon-primary">
              <Github size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm">GitHub Integration &amp; Repositories</h3>
              <p className="text-[11px] text-[#a1a1a1]">Connect account &amp; manage Space-level repositories</p>
            </div>
          </div>
          <button
            onClick={closePanel}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Scrollable Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* Section 1: GitHub Account Connection */}
          <GitHubConnectPanel isDark={isDark} />

          {/* Section 2: Space-Level Repository Linking */}
          <div className={`p-4 rounded-2xl border ${cardBg} space-y-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-sky-500/15 flex items-center justify-center text-sky-400">
                  <Layers size={13} />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Space-Level Repositories
                </h4>
              </div>
              <span className="text-[10px] text-[#a1a1a1]">Strict Inheritance</span>
            </div>

            <p className="text-[11px] text-[#a1a1a1] leading-relaxed">
              When a Space is linked to a repository, all nodes inside this Space automatically inherit it.
              Individual node repo controls will be locked to ensure consistency.
            </p>

            <div className="space-y-2 pt-1">
              {spaces.length === 0 ? (
                <div className="text-center py-4 text-xs text-[#707E94]">
                  No spaces found. Create a space first to link a repository.
                </div>
              ) : (
                spaces.map(space => {
                  const currentRepo = space.github_repo || '';
                  const draftVal = drafts[space.id] ?? currentRepo;
                  const isEditing = editingSpaceId === space.id;

                  return (
                    <div
                      key={space.id}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition ${
                        isDark ? 'bg-[#111111]/80 border-white/5' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-gradient-argon-primary flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm">
                          {space.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-xs truncate block" title={space.name}>
                            {space.name}
                          </span>
                          {currentRepo ? (
                            <span
                              onClick={() => openExternalUrl(`https://github.com/${currentRepo}`)}
                              className="text-[10px] font-mono text-[#2CD9FF] hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <span>{currentRepo}</span>
                              <ExternalLink size={9} />
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#707E94] italic">No repository linked</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 w-full sm:w-auto">
                            <input
                              type="text"
                              value={draftVal}
                              onChange={e => setDrafts(prev => ({ ...prev, [space.id]: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveSpaceRepo(space.id);
                                if (e.key === 'Escape') setEditingSpaceId(null);
                              }}
                              placeholder="owner/repo..."
                              autoFocus
                              className={`px-2.5 py-1 text-xs rounded-lg border outline-none font-mono ${inputBg} w-44`}
                            />
                            <button
                              onClick={() => handleSaveSpaceRepo(space.id)}
                              className="px-2.5 py-1 bg-gradient-argon-primary text-white text-xs font-bold rounded-lg shadow-argon-primary transition"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingSpaceId(null)}
                              className="p-1 text-slate-400 hover:text-white"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingSpaceId(space.id);
                                setDrafts(prev => ({ ...prev, [space.id]: currentRepo }));
                              }}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition border ${
                                currentRepo
                                  ? isDark
                                    ? 'bg-white/5 border-white/10 hover:bg-white/10 text-[#2CD9FF]'
                                    : 'bg-slate-100 border-slate-200 text-[#1171EE] hover:bg-slate-200'
                                  : isDark
                                  ? 'bg-[#1a1a1a] border-sky-400/30 text-sky-300 hover:bg-sky-500/20'
                                  : 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'
                              }`}
                            >
                              {currentRepo ? 'Edit Repo' : 'Link Repo'}
                            </button>

                            {currentRepo && (
                              <button
                                onClick={() => handleClearSpaceRepo(space.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                title="Unlink space repository"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="text-xs text-[#a1a1a1] space-y-1.5 pt-1">
            <p className="font-bold text-white text-xs">Hierarchy Rules:</p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
              <li>Space-level repo overrides node-level repos for all cards inside that Space.</li>
              <li>When a Space has no repo set, individual nodes can link to distinct repositories.</li>
              <li>Proof of work commits will always target the Space repository if linked.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex justify-end bg-[#1a1a1a]/40 shrink-0">
          <button
            onClick={closePanel}
            className={`px-4 py-1.5 text-xs font-bold rounded-xl transition ${
              isDark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
