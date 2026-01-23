'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { marked } from 'marked';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { COURSES, Topic } from '@/data/mockData';


import TextSelectionHandler from '@/components/TextSelectionHandler';
import CourseChatWidget from '@/components/CourseChatWidget';
import AIFeaturePanel from '@/components/AIFeaturePanel';
import {
    ArrowLeft, ArrowRight, Award, BookOpen, CheckCircle, ChevronLeft, ChevronRight, Circle, Clock, FileText, BrainCircuit, Loader2, Menu, MessageSquare, MoreVertical, Pause, Pencil, Play, Save, Settings, Share2, Sparkles, Square, Volume2, X, Mic, Lightbulb, Network, CheckSquare, Layers, Presentation, Lock as MdLock, Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ProfileDropdown from '@/components/ProfileDropdown';
import { processHtmlForSpeech } from '@/lib/speechUtils';
import { updateTopicProgress, completeCourse } from '@/app/actions/progress';
import { useAuth } from '@/components/AuthProvider';
// @ts-ignore
import Confetti from 'react-confetti';

export default function CoursePlayer() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth(); // Access auth user
    // const isPreviewMode = searchParams.get('preview') === 'true'; // Old logic
    const courseId = params.courseId as string;

    // State
    const [allCourses, setAllCourses] = useState<any[]>([]);
    const [course, setCourse] = useState<any>(null);
    const [activeTopicId, setActiveTopicId] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'visualize' | 'mindmap' | 'quiz' | 'flashcards' | 'explain' | 'podcast' | 'simplify' | 'scrollytelling'>('visualize');
    const [aiSidebarOpen, setAiSidebarOpen] = useState(true);
    const [aiSidebarWidth, setAiSidebarWidth] = useState(800); // Default placeholder
    const [isResizing, setIsResizing] = useState(false);
    const [showSourcePdf, setShowSourcePdf] = useState(false);

    // Audio & Highlight State
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [speechQueue, setSpeechQueue] = useState<string[]>([]);
    const [currentMsgIndex, setCurrentMsgIndex] = useState(-1);
    const [processedContent, setProcessedContent] = useState<string>(''); // For HTML highlighting
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

    // Timer State
    const [timeSpent, setTimeSpent] = useState(0);

    // AI State
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingStage, setLoadingStage] = useState('Initializing...');

    const [selectedText, setSelectedText] = useState<string>('');

    // Load Voices
    useEffect(() => {
        const updateVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            setAvailableVoices(voices);
        };

        updateVoices(); // Initial check

        if (typeof window !== 'undefined' && window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = updateVoices;
        }
    }, []);

    // Helper to get preferred voice
    const getPreferredVoice = () => {
        if (availableVoices.length === 0) return null;
        // Priority: Zira (Win), Google US English (Chrome), or any "Female" marker, then default
        return availableVoices.find(v => v.name.includes("Zira")) ||
            availableVoices.find(v => v.name.includes("Google US English")) ||
            availableVoices.find(v => v.name.toLowerCase().includes("female")) ||
            null; // Fallback to default if null
    };

    // Quiz State

    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [enrollmentStatus, setEnrollmentStatus] = useState<any>(null);
    const [showCompletionModal, setShowCompletionModal] = useState(false);

    // Topic Completion State (Local cache to avoid re-fetching constantly)
    const [completedTopics, setCompletedTopics] = useState<Set<string>>(new Set());

    // Derived Preview Mode: URL param OR Course is Completed OR Progress is 100%
    const isPreviewMode = searchParams.get('preview') === 'true'
        || !!enrollmentStatus?.completedAt
        || (enrollmentStatus?.progress === 100);

    // Initial Layout Effect (50% Split)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setAiSidebarWidth(window.innerWidth * 0.5);
        }
    }, []);

    // HEAVY DEBUG LOGGING
    console.log('[CoursePlayer] RENDER', {
        courseId,
        searchParamPreview: searchParams.get('preview'),
        enrollmentCompletedAt: enrollmentStatus?.completedAt,
        enrollmentAll: enrollmentStatus,
        isPreviewMode_Calculated: isPreviewMode
    });

    useEffect(() => {
        console.log('[CoursePlayer] DEBUG EFFECT: State Updated', {
            isPreviewMode,
            enrollmentStatus,
            searchParamsString: searchParams.toString(),
            currentURL: typeof window !== 'undefined' ? window.location.href : 'server',
            fullEnrollment: JSON.stringify(enrollmentStatus)
        });

        // Auto-open Quiz Tab if requested
        const tabParam = searchParams.get('tab');
        if (tabParam === 'quiz') {
            setActiveTab('quiz');
            setAiSidebarOpen(true);
        }
    }, [isPreviewMode, enrollmentStatus, searchParams]);

    // Timer Effect
    useEffect(() => {
        if (isPreviewMode) return; // No timer in preview

        // Don't run timer if topic is already completed
        if (completedTopics.has(activeTopicId)) return;

        let timer: NodeJS.Timeout;
        if (!isPaused && !showCompletionModal) {
            timer = setInterval(() => {
                setTimeSpent(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isPaused, isPreviewMode, showCompletionModal, activeTopicId, completedTopics]);

    // Sidebar Resize Handlers
    const startResizing = React.useCallback((mouseDownEvent: React.MouseEvent) => {
        mouseDownEvent.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = React.useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = React.useCallback((mouseMoveEvent: MouseEvent) => {
        if (isResizing) {
            const newWidth = window.innerWidth - mouseMoveEvent.clientX;
            if (newWidth > 350 && newWidth < window.innerWidth * 0.8) {
                setAiSidebarWidth(newWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

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

            const preferredVoice = getPreferredVoice();
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }

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
    }, [isSpeaking, currentMsgIndex, speechQueue, playbackSpeed, availableVoices]); // Added playbackSpeed and availableVoices to dep array

    useEffect(() => {
        const fetchCourseAndEnrollment = async () => {
            try {
                // 1. Fetch Course Structure First
                const res = await fetch(`/api/courses/${courseId}`);
                let courseData = null;

                if (res.ok) {
                    courseData = await res.json();

                    // REDIRECT COMPLIANCE COURSES
                    if (courseData.isCompliance) {
                        console.log("Redirecting Compliance Course to Viewer...");
                        router.replace(`/compliance/${courseId}`);
                        return; // Stop further processing
                    }

                    // ... (existing parsing logic preserved via below copy if needed, but for brevity assuming safe parsing is done above or here)
                    // Re-implementing parsing logic briefly for safety as we replace the block
                    if (courseData.chapters) {
                        courseData.chapters = courseData.chapters.map((ch: any) => ({
                            ...ch,
                            topics: ch.topics.map((t: any) => {
                                let parsedDetails = {};
                                try {
                                    if (typeof t.content === 'string' && t.content.trim().length > 0) {
                                        try {
                                            parsedDetails = JSON.parse(t.content);
                                            if (typeof parsedDetails === 'string') parsedDetails = JSON.parse(parsedDetails);
                                        } catch (jsonErr) {
                                            parsedDetails = { text: t.content };
                                        }
                                    } else if (typeof t.content === 'object') {
                                        parsedDetails = t.content || {};
                                    } else {
                                        parsedDetails = { text: "" };
                                    }
                                } catch (e) {
                                    parsedDetails = { text: t.content || "" };
                                }
                                return { ...t, content: parsedDetails };
                            })
                        }));
                    }
                    setCourse(courseData);
                }

                // 2. Fetch Enrollment Status (and Completed Topics)
                const enrollRes = await fetch(`/api/enrollments/check?courseId=${courseId}`);
                let completedIds = new Set<string>();

                if (enrollRes.ok) {
                    const enrollData = await enrollRes.json();
                    setEnrollmentStatus(enrollData);

                    if (enrollData.completedTopicIds) {
                        completedIds = new Set(enrollData.completedTopicIds);
                        setCompletedTopics(completedIds);
                    }
                }

                // 3. Resume Logic: Find First Incomplete Topic
                console.log('[ResumeLogic] Checking...', {
                    activeTopicId,
                    completedCount: completedIds.size,
                    completedArr: Array.from(completedIds)
                });

                if (courseData && !activeTopicId) {
                    let firstIncompleteId = null;
                    let firstId = null;

                    for (const ch of courseData.chapters) {
                        for (const t of ch.topics) {
                            if (!firstId) firstId = t.id;
                            if (!completedIds.has(t.id)) {
                                firstIncompleteId = t.id;
                                console.log('[ResumeLogic] Found incomplete:', t.id, t.title);
                                break;
                            }
                        }
                        if (firstIncompleteId) break;
                    }

                    const targetId = firstIncompleteId || firstId || '';
                    console.log('[ResumeLogic] Setting Active Topic:', targetId);
                    setActiveTopicId(targetId);
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

    // Lazy Load & Process Content
    useEffect(() => {
        if (activeTopic) {

            // Process HTML for Speech Highlighting
            const rawText = activeTopic.content?.text || '';
            const htmlContent = marked.parse(rawText) as string; // Convert MD to HTML
            const { processedHtml, sentences } = processHtmlForSpeech(htmlContent);
            setProcessedContent(processedHtml); // Display this!
            setSpeechQueue(sentences);          // Read this!
            setIsSpeaking(false);               // Reset speech
            setCurrentMsgIndex(-1);

            // LAZY GENERATION: If main text is empty, generate it
            if ((!rawText || rawText.length < 50) && !isAiLoading) {
                generateInitialContent(activeTopic as any);
            }
        }
    }, [activeTopicId, activeTopic]); // Depend on activeTopic to catch updates

    // Reset Timer on Topic Change
    useEffect(() => {
        setTimeSpent(0);
        setIsPaused(false);
    }, [activeTopicId]);

    const handleMarkComplete = async () => {
        if (!activeTopicId || !courseId) return;

        // 1. Optimistic Update
        setCompletedTopics(prev => new Set(prev).add(activeTopicId));

        // 2. Save to DB (Skip in Preview)
        // 2. Save to DB (Skip in Preview)
        if (!isPreviewMode && user?.id) { // Check user.id exists
            try {
                // Save timeSpent and mark complete
                await updateTopicProgress(user.id, activeTopicId, timeSpent, true); // Dynamic User ID
            } catch (e) {
                console.error("Failed to save progress", e);
            }
        }

        // 3. Auto-Advance logic could go here, but user asked for "Mark & Next"
        handleNextTopic();
    };

    const handleNextTopic = () => {
        if (!course || !activeTopicId) return;

        let foundCurrent = false;
        let nextTopicId = null;

        for (const ch of course.chapters) {
            for (const t of ch.topics) {
                if (foundCurrent) {
                    nextTopicId = t.id;
                    break;
                }
                if (t.id === activeTopicId) foundCurrent = true;
            }
            if (nextTopicId) break;
        }

        if (nextTopicId) {
            setActiveTopicId(nextTopicId);
        }
    };

    const handlePrevTopic = () => {
        if (!course || !activeTopicId) return;

        let prevTopicId = null;
        let lastTopicId = null;

        for (const ch of course.chapters) {
            for (const t of ch.topics) {
                if (t.id === activeTopicId) {
                    prevTopicId = lastTopicId;
                    break;
                }
                lastTopicId = t.id;
            }
            if (prevTopicId) break;
        }

        if (prevTopicId) {
            setActiveTopicId(prevTopicId);
        }
    };

    const canProceed = isPreviewMode || completedTopics.has(activeTopicId);

    const isLastTopic = () => {
        if (!course?.chapters) return false;
        const lastChapter = course.chapters[course.chapters.length - 1];
        if (!lastChapter?.topics) return false;
        const lastTopic = lastChapter.topics[lastChapter.topics.length - 1];
        return activeTopicId === lastTopic.id;
    };

    const handleFinishCourse = async () => {
        // Mark last topic as complete first
        await handleMarkComplete();

        if (!isPreviewMode && user?.id) {
            await completeCourse(user.id, courseId); // Dynamic User ID
        }
        setShowCompletionModal(true);
    };
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

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };



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

        // Force re-render of content area via key or state
    };

    // Quiz Handlers












    return (
        <div className="fixed inset-0 flex flex-col bg-slate-50 overflow-hidden">
            {/* Global Header */}
            <nav className="relative z-50 bg-slate-900 border-b border-white/10 shadow-md shrink-0 h-16 w-full flex items-center justify-between px-6">
                {/* Left: Back to Dashboard */}
                {/* Quiz Configuration Modal */}


                <div className="absolute left-0 top-0 bottom-0 flex items-center px-6 z-10">
                    <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <ChevronLeft className="h-5 w-5" />
                        <span className="font-medium">Back to Dashboard</span>
                    </Link>
                </div>

                {/* Center: Course Player */}
                <div className="absolute left-1/2 -translate-x-1/2 text-white font-bold text-lg flex items-center gap-2">
                    Course Player
                    {isPreviewMode && <span className="text-xs bg-amber-500 text-slate-900 px-2 py-0.5 rounded font-bold uppercase tracking-wide">[Preview Mode]</span>}
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
                                        {chapter.topics.map((topic: any, tIdx: number) => {
                                            // LOCKING LOGIC:
                                            // In Preview Mode: ALL UNLOCKED
                                            // In Normal Mode: Locked if:
                                            // 1. It's NOT completed
                                            // 2. AND the *previous* topic is NOT completed (linear progression)
                                            // (First topic of first chapter is always unlocked - logic handled by previous check)

                                            // Determine if unlocked
                                            let isUnlocked = true;
                                            if (!isPreviewMode) {
                                                // Find flat index or check previous sibling?
                                                // Simplified: If it's in completedTopics, it's unlocked.
                                                // If it's the specific Active Topic, it's unlocked.
                                                // If the previous topic in this list is completed, it's unlocked.
                                                // This creates a chain.

                                                // We need a robust way. Let's rely on the "Next" buttons having done their job
                                                // BUT we need to prevent clicking ahead.
                                                // A simple robust check: 
                                                // You can click if: It is completed OR it is the 'Next Up' (i.e. all previous linear topics are done)
                                                // Implementing 'Next Up' here efficiently is hard without a flat list.

                                                // Strategy: We will visually disable only truly "future" topics.
                                                // For now, let's leniently unlock "Active Topic".

                                                // BETTER: Just disable all non-completed topics EXCEPT the current active one?
                                                // No, users can switch between completed ones.

                                                const isCompleted = completedTopics.has(topic.id);
                                                const isActive = activeTopicId === topic.id;

                                                // To properly lock "future" topics, we need to know if all *previous* topics are done.
                                                // We can approximate: Is this topic completed? NO. Is is active? NO. Then it's likely future.
                                                // But what if we just navigated back?

                                                // STRICT MODE: Enable if (Completed OR Active). Disable otherwise?
                                                // Problem: How do you get to the defined "Next" one if you can't click it?
                                                // Answer: The "Next" button sets it as Active.

                                                if (!isCompleted && !isActive) {
                                                    isUnlocked = false;
                                                }
                                            }

                                            return (
                                                <button
                                                    key={topic.id}
                                                    onClick={() => isUnlocked && setActiveTopicId(topic.id)}
                                                    disabled={!isUnlocked}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                                                        activeTopicId === topic.id
                                                            ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                                                            : isUnlocked
                                                                ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                                                : "text-slate-300 cursor-not-allowed opacity-60"
                                                    )}
                                                >
                                                    {topic.isCompleted || completedTopics.has(topic.id) ? (
                                                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                                    ) : (
                                                        isUnlocked ? <Circle className="h-4 w-4 shrink-0" /> : <Loader2 className="h-4 w-4 shrink-0 opacity-0" /> // Hidden placeholder or Lock icon
                                                    )}
                                                    <span className="truncate">{topic.title}</span>
                                                    {!isUnlocked && <MdLock className="h-3 w-3 ml-auto text-slate-300" />}
                                                </button>
                                            );
                                        })}
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
                        {/* Top Bar (Primary Tools) */}
                        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 z-20 relative">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-500">Course Player</span>
                                <ChevronLeft className="h-4 w-4 text-slate-400" />
                                <span className="text-sm font-bold text-slate-900 truncate max-w-xs" title={course.title}>{course.title}</span>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Toggle Source PDF */}
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
                                {/* Title removed as per request (displayed in content) */}
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
                                {/* Timer (Hidden in Preview) */}
                                {!isPreviewMode && (
                                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                                        <Clock className="h-3 w-3" />
                                        {formatTime(timeSpent)}
                                    </div>
                                )}

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

                                    <div className="h-6 w-px bg-slate-300 mx-1"></div>
                                    <select
                                        value={playbackSpeed}
                                        onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                                        className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none cursor-pointer hover:text-cyan-700"
                                        title="Playback Speed"
                                        disabled={isAiLoading}
                                    >
                                        <option value="0.75">0.75x</option>
                                        <option value="1">1x</option>
                                        <option value="1.25">1.25x</option>
                                    </select>
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
                                <div className="p-8 md:p-12 max-w-4xl mx-auto">
                                    {isAiLoading || (!activeTopic?.content?.text && !editContent) ? (
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
                                                <div className="relative group/notes">
                                                    {/* Smart Notes Toolbar */}
                                                    <div className="absolute top-4 right-4 z-20 flex items-center gap-2 opacity-0 group-hover/notes:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-md p-1.5 rounded-full shadow-sm border border-slate-200 animate-in slide-in-from-top-2">
                                                        <button
                                                            onClick={() => {
                                                                const el = document.getElementById('smart-notes-content');
                                                                if (el) {
                                                                    const currentSize = parseFloat(getComputedStyle(el).fontSize);
                                                                    el.style.fontSize = `${Math.max(14, currentSize - 2)}px`;
                                                                }
                                                            }}
                                                            className="p-1.5 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-full transition-colors"
                                                            title="Decrease Font Size"
                                                        >
                                                            <div className="text-xs font-bold w-4 h-4 flex items-center justify-center">A-</div>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const el = document.getElementById('smart-notes-content');
                                                                if (el) {
                                                                    const currentSize = parseFloat(getComputedStyle(el).fontSize);
                                                                    el.style.fontSize = `${Math.min(24, currentSize + 2)}px`;
                                                                }
                                                            }}
                                                            className="p-1.5 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-full transition-colors"
                                                            title="Increase Font Size"
                                                        >
                                                            <div className="text-xs font-bold w-4 h-4 flex items-center justify-center">A+</div>
                                                        </button>
                                                        <div className="w-px h-4 bg-slate-200" />
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(activeTopic?.content?.text || "");
                                                            }}
                                                            className="p-1.5 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-full transition-colors"
                                                            title="Copy to Clipboard"
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </button>
                                                    </div>

                                                    <div
                                                        id="smart-notes-content"
                                                        className="prose prose-slate max-w-none animate-in fade-in duration-700 p-2 md:p-4 transition-all
                                                        prose-headings:font-bold prose-headings:tracking-tight
                                                        prose-h1:text-4xl prose-h1:bg-gradient-to-r prose-h1:from-slate-900 prose-h1:to-slate-700 prose-h1:bg-clip-text prose-h1:text-transparent prose-h1:mb-8
                                                        prose-h2:text-2xl prose-h2:text-slate-800 prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-2 prose-h2:mt-10
                                                        prose-h3:text-lg prose-h3:font-semibold prose-h3:text-cyan-700 prose-h3:mt-6 cursor-default
                                                        prose-p:text-slate-600 prose-p:leading-8 prose-p:text-lg
                                                        prose-li:text-slate-700 prose-li:marker:text-cyan-500
                                                        prose-strong:text-slate-900 prose-strong:font-bold
                                                        prose-blockquote:border-l-4 prose-blockquote:border-cyan-400 prose-blockquote:bg-cyan-50/50 prose-blockquote:backdrop-blur-sm prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:italic prose-blockquote:not-italic
                                                        prose-img:rounded-2xl prose-img:shadow-xl prose-img:border prose-img:border-slate-100
                                                    ">
                                                        <TextSelectionHandler
                                                            onExplain={(text) => {
                                                                setSelectedText(text);
                                                                setActiveTab('explain');
                                                                setAiSidebarOpen(true);
                                                            }}
                                                            onVisualize={(text) => {
                                                                setSelectedText(text);
                                                                setActiveTab('visualize');
                                                                setAiSidebarOpen(true);
                                                            }}
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
                                                                        __html: processedContent || (activeTopic?.content?.text ? marked.parse(activeTopic.content.text) as string : "")
                                                                    }}
                                                                    className="min-h-[200px]"
                                                                />
                                                            )}
                                                        </TextSelectionHandler>
                                                    </div>
                                                </div>
                                            )
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                                <FileText className="h-16 w-16 mb-4 opacity-20" />
                                                <p>Select a topic to view content.</p>
                                            </div>
                                        ))}

                                    {/* Source PDF Toggle */}
                                    {allCourses.find(c => c.id === courseId)?.fileUrl && (
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
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Footer Actions: Mark Complete / Navigation - HIDDEN in Preview Mode */}
                                    {!isPreviewMode && (
                                        <div className="mt-12 py-8 border-t border-slate-100 flex items-center justify-between">
                                            <button
                                                onClick={handlePrevTopic}
                                                className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-cyan-600 font-medium transition-colors"
                                            >
                                                <ChevronLeft className="h-4 w-4" /> Previous
                                            </button>

                                            {isLastTopic() ? (
                                                <button
                                                    onClick={handleFinishCourse}
                                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                                                >
                                                    <CheckCircle className="h-5 w-5" /> Finish Course
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleMarkComplete}
                                                    className={cn(
                                                        "flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-md transition-all",
                                                        canProceed
                                                            ? "bg-slate-900 text-white hover:bg-slate-800"
                                                            : "bg-cyan-600 text-white hover:bg-cyan-700 hover:scale-105"
                                                    )}
                                                >
                                                    {canProceed ? "Next Topic" : "Mark as Complete & Next"} <ArrowRight className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Completion Modal */}
                        {showCompletionModal && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                                <Confetti numberOfPieces={200} recycle={false} />
                                <div className="bg-white rounded-3xl max-w-lg w-full p-8 text-center relative shadow-2xl animate-in zoom-in-50 duration-500">
                                    <button
                                        onClick={() => setShowCompletionModal(false)}
                                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>

                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Award className="h-10 w-10 text-green-600" />
                                    </div>

                                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Congratulations!</h2>
                                    <p className="text-slate-600 mb-8">
                                        You have successfully completed <span className="font-bold text-cyan-600">{course.title}</span>.
                                    </p>

                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <p className="text-xs uppercase text-slate-400 font-bold mb-1">Total Time</p>
                                            <p className="text-xl font-bold text-slate-900">
                                                {formatTime(timeSpent)}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <p className="text-xs uppercase text-slate-400 font-bold mb-1">Certificate</p>
                                            <p className="text-xl font-bold text-purple-600">Issued</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => router.push('/dashboard')}
                                            className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                        >
                                            Back to Home
                                        </button>
                                        <button
                                            onClick={() => router.push('/learning?tab=completed')}
                                            className="flex-1 py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700 transition-colors"
                                        >
                                            View Certificate
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar: AI Tools (Resizable) */}
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
                                setIsPaused(false);
                                window.speechSynthesis.cancel();
                            }}
                            forceStopAudio={isSpeaking && !isPaused}
                            quizConfig={(enrollmentStatus as any)?.quizConfig || '5'} // Pass config
                        />
                    </div>
                </div>
            </div>

            {/* AI Chatbot Widget */}
            <CourseChatWidget
                context={activeTopic?.content?.text || ""}
                topicTitle={activeTopic?.title || ""}
            />
        </div>
    );
}
