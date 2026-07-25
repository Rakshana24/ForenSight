import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background, 
  BackgroundVariant,
  useNodesState, 
  useEdgesState, 
  addEdge, 
  MarkerType,
  Position
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Box, Typography, Paper, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';

interface NetworkGraphProps {
  nodesData: any[];
  edgesData: any[];
}

const nodeColors: Record<string, string> = {
  case: '#1E3A8A',    // Brand Blue
  officer: '#2563EB', // Blue
  victim: '#F97316',  // Orange
  accused: '#DC2626', // Red
  unit: '#059669',    // Green
  court: '#4F46E5'    // Indigo
};

// Custom layout function using dagre (Left-to-Right direction)
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 200;
  const nodeHeight = 70;

  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 140 });

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

// Custom radial positioning layout
const getRadialLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const layoutedNodes = nodes.map(node => ({ ...node }));
  
  const caseNode = layoutedNodes.find(n => n.id.includes('case') || n.id.includes('Case')) || layoutedNodes[0];
  const centerX = 500;
  const centerY = 400;
  
  if (caseNode) {
    caseNode.position = { x: centerX - 100, y: centerY - 35 };
  }
  
  // Group other nodes to inner/outer rings
  const innerTypes = ['officer', 'unit', 'court'];
  const innerNodes = layoutedNodes.filter(n => n.id !== caseNode?.id && innerTypes.includes(n.id.split('-')[0].toLowerCase()));
  const outerNodes = layoutedNodes.filter(n => n.id !== caseNode?.id && !innerTypes.includes(n.id.split('-')[0].toLowerCase()));
  
  // Inner ring
  const innerRadius = 220;
  innerNodes.forEach((node, idx) => {
    const angle = (2 * Math.PI * idx) / (innerNodes.length || 1);
    node.position = {
      x: centerX + innerRadius * Math.cos(angle) - 100,
      y: centerY + innerRadius * Math.sin(angle) - 35,
    };
  });
  
  // Outer ring
  const outerRadius = 420;
  outerNodes.forEach((node, idx) => {
    const angle = (2 * Math.PI * idx) / (outerNodes.length || 1);
    node.position = {
      x: centerX + outerRadius * Math.cos(angle) - 100,
      y: centerY + outerRadius * Math.sin(angle) - 35,
    };
  });
  
  return { nodes: layoutedNodes, edges };
};

// Dynamic ports layout calculation based on node relative position to center
const getPortsForPosition = (nodeX: number, nodeY: number, centerX = 500, centerY = 400) => {
  const dx = (nodeX + 100) - centerX;
  const dy = (nodeY + 35) - centerY;
  
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 
      ? { target: Position.Left, source: Position.Right } 
      : { target: Position.Right, source: Position.Left };
  } else {
    return dy > 0 
      ? { target: Position.Top, source: Position.Bottom } 
      : { target: Position.Bottom, source: Position.Top };
  }
};

