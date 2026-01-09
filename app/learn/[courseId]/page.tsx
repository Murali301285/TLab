'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { marked } from 'marked';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { COURSES, Topic } from '@/data/mockData';
import MindMap from '@/components/MindMap';
import FlashcardDeck from '@/components/FlashcardDeck';
import TextSelectionHandler from '@/components/TextSelectionHandler';
import {
    ArrowLeft, BookOpen, CheckCircle, ChevronLeft, ChevronRight, Circle, Clock, FileText, BrainCircuit, Loader2, Menu, MessageSquare, MoreVertical, Pause, Pencil, Play, Save, Settings, Share2, Sparkles, Square, Volume2, X, Mic, Lightbulb, Network, CheckSquare, Layers, Presentation
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ProfileDropdown from '@/components/ProfileDropdown';
import { processHtmlForSpeech } from '@/lib/speechUtils';

export default function CoursePlayer() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;

    // State
    const [allCourses, setAllCourses] = useState<any[]>([]);
    const [course, setCourse] = useState<any>(null);
    const [activeTopicId, setActiveTopicId] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'summary' | 'mindmap' | 'quiz' | 'flashcards' | 'explain' | 'podcast' | 'simplify' | 'visualize'>('summary');
    const [aiSidebarOpen, setAiSidebarOpen] = useState(true);
    const [showSourcePdf, setShowSourcePdf] = useState(false);

    // Audio & Highlight State
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [speechQueue, setSpeechQueue] = useState<string[]>([]);
    const [currentMsgIndex, setCurrentMsgIndex] = useState(-1);
    const [processedContent, setProcessedContent] = useState<string>(''); // For HTML highlighting

    // Timer State
    const [timeSpent, setTimeSpent] = useState(0);

    // AI State
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingStage, setLoadingStage] = useState('Initializing...');
    const [summary, setSummary] = useState<string>('');
    const [mindMapData, setMindMapData] = useState<string>('');
    const [quiz, setQuiz] = useState<any[]>([]);
    const [flashcards, setFlashcards] = useState<any[]>([]);
    const [explanation, setExplanation] = useState<string>('');
    const [selectedText, setSelectedText] = useState<string>('');
    const [podcastData, setPodcastData] = useState<any[]>([]);
    const [simplificationData, setSimplificationData] = useState<string>('');
    const [isPlayingPodcast, setIsPlayingPodcast] = useState(false);
    const [isPodcastPaused, setIsPodcastPaused] = useState(false);
    const [currentPodcastLine, setCurrentPodcastLine] = useState(-1);
    const [visualizeData, setVisualizeData] = useState<any>(null);
    const [selectedAnalogy, setSelectedAnalogy] = useState<string>('General');

    const ANALOGY_TAGS = [
        'General', '🎮 Games', '♟️ Chess', '⚽ Sports', '🍕 Food', '🎬 Movies', '💻 Computers', '🚗 Cars', '🎵 Music', '🚀 Space'
    ];

    // Quiz State
    const [showQuizModal, setShowQuizModal] = useState(false);
    const [quizConfig, setQuizConfig] = useState<number>(3);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });

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
            utterance.rate = 1.0;

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
    }, [isSpeaking, currentMsgIndex, speechQueue]);

    // Podcast Logic
    const playPodcast = () => {
        if (!podcastData || podcastData.length === 0) return;

        if (isPodcastPaused) {
            window.speechSynthesis.resume();
            setIsPodcastPaused(false);
        } else {
            // If resuming or starting fresh
            if (currentPodcastLine === -1) setCurrentPodcastLine(0);
            setIsPlayingPodcast(true);
        }
    };

    const pausePodcast = () => {
        window.speechSynthesis.pause();
        setIsPodcastPaused(true);
    };

    const stopPodcast = () => {
        window.speechSynthesis.cancel();
        setIsPlayingPodcast(false);
        setIsPodcastPaused(false);
        setCurrentPodcastLine(-1);
    };

    useEffect(() => {
        if (isPlayingPodcast && currentPodcastLine >= 0 && currentPodcastLine < podcastData.length) {
            const line = podcastData[currentPodcastLine];
            window.speechSynthesis.cancel(); // Stop prev

            const utterance = new SpeechSynthesisUtterance(line.text);
            utterance.rate = 1.0;

            // Voice/Pitch Tweaking for "Host" vs "Expert"
            const voices = window.speechSynthesis.getVoices();
            // Try to stick to English voices
            const enVoices = voices.filter(v => v.lang.startsWith('en'));

            if (line.speaker === 'Host') {
                // Try a female voice or higher pitch
                const hostVoice = enVoices.find(v => v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Google US English'));
                if (hostVoice) utterance.voice = hostVoice;
                utterance.pitch = 1.1;
            } else {
                // Expert: Male voice or lower pitch
                const expertVoice = enVoices.find(v => v.name.includes('Male') || v.name.includes('David') || v.name.includes('Daniel') || v.name.includes('Microsoft Mark'));
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
        } else if (!isPlayingPodcast) {
            window.speechSynthesis.cancel();
        }
    }, [isPlayingPodcast, currentPodcastLine, podcastData]);

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
            setSummary(activeTopic.content?.summary || '');
            setMindMapData(activeTopic.content?.mindMap || '');
            setQuiz(activeTopic.content?.quiz || []);
            setFlashcards((activeTopic.content as any)?.flashcards || []);
            setExplanation('');

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



    const handleAIFeature = async (feature: 'summary' | 'mindmap' | 'quiz' | 'flashcards' | 'explain' | 'podcast' | 'simplify' | 'visualize', textSelection?: string, analogyOverride?: string) => {
        setActiveTab(feature);
        if (!aiSidebarOpen) setAiSidebarOpen(true);

        // Return if content already exists to save API calls (optional optimization)
        if (feature === 'summary' && summary) return;
        if (feature === 'mindmap' && mindMapData) return;
        // Quiz check moved to click handler to allow regeneration
        if (feature === 'flashcards' && flashcards.length > 0) return;
        // For explain, we always generate new if textSelection is provided
        if (feature === 'explain' && textSelection) {
            setSelectedText(textSelection);
        } else if (feature === 'explain' && !textSelection && explanation) {
            return; // Just switching tabs back to existing explanation
        } else if (feature === 'visualize' && textSelection) {
            setSelectedText(textSelection);
        }

        setIsAiLoading(true);

        try {
            const rawContent = activeTopic?.content?.text || "Content not available";
            // Strip HTML tags to provide clean text context to AI
            const context = rawContent.replace(/<[^>]*>?/gm, '');

            const endpoint = (feature === 'visualize' || (feature as string) === 'concept') ? '/api/ai/concept' : '/api/ai/generate';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: feature === 'simplify' ? 'simplification' : (feature === 'visualize' ? 'concept' : feature),
                    context: feature === 'visualize' ? undefined : context.substring(0, 25000), // increased limit for Llama 3 context
                    // type: feature === 'simplify' ? 'simplification' : feature, <Duplicate removed>
                    // context: context.substring(0, 25000), // <Duplicate removed>
                    topicTitle: textSelection || activeTopic?.title, // Use selected text as "topic" for explanation/visualization
                    questionCount: feature === 'quiz' ? quizConfig : undefined,
                    analogy: feature === 'simplify' ? (analogyOverride || (selectedAnalogy === 'General' ? undefined : selectedAnalogy)) : undefined
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
            } else if (feature === 'podcast') {
                try {
                    const pData = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
                    setPodcastData(pData);
                } catch (e) { console.error("Podcast Parse Error", e); }
            } else if (feature === 'simplify') {
                setSimplificationData(data.content);
            } else if (feature === 'visualize') {
                try {
                    const vData = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
                    setVisualizeData(vData);
                } catch (e) {
                    console.error("Visualize Parse Error", e);
                }
            }

        } catch (error) {
            console.error("AI Feature Error:", error);
            // Fallback logic...
        } finally {
            setIsAiLoading(false);
        }
    };


    const handleAnalogyChange = (newAnalogy: string) => {
        // Optimistically update UI
        setSelectedAnalogy(newAnalogy);
        setSimplificationData(''); // Clear to show loading state

        // Trigger generic AI call immediately with the NEW analogy
        handleAIFeature('simplify', undefined, newAnalogy);
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

    // Quiz Handlers
    const handleQuizTabClick = () => {
        setActiveTab('quiz');
        if (!aiSidebarOpen) setAiSidebarOpen(true);
        if (quiz.length === 0) {
            setShowQuizModal(true);
        }
    };

    const handleQuizStart = (count: number) => {
        setQuizConfig(count);
        setShowQuizModal(false);
        // Reset previous quiz state
        setQuiz([]);
        setUserAnswers({});
        setQuizSubmitted(false);
        setQuizScore({ correct: 0, total: 0 });
        // Trigger generation
        handleAIFeature('quiz'); // Will use the new quizConfig state (might need refs or passing param directly if state update is slow, but usually fine here due to async or we pass param)
        // Wait, handleAIFeature reads state. React 18 updates are batched, but safe to pass param.
        // Actually handleAIFeature uses `quizConfig` state which might be stale in same tick. 
        // Better to pass count explicitly to handleAIFeature or rely on effect. 
        // For safety, let's modify handleAIFeature signature or just rely on state update + timeout, 
        // OR better: call helper that calls API with specific config.
        // Let's refactor handleAIFeature slightly to accept config overrides? 
        // For now, I will assume handleAIFeature reads current state. 
        // To be safe, I'll update handleAIFeature below to read specific param if passed? 
        // Actually, let's just use a dedicated generate function for quiz or pass a param to handleAIFeature.

        // Re-implementing specific call here for safety:
        generateQuizExplicitly(count);
    };

    const generateQuizExplicitly = async (count: number) => {
        setIsAiLoading(true);
        try {
            const rawContent = activeTopic?.content?.text || "";
            const context = rawContent.replace(/<[^>]*>?/gm, ''); // strip html
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'quiz',
                    context: context.substring(0, 25000),
                    topicTitle: activeTopic?.title,
                    questionCount: count
                })
            });
            const data = await response.json();
            try {
                const quizData = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
                setQuiz(quizData);
            } catch (e) { console.error("Quiz Parse Error", e); }
        } catch (e) {
            console.error("Quiz Gen Error", e);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
        if (quizSubmitted) return;
        setUserAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
    };

    const handleSubmitQuiz = () => {
        let correctHost = 0;
        quiz.forEach((q, idx) => {
            if (userAnswers[idx] === q.correctAnswer) {
                correctHost++;
            }
        });
        setQuizScore({ correct: correctHost, total: quiz.length });
        setQuizSubmitted(true);
    };

    const handleRegenerateQuiz = () => {
        setQuiz([]);
        setUserAnswers({});
        setQuizSubmitted(false);
        setShowQuizModal(true);
    };

    return (
        <div className="fixed inset-0 flex flex-col bg-slate-50 overflow-hidden">
            {/* Global Header */}
            <nav className="relative z-50 bg-slate-900 border-b border-white/10 shadow-md shrink-0 h-16 w-full flex items-center justify-between px-6">
                {/* Left: Back to Dashboard */}
                {/* Quiz Configuration Modal */}
                {showQuizModal && (
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
                )}

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
                                <h1 className="text-lg font-bold text-slate-900">
                                    {activeTopic?.title}
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
                                {/* Timer */}
                                <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                                    <Clock className="h-3 w-3" />
                                    {formatTime(timeSpent)}
                                </div>

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
                                                                    __html: processedContent || (activeTopic?.content?.text ? marked.parse(activeTopic.content.text) as string : "")
                                                                }}
                                                                className="min-h-[200px]"
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
                                                    <iframe
                                                        src={allCourses.find(c => c.id === courseId)?.fileUrl}
                                                        className="w-full h-full"
                                                    />
                                                </div>
                                            )}
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
                                    "flex-1 py-4 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1",
                                    activeTab === 'summary' ? "border-cyan-500 text-cyan-600" : "border-transparent text-slate-500 hover:text-slate-900"
                                )}
                            >
                                <FileText className="h-3 w-3" /> Summary
                            </button>
                            <button
                                onClick={() => handleAIFeature('simplify')}
                                className={cn(
                                    "flex-1 py-4 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1",
                                    activeTab === 'simplify' ? "border-amber-500 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-900"
                                )}
                            >
                                <Lightbulb className="h-3 w-3" /> Explain
                            </button>
                            <button
                                onClick={() => handleAIFeature('podcast')}
                                className={cn(
                                    "flex-1 py-4 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1",
                                    activeTab === 'podcast' ? "border-purple-500 text-purple-600" : "border-transparent text-slate-500 hover:text-slate-900"
                                )}
                            >
                                <Mic className="h-3 w-3" /> Podcast
                            </button>
                            <button
                                onClick={() => handleAIFeature('mindmap')}
                                className={cn(
                                    "flex-1 py-4 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1",
                                    activeTab === 'mindmap' ? "border-pink-500 text-pink-600" : "border-transparent text-slate-500 hover:text-slate-900"
                                )}
                            >
                                <Network className="h-3 w-3" /> Mind Map
                            </button>
                            <button
                                onClick={handleQuizTabClick}
                                className={cn(
                                    "flex-1 py-4 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1",
                                    activeTab === 'quiz' ? "border-green-500 text-green-600" : "border-transparent text-slate-500 hover:text-slate-900"
                                )}
                            >
                                <CheckSquare className="h-3 w-3" /> Quiz
                            </button>
                            <button
                                onClick={() => handleAIFeature('visualize')}
                                className={cn(
                                    "flex-1 py-4 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1",
                                    activeTab === 'visualize' ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-900"
                                )}
                            >
                                <Presentation className="h-3 w-3" /> Visualize
                            </button>
                            <button
                                onClick={() => handleAIFeature('flashcards')}
                                className={cn(
                                    "flex-1 py-4 text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1",
                                    activeTab === 'flashcards' ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-900"
                                )}
                            >
                                <Layers className="h-3 w-3" /> Flashcards
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

                                    {activeTab === 'simplify' && (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 h-full flex flex-col">
                                            {/* Analogy Selector */}
                                            <div className="mb-6">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Explain using...</p>
                                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                                    {ANALOGY_TAGS.map(tag => (
                                                        <button
                                                            key={tag}
                                                            onClick={() => {
                                                                setSelectedAnalogy(tag);
                                                                // Trigger generation immediately with new tag if content exists
                                                                // Or just set state and let user click explain?
                                                                // Better UX: Auto-trigger if we are already viewing explanation
                                                                if (activeTab === 'simplify') {
                                                                    // We need a way to trigger handleAIFeature with state update.
                                                                    // Since state update is async, we pass the tag explicitly to a helper or rely on useEffect.
                                                                    // For now, let's just set state. The user might need to re-click "Explain" or we do a quick hack to force re-fetch.
                                                                    // Re-fetch logic:
                                                                    // We can call handleAIFeature('simplify') but we need to ensure the state 'selectedAnalogy' is updated.
                                                                    // Simplest: Just refresh the view.
                                                                    // Let's pass the override to a modified handleAIFeature or just call it after a timeout.
                                                                    // Cleanest: Pass 'analogyOverride' to handleAIFeature.
                                                                }
                                                                // NOTE: Ideally we want to auto-refresh.
                                                                // Let's hack it: user clicks tag -> we set state -> user clicks "Explain" again?
                                                                // No, user expects auto-update.
                                                                // I'll add an auto-trigger.
                                                                handleAnalogyChange(tag);
                                                            }}
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
                                                                selectedAnalogy === tag
                                                                    ? "bg-amber-100 text-amber-700 border-amber-300 shadow-sm"
                                                                    : "bg-white text-slate-500 border-slate-200 hover:border-amber-200 hover:bg-amber-50"
                                                            )}
                                                        >
                                                            {tag}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {simplificationData ? (
                                                <div className="bg-amber-50/50 p-6 rounded-xl border border-amber-100 shadow-sm flex-1 overflow-y-auto custom-scrollbar">
                                                    <div className="flex items-center gap-2 mb-6 text-amber-800 font-bold border-b border-amber-200 pb-3">
                                                        <Lightbulb className="h-5 w-5" />
                                                        <span>Explained Simply {selectedAnalogy !== 'General' && `(${selectedAnalogy})`}</span>
                                                    </div>
                                                    <div className="prose prose-sm prose-amber max-w-none text-slate-700 leading-relaxed
                                                        prose-headings:font-bold prose-headings:text-amber-900 
                                                        prose-p:text-slate-700 prose-p:my-3 prose-p:leading-7
                                                        prose-strong:text-amber-800 prose-strong:font-semibold
                                                        prose-li:marker:text-amber-500
                                                    ">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{simplificationData}</ReactMarkdown>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center p-10 text-slate-400 flex flex-col items-center justify-center flex-1">
                                                    <Lightbulb className="h-12 w-12 mb-4 opacity-20" />
                                                    <p>Select a style and click Explain!</p>
                                                    <button
                                                        onClick={() => handleAIFeature('simplify')}
                                                        className="mt-4 px-6 py-2 bg-amber-100 text-amber-700 rounded-lg font-bold hover:bg-amber-200 transition-colors"
                                                    >
                                                        Generate Explanation
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'podcast' && (
                                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
                                            {podcastData && podcastData.length > 0 ? (
                                                <div className="space-y-4">
                                                    {/* Player Controls */}
                                                    <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between shadow-lg sticky top-0 z-10">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                                                                <Mic className="h-5 w-5 text-white" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-sm">AI Podcast</h4>
                                                                <p className="text-xs text-slate-400">Host vs Expert</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {isPlayingPodcast && !isPodcastPaused ? (
                                                                <button
                                                                    onClick={pausePodcast}
                                                                    className="h-10 w-10 rounded-full flex items-center justify-center bg-white text-slate-900 hover:bg-slate-200 transition-all"
                                                                    title="Pause"
                                                                >
                                                                    <Pause className="h-4 w-4 fill-current" />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={playPodcast}
                                                                    className="h-10 w-10 rounded-full flex items-center justify-center bg-white text-slate-900 hover:bg-slate-200 transition-all"
                                                                    title={isPodcastPaused ? "Resume" : "Play"}
                                                                >
                                                                    <Play className="h-4 w-4 fill-current ml-0.5" />
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={stopPodcast}
                                                                className={cn(
                                                                    "h-10 w-10 rounded-full flex items-center justify-center transition-all",
                                                                    "bg-red-500 hover:bg-red-600 text-white"
                                                                )}
                                                                title="Stop"
                                                            >
                                                                <Square className="h-4 w-4 fill-current" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Script */}
                                                    <div className="space-y-4 pt-2">
                                                        {podcastData.map((line: any, idx: number) => (
                                                            <div key={idx} className={cn(
                                                                "p-4 rounded-xl text-sm transition-all duration-300",
                                                                line.speaker === 'Host' ? "bg-slate-50 ml-4 rounded-tr-none border border-slate-200" : "bg-indigo-50 mr-4 rounded-tl-none border border-indigo-100",
                                                                currentPodcastLine === idx ? "ring-2 ring-purple-500 shadow-md scale-[1.02]" : "opacity-80 grayscale-[0.3]"
                                                            )}>
                                                                <p className="text-xs font-bold mb-1 uppercase tracking-wider opacity-50">
                                                                    {line.speaker}
                                                                </p>
                                                                <p className="text-slate-800 leading-relaxed">
                                                                    {line.text}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center p-10 text-slate-400">Generating script...</div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'quiz' && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
                                            {quiz && quiz.length > 0 ? (
                                                <>
                                                    {/* Score Header */}
                                                    {quizSubmitted && (
                                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between mb-4 sticky top-0 z-10">
                                                            <div>
                                                                <h4 className="font-bold text-slate-900">Quiz Results</h4>
                                                                <p className="text-xs text-slate-500">Based on your selection</p>
                                                            </div>
                                                            <div className={cn(
                                                                "px-4 py-2 rounded-lg font-bold text-lg",
                                                                (quizScore.correct / quizScore.total) >= 0.7 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                                            )}>
                                                                {quizScore.correct}/{quizScore.total} <span className="text-sm font-normal opacity-75">({Math.round((quizScore.correct / quizScore.total) * 100)}%)</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Questions */}
                                                    {quiz.map((q, i) => (
                                                        <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                                            {/* Result Indicator Highlight */}
                                                            {quizSubmitted && (
                                                                <div className={cn(
                                                                    "absolute left-0 top-0 bottom-0 w-1.5",
                                                                    userAnswers[i] === q.correctAnswer ? "bg-green-500" : (userAnswers[i] !== undefined ? "bg-red-500" : "bg-slate-300")
                                                                )} />
                                                            )}

                                                            <p className="text-slate-900 font-medium mb-4 pl-2">
                                                                <span className="text-slate-400 mr-2">Q{i + 1}</span>
                                                                {q.question}
                                                            </p>
                                                            <div className="space-y-2">
                                                                {q.options.map((opt: string, idx: number) => {
                                                                    const isSelected = userAnswers[i] === idx;
                                                                    const isCorrect = q.correctAnswer === idx;

                                                                    let btnStyle = "border-slate-200 text-slate-600 hover:bg-slate-50";

                                                                    if (quizSubmitted) {
                                                                        if (isCorrect) btnStyle = "border-green-500 bg-green-50 text-green-700 font-medium ring-1 ring-green-500";
                                                                        else if (isSelected && !isCorrect) btnStyle = "border-red-500 bg-red-50 text-red-700 ring-1 ring-red-500";
                                                                        else btnStyle = "border-slate-100 text-slate-400 opacity-60";
                                                                    } else {
                                                                        if (isSelected) btnStyle = "border-cyan-500 bg-cyan-50 text-cyan-700 ring-1 ring-cyan-500";
                                                                    }

                                                                    return (
                                                                        <button
                                                                            key={idx}
                                                                            onClick={() => handleAnswerSelect(i, idx)}
                                                                            disabled={quizSubmitted}
                                                                            className={cn(
                                                                                "w-full text-left p-3 rounded-lg text-sm transition-all border flex items-center justify-between group",
                                                                                btnStyle
                                                                            )}
                                                                        >
                                                                            <span>{opt}</span>
                                                                            {quizSubmitted && isCorrect && <CheckCircle className="h-4 w-4 text-green-600" />}
                                                                            {quizSubmitted && isSelected && !isCorrect && <X className="h-4 w-4 text-red-500" />}
                                                                            {!quizSubmitted && isSelected && <CheckCircle className="h-4 w-4 text-cyan-600" />}
                                                                            {!quizSubmitted && !isSelected && <Circle className="h-4 w-4 text-slate-300 group-hover:text-cyan-400" />}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Actions Footer */}
                                                    <div className="pt-4 flex items-center gap-3">
                                                        {!quizSubmitted ? (
                                                            <button
                                                                onClick={handleSubmitQuiz}
                                                                disabled={Object.keys(userAnswers).length !== quiz.length}
                                                                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                                                            >
                                                                Submit Results
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={handleRegenerateQuiz}
                                                                className="w-full py-3 bg-cyan-600 text-white rounded-xl font-bold hover:bg-cyan-700 transition-all shadow-lg flex items-center justify-center gap-2"
                                                            >
                                                                <Sparkles className="h-4 w-4" /> Regenerate Quiz
                                                            </button>
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center p-10 text-slate-400 flex flex-col items-center">
                                                    <BrainCircuit className="h-12 w-12 mb-4 opacity-20" />
                                                    <p className="mb-4">No quiz generated yet.</p>
                                                    <button
                                                        onClick={() => setShowQuizModal(true)}
                                                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-medium transition-colors"
                                                    >
                                                        Create Quiz
                                                    </button>
                                                </div>
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

                                    {activeTab === 'visualize' && (
                                        <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
                                            {visualizeData ? (
                                                <div className="space-y-8">
                                                    {/* 1. Header */}
                                                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                                        <h4 className="text-indigo-900 font-bold mb-1 flex items-center gap-2">
                                                            <Presentation className="h-4 w-4" />
                                                            {visualizeData.summary}
                                                        </h4>
                                                    </div>

                                                    {/* 2. Mermaid Chart */}
                                                    {visualizeData.mermaid && (
                                                        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Process Flow</p>
                                                            <MindMap chart={visualizeData.mermaid} />
                                                        </div>
                                                    )}

                                                    {/* 3. Steps Breakdown */}
                                                    {visualizeData.steps && (
                                                        <div className="space-y-3">
                                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Step-by-Step Breakdown</p>
                                                            {visualizeData.steps.map((step: any, idx: number) => (
                                                                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4 transition-hover hover:border-cyan-200">
                                                                    <div className="h-8 w-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-sm shrink-0">
                                                                        {idx + 1}
                                                                    </div>
                                                                    <div>
                                                                        <h5 className="font-bold text-slate-900 text-sm mb-1">{step.title}</h5>
                                                                        <p className="text-slate-600 text-sm">{step.description}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* 4. Comparison Table */}
                                                    {visualizeData.comparison && (
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Comparison</p>
                                                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-sm">
                                                                <div className="bg-slate-50 p-3 border-b border-slate-200 font-bold text-slate-900 text-center">
                                                                    {visualizeData.comparison.title}
                                                                </div>
                                                                <div className="grid grid-cols-2 divide-x divide-slate-200 bg-slate-50 border-b border-slate-200">
                                                                    {visualizeData.comparison.headers.map((h: string, idx: number) => (
                                                                        <div key={idx} className="p-2 font-bold text-center text-slate-700">{h}</div>
                                                                    ))}
                                                                </div>
                                                                <div className="divide-y divide-slate-100">
                                                                    {visualizeData.comparison.rows.map((row: string[], idx: number) => (
                                                                        <div key={idx} className="grid grid-cols-2 divide-x divide-slate-100 hover:bg-slate-50">
                                                                            <div className="p-3 text-slate-600">{row[0]}</div>
                                                                            <div className="p-3 text-slate-600">{row[1]}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-center p-10 text-slate-400 flex flex-col items-center">
                                                    <Presentation className="h-12 w-12 mb-4 opacity-20" />
                                                    <p>Select text in the content to visualize it!</p>
                                                </div>
                                            )}
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
