import React from 'react';
import {
    ArrowRight, Check, X, Clock, Calendar, TrendingUp,
    Leaf, Tractor, CloudRain, Snowflake, Sun, Users,
    FileText, Shield, AlertTriangle, Lightbulb, Zap,
    Settings, Search, Database, Server, Smartphone,
    Globe, Network, DollarSign, Briefcase, Award,
    BookOpen, GraduationCap, Microscope, Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Icon System ---
// We map AI-generated strings (kebab-case) to Lucide components.
// We include a broad set of defaults + common icons.
const ICON_MAP: any = {
    'arrow-right': ArrowRight, 'check': Check, 'x': X, 'clock': Clock,
    'calendar': Calendar, 'trending-up': TrendingUp, 'leaf': Leaf,
    'tractor': Tractor, 'cloud-rain': CloudRain, 'snowflake': Snowflake,
    'sun': Sun, 'users': Users, 'file-text': FileText, 'shield': Shield,
    'alert-triangle': AlertTriangle, 'lightbulb': Lightbulb, 'zap': Zap,
    'settings': Settings, 'search': Search, 'database': Database,
    'server': Server, 'smartphone': Smartphone, 'globe': Globe,
    'network': Network, 'dollar-sign': DollarSign, 'briefcase': Briefcase,
    'award': Award, 'book-open': BookOpen, 'graduation-cap': GraduationCap,
    'microscope': Microscope, 'heart': Heart
};

export const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
    // Normalize: 'Tractor' -> 'tractor', 'user-check' -> 'user-check'
    const normalized = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // Lucide component or fallback
    const IconComponent = ICON_MAP[normalized] || Lightbulb;

    return <IconComponent className={className} />;
};


// --- Module 1: Process Flow ---
export const ProcessFlow = ({ data }: { data: any }) => {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <DynamicIcon name="network" className="w-5 h-5 text-indigo-600" />
                {data.title}
            </h3>
            <div className="flex flex-col md:flex-row gap-4 relative">
                {data.steps.map((step: any, idx: number) => (
                    <div key={idx} className="flex-1 relative group">
                        {/* Connecting Line (Desktop) */}
                        {idx < data.steps.length - 1 && (
                            <div className="hidden md:block absolute top-6 left-1/2 w-full h-1 bg-slate-100 z-0 group-hover:bg-indigo-50 transition-colors"></div>
                        )}

                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-lg transition-transform group-hover:scale-110 mb-3",
                                idx % 2 === 0 ? "bg-indigo-600" : "bg-purple-600"
                            )}>
                                <DynamicIcon name={step.icon} className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm mb-1">{step.label}</h4>
                            <p className="text-xs text-slate-500 leading-relaxed px-2">{step.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Module 2: Comparison Grid ---
export const ComparisonGrid = ({ data }: { data: any }) => {
    return (
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6 text-center">{data.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.items.map((item: any, idx: number) => (
                    <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border-t-4 border-indigo-500 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                <DynamicIcon name={item.icon} className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-lg text-slate-900">{item.title}</h4>
                        </div>
                        <ul className="space-y-2">
                            {item.points.map((pt: string, pIdx: number) => (
                                <li key={pIdx} className="text-sm text-slate-600 flex items-start gap-2">
                                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                    <span>{pt}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Module 3: Key Concepts ---
export const KeyConcepts = ({ data }: { data: any }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 px-2">{data.title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.concepts.map((concept: any, idx: number) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-cyan-300 hover:shadow-md transition-all group">
                        <div className="mb-3">
                            <span className="p-2 inline-block bg-cyan-50 text-cyan-700 rounded-lg group-hover:bg-cyan-100 transition-colors">
                                <DynamicIcon name={concept.icon} className="w-5 h-5" />
                            </span>
                        </div>
                        <h4 className="font-bold text-slate-900 mb-1">{concept.title}</h4>
                        <p className="text-sm text-slate-500 leading-snug">{concept.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Module 4: Statistics / Highlights ---
export const Statistics = ({ data }: { data: any }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
            {data.stats.map((stat: any, idx: number) => (
                <div key={idx} className="bg-slate-900 text-white p-4 rounded-xl flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10">
                        <DynamicIcon name={stat.icon} className="w-6 h-6 text-indigo-300 mb-2 mx-auto" />
                        <div className="text-2xl font-black tracking-tight mb-1">{stat.value}</div>
                        <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- Module 5: Timeline ---
export const Timeline = ({ data }: { data: any }) => {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                {data.title}
            </h3>
            <div className="space-y-6 relative pl-4">
                {/* Vertical Line */}
                <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-slate-200"></div>

                {data.events.map((ev: any, idx: number) => (
                    <div key={idx} className="relative flex gap-6 group">
                        {/* Dot */}
                        <div className="w-6 h-6 rounded-full bg-white border-4 border-amber-200 group-hover:border-amber-400 z-10 shrink-0 transition-colors"></div>

                        <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-100 group-hover:border-amber-200 transition-colors">
                            <div className="text-sm font-bold text-amber-600 mb-1">{ev.year}</div>
                            <h4 className="font-bold text-slate-900 mb-1">{ev.title}</h4>
                            <p className="text-sm text-slate-600">{ev.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
