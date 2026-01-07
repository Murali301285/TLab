'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';

interface TextSelectionHandlerProps {
    children: React.ReactNode;
    onExplain: (text: string) => void;
}

export default function TextSelectionHandler({ children, onExplain }: TextSelectionHandlerProps) {
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
                <button
                    onClick={handleExplainClick}
                    style={{
                        position: 'fixed',
                        left: selection.x,
                        top: selection.y,
                        transform: 'translate(-50%, -100%)',
                        zIndex: 50
                    }}
                    className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-full shadow-lg border border-slate-700 animate-in fade-in zoom-in duration-200 hover:bg-slate-800 hover:scale-105 transition-all text-sm font-medium"
                >
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    Explain
                </button>
            )}
        </div>
    );
}
