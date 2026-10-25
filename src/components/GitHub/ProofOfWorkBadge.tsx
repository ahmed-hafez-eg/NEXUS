import React from 'react';
import { GitCommit, ExternalLink } from 'lucide-react';
import { openExternalUrl } from '../../utils/opener';

interface ProofOfWorkBadgeProps {
  proofUrl: string;
  proofLabel?: string | null;
}

export const ProofOfWorkBadge: React.FC<ProofOfWorkBadgeProps> = ({ proofUrl, proofLabel }) => {
  if (!proofUrl) return null;

  const displayLabel = proofLabel || (proofUrl.includes('/commit/') ? proofUrl.split('/commit/')[1]?.substring(0, 7) : 'Proof');

  return (
    <a
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        openExternalUrl(proofUrl);
      }}
      href={proofUrl}
      title={`Proof of Work: ${proofUrl}`}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold transition shrink-0"
    >
      <GitCommit size={11} className="shrink-0" />
      <span className="truncate max-w-[90px]">{displayLabel}</span>
      <ExternalLink size={10} className="shrink-0 opacity-70" />
    </a>
  );
};
