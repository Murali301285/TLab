'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { COURSES, Topic } from '@/data/mockData';
import MindMap from '@/components/MindMap';
import {
    ChevronLeft,
    Menu,
    CheckCircle,
    Circle,
    FileText,
    BrainCircuit,
    HelpCircle,
    MessageSquare,
    PlayCircle,
    X,
    Loader2,
    Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ProfileDropdown from '@/components/ProfileDropdown';

export default function CoursePlayer() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;

    const course = COURSES.find(c => c.id === courseId);

    // State
    const [activeTopicId, setActiveTopicId] = useState<string>('t2');
    const [activeTab, setActiveTab] = useState<'summary' | 'mindmap' | 'quiz' | 'chat'>('summary');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [aiSidebarOpen, setAiSidebarOpen] = useState(true);

    // Timer State
    const [timeSpent, setTimeSpent] = useState(0);

    // Chat State
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
        { role: 'ai', content: 'Hello! I am your AI tutor. Ask me anything about this topic.' }
    ]);
    const [chatInput, setChatInput] = useState('');

    // AI State
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [summary, setSummary] = useState<string>('');
    const [mindMapData, setMindMapData] = useState<string>('');
    const [quiz, setQuiz] = useState<any[]>([]);

    if (!course) {
        return <div className="p-10 text-slate-900">Course not found</div>;
    }

    // Timer Effect
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeSpent(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Find active topic data
    let activeTopic: Topic | undefined;
    course.chapters.forEach(ch => {
        const found = ch.topics.find(t => t.id === activeTopicId);
        if (found) activeTopic = found;
    });

    // Initialize content on load
    useEffect(() => {
        if (activeTopic) {
            setSummary(activeTopic.content?.summary || '');
            setMindMapData(activeTopic.content?.mindMap || '');
            setQuiz(activeTopic.content?.quiz || []);
        }
    }, [activeTopicId]);

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const userMsg = chatInput;
        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setChatInput('');
        setIsAiLoading(true);

        try {
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'qa',
                    context: activeTopic?.content?.text || '',
                    topicTitle: activeTopic?.title,
                    question: userMsg
                })
            });
            const data = await response.json();
            setChatMessages(prev => [...prev, { role: 'ai', content: data.content }]);
        } catch (err) {
            setChatMessages(prev => [...prev, { role: 'ai', content: "Sorry, I couldn't process that." }]);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleAIFeature = async (feature: 'summary' | 'mindmap' | 'quiz' | 'chat') => {
        setActiveTab(feature);
        if (feature === 'chat') return;

        setIsAiLoading(true);

        try {
            const currentTopicContent = activeTopic?.content?.text || "Content not available";

            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: feature,
                    context: currentTopicContent,
                    topicTitle: activeTopic?.title
                })
            });

            const data = await response.json();

            if (feature === 'quiz') {
                try {
                    const quizData = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
                    setQuiz(quizData);
                } catch (e) {
                    console.error("Failed to parse quiz JSON", e);
                }
            } else if (feature === 'summary') {
                setSummary(data.content);
            } else if (feature === 'mindmap') {
                setMindMapData(data.content);
            }

        } catch (error) {
            console.error("AI Feature Error:", error);
            alert("Failed to generate AI content. Please check your connection.");
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
            {/* Global Header */}
            <nav className="sticky top-0 z-50 bg-slate-900 border-b border-white/10 shadow-md shrink-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative flex items-center justify-center h-16">
                        <div className="absolute left-0 flex items-center gap-4">
                            <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                                <ChevronLeft className="h-5 w-5" />
                                <span className="font-medium">Back to Dashboard</span>
                            </Link>
                        </div>
                        <div className="text-white font-bold text-lg">Course Player</div>
                        <div className="absolute right-0 flex items-center gap-4">
                            <ProfileDropdown />
                        </div>
                    </div>
                </div>
            </nav>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar: Course Navigation */}
                <div className={cn(
                    "bg-white border-r border-slate-200 transition-all duration-300 flex flex-col",
                    sidebarOpen ? "w-80" : "w-0 overflow-hidden"
                )}>
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                        <h2 className="font-bold text-slate-900 truncate">{course.title}</h2>
                        <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-slate-900">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {course.chapters.map((chapter) => (
                            <div key={chapter.id}>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
                                    {chapter.title}
                                </h3>
                                <div className="space-y-1">
                                    {chapter.topics.map((topic) => (
                                        <button
                                            key={topic.id}
                                            onClick={() => setActiveTopicId(topic.id)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                                                activeTopicId === topic.id
                                                    ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                            )}
                                        >
                                            {topic.isCompleted ? (
                                                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                            ) : (
                                                <Circle className="h-4 w-4 shrink-0" />
                                            )}
                                            <span className="truncate">{topic.title}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Top Bar */}
                    <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur flex items-center justify-between px-4">
                        <div className="flex items-center gap-4">
                            {!sidebarOpen && (
                                <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                                    <Menu className="h-5 w-5" />
                                </button>
                            )}
                            <h1 className="text-lg font-semibold text-slate-900">
                                {activeTopic?.title}
                            </h1>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Timer */}
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm font-mono text-slate-600 border border-slate-200">
                                <Clock className="h-4 w-4 text-slate-400" />
                                {formatTime(timeSpent)}
                            </div>

                            <button
                                onClick={() => setAiSidebarOpen(!aiSidebarOpen)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                                    aiSidebarOpen
                                        ? "bg-purple-50 text-purple-700 border-purple-200"
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                )}
                            >
                                <BrainCircuit className="h-4 w-4" />
                                AI Assistant
                            </button>
                        </div>
                    </header>

                    {/* Content Scroll Area */}
                    <div className="flex-1 overflow-y-auto p-8 md:p-12 scroll-smooth bg-white">
                        <div className="max-w-3xl mx-auto">
                            {activeTopic?.content ? (
                                <div
                                    className="prose prose-slate prose-lg max-w-none"
                                    dangerouslySetInnerHTML={{ __html: activeTopic.content.text.replace(/text-white/g, 'text-slate-900').replace(/text-slate-300/g, 'text-slate-600').replace(/bg-slate-800\/50/g, 'bg-slate-50').replace(/text-slate-400/g, 'text-slate-500') }}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                    <FileText className="h-16 w-16 mb-4 opacity-20" />
                                    <p>Select "1.2 The BATNA Principle" to see the demo content.</p>
                                </div>
                            )}

                            {/* Navigation Footer */}
                            <div className="mt-16 flex justify-between pt-8 border-t border-slate-200">
                                <button className="px-6 py-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                                    Previous
                                </button>
                                <button className="px-6 py-3 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 shadow-lg shadow-cyan-500/20">
                                    Mark as Complete & Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: AI Tools */}
                <div className={cn(
                    "bg-white border-l border-slate-200 transition-all duration-300 flex flex-col",
                    aiSidebarOpen ? "w-96" : "w-0 overflow-hidden"
                )}>
                    <div className="flex border-b border-slate-200">
                        <button
                            onClick={() => handleAIFeature('summary')}
                            className={cn(
                                "flex-1 py-4 text-xs font-medium border-b-2 transition-colors",
                                activeTab === 'summary' ? "border-cyan-500 text-cyan-600" : "border-transparent text-slate-500 hover:text-slate-900"
                            )}
                        >
                            Summary
                        </button>
                        <button
                            onClick={() => handleAIFeature('mindmap')}
                            className={cn(
                                "flex-1 py-4 text-xs font-medium border-b-2 transition-colors",
                                activeTab === 'mindmap' ? "border-purple-500 text-purple-600" : "border-transparent text-slate-500 hover:text-slate-900"
                            )}
                        >
                            Mind Map
                        </button>
                        <button
                            onClick={() => handleAIFeature('quiz')}
                            className={cn(
                                "flex-1 py-4 text-xs font-medium border-b-2 transition-colors",
                                activeTab === 'quiz' ? "border-green-500 text-green-600" : "border-transparent text-slate-500 hover:text-slate-900"
                            )}
                        >
                            Quiz
                        </button>
                        <button
                            onClick={() => handleAIFeature('chat')}
                            className={cn(
                                "flex-1 py-4 text-xs font-medium border-b-2 transition-colors",
                                activeTab === 'chat' ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-900"
                            )}
                        >
                            Chat
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 flex flex-col">
                        {isAiLoading && activeTab !== 'chat' ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                <Loader2 className="h-8 w-8 animate-spin mb-4 text-cyan-600" />
                                <p>Generating AI Content...</p>
                            </div>
                        ) : (
                            <>
                                {activeTab === 'summary' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="bg-cyan-50 p-4 rounded-xl border border-cyan-100">
                                            <h4 className="text-cyan-700 font-bold mb-2 flex items-center gap-2">
                                                <BrainCircuit className="h-4 w-4" /> AI Summary
                                            </h4>
                                            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                                {summary || "Click Summary to generate an AI summary of this topic."}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'mindmap' && (
                                    <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
                                        <p className="text-sm text-slate-500 mb-4">
                                            Visual representation of the concepts in this module.
                                        </p>
                                        {mindMapData ? (
                                            <MindMap chart={mindMapData} />
                                        ) : (
                                            <div className="text-center p-10 text-slate-400">No Mind Map Generated</div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'quiz' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                        {quiz && quiz.length > 0 ? (
                                            quiz.map((q, i) => (
                                                <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                                    <p className="text-slate-900 font-medium mb-4">
                                                        <span className="text-green-600 mr-2">Q{i + 1}.</span>
                                                        {q.question}
                                                    </p>
                                                    <div className="space-y-2">
                                                        {q.options.map((opt: string, idx: number) => (
                                                            <button
                                                                key={idx}
                                                                className="w-full text-left p-3 rounded-lg text-sm transition-colors hover:bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300"
                                                            >
                                                                {opt}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center p-10 text-slate-400">Click Quiz to generate questions.</div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'chat' && (
                                    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                                            {chatMessages.map((msg, i) => (
                                                <div key={i} className={cn(
                                                    "p-3 rounded-lg text-sm max-w-[90%]",
                                                    msg.role === 'user'
                                                        ? "bg-blue-600 text-white ml-auto rounded-tr-none"
                                                        : "bg-white border border-slate-200 text-slate-700 mr-auto rounded-tl-none shadow-sm"
                                                )}>
                                                    {msg.content}
                                                </div>
                                            ))}
                                            {isAiLoading && (
                                                <div className="bg-white border border-slate-200 text-slate-500 p-3 rounded-lg mr-auto rounded-tl-none shadow-sm flex items-center gap-2">
                                                    <Loader2 className="h-3 w-3 animate-spin" /> Typing...
                                                </div>
                                            )}
                                        </div>
                                        <form onSubmit={handleChatSubmit} className="relative">
                                            <input
                                                type="text"
                                                placeholder="Ask a question..."
                                                className="w-full pl-4 pr-10 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={chatInput}
                                                onChange={(e) => setChatInput(e.target.value)}
                                            />
                                            <button
                                                type="submit"
                                                disabled={!chatInput.trim() || isAiLoading}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <MessageSquare className="h-4 w-4" />
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
