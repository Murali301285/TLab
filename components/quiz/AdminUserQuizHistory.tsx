'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, BookOpen } from 'lucide-react';
import QuizCard from './QuizCard';
import QuizDetailsModal from './QuizDetailsModal';

interface AdminUserQuizHistoryProps {
    userId: string;
}

export default function AdminUserQuizHistory({ userId }: AdminUserQuizHistoryProps) {
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);

    const fetchQuizzes = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/quiz/user/${userId}`);
            if (res.ok) {
                const data = await res.json();
                setQuizzes(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) fetchQuizzes();
    }, [userId]);

    return (
        <div className="space-y-6">
            {/* Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin mb-4 text-cyan-500" />
                    <p>Loading quiz history...</p>
                </div>
            ) : quizzes.length === 0 ? (
                <div className="text-center py-20 bg-slate-50/50 rounded-xl border border-dashed border-slate-300">
                    <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No Quizzes Taken</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2">
                        This user hasn't attempted any quizzes yet.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-700">Total Quizzes Attempted: {quizzes.length}</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {quizzes.map((quiz, index) => (
                            <QuizCard
                                key={quiz.id}
                                attempt={quiz}
                                index={index + 1}
                                onClick={() => setSelectedQuiz(quiz)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {selectedQuiz && (
                <QuizDetailsModal
                    attempt={selectedQuiz}
                    onClose={() => setSelectedQuiz(null)}
                />
            )}
        </div>
    );
}
