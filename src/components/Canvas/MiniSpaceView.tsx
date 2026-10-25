import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Connection as FlowConnection,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X, FolderGit2, Layers } from 'lucide-react';

import { useUIStore } from '../../store/useUIStore';
import { useSpaceStore } from '../../store/useSpaceStore';
import { CourseNode } from './CourseNode';
import { TextNode } from './TextNode';
import { DashedEdge } from './DashedEdge';
import * as db from '../../db/client';
import { Course, Connection, TextNode as TextNodeType } from '../../types';

const miniNodeTypes = { courseNode: CourseNode, textNode: TextNode };
const miniEdgeTypes = { dashed: DashedEdge };

export const MiniSpaceView: React.FC = () => {
  const activeMiniSpaceId = useUIStore(s => s.activeMiniSpaceId);
  const closeMiniSpace = useUIStore(s => s.closeMiniSpace);
  const spaces = useSpaceStore(s => s.spaces);
  const theme = useUIStore(s => s.theme);

  const linkedSpace = spaces.find(sp => sp.id === activeMiniSpaceId);

  const [courses, setCourses] = useState<Course[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [textNodeItems, setTextNodeItems] = useState<TextNodeType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (!activeMiniSpaceId) return;
    setIsLoading(true);

    Promise.all([
      db.getCoursesBySpace(activeMiniSpaceId),
      db.getConnectionsBySpace(activeMiniSpaceId),
      db.getTextNodesBySpace(activeMiniSpaceId),
    ])
      .then(([cs, conns, tnodes]) => {
        setCourses(cs);
        setConnections(conns);
        setTextNodeItems(tnodes);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [activeMiniSpaceId]);

  useEffect(() => {
    const courseFlowNodes: Node[] = courses.map(c => ({
      id: c.id,
      type: 'courseNode',
      position: { x: c.pos_x, y: c.pos_y },
      data: { id: c.id, name: c.name, space_id: c.space_id },
    }));

    const textFlowNodes: Node[] = textNodeItems.map(tn => ({
      id: tn.id,
      type: 'textNode',
      position: { x: tn.pos_x, y: tn.pos_y },
      data: { id: tn.id, text: tn.text, color: tn.color, space_id: tn.space_id },
    }));

    setNodes([...courseFlowNodes, ...textFlowNodes]);
  }, [courses, textNodeItems, setNodes]);

  const normalizeHandle = (h?: string | null) => {
    if (!h) return undefined;
    return h.replace('-target', '');
  };

  useEffect(() => {
    const flowEdges: Edge[] = connections.map(conn => ({
      id: conn.id,
      source: conn.source_course_id,
      target: conn.target_course_id,
      sourceHandle: normalizeHandle(conn.source_handle),
      targetHandle: normalizeHandle(conn.target_handle),
      type: 'dashed',
      animated: false,
    }));
    setEdges(flowEdges);
  }, [connections, setEdges]);

  const handleConnect = useCallback(
    (connection: FlowConnection) => {
      if (activeMiniSpaceId && connection.source && connection.target) {
        db.createConnection(
          activeMiniSpaceId,
          connection.source,
          connection.target,
          connection.sourceHandle,
          connection.targetHandle
        ).then(conn => {
          setConnections(prev => [...prev, conn]);
        });
      }
    },
    [activeMiniSpaceId]
  );

  const handleEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    deletedEdges.forEach(edge => {
      db.deleteConnection(edge.id);
      setConnections(prev => prev.filter(c => c.id !== edge.id));
    });
  }, []);

  const handleNodeDragStop = useCallback((_: any, node: Node) => {
    db.updateCoursePosition(node.id, Math.round(node.position.x), Math.round(node.position.y));
    setCourses(prev =>
      prev.map(c =>
        c.id === node.id ? { ...c, pos_x: node.position.x, pos_y: node.position.y } : c
      )
    );
  }, []);

  const defaultViewport = useMemo(() => ({ x: 50, y: 50, zoom: 0.85 }), []);

  if (!activeMiniSpaceId) return null;

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#0a0a0a' : '#F4F7FE';
  const dotColor = isDark ? '#232323' : '#CBD5E1';
  const controlsBg = isDark ? '!bg-[#111111] !border-[#262626]' : '!bg-white !border-slate-200';

  const modalBg = isDark
    ? 'bg-[#141414] border-[#262626] text-[#ededed] shadow-2xl'
    : 'bg-white border-slate-200 text-[#2B3674] shadow-2xl';

  const headerBg = isDark ? 'bg-[#111111] border-[#262626]' : 'bg-slate-50 border-slate-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div
        className={`relative w-[90vw] h-[82vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border animate-fade-in-up ${modalBg}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${headerBg}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-argon-primary flex items-center justify-center text-white shadow-argon-primary">
              <FolderGit2 size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                {linkedSpace?.name ?? 'Linked Space'}
              </h2>
              <p className="text-[11px] text-[#a1a1a1]">
                Interactive portal preview — drag nodes, draw connections
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-sky-500/15 text-[#2CD9FF] border border-sky-500/30">
              <Layers size={10} className="inline mr-1" />
              Live Workspace Portal
            </span>
            <button
              onClick={closeMiniSpace}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          {isLoading ? (
            <div
              className="absolute inset-0 flex items-center justify-center text-slate-400"
              style={{ background: bgColor }}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-[#2CD9FF] border-t-transparent animate-spin" />
                <span className="text-xs font-semibold">Loading portal...</span>
              </div>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={miniNodeTypes}
              edgeTypes={miniEdgeTypes}
              connectionMode={ConnectionMode.Loose}
              edgesReconnectable={false}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeDragStop={handleNodeDragStop}
              onConnect={handleConnect}
              onEdgesDelete={handleEdgesDelete}
              defaultViewport={defaultViewport}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              minZoom={0.2}
              maxZoom={2.5}
              deleteKeyCode={['Backspace', 'Delete']}
              proOptions={{ hideAttribution: true }}
              style={{ background: bgColor }}
            >
              <Background variant={BackgroundVariant.Dots} gap={28} size={1.2} color={dotColor} />
              <Controls showInteractive={false} className={controlsBg} />
              <MiniMap
                nodeColor={isDark ? '#2CD9FF' : '#1171EE'}
                maskColor={isDark ? 'rgba(11, 20, 55, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
                className={`!border rounded-xl shadow-lg ${
                  isDark ? '!bg-[#111111] !border-white/10' : '!bg-white !border-slate-200'
                }`}
                zoomable
                pannable
              />

              {courses.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center p-6 rounded-2xl border bg-[#111111]/80 border-white/10 text-slate-400 max-w-xs shadow-xl">
                    <Layers size={28} className="mx-auto mb-2 text-[#2CD9FF]" />
                    <p className="text-xs font-bold text-white">This space has no nodes yet.</p>
                    <p className="text-[11px] mt-1 text-[#a1a1a1]">Add courses from the main workspace view.</p>
                  </div>
                </div>
              )}
            </ReactFlow>
          )}
        </div>
      </div>
    </div>
  );
};
