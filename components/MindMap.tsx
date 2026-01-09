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
            theme: 'default',
            securityLevel: 'loose',
        });

        if (containerRef.current) {
            mermaid.contentLoaded();
            // Render the diagram
            const render = async () => {
                try {
                    // Clear previous content
                    if (containerRef.current) containerRef.current.innerHTML = '';
                    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
                    const { svg } = await mermaid.render(id, chart);
                    if (containerRef.current) containerRef.current.innerHTML = svg;
                } catch (error) {
                    console.error('Mermaid render error:', error);
                    if (containerRef.current) {
                        containerRef.current.innerHTML = '<div class="text-slate-400 p-8 text-center text-sm">Unable to render visual diagram.</div>';
                    }
                }
            };
            render();
        }
    }, [chart]);

    return (
        <div className="w-full overflow-auto p-4 flex justify-center bg-white rounded-lg border border-slate-200">
            <div ref={containerRef} className="mermaid w-full" />
        </div>
    );
};

export default MindMap;
