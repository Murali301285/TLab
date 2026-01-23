'use client';

import React, { useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    Position,
    Node,
    Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';

interface MindMapProps {
    data: any;
}

// Custom Radial / MindMap Layout
// Now handles Coloring dynamically based on Traversal Depth
const getMindMapLayout = (nodes: Node[], edges: Edge[]) => {
    if (nodes.length === 0) return { nodes, edges };

    const COLORS = ['#dbeafe', '#d1fae5', '#f3e8ff', '#ffe4e6', '#fef3c7']; // Blue, Green, Purple, Rose, Amber

    // 1. Build Adjacency & Find Root
    const adj: Record<string, string[]> = {};
    const parentMap: Record<string, string> = {};

    // Assume first node is root or find one with level 0
    let rootId = nodes[0].id; // Fallback
    // Look for strict root (input type or first node)
    const properRoot = nodes.find(n => n.type === 'input');
    if (properRoot) rootId = properRoot.id;

    nodes.forEach(n => { adj[n.id] = []; });
    edges.forEach(e => {
        if (adj[e.source]) adj[e.source].push(e.target);
        parentMap[e.target] = e.source;
    });

    // 2. Position Nodes & Color Them
    const rootNode = nodes.find(n => n.id === rootId);
    if (rootNode) {
        rootNode.position = { x: 0, y: 0 };
        // Root Style - FORCE BACKGROUND
        rootNode.style = {
            ...rootNode.style,
            background: '#1e293b',
            backgroundColor: '#1e293b',
            color: '#ffffff',
            border: '2px solid #0f172a',
            fontSize: '16px',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
        };
    }

    // Process Level 1 (Direct Children of Root)
    const level1 = adj[rootId] || [];
    const L1_RADIUS_X = 400;
    const L1_RADIUS_Y = 250;

    level1.forEach((childId, idx) => {
        const childNode = nodes.find(n => n.id === childId);
        if (!childNode) return;

        // Color for this branch using index loop
        const branchColor = COLORS[idx % COLORS.length];

        // Apply L1 Style
        childNode.style = {
            ...childNode.style,
            background: branchColor,
            backgroundColor: branchColor,
            border: `1px solid ${branchColor}`,
            color: '#1e293b',
        };

        const angle = (2 * Math.PI * idx) / level1.length;
        childNode.position = {
            x: Math.cos(angle) * L1_RADIUS_X,
            y: Math.sin(angle) * L1_RADIUS_Y
        };

        const isRight = childNode.position.x >= 0;
        childNode.targetPosition = isRight ? Position.Left : Position.Right;
        childNode.sourcePosition = isRight ? Position.Right : Position.Left;

        // Recursive placement for Level 2+
        const processChildren = (parentId: string, parentPos: { x: number, y: number }, depth: number, direction: 'left' | 'right') => {
            const children = adj[parentId] || [];
            if (children.length === 0) return;

            const VERTICAL_SPACING = 60;
            const SUB_OFFSET_X = 250;
            const totalHeight = (children.length - 1) * VERTICAL_SPACING;
            let startY = parentPos.y - totalHeight / 2;

            children.forEach((subId, subIdx) => {
                const subNode = nodes.find(n => n.id === subId);
                if (!subNode) return;

                // Sub-node Style (White)
                subNode.style = {
                    ...subNode.style,
                    background: '#ffffff',
                    backgroundColor: '#ffffff', // Explicit
                    color: '#1e293b',
                    border: '1px solid #cbd5e1',
                };

                subNode.position = {
                    x: parentPos.x + (direction === 'right' ? SUB_OFFSET_X : -SUB_OFFSET_X),
                    y: startY + (subIdx * VERTICAL_SPACING)
                };

                subNode.targetPosition = direction === 'right' ? Position.Left : Position.Right;
                subNode.sourcePosition = direction === 'right' ? Position.Right : Position.Left;

                processChildren(subId, subNode.position, depth + 1, direction);
            });
        };

        processChildren(childId, childNode.position, 2, isRight ? 'right' : 'left');
    });

    return { nodes, edges };
};

export default function MindMapRenderer({ data }: MindMapProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Transform Input Data to React Flow Format
    useEffect(() => {
        const rawNodes = data?.graph?.nodes || data?.nodes || [];
        const rawLinks = data?.graph?.links || data?.links || [];

        if (!Array.isArray(rawNodes) || rawNodes.length === 0) return;

        // 1. Create Nodes (Initial - Minimal Style)
        const flowNodes: Node[] = rawNodes.map((n: any, idx: number) => ({
            id: n.id,
            data: { label: n.label },
            position: { x: 0, y: 0 },
            type: idx === 0 ? 'input' : 'default', // Fallback to index 0
            style: {
                borderRadius: '12px',
                padding: '12px',
                width: 180,
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'center',
                boxShadow: '0 2px 4px 0 rgb(0 0 0 / 0.05)',
                backgroundColor: '#ffffff', // Default white
                background: '#ffffff'
            }
        }));

        // 2. Create Edges
        const flowEdges: Edge[] = rawLinks.map((l: any, idx: number) => ({
            id: `e-${idx}`,
            source: typeof l.source === 'object' ? l.source.id : l.source,
            target: typeof l.target === 'object' ? l.target.id : l.target,
            type: 'default', // Bezier works well for radial
            animated: true,
            style: { stroke: '#94a3b8', strokeWidth: 2 }
        }));

        // 3. Apply Custom Layout (Calculates colors too)
        const { nodes: layoutedNodes, edges: layoutedEdges } = getMindMapLayout(
            flowNodes,
            flowEdges
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

    }, [data, setNodes, setEdges]); // Ensure deps are correct

    // Custom Controls
    const fitViewOptions = { padding: 0.2 };

    return (
        <div className="h-full w-full bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-slate-200 rounded-xl overflow-hidden relative">

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
                fitViewOptions={fitViewOptions}
                minZoom={0.1}
                maxZoom={2}
                attributionPosition="bottom-right"
                style={{ backgroundColor: 'transparent' }}
            >
                <Background color="#cbd5e1" gap={24} size={1} />
                <Controls
                    showInteractive={false}
                    showZoom={true}
                    showFitView={true}
                    className="bg-white border-slate-200 shadow-sm"
                />
            </ReactFlow>

            <div className="absolute top-4 right-14 z-10 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-xs text-slate-500 font-medium">
                Scroll to Zoom • Drag Canvas to Pan
            </div>
        </div>
    );
}
