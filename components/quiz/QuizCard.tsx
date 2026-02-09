'use client';

import React from 'react';
import { Calendar, Clock, Trophy, ArrowRight, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface QuizCardProps {
    attempt: any;
    index?: number;
    onClick: () => void;
}

export default function QuizCard({ attempt, index, onClick }: QuizCardProps) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const percentage = Math.round((attempt.score / attempt.totalQuestions) * 100);
    const isPass = percentage >= 60;

    return (
        <motion.div
            whileHover={{ y: -4 }}
            className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer flex flex-col h-full relative"
            onClick={onClick}
        >
            {/* Index Badge */}
            {index && (
                <div className="absolute top-0 right-0 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg border-b border-l border-slate-200 z-10">
                    #{index}
                </div>
            )}

            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <BookOpen className="h-3 w-3" />
                    <span>Topic</span>
                </div>
                <div className={cn(
                    "px-2 py-1 rounded text-xs font-bold",
                    isPass ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                    {percentage}%
                </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col gap-4">
                <h3 className="font-bold text-slate-800 line-clamp-2 text-lg group-hover:text-indigo-600 transition-colors">
                    {attempt.topicName}
                </h3>

                <div className="grid grid-cols-2 gap-3 mt-auto">
                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        <span className="font-medium">{attempt.score}/{attempt.totalQuestions}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                        <Clock className="h-4 w-4 text-indigo-500" />
                        <span>{formatTime(attempt.timeTaken)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(attempt.submittedAt)}
                </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button className="text-xs font-bold text-indigo-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                    View Details <ArrowRight className="h-3 w-3" />
                </button>
            </div>
        </motion.div>
    );
}
