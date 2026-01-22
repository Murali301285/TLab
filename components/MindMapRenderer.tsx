'use client';

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { ZoomIn, ZoomOut, RefreshCcw, Maximize } from 'lucide-react';

interface MindMapProps {
    data: any;
}

// Compact, modern colors - "Super Awesome" vibe
const BRANCH_COLORS = [
    { fill: '#e0f2fe', stroke: '#0ea5e9', text: '#0369a1' }, // Sky Blue
    { fill: '#fce7f3', stroke: '#ec4899', text: '#be185d' }, // Pink
    { fill: '#dcfce7', stroke: '#22c55e', text: '#15803d' }, // Green
    { fill: '#f3e8ff', stroke: '#a855f7', text: '#7e22ce' }, // Purple
    { fill: '#ffedd5', stroke: '#f97316', text: '#c2410c' }, // Orange
];

export default function MindMapRenderer({ data }: MindMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [shouldAutoFit, setShouldAutoFit] = useState(true);

    const layout = useMemo(() => {
        const rawNodes = data?.graph?.nodes || data?.nodes || [];
        const rawLinks = data?.graph?.links || data?.links || [];

        if (!Array.isArray(rawNodes) || rawNodes.length === 0) return { nodes: [], links: [], bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };

        const adj: Record<string, string[]> = {};
        const inDegree: Record<string, number> = {};

        rawNodes.forEach((n: any) => {
            adj[n.id] = [];
            inDegree[n.id] = 0;
        });

        rawLinks.forEach((l: any) => {
            const s = typeof l.source === 'object' ? l.source.id : l.source;
            const t = typeof l.target === 'object' ? l.target.id : l.target;
            if (adj[s]) adj[s].push(t);
            if (inDegree[t] !== undefined) inDegree[t]++;
        });

        let rootId = rawNodes[0].id;
        // Simple heuristic for root: 0 in-degree
        const candidates = rawNodes.filter((n: any) => inDegree[n.id] === 0);
        if (candidates.length > 0) rootId = candidates[0].id;

        const visited = new Set<string>();
        const treeNodes: any[] = [];
        const treeLinks: any[] = [];
        let minX = 0, maxX = 0, minY = 0, maxY = 0;

        // Recursive placement
        const placeNode = (nodeId: string, parent: any, level: number, angleRange: { start: number, end: number }, branchColor?: any) => {
            if (visited.has(nodeId)) return;
            visited.add(nodeId);

            const nodeData = rawNodes.find((n: any) => n.id === nodeId);
            const childrenIds = adj[nodeId] || [];

            let x = 0, y = 0, angle = 0;
            let myColor = branchColor;

            if (level === 0) {
                x = 0; y = 0;
                myColor = { fill: '#1e293b', stroke: '#0f172a', text: '#fff' }; // Dark Slate Root
            } else {
                angle = (angleRange.start + angleRange.end) / 2;

                // --- ULTRA COMPACT DISTANCES (Resolved) ---
                // Level 1: 100px (tight)
                // Level 2+: 60px (very tight)
                const distance = level === 1 ? 120 : 70;

                x = parent.x + Math.cos(angle) * distance;
                y = parent.y + Math.sin(angle) * distance;

                if (level === 1) {
                    const idx = treeNodes.length; // Approximate branch index
                    myColor = BRANCH_COLORS[idx % BRANCH_COLORS.length];
                }
            }

            // Update Bounds
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);

            // --- Pill Shape / Dimensions ---
            const isRoot = level === 0;
            const width = isRoot ? 80 : 100;
            const height = isRoot ? 80 : 28;

            const visualNode = {
                id: nodeId,
                label: nodeData?.label || nodeId,
                x, y,
                level,
                color: myColor,
                width,
                height,
            };
            treeNodes.push(visualNode);

            if (parent) {
                treeLinks.push({
                    source: parent,
                    target: visualNode,
                    color: myColor?.stroke || '#cbd5e1'
                });
            }

            if (childrenIds.length > 0) {
                const totalRange = angleRange.end - angleRange.start;

                // Tighter spread for sub-branches
                const spreadFactor = level === 0 ? 1 : 0.6;

                if (level === 0) {
                    // Full 360 for root
                    const step = (2 * Math.PI) / childrenIds.length;
                    childrenIds.forEach((childId: string, i: number) => {
                        placeNode(childId, visualNode, level + 1, {
                            start: i * step,
                            end: (i + 1) * step
                        }, undefined);
                    });
                } else {
                    // Cone for branches
                    const cone = Math.PI / 1.8; // ~100 degrees
                    const baseAngle = Math.atan2(y - parent.y, x - parent.x);
                    const startAngle = baseAngle - cone / 2;
                    const step = cone / childrenIds.length;

                    childrenIds.forEach((childId: string, i: number) => {
                        placeNode(childId, visualNode, level + 1, {
                            start: startAngle + i * step,
                            end: startAngle + (i + 1) * step
                        }, myColor);
                    });
                }
            }
        };

        placeNode(rootId, null, 0, { start: 0, end: 2 * Math.PI }, undefined);
        return { nodes: treeNodes, links: treeLinks, bounds: { minX, maxX, minY, maxY } };

    }, [data]);

    // Auto-Fit Logic
    useEffect(() => {
        if (shouldAutoFit && containerRef.current && layout.nodes.length > 0) {
            const { clientWidth, clientHeight } = containerRef.current;
            const PADDING = 60;

            const graphW = Math.max(layout.bounds.maxX - layout.bounds.minX + PADDING, 100);
            const graphH = Math.max(layout.bounds.maxY - layout.bounds.minY + PADDING, 100);

            const scaleX = clientWidth / graphW;
            const scaleY = clientHeight / graphH;

            // Allow some zoom in but cap it
            const fitScale = Math.min(scaleX, scaleY, 1.2);

            setScale(fitScale > 0.1 ? fitScale : 1);
            setShouldAutoFit(false);
        }
    }, [layout, shouldAutoFit]);

    const handleZoomIn = () => setScale(s => Math.min(s + 0.1, 3));
    const handleZoomOut = () => setScale(s => Math.max(s - 0.1, 0.2));
    const handleReset = () => { setShouldAutoFit(true); };

    if (layout.nodes.length === 0) return <div className="p-12 text-center text-slate-400">Rendering Mind Map...</div>;

    // Viewport Calculations
    const PADDING = 100;
    const rawWidth = layout.bounds.maxX - layout.bounds.minX;
    const rawHeight = layout.bounds.maxY - layout.bounds.minY;

    // SVG Size - needs to be precise for scrolling
    const svgWidth = (rawWidth + PADDING * 2) * scale;
    const svgHeight = (rawHeight + PADDING * 2) * scale;

    // Shift to center the (0,0) based layout into the SVG viewbox
    // The layout centers on 0,0 (Root).
    // MinX might be -300. So we shift by +300 + PADDING.
    const shiftX = -layout.bounds.minX + PADDING;
    const shiftY = -layout.bounds.minY + PADDING;

    return (
        <div ref={containerRef} className="h-full w-full relative bg-slate-50 rounded-xl border border-slate-200 overflow-auto scrollbar-thin">

            {/* Toolbar */}
            <div className="sticky top-4 right-4 ml-auto w-fit flex flex-col gap-2 bg-white/90 backdrop-blur p-1.5 rounded-lg shadow-sm border border-slate-200 z-20">
                <button onClick={handleZoomIn} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><ZoomIn className="h-4 w-4" /></button>
                <button onClick={handleZoomOut} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><ZoomOut className="h-4 w-4" /></button>
                <button onClick={handleReset} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Fit to Screen"><Maximize className="h-4 w-4" /></button>
            </div>

            <div style={{ width: svgWidth, height: svgHeight, minWidth: '100%', minHeight: '100%' }} className="relative flex items-center justify-center">
                <svg width={svgWidth} height={svgHeight} className="block overflow-visible">
                    <defs>
                        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.05" />
                        </filter>
                    </defs>

                    <g transform={`scale(${scale}) translate(${shiftX}, ${shiftY})`}>
                        {/* Curved Connections */}
                        {layout.links.map((link: any, i: number) => {
                            // Bezier Curve
                            // M x1 y1 Q cx cy x2 y2
                            // Control point: Midpoint but weighted towards center?
                            // Simple quadratic bezier:
                            // const mx = (link.source.x + link.target.x) / 2;
                            // const my = (link.source.y + link.target.y) / 2;
                            // Actually quadratic logic needs a control point. 
                            // Let's use Q (control point is usually 'source' projected out?)

                            return (
                                <path
                                    key={i}
                                    d={`M ${link.source.x} ${link.source.y} L ${link.target.x} ${link.target.y}`}
                                    stroke={link.color}
                                    strokeWidth={link.target.level === 1 ? 1.5 : 1}
                                    strokeOpacity="0.5"
                                    fill="none"
                                />
                            );
                        })}

                        {/* Nodes */}
                        {layout.nodes.map((node: any) => (
                            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>

                                {/* Root Node */}
                                {node.level === 0 && (
                                    <>
                                        <circle
                                            r={node.width / 2}
                                            fill="#1e293b" // Slate 800
                                            filter="url(#softShadow)"
                                            stroke="#334155"
                                            strokeWidth="4"
                                        />
                                        <foreignObject x={-node.width / 2} y={-node.height / 2} width={node.width} height={node.height}>
                                            <div className="w-full h-full flex items-center justify-center text-center font-bold text-white text-[10px] leading-tight p-2">
                                                {node.label}
                                            </div>
                                        </foreignObject>
                                    </>
                                )}

                                {/* Leaf / Branch Nodes (Pills) */}
                                {node.level > 0 && (
                                    <>
                                        <rect
                                            x={-node.width / 2}
                                            y={-node.height / 2}
                                            width={node.width}
                                            height={node.height}
                                            rx={node.height / 2} // Pill shape
                                            fill={node.color?.fill}
                                            stroke={node.color?.stroke}
                                            strokeWidth="1"
                                            filter="url(#softShadow)"
                                        />
                                        <foreignObject
                                            x={-node.width / 2}
                                            y={-node.height / 2}
                                            width={node.width}
                                            height={node.height}
                                        >
                                            <div className="w-full h-full flex items-center justify-center text-center text-[9px] font-bold px-2 overflow-hidden leading-tight line-clamp-1" style={{ color: node.color?.text }}>
                                                {node.label}
                                            </div>
                                        </foreignObject>
                                    </>
                                )}
                            </g>
                        ))}
                    </g>
                </svg>
            </div>
        </div>
    );
}
