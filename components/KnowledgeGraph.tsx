'use client';
import React, { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Network } from 'lucide-react';

// ForceGraph3D must be imported dynamically as it relies on window/canvas
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-slate-900 text-cyan-500 animate-pulse">Initializing 3D Space...</div>
});

interface KnowledgeGraphProps {
    data: {
        graph?: {
            nodes: Array<{ id: string; group?: number }>;
            links: Array<{ source: string; target: string }>;
        };
    };
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ data }) => {
    const graphRef = useRef<any>(null);
    const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Responsive sizing
    useEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setDimensions({
                    w: entry.contentRect.width,
                    h: entry.contentRect.height
                });
            }
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => resizeObserver.disconnect();
    }, []);

    if (!data?.graph || !data.graph.nodes || data.graph.nodes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50 rounded-xl border border-slate-100 border-dashed p-10">
                <Network className="w-10 h-10 mb-3 opacity-20" />
                <p>No graph data available for this topic.</p>
                <p className="text-xs mt-2">Try generating for a more complex topic.</p>
            </div>
        );
    }

    const { nodes, links } = data.graph;

    // Sanitize Links: ensure source/target exist in nodes to prevent crashes
    const nodeIds = new Set(nodes.map(n => n.id));
    const validLinks = links.filter(l => nodeIds.has(l.source as string) && nodeIds.has(l.target as string));
    const graphData = { nodes, links: validLinks };

    return (
        <div className="h-full w-full relative rounded-xl overflow-hidden bg-slate-900 shadow-2xl border border-slate-700" ref={containerRef} style={{ minHeight: '500px' }}>
            {/* Overlay UI */}
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <div className="bg-black/50 backdrop-blur-md p-3 rounded-lg border border-white/10 text-white">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                        <Network className="w-4 h-4 text-cyan-400" /> Knowledge Galaxy
                    </h3>
                    <p className="text-xs text-slate-400">Drag to rotate • Scroll to zoom • Click nodes</p>
                </div>
            </div>

            <ForceGraph3D
                ref={graphRef}
                width={dimensions.w}
                height={dimensions.h}
                graphData={graphData}
                nodeLabel="id"
                nodeColor={node => (node as any).group === 1 ? "#06b6d4" : "#8b5cf6"} // Cyan for primary, Purple for secondary
                nodeResolution={24}
                nodeRelSize={12} // Significantly bigger for "Galaxy" feel
                nodeOpacity={1}

                // Links
                linkWidth={1.5}
                linkColor={() => "#475569"} // Slate-600
                linkOpacity={0.6}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.005}
                linkDirectionalParticleWidth={1.5}

                backgroundColor="#0f172a" // Slate-900
                onNodeClick={node => {
                    // Aim at node on click
                    const distance = 40;
                    const distRatio = 1 + distance / Math.hypot((node as any).x, (node as any).y, (node as any).z);
                    graphRef.current.cameraPosition(
                        { x: (node as any).x * distRatio, y: (node as any).y * distRatio, z: (node as any).z * distRatio }, // new position
                        node, // lookAt ({ x, y, z })
                        3000  // ms transition duration
                    );
                }}
            />

            {/* Legend Overlay */}
            <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-md p-3 rounded-lg border border-slate-700">
                    <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">Node Types</div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
                        <span className="text-slate-200 text-xs font-medium">Core Concepts</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]"></div>
                        <span className="text-slate-200 text-xs font-medium">Related Topics</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KnowledgeGraph;
