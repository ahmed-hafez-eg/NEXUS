import React from 'react';
import { Layers, X, PieChart } from 'lucide-react';
import { SpaceBreakdownItem, pluralize } from '../../utils/activityUtils';

interface SpaceBreakdownProps {
  items: SpaceBreakdownItem[];
  selectedSpaceId: string | null;
  onSelectSpace: (spaceId: string | null) => void;
  isDark: boolean;
  itemNoun?: string;
  itemsNoun?: string;
}

export const SpaceBreakdown: React.FC<SpaceBreakdownProps> = ({
  items,
  selectedSpaceId,
  onSelectSpace,
  isDark,
  itemNoun = 'task',
  itemsNoun = 'tasks',
}) => {
  if (items.length === 0) {
    return null;
  }

  const activeFiltered = items.find(i => i.spaceId === selectedSpaceId);

  return (
    <div
      className={`p-5 rounded-2xl border transition-colors ${
        isDark ? 'bg-[#141414] border-[#262626] text-white' : 'bg-white border-slate-200 text-[#2B3674]'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-[#2CD9FF] flex items-center justify-center">
            <PieChart size={15} />
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-tight">Where your time went</h4>
            <p className="text-[11px] text-[#a1a1a1]">Task distribution across workspaces</p>
          </div>
        </div>

        {selectedSpaceId && (
          <button
            onClick={() => onSelectSpace(null)}
            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-500/15 text-[#2CD9FF] border border-sky-500/30 hover:bg-sky-500/25 transition"
            title="Clear workspace filter"
          >
            <span>Filtered: {activeFiltered?.spaceName || 'Space'}</span>
            <X size={12} />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {items.map(item => {
          const isSelected = item.spaceId === selectedSpaceId;

          return (
            <div
              key={item.spaceId}
              onClick={() => onSelectSpace(isSelected ? null : item.spaceId)}
              className={`p-3 rounded-xl border transition-all cursor-pointer group select-none ${
                isSelected
                  ? 'border-[#2CD9FF] bg-sky-500/10 ring-2 ring-[#2CD9FF]/20'
                  : isDark
                  ? 'bg-[#1a1a1a] border-[#262626] hover:border-[#333333] hover:bg-[#202020]'
                  : 'bg-slate-50 border-slate-200 hover:border-sky-300 hover:bg-slate-100/80'
              }`}
              title={`Click to ${isSelected ? 'clear filter' : `filter heatmap to "${item.spaceName}"`}`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="flex items-center gap-2 font-bold truncate">
                  <Layers
                    size={13}
                    className={isSelected ? 'text-[#2CD9FF]' : isDark ? 'text-slate-400' : 'text-slate-500'}
                  />
                  <span className="truncate">{item.spaceName}</span>
                </span>
                <span className="font-semibold text-[11px] text-[#a1a1a1] shrink-0 ml-2">
                  <strong className="text-white font-bold">{item.count}</strong> {pluralize(item.count, itemNoun, itemsNoun)} ({item.pct}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-black/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-argon-primary transition-all duration-300"
                  style={{ width: `${Math.max(4, item.pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
