'use client';

import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
    code: string;
}

mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'inherit'
});

export default function MermaidDiagram({ code }: MermaidDiagramProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current && code) {
            // Unique ID for each render to avoid conflicts
            const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

            try {
                mermaid.parse(code).then(async (valid) => {
                    if (valid && containerRef.current) {
                        const { svg } = await mermaid.render(id, code);
                        containerRef.current.innerHTML = svg;
                    }
                }).catch(err => {
                    console.error("Mermaid Parse Error:", err);
                    if (containerRef.current) {
                        containerRef.current.innerHTML = `<div class="text-red-500 text-xs p-2">Invalid Diagram Code</div>`;
                    }
                });
            } catch (e) {
                console.error("Mermaid Render Error:", e);
                containerRef.current.innerHTML = `<div class="text-red-500 text-xs p-2">Failed to render diagram</div>`;
            }
        }
    }, [code]);

    return (
        <div className="w-full h-full overflow-auto bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-center">
            <div ref={containerRef} className="w-full h-full flex items-center justify-center" />
        </div>
    );
}