const NetworkGraph: React.FC<NetworkGraphProps> = ({ nodesData, edgesData }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode as any === 'dark';

  const [layoutMode, setLayoutMode] = useState<'LR' | 'TB' | 'Radial'>('LR');

  const handleLayoutChange = (
    _event: React.MouseEvent<HTMLElement>,
    newLayout: 'LR' | 'TB' | 'Radial' | null,
  ) => {
    if (newLayout !== null) {
      setLayoutMode(newLayout);
    }
  };

  // Transform API nodes to React Flow nodes
  const initialNodes: Node[] = useMemo(() => nodesData.map((n) => ({
    id: n.id,
    type: 'default',
    position: { x: 0, y: 0 },
    data: { 
      label: (
        <Box sx={{ p: 0.5, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: nodeColors[n.type] || 'primary.main', mb: 0.5 }}>
            {n.type.toUpperCase()}
          </Typography>
          <Typography variant="body2" sx={{ wordWrap: 'break-word', whiteSpace: 'normal', px: 1, color: 'text.primary', fontWeight: 600 }}>
            {n.label}
          </Typography>
        </Box>
      ),
      metadata: n.data
    },
    style: {
      background: isDark ? '#1e1e2d' : '#ffffff',
      color: isDark ? '#f3f4f6' : '#1f2937',
      border: `2px solid ${nodeColors[n.type] || '#cbd5e1'}`,
      borderRadius: '8px',
      minWidth: 160,
      maxWidth: 220,
      boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 4px 6px rgba(0, 0, 0, 0.08)',
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  })), [nodesData, isDark]);

  // Transform API edges to React Flow edges
  const initialEdges: Edge[] = useMemo(() => edgesData.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    labelStyle: { fill: isDark ? '#94a3b8' : '#475569', fontWeight: 600, fontSize: 12 },
    labelBgPadding: [4, 4],
    labelBgBorderRadius: 4,
    labelBgStyle: { fill: isDark ? '#1e1e2d' : '#f8fafc', fillOpacity: 0.9 },
    animated: true,
    style: { stroke: isDark ? '#4b5563' : '#94a3b8', strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: isDark ? '#4b5563' : '#94a3b8',
    },
  })), [edgesData, isDark]);

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    let result: { nodes: Node[]; edges: Edge[] };
    if (layoutMode === 'Radial') {
      result = getRadialLayoutedElements(initialNodes, initialEdges);
    } else {
      result = getLayoutedElements(initialNodes, initialEdges, layoutMode);
    }

    // Dynamically adjust handles/ports direction based on node coordinate quadrant relative to center
    result.nodes.forEach((node) => {
      if (layoutMode === 'Radial') {
        const ports = getPortsForPosition(node.position.x, node.position.y);
        node.sourcePosition = ports.source;
        node.targetPosition = ports.target;
      } else if (layoutMode === 'TB') {
        node.sourcePosition = Position.Bottom;
        node.targetPosition = Position.Top;
      } else {
        node.sourcePosition = Position.Right;
        node.targetPosition = Position.Left;
      }
    });

    return result;
  }, [initialNodes, initialEdges, layoutMode]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Sync state if layoutMode or nodesData changes
  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  // Fallback connection handler
  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  return (
    <Box sx={{ width: '100%', height: '100%', minHeight: 600, position: 'relative', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 0.5, gap: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 1, fontWeight: 'bold', textTransform: 'uppercase' }}>
          Network Layout:
        </Typography>
        <ToggleButtonGroup
          value={layoutMode}
          exclusive
          onChange={handleLayoutChange}
          size="small"
          aria-label="network layout mode"
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '8px',
            p: '2px',
            '& .MuiToggleButton-root': {
              border: 'none',
              px: 2,
              py: 0.5,
              borderRadius: '6px !important',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.75rem',
              color: 'text.secondary',
              '&.Mui-selected': {
                bgcolor: isDark ? 'rgba(56, 189, 248, 0.16)' : 'rgba(2, 132, 199, 0.08)',
                color: 'primary.main',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(56, 189, 248, 0.24)' : 'rgba(2, 132, 199, 0.12)',
                }
              }
            }
          }}
        >
          <ToggleButton value="LR" aria-label="horizontal flow">
            <SwapHorizIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
            Horizontal
          </ToggleButton>
          <ToggleButton value="TB" aria-label="vertical tree">
            <SwapVertIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
            Vertical
          </ToggleButton>
          <ToggleButton value="Radial" aria-label="radial orbit">
            <BubbleChartIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
            Radial Orbit
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ flex: 1, minHeight: 600, position: 'relative' }}>
        <style>{`
          .react-flow__controls-button {
            background-color: ${isDark ? '#1e1e2d' : '#ffffff'} !important;
            color: ${isDark ? '#f3f4f6' : '#1f2937'} !important;
            border-bottom: 1px solid ${isDark ? '#2d2d3f' : '#e2e8f0'} !important;
          }
          .react-flow__controls-button:hover {
            background-color: ${isDark ? '#2d2d3f' : '#f1f5f9'} !important;
          }
          .react-flow__controls-button svg {
            fill: ${isDark ? '#f3f4f6' : '#1f2937'} !important;
          }
          .react-flow__minimap {
            background-color: ${isDark ? '#1e1e2d' : '#ffffff'} !important;
            border: 1px solid ${isDark ? '#2d2d3f' : '#e2e8f0'} !important;
          }
          .react-flow__minimap-mask {
            fill: ${isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.6)'} !important;
          }
        `}</style>
        <Paper elevation={0} sx={{ width: '100%', height: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', bgcolor: 'background.paper' }}>
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
            <Background variant={BackgroundVariant.Dots} color={isDark ? '#374151' : '#cbd5e1'} gap={16} />
          </ReactFlow>
        </Paper>
      </Box>
    </Box>
  );
};

export default NetworkGraph;
