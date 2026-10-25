/**
 * NodeIcons.tsx
 * Icon registry for Course/Node cards.
 * Uses lucide-react where available; provides custom SVGs for node-graph and brain.
 */
import React from 'react';
import {
  BookOpen,
  Code2,
  Target,
  Rocket,
  FlaskConical,
  Briefcase,
  Star,
  Folder,
} from 'lucide-react';

export type NodeIconId =
  | 'node-graph'
  | 'brain'
  | 'book'
  | 'code'
  | 'target'
  | 'rocket'
  | 'flask'
  | 'briefcase'
  | 'star'
  | 'folder';

export const NODE_ICON_IDS: NodeIconId[] = [
  'node-graph',
  'brain',
  'book',
  'code',
  'target',
  'rocket',
  'flask',
  'briefcase',
  'star',
  'folder',
];

export const NODE_ICON_LABELS: Record<NodeIconId, string> = {
  'node-graph': 'Node Graph',
  brain: 'Brain',
  book: 'Book',
  code: 'Code',
  target: 'Target',
  rocket: 'Rocket',
  flask: 'Flask',
  briefcase: 'Briefcase',
  star: 'Star',
  folder: 'Folder',
};

/** Custom SVG: three circles connected by lines (generic node graph) */
export const NodeGraphIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 16,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Center node */}
    <circle cx="8" cy="8" r="2.2" />
    {/* Top-left satellite */}
    <circle cx="2.5" cy="3" r="1.5" />
    {/* Bottom-right satellite */}
    <circle cx="13.5" cy="13" r="1.5" />
    {/* Top-right satellite */}
    <circle cx="13.5" cy="3" r="1.5" />
    {/* Connecting lines */}
    <line x1="4" y1="3.8" x2="6.3" y2="6.5" />
    <line x1="9.7" y1="6.5" x2="12" y2="3.8" />
    <line x1="9.5" y1="9.5" x2="12" y2="12" />
  </svg>
);

/** Custom SVG: brain outline */
export const BrainIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 16,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Simplified brain outline */}
    <path d="M8 2.5C6.5 2 4.5 2.5 3.5 4C2.5 5.5 2.5 7 3 8C2 9 2 10.5 3.5 11.5C4.5 12.5 6 13 8 13C10 13 11.5 12.5 12.5 11.5C14 10.5 14 9 13 8C13.5 7 13.5 5.5 12.5 4C11.5 2.5 9.5 2 8 2.5Z" />
    {/* Vertical center line */}
    <line x1="8" y1="3.5" x2="8" y2="12.5" />
    {/* Left hemisphere detail */}
    <path d="M8 6C6.5 6 5 6.5 4.5 8" />
    {/* Right hemisphere detail */}
    <path d="M8 6C9.5 6 11 6.5 11.5 8" />
  </svg>
);

/** Render an icon by its ID */
export function getNodeIcon(
  iconId: string | null | undefined,
  size = 16
): React.ReactElement {
  const id = (iconId as NodeIconId) || 'node-graph';

  switch (id) {
    case 'node-graph':
      return <NodeGraphIcon size={size} />;
    case 'brain':
      return <BrainIcon size={size} />;
    case 'book':
      return <BookOpen size={size} />;
    case 'code':
      return <Code2 size={size} />;
    case 'target':
      return <Target size={size} />;
    case 'rocket':
      return <Rocket size={size} />;
    case 'flask':
      return <FlaskConical size={size} />;
    case 'briefcase':
      return <Briefcase size={size} />;
    case 'star':
      return <Star size={size} />;
    case 'folder':
      return <Folder size={size} />;
    default:
      return <NodeGraphIcon size={size} />;
  }
}

interface IconPickerProps {
  value: string | null | undefined;
  onChange: (id: NodeIconId) => void;
  isDark: boolean;
}

/**
 * Compact icon picker — a row of icon buttons.
 * Renders inline in forms and panels.
 */
export const NodeIconPicker: React.FC<IconPickerProps> = ({ value, onChange, isDark }) => {
  const selected = value || 'node-graph';

  return (
    <div className="flex flex-wrap gap-1.5">
      {NODE_ICON_IDS.map(id => {
        const isActive = id === selected;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            title={NODE_ICON_LABELS[id]}
            aria-label={NODE_ICON_LABELS[id]}
            aria-pressed={isActive}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition border text-xs
              ${isActive
                ? isDark
                  ? 'bg-sky-500/20 border-[#2CD9FF] text-[#2CD9FF] shadow-[0_0_6px_rgba(44,217,255,0.3)]'
                  : 'bg-sky-50 border-sky-400 text-sky-700'
                : isDark
                ? 'bg-[#1a1a1a] border-[#333333] text-[#a1a1a1] hover:border-[#2CD9FF] hover:text-[#2CD9FF]'
                : 'bg-slate-100 border-slate-200 text-slate-500 hover:border-sky-400 hover:text-sky-700'
              }`}
          >
            {getNodeIcon(id, 15)}
          </button>
        );
      })}
    </div>
  );
};
