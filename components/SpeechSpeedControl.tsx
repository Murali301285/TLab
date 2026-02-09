'use client';

import React from 'react';
import { Settings, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpeechSpeedControlProps {
    speed: number;
    onChange: (speed: number) => void;
    className?: string;
    compact?: boolean;
}

export default function SpeechSpeedControl({ speed, onChange, className, compact = false }: SpeechSpeedControlProps) {
    const SPEEDS = [0.8, 1.0, 1.2]; // Config as per user request directly overrides typical 0.75/1.25

    return (
        <div className={cn("flex items-center gap-2", className)}>
            {!compact && (
                <div className="flex items-center text-slate-500 text-xs font-medium">
                    <Gauge className="h-3.5 w-3.5 mr-1" />
                    Speed
                </div>
            )}
            <div className="relative">
                <select
                    value={speed}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className={cn(
                        "appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg py-1.5 pl-3 pr-8 cursor-pointer hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all",
                        compact ? "py-1 pr-6" : ""
                    )}
                    title="Speech Playback Speed"
                >
                    {SPEEDS.map((s) => (
                        <option key={s} value={s}>
                            {s}x
                        </option>
                    ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>
        </div>
    );
}
