'use client';

import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MindMapProps {
    chart: string;
}

const MindMap: React.FC<MindMapProps> = ({ chart }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: true,
            theme: 'dark',
            securityLevel: 'loose',
        });

        if (containerRef.current) {
            mermaid.contentLoaded();
            // Render the diagram
            const render = async () => {
                try {
                    // Clear previous content
                    containerRef.current!.innerHTML = '';
                    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                    const { svg } = await mermaid.render(id, chart);
                    containerRef.current!.innerHTML = svg;
                } catch (error) {
                    console.error('Mermaid render error:', error);
                    containerRef.current!.innerHTML = '<div class="text-red-400 p-4">Error rendering Mind Map</div>';
                }
            };
            render();
        }
    }, [chart]);

    return (
        <div className="w-full overflow-auto p-4 flex justify-center bg-slate-900/50 rounded-lg border border-slate-700">
            <div ref={containerRef} className="mermaid w-full" />
        </div>
    );
};

export default MindMap;
