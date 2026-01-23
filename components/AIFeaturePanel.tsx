'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    Loader2, CheckSquare, Sparkles, BrainCircuit, Mic,
    MessageSquare, Layers, Presentation, Lightbulb, Play, Pause, Square, GalleryVerticalEnd, LayoutGrid, Network, Workflow, Maximize2, Minimize2, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { processHtmlForSpeech } from '@/lib/speechUtils';

// Components
import FlashcardDeck from './FlashcardDeck';
import InfographicRenderer from './InfographicRenderer';
import BentoRenderer from './BentoRenderer';
// import KnowledgeGraph from './KnowledgeGraph'; // Removed
import MindMapRenderer from './MindMapRenderer';
import MermaidDiagram from './MermaidDiagram';
import ScrollyTelling from './ScrollyTelling';
import { Topic } from '@/data/mockData';

interface AIFeaturePanelProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    activeTab: 'mindmap' | 'quiz' | 'flashcards' | 'explain' | 'podcast' | 'simplify' | 'visualize' | 'scrollytelling';
    setActiveTab: (tab: any) => void;

    // Context Data
    topic: any;
    courseId: string;
    selectedText?: string;

    // Callbacks
    onClose: () => void;
    onAudioStart?: () => void;
    forceStopAudio?: boolean;
    quizConfig?: string;
}

const DEMO_FLASHCARDS = [
    { question: "What is the main concept?", answer: "This is a placeholder for AI generated content." },
    { question: "Why is this important?", answer: "It helps in understanding the core material." }
];

