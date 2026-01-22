'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Loader2, Sparkles } from 'lucide-react';
import QuizCard from './QuizCard';
import QuizDetailsModal from './QuizDetailsModal';

export default function QuizHistoryList() {
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);

    const fetchQuizzes = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);

            const res = await fetch(`/api/quiz/my-quizzes?${params.toString()}`);
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
        const timer = setTimeout(() => {
            fetchQuizzes();
        }, 500); // Debounce
        return () => clearTimeout(timer);
    }, [search]);

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by topic..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
                    />
                </div>
                {/* Future: Add Date Range Filter here */}
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-500" />
                    <p>Loading your quiz history...</p>
                </div>
            ) : quizzes.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                    <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="h-8 w-8 text-indigo-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No Quizzes Taken Yet</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mt-2">
                        Start learning a topic and take a quiz to test your knowledge!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {quizzes.map((quiz) => (
                        <QuizCard
                            key={quiz.id}
                            attempt={quiz}
                            onClick={() => setSelectedQuiz(quiz)}
                        />
                    ))}
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
