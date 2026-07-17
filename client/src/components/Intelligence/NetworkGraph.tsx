import React, { useMemo, useCallback } from 'react';
import { 
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  MarkerType,
  Position
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Box, Typography, Paper } from '@mui/material';

interface NetworkGraphProps {
  nodesData: any[];
  edgesData: any[];
}

const nodeColors: Record<string, string> = {
  case: '#3b82f6',    // Blue
  officer: '#8b5cf6', // Purple
  victim: '#f59e0b',  // Amber
  accused: '#ef4444', // Red
  unit: '#10b981',    // Emerald
  court: '#6366f1'    // Indigo
};

// Custom layout function using dagre
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 180;
  const nodeHeight = 60;

  dagreGraph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
  });

  return { nodes, edges };
};

const NetworkGraph: React.FC<NetworkGraphProps> = ({ nodesData, edgesData }) => {
  
  // Transform API nodes to React Flow nodes
  const initialNodes: Node[] = useMemo(() => nodesData.map((n) => ({
    id: n.id,
    type: 'default',
    position: { x: 0, y: 0 },
    data: { 
      label: (
        <Box sx={{ p: 0.5, textAlign: 'center' }}>
          <Typography variant="caption" display="block" fontWeight="bold">
            {n.type.toUpperCase()}
          </Typography>
          <Typography variant="body2" sx={{ wordWrap: 'break-word', whiteSpace: 'normal', px: 1 }}>
            {n.label}
          </Typography>
        </Box>
      ),
      metadata: n.data
    },
    style: {
      background: '#fff',
      border: `2px solid ${nodeColors[n.type] || '#cbd5e1'}`,
      borderRadius: '8px',
      minWidth: 150,
      maxWidth: 200,
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  })), [nodesData]);

  // Transform API edges to React Flow edges
  const initialEdges: Edge[] = useMemo(() => edgesData.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    labelStyle: { fill: '#475569', fontWeight: 600, fontSize: 12 },
    labelBgPadding: [4, 4],
    labelBgBorderRadius: 4,
    labelBgStyle: { fill: '#f8fafc', fillOpacity: 0.8 },
    animated: true,
    style: { stroke: '#94a3b8', strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#94a3b8',
    },
  })), [edgesData]);

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(initialNodes, initialEdges),
    [initialNodes, initialEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Fallback connection handler (though nodes are mostly readonly from API)
  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  return (
    <Box sx={{ width: '100%', height: '100%', minHeight: 600, position: 'relative' }}>
      <Paper elevation={0} sx={{ width: '100%', height: '100%', border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          minZoom={0.2}
          maxZoom={4}
        >
          <Controls />
          <MiniMap 
            nodeStrokeColor={(n) => {
              if (n.style?.background) return '#fff';
              return '#eee';
            }}
            nodeColor={(n) => {
              if (n.style?.borderColor) return n.style.borderColor as string;
              return '#cbd5e1';
            }}
          />
          <Background color="#cbd5e1" gap={16} />
        </ReactFlow>
      </Paper>
    </Box>
  );
};

export default NetworkGraph;
