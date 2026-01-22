import React from 'react';
import {
    ProcessFlow,
    ComparisonGrid,
    KeyConcepts,
    Timeline,
    Statistics
} from './InfographicModules';
import { cn } from '@/lib/utils';
import { LayoutGrid } from 'lucide-react';

interface BentoRendererProps {
    data: {
        summary?: string;
        modules: Array<{
            type: string;
            [key: string]: any;
        }>;
    };
}

const BentoRenderer: React.FC<BentoRendererProps> = ({ data }) => {
    if (!data || !data.modules) return null;

    // Helper to determine grid span based on module type
    const getGridClass = (type: string, index: number) => {
        switch (type) {
            case 'statistics':
                return "col-span-1 md:col-span-4 row-span-1"; // Full width strip
            case 'process_flow':
                return "col-span-1 md:col-span-4 row-span-auto"; // Full width
            case 'comparison_grid':
                return "col-span-1 md:col-span-2 row-span-2"; // Tall half width
            case 'timeline':
                return "col-span-1 md:col-span-2 row-span-2"; // Tall half width
            case 'key_concepts':
                return "col-span-1 md:col-span-4";
            default:
                return "col-span-1 md:col-span-2";
        }
    };

    return (
        <div className="animate-in fade-in duration-700">
            {/* Bento Header */}
            {data.summary && (
                <div className="mb-6 flex items-center gap-2 text-slate-400 font-medium uppercase tracking-widest text-xs">
                    <LayoutGrid className="w-4 h-4" />
                    Bento View
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-min">
                {/* Introduction / Summary Block */}
                <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 rounded-3xl flex flex-col justify-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-colors"></div>
                    <div className="relative z-10">
                        <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-bold mb-4 border border-white/10">Topic Analysis</span>
                        <h2 className="text-2xl md:text-3xl font-black leading-tight mb-2">
                            {data.summary || "Visual Analysis"}
                        </h2>
                        <p className="text-slate-400 text-sm">Automated visual breakdown of the selected content.</p>
                    </div>
                </div>

                {data.modules.map((module, idx) => {
                    const spanClass = getGridClass(module.type, idx);

                    return (
                        <div key={idx} className={cn(
                            "rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white",
                            spanClass
                        )}>
                            {/* We wrap sub-components to ensure they fill the bento cell height if needed */}
                            <div className="h-full w-full">
                                {(() => {
                                    switch (module.type) {
                                        case 'process_flow': return <ProcessFlow data={module} />;
                                        case 'comparison_grid': return <ComparisonGrid data={module} />;
                                        case 'key_concepts': return <KeyConcepts data={module} />;
                                        case 'timeline': return <Timeline data={module} />;
                                        case 'statistics': return <Statistics data={module} />;
                                        default: return null;
                                    }
                                })()}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default BentoRenderer;
