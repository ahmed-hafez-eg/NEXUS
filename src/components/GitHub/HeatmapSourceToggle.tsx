import React from 'react';
import { Github, RefreshCw } from 'lucide-react';
import { useGitHubStore, HeatmapSource } from '../../store/useGitHubStore';
import { useUIStore } from '../../store/useUIStore';

export const HeatmapSourceToggle: React.FC = () => {
  const token = useGitHubStore(s => s.token);
  const heatmapSource = useGitHubStore(s => s.heatmapSource);
  const setHeatmapSource = useGitHubStore(s => s.setHeatmapSource);
  const loadContributions = useGitHubStore(s => s.loadContributions);
  const setActivePanel = useUIStore(s => s.setActivePanel);

  const handleRefresh = async () => {
    await loadContributions();
  };

  const handleOpenGitHubModal = () => {
    setActivePanel('github' as any);
  };

  return (
    <div className="flex items-center gap-2 select-none">
      {!token ? (
        <button
          onClick={handleOpenGitHubModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#2B3674] text-white border border-white/10 rounded-xl text-xs font-bold transition shadow-sm"
        >
          <Github size={14} className="text-[#2CD9FF]" />
          <span>Connect GitHub</span>
        </button>
      ) : (
        <div className="flex items-center gap-1 bg-[#0a0a0a] p-1 rounded-xl border border-white/10 shadow-inner">
          {(['app', 'github', 'combined'] as HeatmapSource[]).map(src => {
            const active = heatmapSource === src;
            const labels: Record<HeatmapSource, string> = {
              app: 'App Only',
              github: 'GitHub Only',
              combined: 'Combined',
            };
            return (
              <button
                key={src}
                onClick={() => setHeatmapSource(src)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
                  active
                    ? 'bg-gradient-argon-primary text-white shadow-argon-primary'
                    : 'text-[#a1a1a1] hover:text-white hover:bg-white/5'
                }`}
              >
                {labels[src]}
              </button>
            );
          })}

          <button
            onClick={handleRefresh}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition ml-0.5"
            title="Refresh GitHub activity calendar"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      )}
    </div>
  );
};
