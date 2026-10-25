import React, { useEffect, useState } from 'react';
import { Star, GitFork, AlertCircle, Calendar, RefreshCw, ExternalLink } from 'lucide-react';
import { useGitHubStore } from '../../store/useGitHubStore';
import { GitHubRepoInfo } from '../../types';
import { openExternalUrl } from '../../utils/opener';
import { formatDistanceToNow } from 'date-fns';

interface RepoStatusBadgeProps {
  repo: string;
  isDark?: boolean;
}

export const RepoStatusBadge: React.FC<RepoStatusBadgeProps> = ({ repo, isDark = true }) => {
  const getOrFetchRepoInfo = useGitHubStore(s => s.getOrFetchRepoInfo);

  const [info, setInfo] = useState<GitHubRepoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');

  const loadData = async (forceRefresh = false) => {
    if (!cleanRepo) return;
    setLoading(true);
    setError(false);

    try {
      if (forceRefresh) {
        useGitHubStore.setState(state => {
          const next = { ...state.repoCache };
          delete next[cleanRepo];
          return { repoCache: next };
        });
      }
      const data = await getOrFetchRepoInfo(cleanRepo);
      if (data) {
        setInfo(data);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [cleanRepo]);

  if (!cleanRepo) return null;

  const bgClass = isDark
    ? 'bg-[#0a0a0a] border-white/10 text-white'
    : 'bg-white border-slate-200 text-[#2B3674]';

  return (
    <div className={`mt-2 p-3.5 rounded-2xl border ${bgClass} flex flex-col gap-2 select-none text-xs shadow-sm`}>
      <div className="flex items-center justify-between gap-2">
        <a
          onClick={(e) => {
            e.preventDefault();
            openExternalUrl(info?.html_url || `https://github.com/${cleanRepo}`);
          }}
          href={`https://github.com/${cleanRepo}`}
          className="font-bold text-[#2CD9FF] hover:underline flex items-center gap-1.5 truncate"
        >
          <span className="truncate">{cleanRepo}</span>
          <ExternalLink size={12} className="shrink-0" />
        </a>

        <button
          onClick={() => loadData(true)}
          disabled={loading}
          className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition disabled:opacity-50"
          title="Refresh repo stats"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && !info && (
        <div className="text-[11px] text-[#a1a1a1] flex items-center gap-1.5 py-1">
          <RefreshCw size={12} className="animate-spin text-[#2CD9FF]" /> Fetching GitHub repo stats...
        </div>
      )}

      {error && !info && (
        <div className="text-[11px] text-rose-400 py-1 font-medium">
          Could not fetch repository info. Verify repository path or check GitHub connection.
        </div>
      )}

      {info && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-[11px]">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
            <Star size={13} className="fill-amber-400" />
            <span className={isDark ? 'text-white' : 'text-[#2B3674]'}>{info.stars.toLocaleString()}</span>
            <span className="text-[#a1a1a1] font-normal">stars</span>
          </div>

          <div className="flex items-center gap-1.5 text-[#2CD9FF] font-bold">
            <GitFork size={13} />
            <span className={isDark ? 'text-white' : 'text-[#2B3674]'}>{info.forks.toLocaleString()}</span>
            <span className="text-[#a1a1a1] font-normal">forks</span>
          </div>

          <div className="flex items-center gap-1.5 text-rose-400 font-bold">
            <AlertCircle size={13} />
            <span className={isDark ? 'text-white' : 'text-[#2B3674]'}>{info.issues.toLocaleString()}</span>
            <span className="text-[#a1a1a1] font-normal">issues</span>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-400 font-medium" title={info.pushed_at}>
            <Calendar size={13} />
            <span className="text-[#a1a1a1] truncate">
              {info.pushed_at ? formatDistanceToNow(new Date(info.pushed_at), { addSuffix: true }) : 'N/A'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
