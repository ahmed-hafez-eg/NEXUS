import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Trash2, Palette } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useUIStore } from '../../store/useUIStore';
import { useSpaceStore } from '../../store/useSpaceStore';
import { showToast } from '../../store/useToastStore';

export interface TextNodeData {
  id: string;
  text: string;
  color: string; // hex
  space_id: string;
}

function hexToRgba(hex: string, alpha: number): string {
  try {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) throw new Error('bad hex');
    return `rgba(${r},${g},${b},${alpha})`;
  } catch {
    return `rgba(71,85,105,${alpha})`;
  }
}

export const TextNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const nodeData = data as unknown as TextNodeData;
  const updateTextNodeContent = useCanvasStore(s => s.updateTextNodeContent);
  const deleteTextNode = useCanvasStore(s => s.deleteTextNode);
  const openConfirm = useUIStore(s => s.openConfirm);
  const theme = useUIStore(s => s.theme);
  const isDark = theme === 'dark';

  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(nodeData.text);
  const [draftColor, setDraftColor] = useState(nodeData.color || '#1171EE');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [hexInput, setHexInput] = useState(nodeData.color || '#1171EE');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditing) setDraftText(nodeData.text);
  }, [nodeData.text, isEditing]);

  useEffect(() => {
    if (!showColorPicker) setDraftColor(nodeData.color || '#1171EE');
  }, [nodeData.color, showColorPicker]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (!showColorPicker) return;
    const handler = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        commitColor();
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColorPicker, draftColor]);

  const commitText = useCallback(() => {
    setIsEditing(false);
    const trimmed = draftText.trim();
    const colorToSave = draftColor;
    updateTextNodeContent(nodeData.id, trimmed || nodeData.text, colorToSave);
  }, [draftText, draftColor, nodeData.id, nodeData.text, updateTextNodeContent]);

  const commitColor = useCallback(() => {
    const isValidHex = /^#[0-9a-fA-F]{6}$/.test(draftColor);
    const finalColor = isValidHex ? draftColor : nodeData.color;
    updateTextNodeContent(nodeData.id, nodeData.text, finalColor);
  }, [draftColor, nodeData.id, nodeData.text, nodeData.color, updateTextNodeContent]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraftText(nodeData.text);
    setIsEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitText();
    }
    if (e.key === 'Escape') {
      setDraftText(nodeData.text);
      setIsEditing(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    openConfirm(
      'Delete Text Node',
      'Are you sure you want to delete this text note and its connections?',
      async () => {
        await deleteTextNode(nodeData.id);
        showToast.warning('Deleted text note');
      }
    );
  };

  const handleColorSwatchClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHexInput(nodeData.color || '#1171EE');
    setDraftColor(nodeData.color || '#1171EE');
    setShowColorPicker(prev => !prev);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      setDraftColor(val);
    }
  };

  const handleNativeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDraftColor(val);
    setHexInput(val);
  };

  const handleColorApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isValidHex = /^#[0-9a-fA-F]{6}$/.test(draftColor);
    const finalColor = isValidHex ? draftColor : nodeData.color;
    setDraftColor(finalColor);
    setHexInput(finalColor);
    updateTextNodeContent(nodeData.id, nodeData.text, finalColor);
    setShowColorPicker(false);
  };

  const color = nodeData.color || '#1171EE';
  const bgAlpha = isDark ? 0.16 : 0.08;
  const borderAlpha = selected ? 0.9 : 0.45;

  const spaces = useSpaceStore(s => s.spaces);
  const activeSpaceId = useSpaceStore(s => s.activeSpaceId);
  const activeSpace = spaces.find(s => s.id === (nodeData.space_id || activeSpaceId));
  const isBlurred = !!(activeSpace?.focused_node_id);

  const handleStyle =
    '!w-3.5 !h-3.5 !bg-[#2CD9FF] !border-2 !border-[#0a0a0a] opacity-60 group-hover:opacity-100 z-30 transition-all hover:scale-135 hover:!bg-[#05CD99] shadow-md';

  return (
    <div
      onDoubleClick={handleDoubleClick}
      data-node-id={nodeData.id}
      className={`group relative min-w-[170px] max-w-[320px] rounded-2xl shadow-xl transition-all duration-200 cursor-pointer select-none backdrop-blur-md ${
        isBlurred
          ? 'opacity-65 filter blur-[0.8px] hover:filter-none hover:opacity-100 transition-all duration-300'
          : ''
      }`}
      style={{
        backgroundColor: hexToRgba(color, bgAlpha),
        border: `2px solid ${hexToRgba(color, borderAlpha)}`,
        boxShadow: selected
          ? `0 0 0 3px ${hexToRgba(color, 0.3)}, 0 10px 25px ${hexToRgba(color, 0.25)}`
          : `0 8px 20px ${hexToRgba(color, 0.12)}`,
      }}
    >
      {/* Connection Handles */}
      <Handle type="source" position={Position.Top} id="top" className={handleStyle} />
      <Handle type="source" position={Position.Right} id="right" className={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={handleStyle} />
      <Handle type="source" position={Position.Left} id="left" className={handleStyle} />

      {/* Toolbar row */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-1.5 gap-2">
        {/* Color swatch */}
        <button
          onClick={handleColorSwatchClick}
          className="shrink-0 w-4.5 h-4.5 rounded-full border border-white/40 shadow-sm transition-transform hover:scale-125 focus:outline-none"
          style={{ backgroundColor: color }}
          title="Change note color"
        >
          <span className="sr-only">Color</span>
        </button>

        <Palette size={12} className="opacity-0 group-hover:opacity-50 transition text-slate-400" />

        {/* Delete button */}
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition text-slate-400 hover:text-rose-400 hover:bg-rose-500/15"
          title="Delete Text Note"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Text area */}
      <div className="px-4 pb-4 pt-1">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={draftText}
            onChange={e => setDraftText(e.target.value)}
            onBlur={commitText}
            onKeyDown={handleKeyDown}
            onClick={e => e.stopPropagation()}
            className="w-full resize-none bg-transparent text-sm font-semibold leading-relaxed focus:outline-none nodrag nopan"
            style={{ color: isDark ? '#ffffff' : '#2B3674', minHeight: '2.5rem' }}
            rows={3}
            placeholder="Type your note..."
          />
        ) : (
          <p
            className="text-sm font-semibold leading-relaxed whitespace-pre-wrap break-words"
            style={{ color: isDark ? '#ededed' : '#2B3674', minHeight: '1.5rem' }}
          >
            {nodeData.text || <span className="opacity-40 italic">Double-click to edit…</span>}
          </p>
        )}
      </div>

      {/* Hover hint */}
      {!isEditing && (
        <div
          className="px-3.5 pb-2 text-[10px] font-medium opacity-0 group-hover:opacity-60 transition leading-none"
          style={{ color: isDark ? '#a1a1a1' : '#707E94' }}
        >
          Double-click to edit
        </div>
      )}

      {/* Color picker popover */}
      {showColorPicker && (
        <div
          ref={colorPickerRef}
          className="absolute z-50 top-11 left-3 nodrag nopan animate-fade-in-up"
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <div
            className={`rounded-2xl shadow-2xl border p-3.5 flex flex-col gap-2.5 w-[210px] ${
              isDark ? 'bg-[#1a1a1a] border-[#333333] text-[#ededed]' : 'bg-white border-slate-200 text-[#2B3674]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Palette size={13} className="shrink-0 text-sky-400" />
              <span className="text-xs font-bold">Accent Color</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="color"
                value={draftColor}
                onChange={handleNativeColorChange}
                className="w-8 h-8 rounded-xl cursor-pointer border-0 p-0 bg-transparent"
                title="Pick custom color"
              />
              <div
                className="flex-1 h-8 rounded-xl border"
                style={{
                  backgroundColor: draftColor,
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                }}
              />
            </div>

            <input
              type="text"
              value={hexInput}
              onChange={handleHexInputChange}
              maxLength={7}
              placeholder="#1171EE"
              className={`w-full text-xs font-mono px-2.5 py-1.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
                isDark
                  ? 'bg-[#0a0a0a] border-white/10 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-200 text-[#2B3674] placeholder-slate-400'
              }`}
            />

            <button
              onClick={handleColorApply}
              className="text-xs font-bold py-1.5 rounded-xl bg-gradient-argon-primary text-white shadow-argon-primary transition hover:brightness-105"
            >
              Apply Color
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

TextNode.displayName = 'TextNode';
