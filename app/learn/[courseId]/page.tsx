'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { COURSES, Topic } from '@/data/mockData';
import MindMap from '@/components/MindMap';
import FlashcardDeck from '@/components/FlashcardDeck';
import TextSelectionHandler from '@/components/TextSelectionHandler';
import {
    ChevronLeft,
    Menu,
    CheckCircle,
    Circle,
    FileText,
    BrainCircuit,
    Loader2,
    Clock,
    X,
    Sparkles,
    Pencil,
    Save,
    Volume2,
    Square
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ProfileDropdown from '@/components/ProfileDropdown';

export default function CoursePlayer() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;

    // State
    const [allCourses, setAllCourses] = useState<any[]>([]);
    const [course, setCourse] = useState<any>(null);
    const [activeTopicId, setActiveTopicId] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'summary' | 'mindmap' | 'quiz' | 'flashcards' | 'explain'>('summary');
    const [aiSidebarOpen, setAiSidebarOpen] = useState(true);
    const [showSourcePdf, setShowSourcePdf] = useState(false);

    // Audio State
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Timer State
    const [timeSpent, setTimeSpent] = useState(0);

    // AI State
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [summary, setSummary] = useState<string>('');
    const [mindMapData, setMindMapData] = useState<string>('');
    const [quiz, setQuiz] = useState<any[]>([]);
    const [flashcards, setFlashcards] = useState<any[]>([]);
    const [explanation, setExplanation] = useState<string>('');
    const [selectedText, setSelectedText] = useState<string>('');

    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [enrollmentStatus, setEnrollmentStatus] = useState<any>(null);

    // Timer Effect
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeSpent(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Audio Logic
    useEffect(() => {
        // Cancel speech when component unmounts or topic changes
        return () => {
            if (typeof window !== 'undefined') {
                window.speechSynthesis.cancel();
            }
            setIsSpeaking(false);
        };
    }, [activeTopicId]);

    // Fetch Course Data & Enrollment
    useEffect(() => {
        const fetchCourseAndEnrollment = async () => {
            try {
                const res = await fetch(`/api/courses/${courseId}`);
                if (res.ok) {
                    const data = await res.json();

                    if (data.chapters) {
                        data.chapters = data.chapters.map((ch: any) => ({
                            ...ch,
                            topics: ch.topics.map((t: any) => {
                                let parsedDetails = {};
                                try {
                                    if (typeof t.content === 'string' && t.content.trim().length > 0) {
                                        // Attempt to parse JSON content
                                        try {
                                            parsedDetails = JSON.parse(t.content);
                                            // Handle double-stringified JSON (common artifact)
                                            if (typeof parsedDetails === 'string') {
                                                parsedDetails = JSON.parse(parsedDetails);
                                            }
                                        } catch (jsonErr) {
                                            // Fallback: Treat as raw rich text/HTML if not valid JSON
                                            parsedDetails = { text: t.content };
                                        }
                                    } else if (typeof t.content === 'object') {
                                        parsedDetails = t.content || {};
                                    } else {
                                        parsedDetails = { text: "" };
                                    }
                                } catch (e) {
                                    console.error("Content parsing error for topic:", t.title, e);
                                    parsedDetails = { text: t.content || "" };
                                }
                                return { ...t, content: parsedDetails };
                            })
                        }));
                    }

                    setCourse(data);

                    if (data.chapters?.[0]?.topics?.[0] && !activeTopicId) {
                        setActiveTopicId(data.chapters[0].topics[0].id);
                    }
                }

                // Check Enrollment
                const enrollRes = await fetch(`/api/enrollments/check?courseId=${courseId}`);
                if (enrollRes.ok) {
                    setEnrollmentStatus(await enrollRes.json());
                }

            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (courseId) fetchCourseAndEnrollment();
    }, [courseId]);

    // Find active topic data
    let activeTopic: Topic | undefined;
    if (course) {
        course.chapters.forEach((ch: any) => {
            const found = ch.topics.find((t: any) => t.id === activeTopicId);
            if (found) activeTopic = found;
        });
    }

    // Lazy Load Content & Initialize View
    useEffect(() => {
        if (activeTopic) {
            setSummary(activeTopic.content?.summary || '');
            setMindMapData(activeTopic.content?.mindMap || '');
            setQuiz(activeTopic.content?.quiz || []);
            setFlashcards((activeTopic.content as any)?.flashcards || []);
            setExplanation('');

            // LAZY GENERATION: If main text is empty, generate it
            if ((!activeTopic.content?.text || activeTopic.content.text.length < 50) && !isAiLoading) {
                generateInitialContent(activeTopic as any);
            }
        }
    }, [activeTopicId, activeTopic]); // Depend on activeTopic to catch updates

    const generateInitialContent = async (topic: any) => {
        if (!topic) return;
        setIsAiLoading(true);
        console.log("Lazy Generating content for:", topic.title);

        try {
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'initial_content',
                    topicId: topic.id,
                    topicTitle: topic.title,
                    courseId: courseId
                })
            });
            const data = await response.json();

            if (data.content) {
                // Update local state deeply
                setCourse((prev: any) => {
                    const newChapters = prev.chapters.map((ch: any) => ({
                        ...ch,
                        topics: ch.topics.map((t: any) => {
                            if (t.id === topic.id) {
                                // Merge content
                                return {
                                    ...t,
                                    content: { ...t.content, text: data.content }
                                };
                            }
                            return t;
                        })
                    }));
                    return { ...prev, chapters: newChapters };
                });
            }
        } catch (e) {
            console.error("Lazy Gen Error", e);
        } finally {
            setIsAiLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
            </div>
        );
    }

    if (!course) {
        return <div className="p-10 text-slate-900">Course not found. ID: {courseId}</div>;
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };



    const toggleSpeech = () => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        } else {
            const textToRead = activeTopic?.content?.text?.replace(/<[^>]*>?/gm, '') || "No content available to read.";
            const utterance = new SpeechSynthesisUtterance(textToRead);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = (e) => {
                console.error("Speech Error", e);
                setIsSpeaking(false);
            };
            window.speechSynthesis.speak(utterance);
            setIsSpeaking(true);
        }
    };

    const handleAIFeature = async (feature: 'summary' | 'mindmap' | 'quiz' | 'flashcards' | 'explain', textSelection?: string) => {
        setActiveTab(feature);
        if (!aiSidebarOpen) setAiSidebarOpen(true);

        // Return if content already exists to save API calls (optional optimization)
        if (feature === 'summary' && summary) return;
        if (feature === 'mindmap' && mindMapData) return;
        if (feature === 'quiz' && quiz.length > 0) return;
        if (feature === 'flashcards' && flashcards.length > 0) return;
        // For explain, we always generate new if textSelection is provided
        if (feature === 'explain' && textSelection) {
            setSelectedText(textSelection);
        } else if (feature === 'explain' && !textSelection && explanation) {
            return; // Just switching tabs back to existing explanation
        }

        setIsAiLoading(true);

        try {
            const rawContent = activeTopic?.content?.text || "Content not available";
            // Strip HTML tags to provide clean text context to AI
            const context = rawContent.replace(/<[^>]*>?/gm, '');

            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: feature,
                    context: context.substring(0, 25000), // increased limit for Llama 3 context
                    topicTitle: textSelection || activeTopic?.title // Use selected text as "topic" for explanation
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
            } else if (feature === 'flashcards') {
                try {
                    const cardsData = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
                    if (Array.isArray(cardsData) && cardsData.length > 0) {
                        setFlashcards(cardsData);
                    } else {
                        // setFlashcards(DEMO_FLASHCARDS); 
                    }
                } catch (e) {
                    console.error("Failed to parse flashcards JSON", e);
                    // setFlashcards(DEMO_FLASHCARDS);
                }
            } else if (feature === 'summary') {
                setSummary(data.content);
            } else if (feature === 'mindmap') {
                setMindMapData(data.content);
            } else if (feature === 'explain') {
                setExplanation(data.content);
            }

        } catch (error) {
            console.error("AI Feature Error:", error);
            // Fallback logic...
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleSaveContent = () => {
        if (!course || !activeTopic) return;

        // 1. Update persisted courses
        const updatedChapters = course.chapters.map((ch: any) => ({
            ...ch,
            topics: ch.topics.map((t: any) => {
                if (t.id === activeTopicId) {
                    return { ...t, content: { ...t.content, text: editContent } };
                }
                return t;
            })
        }));

        const updatedCourse = { ...course, chapters: updatedChapters };

        // Update local state
        setCourse(updatedCourse);
        setAllCourses(prev => prev.map(c => c.id === courseId ? updatedCourse : c));

        // Persist to LocalStorage if custom
        if (courseId.startsWith('custom-')) {
            try {
                const custom = localStorage.getItem('customCourses');
                if (custom) {
                    const courses = JSON.parse(custom);
                    const diskUpdated = courses.map((c: any) => c.id === courseId ? updatedCourse : c);
                    localStorage.setItem('customCourses', JSON.stringify(diskUpdated));
                }
            } catch (e) {
                console.error("Failed to save content", e);
            }
        }

        setIsEditing(false);
        // Reset specific AI states as content changed
        setSummary('');
        setQuiz([]);

        // Force re-render of content area via key or state
    };

    return (
        <div className="fixed inset-0 flex flex-col bg-slate-50 overflow-hidden">
            {/* Global Header */}
            <nav className="relative z-50 bg-slate-900 border-b border-white/10 shadow-md shrink-0 h-16 w-full flex items-center justify-between px-6">
                {/* Left: Back to Dashboard */}
                <div className="absolute left-0 top-0 bottom-0 flex items-center px-6 z-10">
                    <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <ChevronLeft className="h-5 w-5" />
                        <span className="font-medium">Back to Dashboard</span>
                    </Link>
                </div>

                {/* Center: Course Player */}
                <div className="absolute left-1/2 -translate-x-1/2 text-white font-bold text-lg">
                    Course Player
                </div>

                {/* Right: Profile */}
                <div className="absolute right-0 top-0 bottom-0 flex items-center px-6 z-10">
                    <ProfileDropdown />
                </div>
            </nav>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Sidebar: Course Navigation (Hover to expand) */}
                <div className="absolute left-0 top-0 bottom-0 z-40 group h-full flex transition-all duration-300 w-12 hover:w-80">
                    <div className="h-full bg-slate-100 w-12 group-hover:w-0 transition-all duration-300 flex flex-col items-center pt-6 border-r border-slate-200">
                        {/* Menu Icon for Collapsed State */}
                        <Menu className="h-6 w-6 text-slate-500" />
                    </div>

                    <div className={cn(
                        "h-full bg-white border-r border-slate-200 shadow-2xl overflow-hidden flex flex-col w-0 group-hover:w-80 transition-all duration-300"
                    )}>
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <h2 className="font-bold text-slate-900 truncate">{course.title}</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6 w-80">
                            {course.chapters.map((chapter: any) => (
                                <div key={chapter.id}>
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
                                        {chapter.title}
                                    </h3>
                                    <div className="space-y-1">
                                        {chapter.topics.map((topic: any) => (
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
                </div>

                {/* Main Content Area + AI Sidebar Wrapper */}
                <div className="flex-1 flex min-w-0 ml-12 transition-all duration-300">
                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Top Bar */}
                        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur flex items-center justify-between px-4 shrink-0">
                            <div className="flex items-center gap-4">
                                <h1 className="text-lg font-semibold text-slate-900 ml-2">
                                    {activeTopic?.title}
                                </h1>
                                {enrollmentStatus?.enrolled && (
                                    <div className={cn(
                                        "px-2.5 py-1 text-xs font-bold rounded-full border flex items-center gap-1.5",
                                        enrollmentStatus.isValid
                                            ? (enrollmentStatus.daysLeft > 7
                                                ? "bg-green-50 text-green-700 border-green-200"
                                                : "bg-orange-50 text-orange-700 border-orange-200")
                                            : "bg-red-50 text-red-700 border-red-200"
                                    )}>
                                        <Clock className="h-3 w-3" />
                                        {enrollmentStatus.isValid
                                            ? (enrollmentStatus.daysLeft !== null ? `${enrollmentStatus.daysLeft} days left` : 'Active')
                                            : 'Expired'}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Toggle Source PDF */}
                                {course.fileUrl && (
                                    <button
                                        onClick={() => setShowSourcePdf(!showSourcePdf)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                                            showSourcePdf
                                                ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                                                : "bg-white text-slate-600 border-slate-200 hover:text-slate-900"
                                        )}
                                    >
                                        <FileText className="h-4 w-4" />
                                        {showSourcePdf ? "Show Smart Notes" : "View Source PDF"}
                                    </button>
                                )}

                                {/* Timer */}
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm font-mono text-slate-600 border border-slate-200">
                                    <Clock className="h-4 w-4 text-slate-400" />
                                    {formatTime(timeSpent)}
                                </div>

                                <button
                                    onClick={() => {
                                        setEditContent(activeTopic?.content?.text || '');
                                        setIsEditing(!isEditing);
                                    }}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                                        isEditing
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : "bg-white text-slate-500 border-slate-200 hover:text-slate-900"
                                    )}
                                    title="Edit Content"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>

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

                                <div className="h-6 w-px bg-slate-200 mx-2" />

                                <button
                                    onClick={toggleSpeech}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                                        isSpeaking
                                            ? "bg-green-50 text-green-700 border-green-200 animate-pulse"
                                            : "bg-white text-slate-500 border-slate-200 hover:text-slate-900"
                                    )}
                                    title={isSpeaking ? "Stop Reading" : "Read Aloud"}
                                >
                                    {isSpeaking ? <Square className="h-4 w-4 fill-current" /> : <Volume2 className="h-4 w-4" />}
                                    {isSpeaking ? "Stop" : "Listen"}
                                </button>
                            </div>
                        </header>

                        {/* Content Scroll Area */}
                        {/* Content Scroll Area */}
                        <div className="flex-1 overflow-y-auto w-full h-full relative scroll-smooth bg-white">
                            {showSourcePdf && course.fileUrl ? (
                                <iframe src={course.fileUrl} className="w-full h-full border-none" title="Source PDF" />
                            ) : (
                                <div className="p-8 md:p-12 max-w-4xl mx-auto">
                                    {activeTopic?.content ? (
                                        isEditing ? (
                                            <div className="animate-in fade-in slide-in-from-bottom-2">
                                                <textarea
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    className="w-full h-[60vh] p-6 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono text-sm leading-relaxed"
                                                    placeholder="Paste your course content here..."
                                                />
                                                <div className="flex justify-end gap-3 mt-4">
                                                    <button
                                                        onClick={() => setIsEditing(false)}
                                                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleSaveContent}
                                                        className="px-4 py-2 bg-cyan-600 text-white hover:bg-cyan-700 rounded-lg font-medium flex items-center gap-2 shadow-sm"
                                                    >
                                                        <Save className="h-4 w-4" /> Save Content
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <TextSelectionHandler onExplain={(text: string) => handleAIFeature('explain', text)}>
                                                {isAiLoading && (!activeTopic.content.text || activeTopic.content.text.length < 50) ? (
                                                    <div className="flex flex-col items-center justify-center py-20">
                                                        <Loader2 className="h-12 w-12 animate-spin text-cyan-600 mb-4" />
                                                        <p className="text-slate-500 text-center animate-pulse">
                                                            Generating Content From Source...<br />
                                                            <span className="text-sm">(This uses Llama 3 to analyze the PDF)</span>
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div dangerouslySetInnerHTML={{ __html: activeTopic.content.text }} className="prose prose-lg max-w-none text-slate-700" />
                                                )}
                                            </TextSelectionHandler>
                                        )
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
                            )}
                        </div>
                    </div>

                    {/* Right Sidebar: AI Tools */}
                    <div className={cn(
                        "bg-white border-l border-slate-200 transition-all duration-300 flex flex-col",
                        aiSidebarOpen ? "w-1/2" : "w-0 overflow-hidden"
                    )}>
                        <div className="flex border-b border-slate-200 shrink-0">
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
                                onClick={() => handleAIFeature('flashcards')}
                                className={cn(
                                    "flex-1 py-4 text-xs font-medium border-b-2 transition-colors",
                                    activeTab === 'flashcards' ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-900"
                                )}
                            >
                                Flashcards
                            </button>
                            <button
                                onClick={() => handleAIFeature('explain')}
                                className={cn(
                                    "flex-1 py-4 text-xs font-medium border-b-2 transition-colors",
                                    activeTab === 'explain' ? "border-pink-500 text-pink-600" : "border-transparent text-slate-500 hover:text-slate-900"
                                )}
                            >
                                Explain
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 flex flex-col">
                            {isAiLoading ? (
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

                                    {activeTab === 'flashcards' && (
                                        <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
                                            <p className="text-sm text-slate-500 mb-4">
                                                Test your knowledge with AI-generated flashcards.
                                            </p>
                                            <FlashcardDeck cards={flashcards} />
                                        </div>
                                    )}

                                    {activeTab === 'explain' && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                            <div className="bg-pink-50 p-4 rounded-xl border border-pink-100">
                                                <h4 className="text-pink-700 font-bold mb-2 flex items-center gap-2">
                                                    <Sparkles className="h-4 w-4" /> AI Explanation
                                                </h4>
                                                <div className="mb-4 text-sm text-pink-800 italic border-l-2 border-pink-300 pl-3">
                                                    "{selectedText || activeTopic?.title}"
                                                </div>
                                                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                                                    {explanation || "Select text in the content to explain it, or click Explain for the whole topic."}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
