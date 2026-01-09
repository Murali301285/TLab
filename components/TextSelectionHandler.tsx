'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Presentation } from 'lucide-react';

interface TextSelectionHandlerProps {
    children: React.ReactNode;
    onExplain: (text: string) => void;
    onVisualize: (text: string) => void;
}

export default function TextSelectionHandler({ children, onExplain, onVisualize }: TextSelectionHandlerProps) {
    const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleSelection = () => {
            const activeSelection = window.getSelection();
            if (!activeSelection || activeSelection.isCollapsed) {
                setSelection(null);
                return;
            }

            const text = activeSelection.toString().trim();
            if (text.length < 5) return; // Ignore very short selections

            const range = activeSelection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Calculate position relative to viewport, but we'll use fixed positioning for the button
            // Position slightly above the selection
            setSelection({
                text,
                x: rect.left + rect.width / 2,
                y: rect.top - 10
            });
        };

        // Listen for selection changes on the document to handle clicking outside
        document.addEventListener('selectionchange', handleSelection);
        return () => document.removeEventListener('selectionchange', handleSelection);
    }, []);

    const handleExplainClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (selection) {
            onExplain(selection.text);
            // Clear selection after clicking
            window.getSelection()?.removeAllRanges();
            setSelection(null);
        }
    };

    return (
        <div ref={containerRef} className="relative">
            {children}

            {selection && (
                <div
                    style={{
                        position: 'fixed',
                        left: selection.x,
                        top: selection.y,
                        transform: 'translate(-50%, -100%)',
                        zIndex: 50
                    }}
                    className="flex items-center gap-1 bg-white p-1 rounded-full shadow-lg border border-slate-200 animate-in fade-in zoom-in duration-200"
                >
                    <button
                        onClick={handleExplainClick}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700"
                    >
                        <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
                        Explain
                    </button>
                    <div className="w-px h-4 bg-slate-200" />
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (selection) {
                                onVisualize(selection.text);
                                window.getSelection()?.removeAllRanges();
                                setSelection(null);
                            }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700"
                    >
                        <Presentation className="h-3.5 w-3.5 text-purple-500" />
                        Visualise
                    </button>
                </div>
            )}
        </div>
    );
}
