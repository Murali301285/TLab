'use client';

import React from 'react';
import {
    Lightbulb, Target, Rocket, Star,
    CheckCircle, ArrowRight, Zap,
    TrendingUp, Shield, Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoGraphicProps {
    data: any;
}

const ICONS = [Lightbulb, Target, Rocket, Star, Zap, TrendingUp, Shield, Award];
const COLORS = [
    { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
    { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
    { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
];

export default function InfoGraphicRenderer({ data }: InfoGraphicProps) {
    // 1. Extract items from various module types (flattened for this view)
    const items = React.useMemo(() => {
        if (!data) return [];

        // If data is just an array, return it
        if (Array.isArray(data)) return data;

        // If data has 'modules', extract items from them
        if (data.modules && Array.isArray(data.modules)) {
            const extracted: any[] = [];
            data.modules.forEach((mod: any) => {
                if (mod.steps) extracted.push(...mod.steps);            // process_flow
                else if (mod.items) extracted.push(...mod.items);       // comparison_grid
                else if (mod.concepts) extracted.push(...mod.concepts); // key_concepts
                else if (mod.events) extracted.push(...mod.events);     // timeline
                else if (mod.stats) extracted.push(...mod.stats);       // statistics
            });
            return extracted;
        }

        // Fallback: check for nodes or direct graph
        return data.nodes || data.graph?.nodes || [];
    }, [data]);


    if (!items || items.length === 0) {
        return <div className="p-8 text-center text-slate-400">No visual data available.</div>;
    }

    return (
        <div className="w-full h-full overflow-y-auto p-4 bg-slate-50/50 rounded-xl">
            {/* Header / Summary */}
            {data?.summary && (
                <div className="mb-6 text-center">
                    <h2 className="text-xl font-bold text-slate-800">{data.summary}</h2>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {items.map((item: any, idx: number) => {
                    const Icon = ICONS[idx % ICONS.length];
                    const color = COLORS[idx % COLORS.length];

                    // Normalize labels
                    const label = item.label || item.title || item.value || (typeof item === 'string' ? item : 'Concept');
                    const desc = item.description || item.desc || item.back || '';

                    return (
                        <div
                            key={idx}
                            className={cn(
                                "relative overflow-hidden rounded-2xl p-6 border-2 transition-all hover:scale-[1.02] hover:shadow-lg cursor-default",
                                "bg-white",
                                color.border
                            )}
                        >
                            <div className={cn(
                                "absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20",
                                color.bg.replace('100', '500')
                            )} />

                            <div className="relative z-10 flex items-start gap-4">
                                <div className={cn(
                                    "p-3 rounded-xl flex items-center justify-center shadow-sm shrink-0",
                                    color.bg,
                                    color.text
                                )}>
                                    <Icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className={cn("text-lg font-bold mb-1", "text-slate-800")}>
                                        {label}
                                    </h3>
                                    {desc && (
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            {desc}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Decorative timeline/connector if needed */}
                            {idx < items.length - 1 && (
                                <div className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 opacity-0">
                                    <ArrowRight className="h-5 w-5 text-slate-300" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bottom summary card if mainTopic exists */}
            {data?.mainTopic && (
                <div className="mt-6 p-6 bg-slate-900 text-white rounded-2xl text-center shadow-xl">
                    <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                        <CheckCircle className="h-6 w-6 text-green-400" />
                        Key Takeaway
                    </h2>
                    <p className="mt-2 text-slate-300 max-w-2xl mx-auto">
                        {data.mainTopic}
                    </p>
                </div>
            )}
        </div>
    );
}
