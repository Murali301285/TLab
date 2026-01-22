'use client';

import React from 'react';
import { X, CheckCircle, XCircle, FileDown, Printer, Calendar, RotateCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface QuizDetailsModalProps {
    attempt: any;
    onClose: () => void;
}

export default function QuizDetailsModal({ attempt, onClose }: QuizDetailsModalProps) {
    const router = useRouter();

    const handleRetake = () => {
        if (attempt.courseId && attempt.topic && attempt.topic.chapterId && attempt.topicId) {
            router.push(`/learn/${attempt.courseId}?chapter=${attempt.topic.chapterId}&topic=${attempt.topicId}&tab=quiz`);
        } else {
            console.error("Missing navigation data for retake", attempt);
            // Fallback or alert if data missing (though API should provide it now)
            if (attempt.courseId) router.push(`/learn/${attempt.courseId}`);
        }
    };

    const handleDownload = () => {
        window.print(); // Simple print for now, can be enhanced to PDF later
    };

    if (!attempt) return null;

    const { questions, userAnswers } = attempt.quizData;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:p-0 print:bg-white inset-0">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col print:shadow-none print:max-w-none print:h-full print:rounded-none"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50 print:bg-white print:border-b-2">
                        <div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                                <span className="uppercase tracking-wider font-bold text-xs">{attempt.courseId ? 'Course Assessment' : 'Topic Quiz'}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(attempt.submittedAt).toLocaleDateString()}</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">{attempt.topicName}</h2>
                        </div>
                        <div className="flex items-center gap-2 print:hidden">
                            <button
                                onClick={handleRetake}
                                className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 mr-2"
                            >
                                <RotateCw className="h-4 w-4" /> Retake Quiz
                            </button>
                            <button onClick={handleDownload} className="p-2 hover:bg-white rounded-full text-slate-600 border border-transparent hover:border-slate-200 transition-all" title="Print Report">
                                <Printer className="h-5 w-5" />
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-all">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    {/* Stats Bar */}
                    <div className="p-6 bg-white grid grid-cols-4 gap-4 border-b border-slate-100 print:grid-cols-4">
                        <div className="text-center p-3 bg-indigo-50 rounded-xl print:bg-transparent print:border">
                            <div className="text-xs text-indigo-500 font-bold uppercase">Score</div>
                            <div className="text-2xl font-bold text-indigo-700">{attempt.score}/{attempt.totalQuestions}</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-xl print:bg-transparent print:border">
                            <div className="text-xs text-green-600 font-bold uppercase">Result</div>
                            <div className="text-2xl font-bold text-green-700">
                                {Math.round((attempt.score / attempt.totalQuestions) * 100)}%
                            </div>
                        </div>
                        <div className="text-center p-3 bg-amber-50 rounded-xl print:bg-transparent print:border">
                            <div className="text-xs text-amber-600 font-bold uppercase">Time</div>
                            <div className="text-2xl font-bold text-amber-700">{Math.floor(attempt.timeTaken / 60)}m {attempt.timeTaken % 60}s</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-xl print:bg-transparent print:border">
                            <div className="text-xs text-blue-600 font-bold uppercase">Status</div>
                            <div className="text-2xl font-bold text-blue-700">
                                {(() => {
                                    const percentage = (attempt.score / attempt.totalQuestions) * 100;
                                    if (percentage === 100) return <span className="text-purple-600">DISTINCTION</span>;
                                    if (percentage >= 50) return <span className="text-green-600">PASSED</span>;
                                    return <span className="text-red-600">FAILED</span>;
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Questions List */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50 print:bg-white print:overflow-visible">
                        {questions.map((q: any, i: number) => {
                            const userAnswer = userAnswers[i];
                            const isCorrect = userAnswer === q.correctAnswer;

                            return (
                                <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border print:break-inside-avoid">
                                    <div className="flex gap-4">
                                        <div className="shrink-0">
                                            {isCorrect ? (
                                                <div className="h-8 w-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                                    <CheckCircle className="h-5 w-5" />
                                                </div>
                                            ) : (
                                                <div className="h-8 w-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                                                    <XCircle className="h-5 w-5" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-800 text-lg mb-4">
                                                <span className="text-slate-400 mr-2">{i + 1}.</span>
                                                {q.question}
                                            </h3>

                                            <div className="space-y-3">
                                                {q.options.map((opt: string, optIdx: number) => {
                                                    const isSelected = userAnswer === optIdx;
                                                    const isTargetCorrect = optIdx === q.correctAnswer;

                                                    let itemClass = "border-slate-200 bg-slate-50 text-slate-600"; // Default

                                                    if (isTargetCorrect) {
                                                        itemClass = "border-green-500 bg-green-50 text-green-800 font-medium ring-1 ring-green-500";
                                                    } else if (isSelected && !isTargetCorrect) {
                                                        itemClass = "border-red-300 bg-red-50 text-red-800";
                                                    }

                                                    return (
                                                        <div key={optIdx} className={cn(
                                                            "p-3 rounded-lg border text-sm flex items-center justify-between",
                                                            itemClass
                                                        )}>
                                                            <span>{opt}</span>
                                                            {isTargetCorrect && <CheckCircle className="h-4 w-4 text-green-600" />}
                                                            {isSelected && !isTargetCorrect && <XCircle className="h-4 w-4 text-red-500" />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-200 bg-white text-center text-xs text-slate-400 print:hidden">
                        Quiz Report generated on {new Date().toLocaleString()} • T-Lab Learning Platform
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

// Add CSS for print helper
/*
@media print {
  body * {
    visibility: hidden;
  }
  .fixed, .fixed * {
    visibility: visible;
  }
  .fixed {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background: white;
  }
}
*/