export default function AIFeaturePanel({
    isOpen,
    setIsOpen,
    activeTab,
    setActiveTab,
    topic,
    courseId,
    selectedText,
    onClose,
    onAudioStart,
    forceStopAudio,
    quizConfig = '5'
}: AIFeaturePanelProps) {
    // AI Content States
    const [explanation, setExplanation] = useState<string | null>(null);
    const [quiz, setQuiz] = useState<any[]>([]);
    const [flashcards, setFlashcards] = useState<any[]>([]);
    const [podcastData, setPodcastData] = useState<any>(null);
    const [simplificationData, setSimplificationData] = useState<string | null>(null);
    const [visualizeData, setVisualizeData] = useState<any>(null);
    const [mindMapData, setMindMapData] = useState<any>(null);
    const [scrollyData, setScrollyData] = useState<any>(null);

    // UI States
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [selectedAnalogy, setSelectedAnalogy] = useState<string>('General');
    const [visualLayout, setVisualLayout] = useState<'flow' | 'bento' | 'graph' | 'mindmap'>('bento');
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Quiz State
    // const [quizConfig, setQuizConfig] = useState<number>(3); // Removed in favor of props
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
    const [quizTimer, setQuizTimer] = useState(0); // Seconds
    const [isQuizTimerRunning, setIsQuizTimerRunning] = useState(false);
    const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);

    // Podcast State
    const [isPlayingPodcast, setIsPlayingPodcast] = useState(false);
    const [isPodcastPaused, setIsPodcastPaused] = useState(false);
    const [currentPodcastLine, setCurrentPodcastLine] = useState(-1);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    const ANALOGY_TAGS = [
        'General', '🎮 Games', '🍕 Food', '🎬 Movies', '♟️ Chess', '🚗 Cars', '🚀 Space'
    ];

    // Reset state when topic changes
    useEffect(() => {
        setExplanation(null);
        setQuiz([]);
        setFlashcards([]);
        setPodcastData(null);
        setSimplificationData(null);
        setVisualizeData(null);
        setMindMapData(null);
        setScrollyData(null);
        setIsPlayingPodcast(false);
        window.speechSynthesis.cancel();
    }, [topic?.id]);

    // Handle Tab Change & Auto-Fetch
    const topicId = topic?.id;
    useEffect(() => {
        if (isOpen && activeTab) {
            // Auto-Generate Quiz if Config is Fixed
            if (activeTab === 'quiz') {
                if ((quizConfig === '5' || quizConfig === '10') && quiz.length === 0 && !isAiLoading) {
                    handleAIFeature('quiz', undefined, undefined, parseInt(quizConfig));
                }
                return;
            }

            // Don't auto-fetch for scrollytelling (waiting for start)
            if (activeTab === 'scrollytelling') return;

            handleAIFeature(activeTab);
        }
    }, [activeTab, isOpen, quizConfig, quiz.length, topicId]); // Trigger regen on topic change

    // Quiz Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isQuizTimerRunning && !quizSubmitted) {
            interval = setInterval(() => {
                setQuizTimer(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isQuizTimerRunning, quizSubmitted]);

    // Start Timer when Quiz is generated
    useEffect(() => {
        if (quiz.length > 0 && !quizSubmitted) {
            setQuizTimer(0);
            setIsQuizTimerRunning(true);
        } else {
            setIsQuizTimerRunning(false);
        }
    }, [quiz, quizSubmitted]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAIFeature = async (feature: string, overrideText?: string, analogyOverride?: string, quizConfigOverride?: number) => {
        // Cached checks
        if (feature === 'flashcards' && flashcards.length > 0) return;
        if (feature === 'quiz' && quiz.length > 0 && !quizConfigOverride) return; // Retrigger manually for quiz only if no override

        // Explain logic
        if (feature === 'explain') {
            // If we have selected text, ALWAYS fetch new
            if (selectedText) {
                // proceed to fetch
            } else if (explanation) {
                return; // Cached topic explanation
            }
        }

        setIsAiLoading(true);

        try {
            const rawContent = topic?.content?.text || (typeof topic?.content === 'string' ? topic.content : "");
            const context = rawContent.replace(/<[^>]*>?/gm, '');

            // Endpoint Selection
            const endpoint = (feature === 'visualize' || feature === 'scrollytelling')
                ? '/api/ai/generate' // Fixed: Updated route handling in backend supports this now? 
                : '/api/ai/generate'; // Actually all go to generate now except specific legacy ones?

            // NOTE: Compliance page had custom logic mapping 'visualize' -> 'concept' endpoint.
            // But recent backend updates unified it into /api/ai/generate with 'visualize' type.
            // Let's stick to /api/ai/generate for everything as per latest refactor.

            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: feature === 'simplify' ? 'simplification' : (feature === 'visualize' ? 'visualize' : feature),
                    context: context.substring(0, 25000),
                    topicTitle: overrideText || selectedText || topic?.title,
                    questionCount: feature === 'quiz' ? (quizConfigOverride || quizConfig) : undefined,
                    analogy: feature === 'simplify' ? (analogyOverride || selectedAnalogy) : undefined
                })
            });

            const data = await response.json();
            const content = data.content;

            const parseJSON = (str: any) => {
                if (typeof str !== 'string') return str;

                // 1. naive clean
                let cleanStr = str.replace(/```json/g, '').replace(/```/g, '').trim();

                // Check for Mermaid/Text string to avoid JSON Parse Error logs
                if (
                    cleanStr.startsWith('mindmap') ||
                    cleanStr.startsWith('graph') ||
                    cleanStr.startsWith('sequenceDiagram') ||
                    cleanStr.startsWith('flowchart')
                ) {
                    return null; // Will trigger fallback in handleAIFeature
                }

                // 2. Extract JSON part if there is extra text
                const firstOpenBrace = cleanStr.indexOf('{');
                const firstOpenBracket = cleanStr.indexOf('[');
                let startIndex = -1;

                // Determine if it starts with { or [
                if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
                    startIndex = firstOpenBrace;
                } else if (firstOpenBracket !== -1) {
                    startIndex = firstOpenBracket;
                }

                if (startIndex !== -1) {
                    // Find the matching end
                    const lastCloseBrace = cleanStr.lastIndexOf('}');
                    const lastCloseBracket = cleanStr.lastIndexOf(']');
                    const endIndex = Math.max(lastCloseBrace, lastCloseBracket);

                    if (endIndex > startIndex) {
                        cleanStr = cleanStr.substring(startIndex, endIndex + 1);
                    }
                }

                try {
                    return JSON.parse(cleanStr);
                } catch (e) {
                    // Only log if it's not a known non-JSON format we already checked (redundant but safe)
                    // console.error("JSON Parse Error", e);
                    return null;
                }
            };

            if (feature === 'explain') setExplanation(content);
            else if (feature === 'simplify') setSimplificationData(content);
            else if (feature === 'quiz') {
                const parsed = parseJSON(content);
                setQuiz(Array.isArray(parsed) ? parsed : []);
                setQuizSubmitted(false);
                setUserAnswers({});
                setQuizScore({ correct: 0, total: 0 });
                // Timer start handled by effect
            }
            else if (feature === 'flashcards') setFlashcards(parseJSON(content) || []);
            else if (feature === 'podcast') setPodcastData(parseJSON(content));
            else if (feature === 'mindmap') {
                const parsed = parseJSON(content);
                // Fallback to raw string if parsed is null but content looks like mermaid
                if (!parsed && typeof content === 'string' && (content.trim().startsWith('mindmap') || content.trim().startsWith('graph'))) {
                    setMindMapData(content.replace(/```mermaid/g, '').replace(/```/g, '').trim());
                } else {
                    setMindMapData(parsed);
                }
            }
            else if (feature === 'visualize') setVisualizeData(parseJSON(content));
            else if (feature === 'scrollytelling') setScrollyData(parseJSON(content));

        } catch (error) {
            console.error("AI Feature Error:", error);
        } finally {
            setIsAiLoading(false);
        }
    };

    // --- Podcast Logic ---
    useEffect(() => {
        if (isPlayingPodcast && currentPodcastLine >= 0 && podcastData && currentPodcastLine < podcastData.length) {
            const line = podcastData[currentPodcastLine];
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(line.text);
            const voices = window.speechSynthesis.getVoices();
            const enVoices = voices.filter(v => v.lang.startsWith('en'));

            // Apply Speed
            utterance.rate = playbackSpeed;

            if (line.speaker === 'Host') {
                const hostVoice = enVoices.find(v => v.name.includes('Female') || v.name.includes('Google US English'));
                if (hostVoice) utterance.voice = hostVoice;
                utterance.pitch = 1.1;
            } else {
                const expertVoice = enVoices.find(v => v.name.includes('Male') || v.name.includes('Google UK English Male'));
                if (expertVoice) utterance.voice = expertVoice;
                utterance.pitch = 0.9;
            }

            utterance.onend = () => {
                if (isPlayingPodcast) {
                    if (currentPodcastLine + 1 < podcastData.length) {
                        setCurrentPodcastLine(prev => prev + 1);
                    } else {
                        setIsPlayingPodcast(false);
                        setCurrentPodcastLine(-1);
                    }
                }
            };
            window.speechSynthesis.speak(utterance);
        }
    }, [isPlayingPodcast, currentPodcastLine, podcastData, playbackSpeed]);

    // Handle External Force Stop (Course Player started)
    useEffect(() => {
        if (forceStopAudio && isPlayingPodcast) {
            window.speechSynthesis.cancel();
            setIsPlayingPodcast(false);
            setIsPodcastPaused(false);
        }
    }, [forceStopAudio]);

    const togglePodcast = () => {
        if (isPlayingPodcast) {
            if (isPodcastPaused) {
                window.speechSynthesis.resume();
                setIsPodcastPaused(false);
            } else {
                window.speechSynthesis.pause();
                setIsPodcastPaused(true);
            }
        } else {
            // Start Podcast - Notify Parent to stop its audio
            onAudioStart?.();
            setIsPlayingPodcast(true);
            setCurrentPodcastLine(0);
        }
    };

    // --- Quiz Logic ---
    const handleQuizSubmit = () => {
        if (Object.keys(userAnswers).length < quiz.length) {
            alert("Please select an answer for all questions before submitting.");
            return;
        }

        let correct = 0;
        quiz.forEach((q, idx) => {
            if (userAnswers[idx] === q.correctAnswer) correct++;
        });
        setQuizScore({ correct, total: quiz.length });
        setQuizSubmitted(true);
        setIsQuizTimerRunning(false);
    };

    const handleSaveQuizToProfile = async () => {
        setIsSubmittingQuiz(true);
        try {
            const response = await fetch('/api/quiz/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseId,
                    topicId: topic?.id,
                    topicName: topic?.title || "Unknown Topic",
                    score: quizScore.correct,
                    totalQuestions: quizScore.total,
                    timeTaken: quizTimer,
                    quizData: {
                        questions: quiz,
                        userAnswers
                    }
                })
            });

            if (response.ok) {
                // Success Toast/Notification could go here
                alert("Quiz saved to your profile!");
            } else {
                alert("Failed to save quiz results.");
            }
        } catch (error) {
            console.error(error);
            alert("Error saving quiz.");
        } finally {
            setIsSubmittingQuiz(false);
        }
    };

    const resetQuiz = () => {
        setQuiz([]);
        setQuizSubmitted(false);
        setUserAnswers({});
        setQuizScore({ correct: 0, total: 0 });
        setQuizTimer(0);
    };


    if (!isOpen) return null;

    return (
        <div className={cn(
            "flex flex-col bg-slate-50 border-l border-slate-200 animate-in slide-in-from-right duration-300 transition-all",
            isFullscreen ? "fixed inset-0 top-16 z-[9999] w-full h-full md:pl-20" : "h-full w-full"
        )}>
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0 h-16">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    AI Tools
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className={cn(
                            "p-2 rounded-lg transition-colors",
                            isFullscreen ? "text-slate-500 hover:bg-red-50 hover:text-red-600" : "text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                        )}
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    >
                        {isFullscreen ? <X className="h-5 w-5" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                    {!isFullscreen && (
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-red-500 transition-colors">
                            <LayoutGrid className="h-4 w-4" /> {/* Close Panel */}
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto bg-white border-b border-slate-200 shrink-0 scrollbar-hide">
                {[
                    { id: 'visualize', icon: Presentation, label: 'Visualize', color: 'indigo' },
                    { id: 'simplify', icon: Lightbulb, label: 'Explain', color: 'amber' },
                    { id: 'quiz', icon: CheckSquare, label: 'Quiz', color: 'green' },
                    { id: 'scrollytelling', icon: GalleryVerticalEnd, label: 'Journey', color: 'rose' },
                    { id: 'podcast', icon: Mic, label: 'Podcast', color: 'purple' },
                    { id: 'flashcards', icon: Layers, label: 'Cards', color: 'orange' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "flex-1 min-w-[80px] py-4 text-xs font-medium border-b-2 transition-colors flex flex-col items-center gap-1 hover:bg-slate-50",
                            activeTab === tab.id
                                ? `border-${tab.color}-500 text-${tab.color}-600 bg-${tab.color}-50/10`
                                : "border-transparent text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50">
                <div className={cn("p-6 min-h-full", isFullscreen ? "max-w-7xl mx-auto w-full bg-white shadow-sm min-h-screen border-x border-slate-100" : "")}>
                    {isAiLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-500" />
                            <p>Generating AI {activeTab}...</p>
                        </div>
                    ) : (
                        <div className="h-full">

                            {/* EXPLAIN / SIMPLIFY */}
                            {(activeTab === 'simplify' || activeTab === 'explain') && (
                                <div className="space-y-4">
                                    {activeTab === 'simplify' && (
                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                            {ANALOGY_TAGS.map(tag => (
                                                <button
                                                    key={tag}
                                                    onClick={() => {
                                                        setSelectedAnalogy(tag);
                                                        handleAIFeature('simplify', undefined, tag);
                                                    }}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all",
                                                        selectedAnalogy === tag ? "bg-amber-100 border-amber-300 text-amber-800" : "bg-white border-slate-200 text-slate-500"
                                                    )}
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <div className={cn(
                                        "prose prose-amber bg-amber-50/50 p-4 rounded-xl border border-amber-100 min-w-full",
                                        isFullscreen ? "prose-md max-w-none" : "prose-sm"
                                    )}>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {(activeTab === 'explain' ? explanation : simplificationData) || "Select content to explain."}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}

                            {/* VISUALIZE */}
                            {activeTab === 'visualize' && (
                                <div className="h-full flex flex-col">
                                    {visualizeData && (
                                        <div className="flex justify-end mb-4">
                                            <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                                                {['flow', 'bento', 'mindmap'].map(mode => (
                                                    <button
                                                        key={mode}
                                                        onClick={() => {
                                                            setVisualLayout(mode as any);
                                                            if (mode === 'mindmap' && !mindMapData && !isAiLoading) {
                                                                handleAIFeature('mindmap');
                                                            }
                                                        }}
                                                        className={cn(
                                                            "px-3 py-1.5 text-xs font-bold rounded-md capitalize flex items-center gap-1",
                                                            visualLayout === mode ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"
                                                        )}
                                                    >
                                                        {mode === 'flow' && <Presentation className="h-3 w-3" />}
                                                        {mode === 'bento' && <LayoutGrid className="h-3 w-3" />}
                                                        {mode === 'mindmap' && <Workflow className="h-3 w-3" />}
                                                        {mode === 'flow' ? 'Infographic' : mode}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex-1 min-h-[400px]">
                                        {visualizeData ? (
                                            <>
                                                {visualLayout === 'bento' && <BentoRenderer data={visualizeData} />}
                                                {visualLayout === 'flow' && <InfographicRenderer data={visualizeData} />}
                                                {visualLayout === 'mindmap' && (
                                                    mindMapData ? (
                                                        typeof mindMapData === 'string' ?
                                                            <MermaidDiagram code={mindMapData} /> :
                                                            <MindMapRenderer data={mindMapData} />
                                                    ) : (isAiLoading ? <div className="text-center text-slate-400 mt-20">Generating detailed mind map...</div> : (visualizeData?.graph ? <MindMapRenderer data={visualizeData} /> : <div className="text-center text-slate-400 mt-20">Click to generate mind map.</div>))
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-center text-slate-400 mt-20">Visualize concepts here.</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* SCROLLYTELLING */}
                            {activeTab === 'scrollytelling' && (
                                <div className="h-full">
                                    {scrollyData ? (
                                        <ScrollyTelling data={scrollyData} />
                                    ) : (
                                        <div className="text-center flex flex-col items-center mt-20">
                                            <GalleryVerticalEnd className="h-12 w-12 text-slate-200 mb-4" />
                                            <p className="text-slate-400">Generate a visual story journey.</p>
                                            <button onClick={() => handleAIFeature('scrollytelling')} className="mt-4 text-rose-500 font-bold hover:underline">Start Journey</button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* PODCAST */}
                            {activeTab === 'podcast' && (
                                <div>
                                    {podcastData ? (
                                        <div className="space-y-4">
                                            <div className="sticky top-0 z-10 bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center shadow-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 bg-indigo-500 rounded-full flex items-center justify-center"><Mic className="h-5 w-5" /></div>
                                                    <div><div className="font-bold">AI Podcast</div><div className="text-xs text-slate-400">Host vs Expert</div></div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <select
                                                        value={playbackSpeed}
                                                        onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                                                        className="bg-slate-800 text-xs font-bold text-white focus:outline-none cursor-pointer hover:bg-slate-700 px-2 py-1 rounded border border-slate-700"
                                                        title="Playback Speed"
                                                    >
                                                        <option value="0.75">0.75x</option>
                                                        <option value="1">1x</option>
                                                        <option value="1.25">1.25x</option>
                                                    </select>
                                                    <button onClick={togglePodcast} className="h-10 w-10 bg-white text-slate-900 rounded-full flex items-center justify-center hover:bg-slate-200">
                                                        {isPlayingPodcast && !isPodcastPaused ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-4 p-2">
                                                {podcastData.map((line: any, i: number) => (
                                                    <div key={i} className={cn(
                                                        "p-4 rounded-xl text-sm border",
                                                        line.speaker === 'Host' ? "bg-slate-50 ml-8 border-slate-200" : "bg-indigo-50 mr-8 border-indigo-100",
                                                        currentPodcastLine === i ? "ring-2 ring-indigo-500 shadow-md" : "opacity-80"
                                                    )}>
                                                        <div className="text-xs font-bold uppercase mb-1 opacity-50">{line.speaker}</div>
                                                        {line.text}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center text-slate-400 mt-20">Generating script...</div>
                                    )}
                                </div>
                            )}

                            {/* QUIZ */}
                            {activeTab === 'quiz' && (
                                <div className="space-y-6">
                                    {quiz.length > 0 ? (
                                        <>
                                            <div className="flex justify-between items-center mb-4 bg-slate-100 p-2 rounded-lg">
                                                <div className="font-bold text-slate-700 flex items-center gap-2">
                                                    <span className="text-indigo-600">⏱️</span>
                                                    {formatTime(quizTimer)}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {quizSubmitted && (
                                                        <div className={cn(
                                                            "px-3 py-1 rounded-lg font-bold text-sm mr-2",
                                                            (quizScore.correct / quizScore.total) >= 0.7 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                                        )}>
                                                            {quizScore.correct}/{quizScore.total}
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={resetQuiz}
                                                        className="px-3 py-1.5 bg-white text-indigo-600 text-xs font-bold rounded-lg border border-indigo-100 hover:bg-indigo-50 transition-all flex items-center gap-2"
                                                    >
                                                        <Sparkles className="h-3 w-3" />
                                                        Regenerate Quiz
                                                    </button>
                                                </div>
                                            </div>

                                            {quizSubmitted && (
                                                <div className="bg-green-100 text-green-800 p-4 rounded-xl font-bold text-center border border-green-200">
                                                    You scored {quizScore.correct} / {quizScore.total}
                                                </div>
                                            )}
                                            {quiz.map((q, i) => (
                                                <div key={i} className="bg-white border border-slate-200 p-6 rounded-xl relative overflow-hidden">
                                                    {quizSubmitted && (
                                                        <div className={cn("absolute left-0 top-0 bottom-0 w-1",
                                                            userAnswers[i] === q.correctAnswer ? "bg-green-500" : "bg-red-500"
                                                        )} />
                                                    )}
                                                    <h4 className="font-bold text-slate-900 mb-4">{i + 1}. {q.question}</h4>
                                                    <div className="space-y-2">
                                                        {q.options.map((opt: string, optIdx: number) => (
                                                            <button
                                                                key={optIdx}
                                                                disabled={quizSubmitted}
                                                                onClick={() => setUserAnswers(prev => ({ ...prev, [i]: optIdx }))}
                                                                className={cn(
                                                                    "w-full text-left p-3 rounded-lg text-sm border transition-all",
                                                                    userAnswers[i] === optIdx ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "hover:bg-slate-50 border-slate-200",
                                                                    quizSubmitted && optIdx === q.correctAnswer && "bg-green-50 border-green-500 text-green-700 font-bold"
                                                                )}
                                                            >
                                                                {opt}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            {!quizSubmitted ? (
                                                <div className="flex gap-2">
                                                    <button onClick={resetQuiz} className="px-4 py-3 bg-white text-slate-500 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-xs uppercase tracking-wider">Cancel</button>



                                                    <button onClick={handleQuizSubmit} className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">Submit Answers</button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-3">
                                                    <button
                                                        onClick={handleSaveQuizToProfile}
                                                        disabled={isSubmittingQuiz}
                                                        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        {isSubmittingQuiz ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
                                                        Submit to Profile
                                                    </button>

                                                    <button onClick={resetQuiz} className="w-full py-3 bg-white text-indigo-600 font-bold rounded-xl border-2 border-indigo-100 hover:bg-indigo-50 hover:border-indigo-200 transition-all flex items-center justify-center gap-2">
                                                        <Sparkles className="h-4 w-4" />
                                                        Regenerate Quiz
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-center text-slate-400 mt-20">
                                            <p>Generate a quiz to test your knowledge.</p>
                                            <div className="flex gap-2 justify-center mt-4">
                                                {(!quizConfig || quizConfig === 'BOTH') && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                handleAIFeature('quiz', undefined, undefined, 5);
                                                            }}
                                                            className="px-6 py-2 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600 transition-all shadow-sm"
                                                        >
                                                            5 Questions
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                handleAIFeature('quiz', undefined, undefined, 10);
                                                            }}
                                                            className="px-6 py-2 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600 transition-all shadow-sm"
                                                        >
                                                            10 Questions
                                                        </button>
                                                    </>
                                                )}
                                                {(quizConfig === '5' || quizConfig === '10') && (
                                                    <div className="flex flex-col items-center justify-center pt-4">
                                                        <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mb-2" />
                                                        <div className="text-sm text-slate-400 italic">
                                                            Starting your {quizConfig} question quiz...
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* FLASHCARDS */}
                            {activeTab === 'flashcards' && (
                                <div className="h-full flex flex-col">
                                    {flashcards.length > 0 ? (
                                        <FlashcardDeck cards={flashcards} />
                                    ) : (
                                        <div className="text-center text-slate-400 mt-20">Generating cards...</div>
                                    )}
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
