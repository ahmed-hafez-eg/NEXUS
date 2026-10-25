import React from 'react';
import {
  BaseEdge,
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
} from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { showToast } from '../../store/useToastStore';

export const DashedEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const [isHovered, setIsHovered] = React.useState(false);
  const deleteConnection = useCanvasStore(s => s.deleteConnection);

  const handleDelete = () => {
    deleteConnection(id);
    showToast.info('Deleted connection');
  };

  // High contrast Argon connection colors
  const strokeColor = selected
    ? '#05CD99'
    : isHovered
    ? '#2CD9FF'
    : '#1171EE';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth: selected || isHovered ? 2.5 : 2,
          strokeDasharray: '6 5',
          cursor: 'pointer',
          filter: selected || isHovered ? 'drop-shadow(0 0 6px rgba(44, 217, 255, 0.6))' : 'none',
          transition: 'stroke 0.2s, stroke-width 0.2s, filter 0.2s',
          ...style,
        }}
      />
      {/* Invisible thicker path to make hovering/clicking easier */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={24}
        className="cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onContextMenu={(e) => {
          e.preventDefault();
          handleDelete();
        }}
      />

      {isHovered && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan animate-fade-in-up"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-argon-error transition-all hover:scale-110 cursor-pointer"
              title="Delete connection"
            >
              <Trash2 size={12} strokeWidth={2.5} />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
