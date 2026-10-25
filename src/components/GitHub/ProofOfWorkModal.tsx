import React, { useEffect, useState } from 'react';
import { X, GitCommit, RefreshCw, Trash2, Check } from 'lucide-react';
import { Section, GitHubCommitItem } from '../../types';
import { useSectionStore } from '../../store/useSectionStore';
import { useGitHubStore } from '../../store/useGitHubStore';
import { fetchRepoCommits } from '../../services/githubApi';
import { ArgonButton } from '../UI/ArgonButton';
import { showToast } from '../../store/useToastStore';

interface ProofOfWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: Section;
  courseRepo?: string | null;
}

export const ProofOfWorkModal: React.FC<ProofOfWorkModalProps> = ({
  isOpen,
  onClose,
  section,
  courseRepo,
}) => {
  const updateSectionProof = useSectionStore(s => s.updateSectionProof);
  const token = useGitHubStore(s => s.token);

  const [proofUrl, setProofUrl] = useState(section.proof_url || '');
  const [proofLabel, setProofLabel] = useState(section.proof_label || '');

  const [commits, setCommits] = useState<GitHubCommitItem[]>([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [commitError, setCommitError] = useState('');

  const cleanRepo = courseRepo?.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');

  useEffect(() => {
    if (isOpen) {
      setProofUrl(section.proof_url || '');
      setProofLabel(section.proof_label || '');

      if (cleanRepo) {
        setLoadingCommits(true);
        setCommitError('');
        fetchRepoCommits(cleanRepo, token || undefined)
          .then(items => {
            setCommits(items);
            setLoadingCommits(false);
          })
          .catch(err => {
            console.error('Failed to fetch commits:', err);
            setCommitError('Could not fetch repo commits');
            setLoadingCommits(false);
          });
      } else {
        setCommits([]);
      }
    }
  }, [isOpen, section, cleanRepo, token]);

  if (!isOpen) return null;

  const handleSave = async (url: string, label: string) => {
    await updateSectionProof(section.id, url.trim() || null, label.trim() || null);
    showToast.success('Saved proof of work');
    onClose();
  };

  const handleRemove = async () => {
    await updateSectionProof(section.id, null, null);
    showToast.info('Removed proof of work');
    onClose();
  };

  const handleSelectCommit = (c: GitHubCommitItem) => {
    setProofUrl(c.html_url);
    setProofLabel(c.shortSha);
    handleSave(c.html_url, c.shortSha);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[#111111] text-white shadow-2xl overflow-hidden flex flex-col animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4.5 border-b border-white/10 bg-[#1a1a1a]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-argon-primary flex items-center justify-center text-white shadow-argon-primary">
              <GitCommit size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm">Attach Proof of Work</h3>
              <p className="text-[11px] text-[#a1a1a1]">{section.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Section 1: Recent Commits from Linked Repo */}
          {cleanRepo && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#a1a1a1]">
                <span>Recent Commits in {cleanRepo}</span>
                {loadingCommits && <RefreshCw size={12} className="animate-spin text-[#2CD9FF]" />}
              </div>

              {commitError && <p className="text-[11px] text-rose-400">{commitError}</p>}

              {commits.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {commits.map(c => (
                    <button
                      key={c.sha}
                      onClick={() => handleSelectCommit(c)}
                      className="w-full text-left p-2.5 rounded-xl border border-white/10 bg-[#0a0a0a] hover:border-sky-400/60 hover:bg-[#1a1a1a] transition flex items-center justify-between gap-2 group"
                    >
                      <div className="truncate text-xs">
                        <span className="font-mono text-[#2CD9FF] font-bold mr-2">{c.shortSha}</span>
                        <span className="text-slate-200 group-hover:text-white truncate font-medium">{c.message}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{c.authorName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Manual Link Entry */}
          <div className="space-y-3 pt-3 border-t border-white/10">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#a1a1a1]">Or Enter Proof URL Manually</h4>

            <div>
              <label className="text-[11px] text-slate-300 block mb-1 font-semibold">Proof URL (Commit or PR link)</label>
              <input
                type="url"
                placeholder="https://github.com/owner/repo/commit/..."
                value={proofUrl}
                onChange={e => setProofUrl(e.target.value)}
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl text-xs text-white placeholder-[#707E94] focus:outline-none focus:border-[#2CD9FF]"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-300 block mb-1 font-semibold">Badge Label (Optional)</label>
              <input
                type="text"
                placeholder="e.g. SHA or Fix #12"
                value={proofLabel}
                onChange={e => setProofLabel(e.target.value)}
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl text-xs text-white placeholder-[#707E94] focus:outline-none focus:border-[#2CD9FF]"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-[#1a1a1a]/60">
          {section.proof_url ? (
            <button
              onClick={handleRemove}
              className="px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/15 rounded-xl transition flex items-center gap-1.5"
            >
              <Trash2 size={13} /> Remove
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <ArgonButton
              variant="primary"
              size="sm"
              onClick={() => handleSave(proofUrl, proofLabel)}
              disabled={!proofUrl.trim()}
              leftIcon={<Check size={14} />}
            >
              Save Proof
            </ArgonButton>
          </div>
        </div>
      </div>
    </div>
  );
};
