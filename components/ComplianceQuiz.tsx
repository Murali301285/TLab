'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, Award, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { saveQuizAttempt } from '@/app/actions/courses';
import confetti from 'canvas-confetti';

interface Question {
    question: string;
    options: string[];
    correctAnswer: number;
}

interface ComplianceQuizProps {
    courseId: string;
    userId: string;
    courseTitle: string;
    passPercentage: number;
    questionCount: number;
    onPass: () => void;
    onSign: () => void;
}

export default function ComplianceQuiz({
    courseId,
    userId,
    courseTitle,
    passPercentage,
    questionCount,
    onPass,
    onSign
}: ComplianceQuizProps) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<number[]>([]);
    const [status, setStatus] = useState<'loading' | 'active' | 'submitting' | 'result'>('loading');
    const [score, setScore] = useState(0);
    const [passed, setPassed] = useState(false);
    const [history, setHistory] = useState<string[]>([]); // Track question history to avoid repeats
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        generateQuiz();
    }, []);

    const generateQuiz = async () => {
        setStatus('loading');
        setError(null);
        try {
            const res = await fetch('/api/ai/generate', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'quiz',
                    courseId,
                    topicTitle: courseTitle,
                    questionCount: questionCount || 5,
                    previousQuestions: history // Send history to backend
                })
            });
            const data = await res.json();

            // Handle different response structures from existing API
            let quizContent = data.content;
            if (typeof quizContent === 'string') {
                try {
                    quizContent = JSON.parse(quizContent);
                } catch (e) {
                    console.error("Failed to parse quiz string", e);
                }
            }

            if (Array.isArray(quizContent)) {
                // Shuffle questions and options
                const shuffledQuestions = quizContent.map((q: Question) => {
                    const optionsWithIndex = q.options.map((opt, idx) => ({ opt, idx }));
                    // Shuffle options
                    for (let i = optionsWithIndex.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [optionsWithIndex[i], optionsWithIndex[j]] = [optionsWithIndex[j], optionsWithIndex[i]];
                    }
                    const newOptions = optionsWithIndex.map(o => o.opt);
                    const newCorrectAnswer = optionsWithIndex.findIndex(o => o.idx === q.correctAnswer);
                    return { ...q, options: newOptions, correctAnswer: newCorrectAnswer };
                });

                // Shuffle the questions themselves
                for (let i = shuffledQuestions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
                }

                setQuestions(shuffledQuestions);
                setUserAnswers(new Array(shuffledQuestions.length).fill(-1));
                setStatus('active');
                setCurrentQuestionIndex(0);

                // Add new questions to history
                const newQuestionTexts = shuffledQuestions.map((q: Question) => q.question);
                setHistory(prev => [...prev, ...newQuestionTexts]);

            } else {
                throw new Error("Invalid quiz format received");
            }
        } catch (e: any) {
            console.error(e);
            setError("Failed to generate quiz. Please try again.");
            setStatus('result');
            // In a real failed gen scenario, we might want a different UI than 'result', 
            // but for simplicity we reuse it with error message.
        }
    };

    const handleAnswer = (optionIndex: number) => {
        const newAnswers = [...userAnswers];
        newAnswers[currentQuestionIndex] = optionIndex;
        setUserAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        setStatus('submitting');

        let correctCount = 0;
        questions.forEach((q, idx) => {
            if (userAnswers[idx] === q.correctAnswer) correctCount++;
        });

        const finalScore = Math.round((correctCount / questions.length) * 100);
        setScore(finalScore);

        try {
            const result = {
                score: finalScore,
                totalQuestions: questions.length,
                timeTaken: 0,
                quizData: { questions, userAnswers }
            };

            const saveRes = await saveQuizAttempt(userId, courseId, result);

            if (saveRes.success) {
                const isPass = saveRes.passed ?? false;
                setPassed(isPass);

                if (isPass) {
                    onPass();
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 }
                    });
                }
            } else {
                setError("Failed to save result. Please check connection.");
            }
        } catch (e) {
            console.error(e);
            setError("Unexpected error submitting quiz.");
        }

        setStatus('result');
    };

    if (status === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
                <Loader2 className="h-12 w-12 animate-spin text-cyan-600" />
                <p className="text-slate-500 font-medium animate-pulse text-lg">Designing your assessment...</p>
            </div>
        );
    }

    if (status === 'result') {
        return (
            <div className="max-w-2xl mx-auto py-12 px-6 text-center space-y-8 animate-in zoom-in-95 duration-500">
                <div className={cn("mx-auto h-32 w-32 rounded-full flex items-center justify-center shadow-lg mb-6 transition-all duration-500", passed ? "bg-green-100 ring-8 ring-green-50" : "bg-red-100 ring-8 ring-red-50")}>
                    {passed ? <Award className="h-16 w-16 text-green-600" /> : <XCircle className="h-16 w-16 text-red-600" />}
                </div>

                <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                    {passed ? "Assessment Passed!" : "Assessment Failed"}
                </h2>

                <div className={cn("text-7xl font-black tracking-tighter", passed ? "text-green-600" : "text-red-500")}>
                    {score}%
                </div>

                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <p className="text-slate-700 text-lg leading-relaxed">
                        {passed
                            ? "Congratulations! You have successfully demonstrated your understanding of this policy. You may now proceed to sign the document."
                            : `You need a score of ${passPercentage}% or higher to pass. Please review the material and try again.`}
                    </p>
                </div>

                <div className="flex justify-center gap-4 pt-4">
                    {passed ? (
                        <button
                            onClick={onSign}
                            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 animate-bounce"
                        >
                            <span className="h-5 w-5 mr-1">✍️</span> Sign Document
                        </button>
                    ) : (
                        <button
                            onClick={generateQuiz}
                            className="flex items-center gap-2 px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <RotateCcw className="h-5 w-5" /> Try Again
                        </button>
                    )}
                </div>

                {error && <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg">{error}</p>}
            </div>
        );
    }

    const question = questions[currentQuestionIndex];
    if (!question) return null;

    return (
        <div className="max-w-xl mx-auto py-4">
            {/* Header / Progress */}
            <div className="mb-4">
                <div className="flex justify-between items-end mb-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question {currentQuestionIndex + 1} of {questions.length}</span>
                    <span className="text-xs font-bold text-cyan-600">{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden shadow-inner">
                    <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Question Card */}
            <div className="bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 leading-snug">
                        {question.question}
                    </h3>

                    <div className="space-y-2">
                        {question.options.map((option, idx) => {
                            const isSelected = userAnswers[currentQuestionIndex] === idx;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(idx)}
                                    className={cn(
                                        "w-full text-left p-3 rounded-lg border transition-all duration-200 flex items-center justify-between group relative overflow-hidden",
                                        isSelected
                                            ? "border-cyan-500 bg-cyan-50 shadow-sm scale-[1.01]"
                                            : "border-slate-100 hover:border-cyan-200 hover:bg-slate-50"
                                    )}
                                >
                                    <div className="flex items-center gap-3 z-10 relative">
                                        <div className={cn(
                                            "h-6 w-6 rounded-full border flex items-center justify-center font-bold text-xs transition-colors",
                                            isSelected ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-300 text-slate-400 group-hover:border-cyan-400 group-hover:text-cyan-600"
                                        )}>
                                            {String.fromCharCode(65 + idx)}
                                        </div>
                                        <span className={cn("font-medium text-sm", isSelected ? "text-cyan-900" : "text-slate-600")}>
                                            {option}
                                        </span>
                                    </div>
                                    {isSelected && (
                                        <CheckCircle className="h-4 w-4 text-cyan-600 z-10 animate-in zoom-in spin-in-12" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-slate-50 p-3 border-t border-slate-100 flex justify-between">
                    <button
                        onClick={handlePrevious}
                        disabled={currentQuestionIndex === 0}
                        className={cn(
                            "px-4 py-2 rounded-lg font-bold text-sm text-slate-600 hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                            currentQuestionIndex === 0 ? "invisible" : ""
                        )}
                    >
                        Back
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={userAnswers[currentQuestionIndex] === -1}
                        className={cn(
                            "px-6 py-2 rounded-lg font-bold text-sm text-white shadow-md transition-all transform flex items-center gap-2",
                            userAnswers[currentQuestionIndex] === -1
                                ? "bg-slate-300 cursor-not-allowed"
                                : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 hover:-translate-y-0.5 hover:shadow-cyan-200"
                        )}
                    >
                        {status === 'submitting' && <Loader2 className="h-4 w-4 animate-spin" />}
                        {currentQuestionIndex === questions.length - 1 ? "Submit" : "Next"}
                    </button>
                </div>
            </div>
        </div>
    );
}
