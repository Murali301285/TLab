'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Search, Loader2, Info, ArrowRight, Table } from 'lucide-react';
// @ts-ignore
import MindMap from '@/components/MindMap';

export default function ConceptPage() {
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null); // { summary, mermaid, steps, comparison }

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) return;

        setLoading(true);
        setData(null);

        try {
            const res = await fetch('/api/ai/concept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic })
            });
            const response = await res.json();
            if (response.success) {
                setData(response.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header / Nav */}
            <div className="bg-slate-900 text-white p-4 sticky top-0 z-10 border-b border-white/10">
                <div className="max-w-7xl mx-auto flex items-center gap-4">
                    <Link href="/coach" className="text-slate-400 hover:text-white transition-colors">
                        <ChevronLeft className="h-6 w-6" />
                    </Link>
                    <h1 className="font-bold text-lg">Visual Concept Coach</h1>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">

                {/* Search Hero */}
                <div className="max-w-2xl mx-auto mb-12 text-center">
                    {!data && !loading && (
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">What do you want to visualize?</h2>
                            <p className="text-slate-500">Enter a complex topic, and I'll break it down into diagrams, steps, and tables.</p>
                        </div>
                    )}

                    <form onSubmit={handleSearch} className="relative shadow-xl rounded-full">
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g., Photosynthesis, Agile Methodology, Supply Chain..."
                            className="w-full pl-6 pr-14 py-4 rounded-full border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none text-lg transition-all"
                        />
                        <button
                            type="submit"
                            disabled={loading || !topic}
                            className="absolute right-2 top-2 p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ArrowRight className="h-6 w-6" />}
                        </button>
                    </form>
                </div>

                {loading && (
                    <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mb-4"></div>
                        <p className="text-slate-500 animate-pulse">Designing your explanation...</p>
                    </div>
                )}

                {data && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                        {/* 1. Summary Header */}
                        <div className="bg-gradient-to-r from-purple-100 to-white border-l-4 border-purple-500 p-6 rounded-r-xl shadow-sm">
                            <h2 className="text-2xl font-bold text-slate-900 capitalize mb-2">{topic}</h2>
                            <p className="text-slate-700 text-lg leading-relaxed">{data.summary}</p>
                        </div>

                        {/* 2. Process Flowchart */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                                <Search className="h-5 w-5 text-purple-500" />
                                <h3 className="font-semibold text-slate-900">Process Visualization</h3>
                            </div>
                            <div className="p-0">
                                <MindMap chart={data.mermaid || ''} />
                            </div>
                        </div>

                        {/* 3. Steps Breakdown */}
                        {data.steps && data.steps.length > 0 && (
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                    <Info className="h-6 w-6 text-purple-500" /> Key Components & Steps
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {data.steps.map((step: any, idx: number) => (
                                        <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 font-[900] text-6xl text-slate-300 group-hover:text-purple-200 transition-colors select-none">
                                                {idx + 1}
                                            </div>
                                            <div className="text-4xl mb-4">{step.icon}</div>
                                            <h4 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h4>
                                            <p className="text-slate-600 leading-relaxed bg-white/80 relative z-10">{step.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. Comparison Table (Optional) */}
                        {data.comparison && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                                    <Table className="h-5 w-5 text-purple-500" />
                                    <h3 className="font-semibold text-slate-900">{data.comparison.title || 'Comparison'}</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50/50">
                                                {data.comparison.headers?.map((h: string, i: number) => (
                                                    <th key={i} className="px-6 py-4 font-bold text-slate-700 border-b border-slate-200 w-1/2">
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {data.comparison.rows?.map((row: string[], idx: number) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                    {row.map((cell, cellIdx) => (
                                                        <td key={cellIdx} className="px-6 py-4 text-slate-600">
                                                            {cell}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
