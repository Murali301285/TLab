'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { marked } from 'marked';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { COURSES, Topic } from '@/data/mockData';
import FlashcardDeck from '@/components/FlashcardDeck';
import TextSelectionHandler from '@/components/TextSelectionHandler';
import CourseChatWidget from '@/components/CourseChatWidget';
import InfographicRenderer from "@/components/InfographicRenderer";
import BentoRenderer from "@/components/BentoRenderer";
import KnowledgeGraph from "@/components/KnowledgeGraph";
import ScrollyTelling from "@/components/ScrollyTelling";
import AIFeaturePanel from '@/components/AIFeaturePanel';
import {
    ArrowLeft, BookOpen, CheckCircle, ChevronLeft, ChevronRight, Circle, Clock, FileText, BrainCircuit, Loader2, Menu, MessageSquare, MoreVertical, Pause, Pencil, Play, Save, Settings, Share2, Sparkles, Square, Volume2, X, Mic, Lightbulb, Network, CheckSquare, Layers, Presentation, PenTool, ShieldCheck, LayoutGrid, GalleryVerticalEnd
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { cn } from '@/lib/utils';
import ProfileDropdown from '@/components/ProfileDropdown';
import { processHtmlForSpeech } from '@/lib/speechUtils';
import { getComplianceCourses, signCourse } from '../../actions/courses';
import ComplianceQuiz from '@/components/ComplianceQuiz';



export default function ComplianceCoursePage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const courseId = params.courseId as string;
    const isPreviewMode = searchParams.get('preview') === 'true';

    // State
    const [allCourses, setAllCourses] = useState<any[]>([]);
    const [course, setCourse] = useState<any>(null);
    const [activeTopicId, setActiveTopicId] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'summary' | 'mindmap' | 'quiz' | 'flashcards' | 'explain' | 'podcast' | 'simplify' | 'visualize' | 'scrollytelling'>('visualize');
    const [aiSidebarOpen, setAiSidebarOpen] = useState(true);
    const [showSourcePdf, setShowSourcePdf] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

    // Audio & Highlight State
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [speechQueue, setSpeechQueue] = useState<string[]>([]);
    const [currentMsgIndex, setCurrentMsgIndex] = useState(-1);
    const [processedContent, setProcessedContent] = useState<string>('Loading Content...'); // Init with loading

    // DEBUG OVERLAY
    const debugInfo = {
        activeTopicId,
        hasCourse: !!course,
        activeTopicFound: !!(course?.chapters?.flatMap((c: any) => c.topics).find((t: any) => t.id === activeTopicId)),
        processedContentLen: processedContent?.length
    };


    // AI State
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingStage, setLoadingStage] = useState('Initializing...');

    // Left Sidebar (Course Navigation)
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // AI Sidebar
    const [aiSidebarWidth, setAiSidebarWidth] = useState(500); // Default width
    const [isResizing, setIsResizing] = useState(false);

    // Auto-Resize AI Sidebar for 50/50 split
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const calculateSplit = () => {
                if (!aiSidebarOpen) return;
                const leftSidebarWidth = sidebarOpen ? 320 : 48; // w-80 vs w-12
                const availableWidth = window.innerWidth - leftSidebarWidth;
                setAiSidebarWidth(availableWidth / 2);
            };

            // Calculate immediately and on resize/sidebar toggle
            calculateSplit();
            window.addEventListener('resize', calculateSplit);
            return () => window.removeEventListener('resize', calculateSplit);
        }
    }, [sidebarOpen, aiSidebarOpen]);



    const [flashcards, setFlashcards] = useState<any[]>([]);
    const [explanation, setExplanation] = useState<string>('');
    const [selectedText, setSelectedText] = useState<string>('');

    // Podcast State (managed by AIFeaturePanel but needed for callback if any?)
    // Actually, AIFeaturePanel manages its own state mostly, but we might pass props.
    // Let's keep these for now if needed, but remove duplicates.
    const [isPlayingPodcast, setIsPlayingPodcast] = useState(false);
    const [isPodcastPaused, setIsPodcastPaused] = useState(false);
    const [currentPodcastLine, setCurrentPodcastLine] = useState(-1);

    const [selectedAnalogy, setSelectedAnalogy] = useState<string>('General');

    const ANALOGY_TAGS = [
        'General', '🎮 Games', '♟️ Chess', '⚽ Sports', '🍕 Food', '🎬 Movies', '💻 Computers', '🚗 Cars', '🎵 Music', '🚀 Space'
    ];

    // Quiz State
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [visualLayout, setVisualLayout] = useState<'flow' | 'bento' | 'graph'>('flow');
    const [quizConfig, setQuizConfig] = useState<number>(3);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });

    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [enrollmentStatus, setEnrollmentStatus] = useState<any>(null);

    // Compliance State
    const { user } = useAuth();
    const [isSigned, setIsSigned] = useState(false);
    const [showSignModal, setShowSignModal] = useState(false);
    const [acknowledgementChecked, setAcknowledgementChecked] = useState(false);
    const [isSubmittingSign, setIsSubmittingSign] = useState(false);
    const [allTopicsViewed, setAllTopicsViewed] = useState(false);
    const [maxViewedIndex, setMaxViewedIndex] = useState(0); // Compliance Tracking
    const [quizPassed, setQuizPassed] = useState(false);



    // Initial Layout Effect (50% Split)
    const userHasNavigated = useRef(false); // Track if user has manually navigated

    // Sidebar Resize Handlers
    const startResizing = (mouseDownEvent: React.MouseEvent) => {
        mouseDownEvent.preventDefault();
        setIsResizing(true);
    };

    const stopResizing = () => {
        setIsResizing(false);
    };

    const resize = (mouseMoveEvent: MouseEvent) => {
        if (isResizing) {
            const newWidth = window.innerWidth - mouseMoveEvent.clientX;
            if (newWidth > 350 && newWidth < window.innerWidth * 0.8) {
                setAiSidebarWidth(newWidth);
            }
        }
    };

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [isResizing]);

    // Auto-hide sidebars on Final Assessment
    useEffect(() => {
        if (activeTopicId === 'final-quiz') {
            setAiSidebarOpen(false);
            setSidebarOpen(false);
        }
    }, [activeTopicId]);

    // Compliance: Update Max Viewed Topic
    useEffect(() => {
        if (course?.isCompliance && activeTopicId) {
            const flat = course.chapters.flatMap((c: any) => c.topics);
            const idx = flat.findIndex((t: any) => t.id === activeTopicId);
            // If we are at the max index, we essentially "completed" it by landing here? 
            // Or do we wait for "Next" click? 
            // Validating: "Enable page 2 when page 1 is complete".
            // Let's assume landing on it unlocks it.
            // AND the next one should be unlockable? 
            // No, landing on Page 1 shouldn't unlock Page 2 immediately.
            // Page 2 unlocks when Page 1 is done.
            // So maxViewedIndex should represent "Unlocked Index".
            // If I am on Page 1 (Index 0), MaxUnlocked is 0.
            // Unlocked = 0. Users can click 0.
            // When do I bump to 1?
            // On "Next" click.
            // The footer "Next" button sets activeTopicId to next. 
            // So if I successfully navigate to next, then max increases.
            // But wait, if I am restricted from clicking next until "complete", that's different.
            // User said: "Page 2 enable when page 1 is complete".
            // I will assume "Next" button click IS the completion action (acknowledging read).
            if (idx > maxViewedIndex) {
                setMaxViewedIndex(idx);
            }
        }
    }, [activeTopicId, course]);

    // Audio Cleanup
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined') {
                window.speechSynthesis.cancel();
            }
            setIsSpeaking(false);
            setCurrentMsgIndex(-1);
            // Clear highlights
            const highlights = document.querySelectorAll('.bg-yellow-200');
            highlights.forEach(el => el.classList.remove('bg-yellow-200', 'text-slate-900'));
        };
    }, [activeTopicId]);

    // Audio Logic (Queue Processor)
    useEffect(() => {
        if (isSpeaking && currentMsgIndex >= 0 && currentMsgIndex < speechQueue.length) {
            const text = speechQueue[currentMsgIndex];

            // Highlight Logic
            // 1. Remove prev highlight
            if (currentMsgIndex > 0) {
                const prevEl = document.getElementById(`s-${currentMsgIndex - 1}`);
                if (prevEl) prevEl.classList.remove('bg-yellow-200', 'text-slate-900');
            }

            // 2. Add new highlight (Retry if DOM not ready yet)
            const highlightCurrent = () => {
                const curEl = document.getElementById(`s-${currentMsgIndex}`);
                if (curEl) {
                    curEl.classList.add('bg-yellow-200', 'text-slate-900');
                    curEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    // Retry briefly if element not found (e.g. during render)
                    setTimeout(() => {
                        const retryEl = document.getElementById(`s-${currentMsgIndex}`);
                        if (retryEl) {
                            retryEl.classList.add('bg-yellow-200', 'text-slate-900');
                            retryEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 100);
                }
            };

            // Run highlight immediately
            highlightCurrent();

            // Also set an interval to 'hold' the highlight in case of react re-renders wiping classes
            const keeper = setInterval(() => {
                const el = document.getElementById(`s-${currentMsgIndex}`);
                if (el && !el.classList.contains('bg-yellow-200')) {
                    el.classList.add('bg-yellow-200', 'text-slate-900');
                }
            }, 500);

            // Cancel previous speech
            window.speechSynthesis.cancel();

            // Create utterance
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = playbackSpeed;

            utterance.onend = () => {
                clearInterval(keeper); // Stop keeping
                if (isSpeaking) {
                    if (currentMsgIndex + 1 < speechQueue.length) {
                        setCurrentMsgIndex(prev => prev + 1);
                    } else {
                        // Cleanup last
                        const lastEl = document.getElementById(`s-${currentMsgIndex}`);
                        if (lastEl) lastEl.classList.remove('bg-yellow-200', 'text-slate-900');
                        setIsSpeaking(false);
                        setCurrentMsgIndex(-1);
                    }
                }
            };

            utterance.onerror = (e) => {
                // Ignore errors caused by manual cancellation
                if (e.error === 'interrupted' || e.error === 'canceled') {
                    clearInterval(keeper);
                    return;
                }
                console.error("Speech Error", e);
                clearInterval(keeper);
                setIsSpeaking(false);
            };

            window.speechSynthesis.speak(utterance);

            return () => clearInterval(keeper);
        }
    }, [isSpeaking, currentMsgIndex, speechQueue, playbackSpeed]);





    // Fetch Course
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

                // Check Compliance/Enrollment Status if courseId and userId available
                // Check Compliance/Enrollment Status if courseId and userId available
                if (courseId && user?.id) {
                    const statusRes = await getComplianceCourses(user.id);
                    if (statusRes.success && statusRes.data) {
                        const currentCourse = statusRes.data.find((c: any) => c.id === courseId);
                        if (currentCourse) {
                            setIsSigned(currentCourse.isSigned);
                            setAllTopicsViewed(currentCourse.allTopicsViewed);
                            setQuizPassed(currentCourse.quizPassed || false);

                            // Auto-Resume to last active topic
                            if (currentCourse.lastActiveTopicId && !userHasNavigated.current) {
                                setActiveTopicId(currentCourse.lastActiveTopicId);
                            }
                        }
                    }
                }

            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (courseId) fetchCourseAndEnrollment();
    }, [courseId]);



    const handleSign = async () => {
        if (!acknowledgementChecked || !user?.id) return;
        setIsSubmittingSign(true);
        try {
            const res = await signCourse(courseId as string, user.id);
            if (res.success) {
                setIsSigned(true);
                setShowSignModal(false);
                // Also trigger confetti or success toast
            }
        } catch (error) {
            console.error("Signature failed", error);
        } finally {
            setIsSubmittingSign(false);
        }
    };


    // Find active topic data
    let activeTopic: Topic | undefined;
    if (course) {
        course.chapters.forEach((ch: any) => {
            const found = ch.topics.find((t: any) => t.id === activeTopicId);
            if (found) activeTopic = found;
        });
    }

    // Track generations per topic
    const generationAttempted = useRef<Record<string, boolean>>({});

    // Lazy Load & Process Content
    useEffect(() => {
        if (activeTopic) {
            // Process Content & cleanup unnecessary state sets
            setExplanation('');

            // Process HTML for Speech Highlighting
            const rawText = activeTopic.content?.text || (typeof activeTopic.content === 'string' ? activeTopic.content : '');

            try {
                const htmlContent = marked.parse(rawText) as string;
                let { processedHtml, sentences } = processHtmlForSpeech(htmlContent);

                if (!processedHtml || processedHtml.trim() === '') {
                    processedHtml = htmlContent;
                }

                setProcessedContent(processedHtml); // Display this!
                setSpeechQueue(sentences);          // Read this!
            } catch (err) {
                console.error("Error processing content:", err);
            }
            setIsSpeaking(false);               // Reset speech
            setCurrentMsgIndex(-1);

            // Mark as Completed (Immediate for Compliance)
            fetch('/api/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user?.id,
                    topicId: activeTopic.id,
                    completed: true,
                    timeSpent: 10 // Min time increment
                })
            }).then(() => {
                // Update local maxViewedIndex if needed to unlock next button immediately in UI
                if (course && course.isCompliance) {
                    const flat = course.chapters.flatMap((c: any) => c.topics);
                    const idx = flat.findIndex((t: any) => t.id === activeTopic?.id);
                    if (idx >= maxViewedIndex) {
                        setMaxViewedIndex(idx + 1);
                        // Also check if this was the last topic to trigger signature enablement
                        if (idx === flat.length - 1) {
                            setAllTopicsViewed(true);
                        }
                    }
                }
            });

            // LAZY GENERATION: If main text is empty, generate it
            const shouldGenerate = (!rawText || rawText.length < 50) && !isAiLoading && !generationAttempted.current[activeTopic.id];

            if (shouldGenerate) {
                console.log("DEBUG: Triggering Lazy Generation because rawText < 50 and not attempted yet");
                generationAttempted.current[activeTopic.id] = true;
                generateInitialContent(activeTopic as any);
            } else {
                if (generationAttempted.current[activeTopic.id]) {
                    console.log("DEBUG: Skipping Generation (Already Attempted)");
                } else if (isAiLoading) {
                    console.log("DEBUG: Skipping Generation (Already Loading)");
                } else {
                    console.log("DEBUG: Skipping Generation (Content OK)");
                }
            }
        } else {
            console.log("DEBUG: No activeTopic found for id:", activeTopicId);
        }
    }, [activeTopicId, activeTopic]); // Depend on activeTopic to catch updates

    const generateInitialContent = async (topic: any) => {
        if (!topic) return;
        setIsAiLoading(true);
        setLoadingProgress(0);
        setLoadingStage('Analyzing structure...');
        console.log("Lazy Generating content for:", topic.title);

        // Simulate Progress
        const interval = setInterval(() => {
            setLoadingProgress(prev => {
                if (prev >= 95) return prev;
                const newProgress = prev + Math.floor(Math.random() * 5) + 1;

                // Update Stage Text
                if (newProgress > 20 && newProgress < 50) setLoadingStage('Extracting key concepts...');
                if (newProgress >= 50 && newProgress < 80) setLoadingStage('Drafting smart notes...');
                if (newProgress >= 80) setLoadingStage('Formatting content...');

                return newProgress;
            });
        }, 800);

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

            clearInterval(interval);
            setLoadingProgress(100);
            setLoadingStage('Finalizing...');

            if (data.content && data.content.length > 50) { // Only update if content is substantial
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
            } else {
                console.warn("DEBUG: Generated content was empty or too short. Not updating.");
            }
        } catch (e) {
            console.error("Lazy Gen Error", e);
        } finally {
            setIsAiLoading(false);
            setLoadingProgress(100);
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





    const handlePlay = () => {
        if (isPaused) {
            window.speechSynthesis.resume();
            setIsPaused(false);
            setIsSpeaking(true);
        } else {
            if (speechQueue.length > 0) {
                setIsSpeaking(true);
                // If starting fresh or restarted
                if (currentMsgIndex === -1) setCurrentMsgIndex(0);
            }
        }
    };

    const handlePause = () => {
        if (isSpeaking && !isPaused) {
            window.speechSynthesis.pause();
            setIsPaused(true);
            setIsSpeaking(false);
        }
    };

    const handleStop = () => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentMsgIndex(-1);
        // Clear highlights
        const highlights = document.querySelectorAll('.bg-yellow-200');
        highlights.forEach(el => el.classList.remove('bg-yellow-200', 'text-slate-900'));
    };

    const handleSaveContent = async () => {
        // Implement save logic here, possibly calling an API or Server Action
        console.log("Saving content:", editContent);
        setIsEditing(false);
        // Trigger refetch or local update if needed
    };

    const handleAIFeature = (feature: string, text?: string, analogy?: string) => {
        setAiSidebarOpen(true);
        setActiveTab(feature as any);
        if (text) setSelectedText(text);
        if (analogy) setSelectedAnalogy(analogy);
    };



    const handleQuizStart = (count: number) => {
        setQuizConfig(count);
        setShowQuizModal(false);
        handleAIFeature('quiz');
    };




    return (
        <div className="fixed inset-0 flex flex-col bg-slate-50 overflow-hidden">
            {/* Global Header */}
            <nav className="relative z-50 bg-slate-900 border-b border-white/10 shadow-md shrink-0 h-16 w-full flex items-center justify-between px-6">
                {/* Left: Back to Dashboard */}
                <div className="absolute left-0 top-0 bottom-0 flex items-center px-6 z-10">
                    <button
                        onClick={() => {
                            if (isPreviewMode) {
                                router.push('/admin/upload');
                            } else {
                                router.push('/compliance');
                            }
                        }}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5" />
                        <span className="font-medium">Exit Viewer</span>
                    </button>
                </div>

                {/* Center: Course Player */}
                <div className="absolute left-1/2 -translate-x-1/2 text-white font-bold text-lg flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-indigo-400" />
                    Compliance Viewer
                    {isPreviewMode && <span className="text-xs bg-amber-500 text-slate-900 px-2 py-0.5 rounded font-bold uppercase tracking-wide">[Preview Mode]</span>}
                </div>

                {/* Right: Profile */}
                <div className="absolute right-0 top-0 bottom-0 flex items-center px-6 z-10">
                    <ProfileDropdown />
                </div>
            </nav >

            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Sidebar: Course Navigation (Toggleable) */}
                <div
                    className={cn(
                        "flex flex-col h-full transition-all duration-300 shadow-xl bg-slate-100 border-r border-slate-200 shrink-0 z-30",
                        sidebarOpen ? "w-52" : "w-12"
                    )}
                >
                    {/* Collapsed Strip */}
                    <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-12 flex flex-col items-center pt-6 z-10",
                        sidebarOpen ? "opacity-0 pointer-events-none" : "opacity-100"
                    )}>
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 hover:bg-slate-200 rounded-lg transition-colors group"
                            title="Open Sidebar"
                        >
                            <Menu className="h-6 w-6 text-slate-600 group-hover:text-indigo-600 transition-colors" />
                        </button>
                    </div>

                    {/* Expanded Content */}
                    <div className={cn(
                        "h-full w-full flex flex-col transition-all duration-300 overflow-hidden bg-white",
                        sidebarOpen ? "opacity-100" : "opacity-0"
                    )}>
                        <div className="p-4 border-b border-slate-200 flex items-center justify-end bg-slate-50 shrink-0">
                            <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-slate-200 rounded">
                                <ChevronLeft className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6 w-52">
                            {course.chapters.map((chapter: any) => (
                                <div key={chapter.id}>
                                    {!course.isCompliance && (
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
                                            {chapter.title}
                                        </h3>
                                    )}
                                    <div className="space-y-1">
                                        {chapter.topics.map((topic: any) => (
                                            <button
                                                key={topic.id}
                                                onClick={() => {
                                                    // Compliance Locking
                                                    if (course.isCompliance) {
                                                        const flat = course.chapters.flatMap((c: any) => c.topics);
                                                        const idx = flat.findIndex((t: any) => t.id === topic.id);
                                                        // Allow navigation if previously visited (<= maxViewedIndex) OR if signed
                                                        if (isSigned || idx <= maxViewedIndex) {
                                                            userHasNavigated.current = true;
                                                            setActiveTopicId(topic.id);
                                                        }
                                                    } else {
                                                        userHasNavigated.current = true;
                                                        setActiveTopicId(topic.id);
                                                    }
                                                }}
                                                disabled={course.isCompliance && !isSigned && !isPreviewMode && (() => {
                                                    const flat = course.chapters.flatMap((c: any) => c.topics);
                                                    const idx = flat.findIndex((t: any) => t.id === topic.id);
                                                    return idx > maxViewedIndex;
                                                })()}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                                                    activeTopicId === topic.id
                                                        ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                                                        : (course.isCompliance && !isSigned && !isPreviewMode && (() => {
                                                            const flat = course.chapters.flatMap((c: any) => c.topics);
                                                            const idx = flat.findIndex((t: any) => t.id === topic.id);
                                                            return idx > maxViewedIndex;
                                                        })())
                                                            ? "text-slate-300 cursor-not-allowed opacity-50"
                                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                                )}
                                            >
                                                {/* Page Number for Compliance */}
                                                {/* Page Number for Compliance */}
                                                {course.isCompliance ? (
                                                    <span className="truncate font-medium">
                                                        Page {(() => {
                                                            const flat = course.chapters.flatMap((c: any) => c.topics);
                                                            return flat.findIndex((t: any) => t.id === topic.id) + 1;
                                                        })()}
                                                    </span>
                                                ) : (
                                                    <>
                                                        {topic.isCompleted ? (
                                                            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                                        ) : (
                                                            <Circle className="h-4 w-4 shrink-0" />
                                                        )}
                                                        <span className="truncate">{topic.title}</span>
                                                    </>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>



                </div>

                {/* Main Content Area + AI Sidebar Wrapper (Flex Sibling) */}
                <div className="flex-1 flex min-w-0 transition-all duration-300">
                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                        {/* Top Bar (Primary Tools) */}
                        <header className="min-h-[4rem] py-3 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 z-20 relative">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wide">
                                        Compliance & Policies
                                    </span>
                                    <ChevronRight className="h-3 w-3 text-slate-300" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-base font-bold text-slate-900 leading-tight" title={course.title}>{course.title}</span>
                                    {course.isCompliance && course.documentNumber && (
                                        <span className="text-[10px] font-mono text-slate-500 leading-none mt-0.5">Ref: {course.documentNumber}</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Toggle Source PDF - Enabled for all */}
                                {course.fileUrl && (
                                    <button
                                        onClick={() => setShowSourcePdf(!showSourcePdf)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                                            showSourcePdf
                                                ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                                                : "bg-white text-slate-600 border-slate-200 hover:text-slate-900"
                                        )}
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                        {showSourcePdf ? "Show Smart Notes" : "View Source PDF"}
                                    </button>
                                )}

                                <button
                                    onClick={() => setAiSidebarOpen(!aiSidebarOpen)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                                        aiSidebarOpen
                                            ? "bg-purple-50 text-purple-700 border-purple-200"
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    )}
                                >
                                    <BrainCircuit className="h-3.5 w-3.5" />
                                    AI Tools
                                </button>
                            </div>
                        </header>

                        {/* Secondary Header (Topic & Controls) */}
                        <div className="h-14 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between px-6 shrink-0 z-10">
                            <div className="flex items-center gap-4">
                                <h1 className="text-lg font-bold text-slate-900">
                                    {activeTopicId === 'final-quiz' ? "Final Assessment" : activeTopic?.title}
                                </h1>
                            </div>

                            <div className="flex items-center gap-4">
                                {enrollmentStatus?.enrolled && (
                                    <div className={cn(
                                        "px-3 py-1 text-xs font-bold rounded-full border flex items-center gap-1",
                                        !enrollmentStatus.isValid
                                            ? "bg-red-50 text-red-700 border-red-200"
                                            : (enrollmentStatus.daysLeft !== null && enrollmentStatus.daysLeft <= 7)
                                                ? "bg-orange-50 text-orange-700 border-orange-200"
                                                : "bg-green-50 text-green-700 border-green-200"
                                    )}>
                                        {!enrollmentStatus.isValid
                                            ? (enrollmentStatus.daysLeft && enrollmentStatus.daysLeft < 0
                                                ? `${Math.abs(enrollmentStatus.daysLeft)} days due`
                                                : 'Expired')
                                            : (enrollmentStatus.daysLeft !== null
                                                ? (enrollmentStatus.daysLeft <= 7 ? `Expiring in ${enrollmentStatus.daysLeft} days` : `${enrollmentStatus.daysLeft} days left`)
                                                : 'Active')
                                        }
                                    </div>
                                )}
                                {/* Timer Removed */}

                                {/* Audio Controls */}
                                <div className={cn("flex items-center gap-1 bg-slate-100 p-1 rounded-lg transition-opacity duration-300", isAiLoading ? "opacity-50 pointer-events-none grayscale" : "opacity-100")}>
                                    {!isSpeaking && !isPaused ? (
                                        <button
                                            onClick={handlePlay}
                                            disabled={isAiLoading}
                                            className="p-2 text-slate-600 hover:text-cyan-600 hover:bg-white rounded-md transition-all disabled:cursor-not-allowed"
                                            title="Read Aloud"
                                        >
                                            <Play className="h-5 w-5" />
                                        </button>
                                    ) : (
                                        <>
                                            {isPaused ? (
                                                <button
                                                    onClick={handlePlay}
                                                    disabled={isAiLoading}
                                                    className="p-2 text-cyan-600 bg-white shadow-sm rounded-md transition-all disabled:cursor-not-allowed"
                                                    title="Resume"
                                                >
                                                    <Play className="h-5 w-5" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handlePause}
                                                    disabled={isAiLoading}
                                                    className="p-2 text-slate-600 hover:text-cyan-600 hover:bg-white rounded-md transition-all disabled:cursor-not-allowed"
                                                    title="Pause"
                                                >
                                                    <Pause className="h-5 w-5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={handleStop}
                                                disabled={isAiLoading}
                                                className="p-2 text-red-500 hover:bg-white rounded-md transition-all disabled:cursor-not-allowed"
                                                title="Stop"
                                            >
                                                <Square className="h-5 w-5 fill-current" />
                                            </button>
                                        </>
                                    )}

                                    {/* Speed Control */}
                                    <div className="flex items-center gap-1 ml-1 border-l border-slate-300 pl-1">
                                        <button
                                            onClick={() => setPlaybackSpeed(s => Math.max(0.5, s - 0.25))}
                                            className="p-1 text-slate-500 hover:bg-white rounded hover:text-slate-900 text-xs font-bold w-6 text-center"
                                            title="Decrease Speed"
                                        >
                                            -
                                        </button>
                                        <span className="text-xs font-mono font-bold text-slate-700 w-8 text-center">{playbackSpeed}x</span>
                                        <button
                                            onClick={() => setPlaybackSpeed(s => Math.min(2.0, s + 0.25))}
                                            className="p-1 text-slate-500 hover:bg-white rounded hover:text-slate-900 text-xs font-bold w-6 text-center"
                                            title="Increase Speed"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                {isEditing && (
                                    <span className="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded border border-amber-200">
                                        Editing Mode
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Content Scroll Area */}
                        <div className="flex-1 overflow-y-auto w-full h-full relative scroll-smooth bg-white">
                            {showSourcePdf && course.fileUrl ? (
                                <iframe src={course.fileUrl} className="w-full h-full border-none" title="Source PDF" />
                            ) : (
                                <div className="min-h-full bg-white">
                                    {activeTopicId === 'final-quiz' ? (
                                        <div className="p-4 md:p-8 max-w-5xl mx-auto">
                                            <div className="mb-6">
                                                <h1 className="text-3xl font-bold text-slate-900">Final Assessment</h1>
                                                <p className="text-slate-500">Complete this quiz to unlock the signature page.</p>
                                            </div>
                                            <ComplianceQuiz
                                                courseId={courseId}
                                                userId={user?.id || ""}
                                                courseTitle={course.title}
                                                passPercentage={course.quizMinScore || 80}
                                                questionCount={course.quizQuestionCount || 5}
                                                onPass={() => {
                                                    setQuizPassed(true);
                                                }}
                                                onSign={() => setShowSignModal(true)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="p-8 md:p-12 max-w-4xl mx-auto">
                                            {isAiLoading || (!activeTopic?.content?.text && typeof activeTopic?.content !== 'string' && !editContent && activeTopic) ? (
                                                <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6 animate-in fade-in duration-700">
                                                    {/* Pulse Animation */}
                                                    <div className="relative">
                                                        <div className="absolute inset-0 bg-cyan-100 rounded-full animate-ping opacity-75"></div>
                                                        <div className="relative bg-white p-4 rounded-full border-2 border-cyan-100 shadow-xl">
                                                            <BrainCircuit className="h-10 w-10 text-cyan-600 animate-pulse" />
                                                        </div>
                                                    </div>

                                                    <div className="max-w-md space-y-2 w-full">
                                                        <h3 className="text-xl font-bold text-slate-800">
                                                            {loadingStage}
                                                        </h3>
                                                        {/* Progress Bar */}
                                                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                            <div
                                                                className="bg-cyan-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                                                                style={{ width: `${loadingProgress}%` }}
                                                            />
                                                        </div>
                                                        <p className="text-slate-500 text-xs text-right font-mono">
                                                            {loadingProgress}%
                                                        </p>
                                                    </div>

                                                    {/* Skeleton Lines */}
                                                    <div className="w-full max-w-lg space-y-3 pt-4">
                                                        <div className="h-4 bg-slate-100 rounded w-3/4 mx-auto animate-pulse" />
                                                        <div className="h-4 bg-slate-100 rounded w-full animate-pulse delay-75" />
                                                        <div className="h-4 bg-slate-100 rounded w-5/6 mx-auto animate-pulse delay-150" />
                                                        <div className="h-4 bg-slate-100 rounded w-2/3 mx-auto animate-pulse delay-300" />
                                                    </div>
                                                </div>
                                            ) : (
                                                activeTopic?.content ? (
                                                    isEditing ? (
                                                        <div className="animate-in fade-in slide-in-from-bottom-2">
                                                            <textarea
                                                                value={editContent}
                                                                onChange={(e) => setEditContent(e.target.value)}
                                                                className="w-full h-[60vh] p-4 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
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
                                                        <div className="prose prose-slate max-w-none 
                                                prose-headings:font-bold prose-headings:text-slate-800 
                                                prose-h1:text-3xl prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
                                                prose-h3:text-xl prose-h3:text-cyan-700 prose-h3:mt-6
                                                prose-p:text-slate-600 prose-p:leading-relaxed prose-p:my-4
                                                prose-li:marker:text-cyan-500 prose-li:text-slate-600
                                                prose-strong:text-slate-900 prose-strong:font-bold
                                                prose-a:text-cyan-600 hover:prose-a:text-cyan-700
                                                prose-img:rounded-xl prose-img:shadow-lg prose-img:mx-auto prose-img:my-8
                                                prose-blockquote:border-l-4 prose-blockquote:border-cyan-500 prose-blockquote:bg-cyan-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
                                            ">
                                                            {/* DEBUG: Restored TextSelectionHandler */}
                                                            <TextSelectionHandler
                                                                onExplain={(text) => handleAIFeature('explain', text)}
                                                                onVisualize={(text) => handleAIFeature('visualize', text)}
                                                            >
                                                                {activeTopic?.type === 'video' ? (
                                                                    <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-lg mb-8">
                                                                        <iframe
                                                                            src={(activeTopic.content as any).videoUrl}
                                                                            className="w-full h-full"
                                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                            allowFullScreen
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div
                                                                        dangerouslySetInnerHTML={{
                                                                            __html: processedContent || (
                                                                                activeTopic?.content?.text
                                                                                    ? marked.parse(activeTopic.content.text) as string
                                                                                    : (typeof activeTopic?.content === 'string' ? marked.parse(activeTopic.content) as string : "<p>No content available.</p>")
                                                                            )
                                                                        }}
                                                                        className="min-h-[200px] bg-white p-4 text-slate-800"
                                                                    />
                                                                )}
                                                            </TextSelectionHandler>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                                        <FileText className="h-16 w-16 mb-4 opacity-20" />
                                                        <p>Select a topic to view content.</p>
                                                    </div>
                                                ))}

                                            {/* Source PDF Toggle: HIDE for Compliance */}
                                            {allCourses.find(c => c.id === courseId)?.fileUrl && !course.isCompliance && (
                                                <div className="mt-8 border-t border-slate-100 pt-6">
                                                    <button
                                                        onClick={() => setShowSourcePdf(!showSourcePdf)}
                                                        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-cyan-600 transition-colors"
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                        {showSourcePdf ? "Hide Source Document" : "Show Source Document"}
                                                    </button>

                                                    {showSourcePdf && (
                                                        <div className="mt-4 h-[600px] bg-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                                                            <iframe
                                                                src={allCourses.find(c => c.id === courseId)?.fileUrl}
                                                                className="w-full h-full"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Compliance Navigation Footer */}
                                            {course.isCompliance && (
                                                <div className="mt-12 pt-6 border-t border-slate-200 flex items-center justify-between">
                                                    <button
                                                        onClick={() => {
                                                            const flatTopics = course.chapters.flatMap((c: any) => c.topics);
                                                            const currIdx = flatTopics.findIndex((t: any) => t.id === activeTopicId);
                                                            if (currIdx > 0) {
                                                                userHasNavigated.current = true;
                                                                setActiveTopicId(flatTopics[currIdx - 1].id);
                                                            }
                                                        }}
                                                        disabled={!course.chapters.flatMap((c: any) => c.topics).findIndex((t: any) => t.id === activeTopicId) /* Index 0 check handled by findIndex > 0 implicitly? No. */}
                                                        className={cn(
                                                            "px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all",
                                                            course.chapters.flatMap((c: any) => c.topics).findIndex((t: any) => t.id === activeTopicId) <= 0
                                                                ? "opacity-0 pointer-events-none" // Hide Previous on first page
                                                                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                                                        )}
                                                    >
                                                        <ChevronLeft className="h-4 w-4" /> Previous
                                                    </button>

                                                    <div className="flex bg-slate-100 rounded-full px-4 py-1.5 text-xs font-medium text-slate-500">
                                                        Page {course.chapters.flatMap((c: any) => c.topics).findIndex((t: any) => t.id === activeTopicId) + 1} of {course.chapters.flatMap((c: any) => c.topics).length}
                                                    </div>

                                                    {course.chapters.flatMap((c: any) => c.topics).findIndex((t: any) => t.id === activeTopicId) < course.chapters.flatMap((c: any) => c.topics).length - 1 ? (
                                                        <button
                                                            onClick={() => {
                                                                const flatTopics = course.chapters.flatMap((c: any) => c.topics);
                                                                const currIdx = flatTopics.findIndex((t: any) => t.id === activeTopicId);
                                                                if (currIdx < flatTopics.length - 1) {
                                                                    const nextId = flatTopics[currIdx + 1].id;
                                                                    userHasNavigated.current = true;
                                                                    setActiveTopicId(nextId);
                                                                    // Unlock next page logic should go here or effect? 
                                                                    // We'll update maxViewedIndex via effect or state if we have settter access here.
                                                                    // Since I can't easily inject state setter here in this block without full rework, 
                                                                    // I will rely on the Sidebar rendering logic to assume "visited" = "index <= current + X"? 
                                                                    // Actually, simpler: Use Effect to tracking max index.
                                                                }
                                                            }}
                                                            className="px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-lg"
                                                        >
                                                            Next <ChevronRight className="h-4 w-4" />
                                                        </button>
                                                    ) : (
                                                        activeTopicId !== 'final-quiz' && (course.quizQuestionCount || 0) > 0 ? (
                                                            <button
                                                                onClick={() => {
                                                                    userHasNavigated.current = true;
                                                                    setActiveTopicId('final-quiz');
                                                                }}
                                                                className="px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 bg-purple-600 text-white hover:bg-purple-700 shadow-lg"
                                                            >
                                                                Final Assessment <ChevronRight className="h-4 w-4" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => setShowSignModal(true)}
                                                                disabled={!allTopicsViewed || ((course.quizQuestionCount || 0) > 0 && !quizPassed)}
                                                                className={cn("px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg animate-pulse",
                                                                    (!allTopicsViewed || ((course.quizQuestionCount || 0) > 0 && !quizPassed)) ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700"
                                                                )}
                                                            >
                                                                <PenTool className="h-4 w-4" /> Complete & Acknowledge
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            )}

                                        </div>
                                    )}
                                </div>
                            )}
                        </div>


                    </div>

                    {/* Right Sidebar: AI Tools */}
                    <div
                        className={cn(
                            "bg-white border-l border-slate-200 transition-all duration-0 flex flex-col relative shadow-xl z-30",
                            aiSidebarOpen ? "" : "w-0 overflow-hidden border-0"
                        )}
                        style={{ width: aiSidebarOpen ? aiSidebarWidth : 0 }}
                    >
                        {/* Drag Handle */}
                        {aiSidebarOpen && (
                            <div
                                onMouseDown={startResizing}
                                className="absolute left-0 top-0 bottom-0 w-1 bg-transparent hover:bg-indigo-400 cursor-col-resize z-50 transition-colors flex items-center justify-center group"
                            >
                                <div className="h-8 w-1 bg-slate-200 rounded-full group-hover:bg-indigo-500" />
                            </div>
                        )}

                        <AIFeaturePanel
                            isOpen={aiSidebarOpen}
                            setIsOpen={setAiSidebarOpen}
                            activeTab={activeTab as any}
                            setActiveTab={setActiveTab}
                            topic={activeTopic}
                            courseId={courseId}
                            selectedText={selectedText}
                            onClose={() => setAiSidebarOpen(false)}
                            onAudioStart={() => {
                                setIsSpeaking(false);
                                window.speechSynthesis.cancel();
                            }}
                            forceStopAudio={isSpeaking && !isPaused}
                            quizConfig={'5'}
                        />
                    </div>
                </div>
                {/* Signature Modal */}
                {
                    showSignModal && (
                        <div className="absolute inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4 transform transition-all scale-100 animate-in zoom-in-95 duration-200 border border-slate-100">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-indigo-100 p-2 rounded-lg">
                                            <ShieldCheck className="h-6 w-6 text-indigo-600" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900">Sign Document</h3>
                                    </div>
                                    <button
                                        onClick={() => setShowSignModal(false)}
                                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <p className="text-slate-600 mb-6 leading-relaxed text-sm">
                                    By signing below, I acknowledge that I have read, understood, and agree to abide by the policies and procedures outlined in this document. I understand that my digital signature is legally binding.
                                </p>

                                <div className="flex items-center gap-3 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setAcknowledgementChecked(!acknowledgementChecked)}>
                                    <div
                                        className={cn(
                                            "h-5 w-5 rounded border flex items-center justify-center transition-all",
                                            acknowledgementChecked ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white"
                                        )}
                                    >
                                        {acknowledgementChecked && <CheckSquare className="h-3.5 w-3.5 text-white" />}
                                    </div>
                                    <span className="text-slate-700 font-medium text-sm select-none">
                                        I have read and understood the contents
                                    </span>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowSignModal(false)}
                                        className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSign}
                                        disabled={!acknowledgementChecked || isSubmittingSign || !allTopicsViewed}
                                        className={cn(
                                            "flex-[2] py-3 px-4 rounded-xl font-bold text-white transition-all shadow-md flex items-center justify-center gap-2",
                                            (acknowledgementChecked && !isSubmittingSign && allTopicsViewed)
                                                ? "bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200"
                                                : "bg-slate-300 cursor-not-allowed shadow-none"
                                        )}
                                    >
                                        {isSubmittingSign ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Signing...
                                            </>
                                        ) : (
                                            <>
                                                <PenTool className="h-4 w-4" />
                                                Confirm Signature
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Quiz Configuration Modal */}
                {
                    showQuizModal && (
                        <div className="absolute inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-slate-900">Generate Quiz</h3>
                                    <button onClick={() => setShowQuizModal(false)} className="text-slate-400 hover:text-slate-600">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <p className="text-slate-600 mb-6 text-sm">
                                    How many questions would you like to generate for this topic?
                                </p>

                                <div className="flex justify-between gap-4 mb-8">
                                    {[3, 5, 10].map((num) => (
                                        <button
                                            key={num}
                                            onClick={() => setQuizConfig(num)}
                                            className={cn(
                                                "flex-1 h-14 rounded-xl border-2 font-bold text-lg flex items-center justify-center transition-all",
                                                quizConfig === num
                                                    ? "border-cyan-500 bg-cyan-50 text-cyan-700 shadow-md transform scale-105"
                                                    : "border-slate-200 text-slate-500 hover:border-cyan-200 hover:bg-slate-50"
                                            )}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => handleQuizStart(quizConfig)}
                                    className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                                >
                                    <Sparkles className="h-5 w-5" />
                                    Generate Quiz
                                </button>
                            </div>
                        </div>
                    )
                }

                {/* AI Chatbot Widget */}
                <CourseChatWidget
                    context={activeTopic?.content?.text || ""}
                    topicTitle={activeTopic?.title}
                />
            </div>
        </div >
    );
}
