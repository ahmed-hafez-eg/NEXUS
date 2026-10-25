import React, { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  Controls,
  Connection as FlowConnection,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { CourseNode } from './CourseNode';
import { SpaceLinkNode } from './SpaceLinkNode';
import { TextNode } from './TextNode';
import { DashedEdge } from './DashedEdge';
import { useCanvasStore } from '../../store/useCanvasStore';
import { useSpaceStore } from '../../store/useSpaceStore';
import { useUIStore } from '../../store/useUIStore';
import { parseJsonArray } from '../../db/client';
import { Plus, Compass } from 'lucide-react';
import { ArgonButton } from '../UI/ArgonButton';
import { ArgonCard } from '../UI/ArgonCard';

const nodeTypes = {
  courseNode: CourseNode,
  spaceLinkNode: SpaceLinkNode,
  textNode: TextNode,
};

const edgeTypes = {
  dashed: DashedEdge,
};

const CourseCanvasInner: React.FC = () => {
  const activeSpaceId = useSpaceStore(s => s.activeSpaceId);
  const activeSpace = useSpaceStore(s => s.spaces.find(sp => sp.id === activeSpaceId));
  const theme = useUIStore(s => s.theme);

  const courses = useCanvasStore(s => s.courses);
  const connections = useCanvasStore(s => s.connections);
  const spaceLinks = useCanvasStore(s => s.spaceLinks);
  const textNodes = useCanvasStore(s => s.textNodes);
  const loadCanvas = useCanvasStore(s => s.loadCanvas);
  const updateCoursePosition = useCanvasStore(s => s.updateCoursePosition);
  const updateSpaceLinkPosition = useCanvasStore(s => s.updateSpaceLinkPosition);
  const updateTextNodePosition = useCanvasStore(s => s.updateTextNodePosition);
  const createConnection = useCanvasStore(s => s.createConnection);
  const deleteConnection = useCanvasStore(s => s.deleteConnection);
  const openAddCourse = useUIStore(s => s.openAddCourse);
  const openCourseDetail = useUIStore(s => s.openCourseDetail);
  const setSelectedCourseId = useCanvasStore(s => s.setSelectedCourseId);

  const pendingCanvasJump = useCanvasStore(s => s.pendingCanvasJump);
  const setPendingCanvasJump = useCanvasStore(s => s.setPendingCanvasJump);

  const { setCenter, fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Smooth camera glide to source target node when jumping from a SpaceLink
  useEffect(() => {
    if (!pendingCanvasJump) return;

    const { targetCourseId, targetSectionId } = pendingCanvasJump;

    if (targetCourseId) {
      const targetNode =
        nodes.find(n => n.id === targetCourseId) ||
        courses.find(c => c.id === targetCourseId);

      if (targetNode) {
        const posX = 'position' in targetNode ? targetNode.position.x : targetNode.pos_x ?? 0;
        const posY = 'position' in targetNode ? targetNode.position.y : targetNode.pos_y ?? 0;

        // Pan and zoom camera directly to the exact X/Y coordinates of the targeted node
        setCenter(posX + 140, posY + 80, { zoom: 1.15, duration: 800 });

        // If targeted sub-task was specified, auto-open course detail panel
        if (targetSectionId) {
          setSelectedCourseId(targetCourseId);
          openCourseDetail();
        }

        setPendingCanvasJump(null);
      }
    } else {
      // If link targeted whole space, fit entire view smoothly
      fitView({ duration: 800, padding: 0.25 });
      setPendingCanvasJump(null);
    }
  }, [
    pendingCanvasJump,
    nodes,
    courses,
    setCenter,
    fitView,
    setSelectedCourseId,
    openCourseDetail,
    setPendingCanvasJump,
  ]);

  // Safety fallback: if target node is not found after 1.5s, clean up jump state
  useEffect(() => {
    if (!pendingCanvasJump) return;

    const timer = setTimeout(() => {
      if (useCanvasStore.getState().pendingCanvasJump) {
        fitView({ duration: 600, padding: 0.25 });
        setPendingCanvasJump(null);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [pendingCanvasJump, fitView, setPendingCanvasJump]);

  // Load canvas whenever active space changes
  useEffect(() => {
    if (activeSpaceId) {
      loadCanvas(activeSpaceId);
    }
  }, [activeSpaceId, loadCanvas]);

  // Synchronize courses + spaceLinks + textNodes to React Flow nodes
  useEffect(() => {
    const courseNodes: Node[] = (courses || []).map(c => ({
      id: c.id,
      type: 'courseNode',
      position: { x: typeof c.pos_x === 'number' ? c.pos_x : 0, y: typeof c.pos_y === 'number' ? c.pos_y : 0 },
      data: {
        id: c.id,
        name: c.name || 'Untitled Node',
        space_id: c.space_id,
        hashtags: parseJsonArray<string>(c.hashtags),
      },
    }));

    const spaceLinkNodes: Node[] = spaceLinks.map(sl => ({
      id: sl.id,
      type: 'spaceLinkNode',
      position: { x: sl.pos_x, y: sl.pos_y },
      data: {
        id: sl.id,
        linked_space_id: sl.linked_space_id,
        space_id: sl.space_id,
        target_course_id: sl.target_course_id || null,
        target_section_id: sl.target_section_id || null,
      },
    }));

    const textFlowNodes: Node[] = textNodes.map(tn => ({
      id: tn.id,
      type: 'textNode',
      position: { x: tn.pos_x, y: tn.pos_y },
      data: {
        id: tn.id,
        text: tn.text,
        color: tn.color,
        space_id: tn.space_id,
      },
    }));

    setNodes([...courseNodes, ...spaceLinkNodes, ...textFlowNodes]);
  }, [courses, spaceLinks, textNodes, setNodes]);

  const normalizeHandle = (h?: string | null) => {
    if (!h) return undefined;
    return h.replace('-target', '');
  };

  // Synchronize connections to React Flow edges
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

  // Node drag stopped -> persist position to SQLite
  const handleNodeDragStop = useCallback(
    (_: any, node: Node) => {
      const isSpaceLink = spaceLinks.some(sl => sl.id === node.id);
      const isTextNode = textNodes.some(tn => tn.id === node.id);
      if (isSpaceLink) {
        updateSpaceLinkPosition(node.id, Math.round(node.position.x), Math.round(node.position.y));
      } else if (isTextNode) {
        updateTextNodePosition(node.id, Math.round(node.position.x), Math.round(node.position.y));
      } else {
        updateCoursePosition(node.id, Math.round(node.position.x), Math.round(node.position.y));
      }
    },
    [spaceLinks, textNodes, updateCoursePosition, updateSpaceLinkPosition, updateTextNodePosition]
  );

  const handleConnectStart = useCallback((_event: any, _params: any) => {
    // onConnectStart hook
  }, []);

  // Connect handle to handle -> persist connection to SQLite
  const handleConnect = useCallback(
    (connection: FlowConnection) => {
      if (activeSpaceId && connection.source && connection.target) {
        createConnection(
          activeSpaceId,
          connection.source,
          connection.target,
          normalizeHandle(connection.sourceHandle),
          normalizeHandle(connection.targetHandle)
        );
      }
    },
    [activeSpaceId, createConnection]
  );

  // Drop anywhere on node body -> auto-snap to nearest/counterpart handle
  const handleConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: any) => {
      if (!connectionState?.isValid && connectionState?.fromNode && activeSpaceId) {
        const targetElement = (event.target as HTMLElement)?.closest(
          '[data-node-id], .react-flow__node'
        );
        if (targetElement) {
          const targetNodeId =
            targetElement.getAttribute('data-node-id') || targetElement.getAttribute('data-id');
          if (targetNodeId && targetNodeId !== connectionState.fromNode.id) {
            const rawFrom = connectionState.fromHandle?.id || 'right';
            const fromHandleId = normalizeHandle(rawFrom) || 'right';
            let targetHandle = 'left';
            if (fromHandleId === 'left') targetHandle = 'right';
            else if (fromHandleId === 'top') targetHandle = 'bottom';
            else if (fromHandleId === 'bottom') targetHandle = 'top';

            createConnection(
              activeSpaceId,
              connectionState.fromNode.id,
              targetNodeId,
              fromHandleId,
              targetHandle
            );
          }
        }
      }
    },
    [activeSpaceId, createConnection]
  );

  const handleEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      deletedEdges.forEach(edge => {
        deleteConnection(edge.id);
      });
    },
    [deleteConnection]
  );

  const defaultViewport = useMemo(() => ({ x: 60, y: 60, zoom: 0.95 }), []);

  const isDark = theme === 'dark';
  const canvasBg = isDark ? '#0a0a0a' : '#F4F7FE';
  const dotColor = isDark ? '#232323' : '#CBD5E1';
  const wrapperBg = isDark ? 'bg-[#0a0a0a]' : 'bg-[#F4F7FE]';
  const controlsClass = isDark ? '!bg-[#111111] !border-[rgba(255,255,255,0.1)]' : '!bg-white !border-slate-200';

  if (!activeSpaceId) {
    return (
      <div className={`flex-1 h-full w-full flex flex-col items-center justify-center ${wrapperBg} text-slate-400 select-none`}>
        <div className="w-16 h-16 rounded-2xl bg-gradient-argon-primary/10 flex items-center justify-center mb-4 text-[#2CD9FF] border border-sky-400/20 shadow-argon-primary">
          <Compass size={32} />
        </div>
        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-[#2B3674]'}`}>
          No Workspace Selected
        </h2>
        <p className={`text-sm mt-1.5 max-w-sm text-center ${isDark ? 'text-[#a1a1a1]' : 'text-[#707E94]'}`}>
          Select an existing space from the sidebar or click "+" to build a new study roadmap.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative flex-1 h-full w-full ${wrapperBg} overflow-hidden select-none`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        edgesReconnectable={false}
        edgesFocusable={true}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onConnectStart={handleConnectStart}
        onConnect={handleConnect}
        onConnectEnd={handleConnectEnd}
        onEdgesDelete={handleEdgesDelete}
        defaultViewport={defaultViewport}
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2.5}
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
        style={{ background: canvasBg }}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1.5} color={dotColor} />
        <Controls showInteractive={false} className={controlsClass} />

        {courses.length === 0 && spaceLinks.length === 0 && textNodes.length === 0 && (
          <Panel position="top-center" className="mt-24 pointer-events-none">
            <div className="pointer-events-auto">
              <ArgonCard
                isDark={isDark}
                hoverable={false}
                elevation="high"
                className="p-8 text-center max-w-md backdrop-blur-xl border border-sky-400/20"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-argon-primary flex items-center justify-center mx-auto mb-4 text-white shadow-argon-primary">
                  <Plus size={28} strokeWidth={2.5} />
                </div>
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#2B3674]'}`}>
                  {activeSpace ? activeSpace.name : 'Empty Space'}
                </h3>
                <p className={`text-xs mt-1.5 mb-5 leading-relaxed ${isDark ? 'text-[#a1a1a1]' : 'text-[#707E94]'}`}>
                  This workspace has no nodes yet. Add nodes, link other spaces, or drop text notes to structure your workspace!
                </p>
                <ArgonButton
                  variant="primary"
                  size="md"
                  onClick={openAddCourse}
                  leftIcon={<Plus size={16} strokeWidth={2.5} />}
                  className="mx-auto"
                >
                  Add First Node
                </ArgonButton>
              </ArgonCard>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
};

export const CourseCanvas: React.FC = () => {
  return (
    <ReactFlowProvider>
      <CourseCanvasInner />
    </ReactFlowProvider>
  );
};
