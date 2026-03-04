'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    UploadCloud,
    FileText,
    CheckCircle,
    Loader2,
    ArrowRight,
    Book,
    Shield,
    ImageIcon,
    Search,
    Filter,
    Edit,
    Trash2,
    Power,
    RefreshCw,
    Bot,
    ChevronLeft,
    Bell,
    Sparkles,
    MessageSquare,
    AlertTriangle,
    Download,
    Eye,
    Mic,
    MicOff,
    Palette,
    AlertCircle,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import MainHeader from '@/components/MainHeader';
import { uploadChunk, finalizeUpload } from '@/app/actions/ingest';
import { getAdminCourses, toggleCourseStatus, deleteCourse, updateCourse, getCategories, createAiCourse, getAdminCourseStats } from '@/app/actions/courses';
import { generateContentSummaryAction, aiAssistantChatAction, generateDescriptionAction } from '@/app/actions/aiMock';
import { generateCoverImageAction, generateDesignCoverAction } from '@/app/actions/aiCover';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PageLoader from '@/components/PageLoader';
import DashboardLoader from '@/components/DashboardLoader';
import { useAuth } from '@/components/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';

const CourseImage = ({ src, alt, className }: { src?: string, alt: string, className?: string }) => {
    const [imgSrc, setImgSrc] = useState(src || '/assets/placeholder-course.png');

    useEffect(() => {
        setImgSrc(src?.trim() ? src : '/assets/placeholder-course.png');
    }, [src]);

    return (
        <Image
            src={imgSrc}
            alt={alt}
            fill
            className={className}
            onError={() => {
                if (imgSrc !== '/assets/placeholder-course.png') {
                    setImgSrc('/assets/placeholder-course.png');
                }
            }}
        />
    );
};

// Theme Constants
const GRADIENT_THEMES: Record<string, [string, string]> = {
    'Sunset': ['#fa709a', '#fee140'],
    'Ocean': ['#4facfe', '#00f2fe'],
    'Berry': ['#a18cd1', '#fbc2eb'],
    'Midnight': ['#2b5876', '#4e4376'],
    'Sunrise': ['#ff9a9e', '#fecfef'],
    'Mint': ['#a8ff78', '#78ffd6'],
    'Lavender': ['#e6dee9', '#afc9ff'],
    'Fire': ['#f83600', '#f9d423']
};

const SOLID_THEMES: Record<string, string> = {
    'Blue': '#3b82f6',
    'Purple': '#8b5cf6',
    'Green': '#10b981',
    'Red': '#ef4444',
    'Orange': '#f97316',
    'Slate': '#475569',
    'Teal': '#14b8a6',
    'Pink': '#ec4899'
};

export default function AdminUploadPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const chatEndRef = useRef<HTMLDivElement>(null);

    // View Mode: List vs Add
    const [viewMode, setViewMode] = useState<'list' | 'add'>('list');
    const [finalThumbnailUrl, setFinalThumbnailUrl] = useState<string | null>(null);

    // Data States
    const [adminCourses, setAdminCourses] = useState<any[]>([]);
    const [isLoadingCourses, setIsLoadingCourses] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
    const [sortOption, setSortOption] = useState('latest');
    const [assignmentFilter, setAssignmentFilter] = useState('All'); // 'All', 'Assigned', 'Not Assigned'
    const [hasMore, setHasMore] = useState(true);
    const [totalCourseCount, setTotalCourseCount] = useState(0);
    const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

    // Categories State
    const [categories, setCategories] = useState<any[]>([]);

    // Add/Edit Form States
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'review' | 'success'>('idle');
    const [file, setFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [courseTitle, setCourseTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
    const [isCompliance, setIsCompliance] = useState(false);
    const [documentNumber, setDocumentNumber] = useState('');
    const [quizQuestionCount, setQuizQuestionCount] = useState(5);
    const [quizMinScore, setQuizMinScore] = useState(80);
    const [extractedData, setExtractedData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // --- AI Feature States ---
    const [coverMode, setCoverMode] = useState<'upload' | 'gradient'>('upload');
    const [contentMode, setContentMode] = useState<'upload' | 'ai'>('upload');

    // AI Cover
    // Design Cover (Solid/Gradient)
    const [designType, setDesignType] = useState<'solid' | 'gradient'>('gradient');
    const [designTheme, setDesignTheme] = useState('Sunset');
    const [designColors, setDesignColors] = useState<string[]>(['#fa709a', '#fee140']); // Init with Sunset
    const [coverAuthor, setCoverAuthor] = useState('3Vidya');
    const [coverYear, setCoverYear] = useState(new Date().getFullYear().toString());
    const [activeTab, setActiveTab] = useState<'content' | 'cover' | 'details'>('content');
    const [isGeneratingCover, setIsGeneratingCover] = useState(false);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [generatedCoverUrl, setGeneratedCoverUrl] = useState<string | null>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [coverFontColor, setCoverFontColor] = useState('#000000');
    const [showLoader, setShowLoader] = useState(true);

    // Duplicate Error Modal
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateErrorMsg, setDuplicateErrorMsg] = useState('');

    // AI Content Assistant
    const [aiContextType, setAiContextType] = useState<'policy' | 'course' | 'library' | null>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [aiWarning, setAiWarning] = useState<string | null>(null);
    const [aiGeneratedContent, setAiGeneratedContent] = useState<string | null>(null);
    const [showAuthorDetails, setShowAuthorDetails] = useState(true);

    // Ingestion Options
    const [ingestType, setIngestType] = useState<'extract' | 'summarize'>('extract');

    // Voice Input States
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchCategoryStats = async () => {
        try {
            const res = await getAdminCourseStats();
            if (res.success && res.data) {
                const counts = categories.reduce((acc, cat) => {
                    acc[cat.id] = res.data.filter((c: any) =>
                        c.category === cat.name || c.subCategoryId === cat.id || c.subCategory?.categoryId === cat.id
                    ).length;
                    return acc;
                }, {} as Record<string, number>);
                setCategoryCounts(counts);
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchCategories();
        }
    }, [user]);

    useEffect(() => {
        if (user && categories.length > 0) {
            fetchCategoryStats();
        }
    }, [user, categories]);

    useEffect(() => {
        if (user && viewMode === 'list') {
            const delayDebounceFn = setTimeout(() => {
                fetchCourses(true);
            }, 300);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [viewMode, user, searchTerm, selectedCategoryFilter, sortOption, assignmentFilter]);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages]);

    // PDF.js worker setup
    useEffect(() => {
        const loadPdfWorker = async () => {
            const pdfjs = await import('pdfjs-dist');
            // Use local worker file from public folder for reliability
            pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        };
        loadPdfWorker();
    }, []);

    // Compliance Effect: Auto-select Policy category
    useEffect(() => {
        if (isCompliance) {
            const policyCat = categories.find(c => c.name.toLowerCase() === 'policy');
            if (policyCat) {
                setSelectedCategory(policyCat.id);
            }
        }
    }, [isCompliance, categories]);

    // Voice Recognition Setup
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognitionInstance = new SpeechRecognition();
                recognitionInstance.continuous = true;
                recognitionInstance.interimResults = true;
                recognitionInstance.lang = 'en-US';

                recognitionInstance.onresult = (event: any) => {
                    const transcript = Array.from(event.results)
                        .map((result: any) => result[0])
                        .map((result: any) => result.transcript)
                        .join('');

                    setChatInput(transcript);

                    // Clear existing silence timer
                    if (silenceTimerRef.current) {
                        clearTimeout(silenceTimerRef.current);
                    }

                    // Set new silence timer (auto-send after 2 seconds of silence)
                    silenceTimerRef.current = setTimeout(() => {
                        if (transcript.trim()) {
                            recognitionInstance.stop();
                            setIsListening(false);
                            // Trigger send
                            setTimeout(() => {
                                const sendBtn = document.getElementById('voice-send-btn');
                                if (sendBtn) sendBtn.click();
                            }, 100);
                        }
                    }, 2000);
                };

                recognitionInstance.onerror = (event: any) => {
                    console.error('Speech recognition error:', event.error);
                    setIsListening(false);
                };

                recognitionInstance.onend = () => {
                    setIsListening(false);
                };

                setRecognition(recognitionInstance);
            }
        }

        return () => {
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
        };
    }, []);



    const fetchCategories = async () => {
        try {
            const res = await getCategories();
            if (res.success) {
                setCategories(res.data || []);
            } else {
                console.error("Failed to fetch categories:", res.error);
            }
        } catch (error) {
            console.error("Critical error fetching categories:", error);
        }
    };

    const fetchCourses = async (reset = false) => {
        if (reset) setIsLoadingCourses(true);
        try {
            const currentOffset = reset ? 0 : adminCourses.length;
            const res = await getAdminCourses({
                limit: 10,
                offset: currentOffset,
                search: searchTerm,
                categoryFilter: selectedCategoryFilter,
                assignmentFilter,
                sortOption
            });
            if (res.success) {
                if (reset) {
                    setAdminCourses(res.data || []);
                } else {
                    setAdminCourses(prev => [...prev, ...(res.data || [])]);
                }
                setHasMore(res.hasMore || false);
                setTotalCourseCount(res.totalCount || 0);
            } else {
                console.error("Failed to fetch courses:", res.error);
            }
        } catch (error) {
            console.error("Critical error fetching courses:", error);
        } finally {
            setIsLoadingCourses(false);
        }
    };





    const generateCoverFromPdf = async (file: File): Promise<File | null> => {
        try {
            const pdfjs = await import('pdfjs-dist');
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjs.getDocument(arrayBuffer);
            const pdf = await loadingTask.promise;

            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1.5 }); // 1.5x scale for decent quality

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (!context) return null;

            await page.render({ canvasContext: context, viewport: viewport } as any).promise;

            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        const coverFile = new File([blob], "cover-generated.png", { type: "image/png" });
                        resolve(coverFile);
                    } else {
                        resolve(null);
                    }
                }, 'image/png');
            });

        } catch (e) {
            console.error("PDF Cover Gen Error", e);
            return null;
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setError(null);

            // Auto-set title if empty
            if (!courseTitle) {
                const name = selectedFile.name.replace(/\.[^/.]+$/, "");
                const formattedTitle = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                setCourseTitle(formattedTitle);

                // Auto-generate description based on the new title
                if (!description) {
                    handleGenerateDescription(formattedTitle);
                }
            }

            // Auto-Generate Cover for PDF (Only if in Upload Mode and no existing cover)
            if (coverMode === 'upload' && !coverPreview && selectedFile.type === 'application/pdf') {
                const generatedCover = await generateCoverFromPdf(selectedFile);
                if (generatedCover) {
                    setCoverFile(generatedCover);
                    setCoverPreview(URL.createObjectURL(generatedCover));
                }
            }
        }
    };

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setCoverFile(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    // Design Cover Generation
    const handleGenerateCover = async () => {
        if (!courseTitle) {
            setError("Please enter a Title first.");
            return;
        }
        if (showAuthorDetails && (!coverAuthor.trim() || !coverYear.trim())) {
            setError("Author and Year are required.");
            return;
        }

        setIsGeneratingCover(true);
        setError(null);
        try {
            // Clean title
            // Clean title (Preserve newlines)
            const cleanTitle = courseTitle.trim();
            const res = await generateDesignCoverAction({
                title: cleanTitle,
                theme: designTheme,
                colors: designColors,
                type: designType,
                author: showAuthorDetails ? coverAuthor : '',
                year: showAuthorDetails ? coverYear : '',
                fontColor: coverFontColor
            });

            if (res.success && res.url) {
                setGeneratedCoverUrl(res.url);
                setCoverPreview(res.url);
            } else {
                setError(res.message || "Failed to generate cover.");
            }
        } catch (e: any) {
            console.error("Cover Gen Error:", e.message);
            setError("Failed to generate cover due to an unexpected error.");
        }
        setIsGeneratingCover(false);
    };

    const handleGenerateDescription = async (titleOverride?: string) => {
        const titleToUse = titleOverride || courseTitle;
        if (!titleToUse) {
            setError('Please enter a title to generate a description');
            return;
        }
        setIsGeneratingDescription(true);
        try {
            const result = await generateDescriptionAction(titleToUse);
            if (result.success) {
                if (result.description) setDescription(result.description);
            }
        } catch (err) {
            console.error("Failed to generate description", err);
            setError('Failed to generate description');
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    // AI Chat Handler
    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;

        const newUserMsg = { role: 'user', content: chatInput };
        const newHistory = [...chatMessages, newUserMsg];
        setChatMessages(newHistory);
        setChatInput('');
        setIsChatLoading(true);
        setAiWarning(null);

        try {
            const res = await aiAssistantChatAction(newHistory, aiContextType || 'details');

            if (res.success) {
                setChatMessages([...newHistory, { role: 'assistant', content: res.message }]);
                // If it's a final structured output (mocked logic), we could set it as generated content
                // For now, if the assistant provides a "draft", we can assume the last message is the content
                // Auto-generated content processing
                setAiGeneratedContent(res.message);

                // Auto-Extract Title and Description if not set
                if (res.message) {
                    const lines = res.message.split('\n');
                    const firstLine = lines[0].replace(/^#+\s*/, '').trim(); // Remove markdown headers

                    if (firstLine && !courseTitle) {
                        setCourseTitle(firstLine);
                        // Try to find description (first paragraph after title)
                        const remaining = lines.slice(1).join('\n').trim();
                        const firstPara = remaining.split('\n\n')[0].replace(/^[#*-]+\s*/, '').trim();
                        if (firstPara && !description) {
                            setDescription(firstPara.substring(0, 200) + (firstPara.length > 200 ? '...' : ''));
                        }
                    }
                }
                if (res.isWarning) setAiWarning(res.message); // If warning, show it
            } else {
                if (res.isWarning) {
                    setChatMessages([...newHistory, { role: 'assistant', content: res.message, isWarning: true }]);
                    setAiWarning(res.message);
                }
            }
        } catch (e) {
            console.error(e);
        }
        setIsChatLoading(false);
    };



    const toggleVoiceInput = () => {
        if (!recognition) {
            alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
            return;
        }

        if (isListening) {
            recognition.stop();
            setIsListening(false);
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
        } else {
            setChatInput(''); // Clear input before starting
            recognition.start();
            setIsListening(true);
        }
    };

    const startAiWizard = (type: 'policy' | 'course' | 'library') => {
        setAiContextType(type);
        setChatMessages([{ role: 'assistant', content: `I'm ready to help you create a ${type}. What are the key details or main topic?` }]);
        setAiGeneratedContent(null);

        // Auto-select category based on type
        // This ensures the rest of the form works correctly (saving, etc.)
        const targetCat = categories.find(c => c.name.toLowerCase().includes(type));
        if (targetCat) {
            setSelectedCategory(targetCat.id);
            setSelectedSubCategory(''); // Reset sub-category
        }
    };

    const resetForm = () => {
        setFile(null);
        setCoverFile(null);
        setCoverPreview(null);
        setCourseTitle('');
        setDescription('');
        setSelectedCategory('');
        setSelectedSubCategory('');
        setIsCompliance(false);
        setDocumentNumber('');
        setQuizQuestionCount(5);
        setQuizMinScore(80);
        setIsEditing(false);
        setEditingId(null);
        setStatus('idle');
        setExtractedData(null);
        setError(null);

        // AI Resets
        setCoverMode('upload');
        setContentMode('upload');
        setGeneratedCoverUrl(null);
        setAiContextType(null);
        setChatMessages([]);
        setAiGeneratedContent(null);
        setIngestType('extract');

        // Reset design cover to defaults
        setDesignType('gradient');
        setDesignTheme('Sunset');
        setDesignColors(GRADIENT_THEMES['Sunset']);
    };

    const handleEditClick = (course: any) => {
        setIsEditing(true);
        setEditingId(course.id);
        const name = course.title;
        setCourseTitle(name);
        setDescription(course.description || '');
        setIsCompliance(course.isCompliance || false);
        setDocumentNumber(course.documentNumber || '');
        setQuizQuestionCount(course.quizQuestionCount || 5);
        setQuizMinScore(course.quizMinScore || 80);

        // Map category properly
        if (course.subCategory) {
            setSelectedSubCategory(course.subCategory.id);
            setSelectedCategory(course.subCategory.categoryId);
        } else {
            // Unmapped or Legacy
            const cat = categories.find(c => c.name === course.category);
            if (cat) setSelectedCategory(cat.id);
            else setSelectedCategory(course.category || '');
            setSelectedSubCategory('');
        }

        setCoverPreview(course.thumbnail);
        setViewMode('add');
    };

    const handleDelete = async (courseId: string) => {
        if (confirm("Are you sure you want to delete this course?")) {
            await deleteCourse(courseId);
            fetchCourses();
        }
    };

    const handleToggleActive = async (courseId: string, currentStatus: boolean) => {
        await toggleCourseStatus(courseId, !currentStatus);
        fetchCourses();
    };

    const startUpload = async () => {
        // Validation
        const errors: string[] = [];
        if (!courseTitle) errors.push("Title");
        if (!selectedCategory) errors.push("Category");
        // For Edit mode, file and cover are optional if they already exist
        // For AI modes, verify we have content
        if (!isEditing) {
            if (coverMode === 'upload' && !coverFile) errors.push("Cover Image");
            if (coverMode === 'gradient' && !generatedCoverUrl) errors.push("Generated Cover");

            if (contentMode === 'upload' && !file) errors.push("Document/Video");
            if (contentMode === 'ai' && !aiGeneratedContent) errors.push("AI Content");
        }

        if (errors.length > 0) {
            setError(`Please complete: ${errors.join(', ')}.`);
            return;
        }

        setStatus('uploading');
        setProgress(0);
        setError(null);

        try {
            let thumbnailUrl = "";

            // 1. Handle Cover Image
            // 1. Handle Cover Image
            if (coverMode === 'gradient' && generatedCoverUrl) {
                thumbnailUrl = generatedCoverUrl;
            } else if (coverFile) {
                const coverFormData = new FormData();
                coverFormData.append('file', coverFile);
                try {
                    const imgRes = await fetch('/api/upload/image', { method: 'POST', body: coverFormData });
                    if (!imgRes.ok) throw new Error("Failed to upload cover image");
                    const imgData = await imgRes.json();
                    thumbnailUrl = imgData.url;
                } catch (err: any) {
                    setError(`Cover Fail: ${err.message}`);
                    setStatus('idle');
                    return;
                }
            } else if (coverPreview && coverPreview.startsWith('http')) {
                thumbnailUrl = coverPreview; // Keep existing if valid URL
            }

            // Find category name
            const catObj = categories.find(c => c.id === selectedCategory);
            const categoryName = catObj ? catObj.name : selectedCategory;

            // 2. Prepare Final Data Object (Pre-computation)
            const baseData = {
                title: courseTitle,
                description,
                categoryName,
                subCategoryId: selectedSubCategory || undefined,
                thumbnailUrl,
                isActive: true,
                isCompliance: isCompliance,
                documentNumber: isCompliance ? documentNumber : undefined,
                quizQuestionCount: isCompliance ? quizQuestionCount : undefined,
                quizMinScore: isCompliance ? quizMinScore : undefined
            };

            // 3. Handle Content Ingestion
            setFinalThumbnailUrl(thumbnailUrl);

            if (contentMode === 'ai' && aiGeneratedContent) {
                // AI Content Flow
                setStatus('processing');

                // Simulate processing of AI content
                await new Promise(resolve => setTimeout(resolve, 1000));

                // If AI Generated, we treat it as "extracted data" directly?
                // Or create a text file?
                // Ideally backend accepts text content. We will simulate extractedData.
                setExtractedData({
                    summary: aiGeneratedContent,
                    topics: ["AI Generated Topic 1", "AI Generated Topic 2"]
                });

                // Go to review if Summarize was requested or just AI content default review
                if (ingestType === 'summarize' || contentMode === 'ai') {
                    setStatus('review');
                    return; // Stop here, user must approve
                }

            } else if (file) {
                // Standard Upload Flow
                const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB
                const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
                const fileId = `${Date.now()}-${file.name}`;

                for (let i = 0; i < totalChunks; i++) {
                    const start = i * CHUNK_SIZE;
                    const end = Math.min(file.size, start + CHUNK_SIZE);
                    const chunk = file.slice(start, end);

                    const formData = new FormData();
                    formData.append('fileId', fileId);
                    formData.append('chunkIndex', i.toString());
                    formData.append('chunk', chunk);

                    const res = await uploadChunk(formData);
                    if (!res.success) throw new Error(res.error);

                    setProgress(Math.round(((i + 1) / totalChunks) * 100));
                }

                // Finalize
                setStatus('processing');
                const finalFormData = new FormData();
                finalFormData.append('fileId', fileId);
                finalFormData.append('fileName', file.name);
                finalFormData.append('category', categoryName);
                finalFormData.append('subCategoryId', selectedSubCategory);
                finalFormData.append('title', courseTitle);
                finalFormData.append('description', description);
                finalFormData.append('thumbnailUrl', thumbnailUrl || "");
                finalFormData.append('isCompliance', isCompliance.toString());
                if (isCompliance) {
                    if (documentNumber) finalFormData.append('documentNumber', documentNumber);
                    finalFormData.append('quizQuestionCount', quizQuestionCount.toString());
                    finalFormData.append('quizMinScore', quizMinScore.toString());
                }

                // If Ingest Type is Summarize, we trigger that action?
                // The 'finalizeUpload' usually extracts.
                // If we want AI summary, we might call mock action HERE.

                const ingestRes = await finalizeUpload(finalFormData);
                if (ingestRes.success) {
                    let finalExtracted = ingestRes.data;

                    if (ingestType === 'summarize') {
                        // Enhance with AI Summary
                        const summaryRes = await generateContentSummaryAction({ title: courseTitle });
                        if (summaryRes.success) {
                            finalExtracted = { ...finalExtracted, summary: summaryRes.summary } as any;
                        }
                    }

                    setExtractedData(finalExtracted);

                    // If Summarize/AI -> Review Mode
                    if (ingestType === 'summarize') {
                        setStatus('review');
                        return;
                    }

                    setStatus('success');
                    handleRefresh();
                } else {
                    // Check for duplicate content error
                    if (ingestRes.error && ingestRes.error.toLowerCase().includes("already exists")) {
                        setDuplicateErrorMsg(ingestRes.error);
                        setShowDuplicateModal(true);
                        setStatus('idle');
                        return;
                    }
                    throw new Error(ingestRes.error);
                }
            } else if (isEditing && editingId) {
                // Metadata Update Only including Cover
                const res = await updateCourse(editingId, baseData);

                if (!res.success) throw new Error(res.error);

                setStatus('success');
                handleRefresh();
            }

        } catch (e: any) {
            console.error(e);
            setError(e.message || "An error occurred during upload.");
            setStatus('idle');
        }
    };

    // Final Approval from Review Mode
    const handleApproveContent = async () => {
        if (contentMode === 'ai' && aiGeneratedContent) {
            setStatus('processing');
            try {
                // Determine Category ID vs Name
                // We likely have selectedCategory ID
                const catObj = categories.find(c => c.id === selectedCategory);
                const catName = catObj ? catObj.name : "General";

                const aiData = {
                    title: courseTitle || "AI Generated Course",
                    description: description || "No description provided.",
                    categoryName: catName,
                    subCategoryId: selectedSubCategory,
                    thumbnailUrl: generatedCoverUrl || finalThumbnailUrl,
                    isActive: true,
                    isCompliance: isCompliance,
                    documentNumber: isCompliance ? documentNumber : undefined,
                    quizQuestionCount: isCompliance ? quizQuestionCount : undefined,
                    quizMinScore: isCompliance ? quizMinScore : undefined,
                    aiContent: aiGeneratedContent
                };

                const res = await createAiCourse(aiData, user?.id || ''); // user.id from useAuth hook

                if (res.success) {
                    setStatus('success');
                    handleRefresh();
                } else {
                    setError(res.error || "Failed to save AI course.");
                    setStatus('review'); // Go back to review on error
                }
            } catch (e: any) {
                console.error(e);
                setError(e.message || "An unexpected error occurred.");
                setStatus('review');
            }
        } else {
            // Standard Flow (already handled or extracted)
            setStatus('success');
            handleRefresh();
        }
    };

    // Filter & Sort Helper
    const paginatedCourses = adminCourses;
    const totalCount = totalCourseCount;

    const currentSubCategories = selectedCategory
        ? categories.find(c => c.id === selectedCategory)?.subCategories || []
        : [];

    const handleRefresh = () => {
        fetchCourses(true);
        fetchCategoryStats();
    };

    return (
        <div className="h-screen bg-slate-50 flex flex-col overflow-hidden relative">
            <AnimatePresence>
                {(authLoading || (isLoadingCourses && viewMode === 'list' && adminCourses.length === 0) || showLoader) && (
                    <DashboardLoader
                        key="loader"
                        isLoading={isLoadingCourses && viewMode === 'list' && adminCourses.length === 0}
                        message="Loading admin data..."
                        onFinish={() => setShowLoader(false)}
                    />
                )}
            </AnimatePresence>
            {/* Header */}
            {/* Header */}
            <MainHeader />

            {/* Sub-Header */}
            <div className="bg-white border-b border-slate-200 shadow-sm sticky top-16 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Shield className="h-6 w-6 text-cyan-600" />
                        <h1 className="text-xl font-bold text-slate-900">Content Master</h1>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-full relative">
                        <button onClick={() => setViewMode('list')} className={cn("relative z-10 px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300", viewMode === 'list' ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-700")}>Existing Content</button>
                        <button onClick={() => { setViewMode('add'); resetForm(); }} className={cn("relative z-10 px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300", viewMode === 'add' ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-700")}>{isEditing ? 'Edit Content' : 'Add New'}</button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                {/* LIST VIEW */}
                {viewMode === 'list' && (
                    <>
                        <div className="flex-none">
                            {/* Category Tabs */}
                            <div className="mb-6 flex overflow-x-auto pb-2 scrollbar-hide gap-2">
                                <button
                                    onClick={() => setSelectedCategoryFilter('All')}
                                    className={cn(
                                        "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
                                        selectedCategoryFilter === 'All'
                                            ? "bg-slate-900 text-white border-slate-900 shadow-md"
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                    )}
                                >
                                    All Content <span className={cn("ml-2 text-xs py-0.5 px-2 rounded-full", selectedCategoryFilter === 'All' ? "bg-white/20" : "bg-slate-100 text-slate-600")}>{totalCount}</span>
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategoryFilter(cat.id)}
                                        className={cn(
                                            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
                                            selectedCategoryFilter === cat.id
                                                ? "bg-slate-900 text-white border-slate-900 shadow-md"
                                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                        )}
                                    >
                                        {cat.name} <span className={cn("ml-2 text-xs py-0.5 px-2 rounded-full", selectedCategoryFilter === cat.id ? "bg-white/20" : "bg-slate-100 text-slate-600")}>{categoryCounts[cat.id] || 0}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Filters */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-center justify-between">
                                <div className="relative flex-1 min-w-[250px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <input type="text" placeholder="Search content..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none" />
                                </div>
                                <div className="flex items-center gap-3 overflow-x-auto">
                                    {/* Status Filter */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-500 whitespace-nowrap">Status:</span>
                                        <select
                                            value={assignmentFilter}
                                            onChange={(e) => setAssignmentFilter(e.target.value)}
                                            className="pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none bg-white cursor-pointer hover:border-cyan-400 transition-colors"
                                        >
                                            <option value="All">All Status</option>
                                            <option value="Assigned">Assigned</option>
                                            <option value="Not Assigned">Not Assigned</option>
                                        </select>
                                    </div>

                                    <div className="h-6 w-px bg-slate-200 mx-1"></div>

                                    {/* Sort */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-500 whitespace-nowrap">Sort by:</span>
                                        <select
                                            value={sortOption}
                                            onChange={(e) => setSortOption(e.target.value)}
                                            className="pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none bg-white cursor-pointer hover:border-cyan-400 transition-colors"
                                        >
                                            <option value="latest">Latest</option>
                                            <option value="oldest">Older</option>
                                            <option value="a_z">A-Z</option>
                                            <option value="z_a">Z-A</option>
                                            <option value="most_assigned">Most Assigned</option>
                                            <option value="least_assigned">Least Assigned</option>
                                        </select>
                                    </div>
                                    <button onClick={handleRefresh} className="p-2 text-slate-500 hover:text-cyan-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"><RefreshCw className={cn("h-5 w-5", isLoadingCourses && "animate-spin")} /></button>
                                </div>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="flex-1 overflow-y-auto scrollbar-hover pr-2 min-h-0 animate-in fade-in slide-in-from-bottom-4">
                            {isLoadingCourses ? (
                                <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-cyan-600" /></div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
                                    {paginatedCourses.map((course) => (
                                        <div key={course.id} className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col">
                                            <div className="relative h-48 w-full bg-slate-100">
                                                <CourseImage src={course.thumbnail} alt={course.title} className="object-contain" />
                                                <div className="absolute top-3 left-3"><span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase backdrop-blur-md", course.isActive ? "bg-green-500/90 text-white" : "bg-slate-500/90 text-white")}>{course.isActive ? 'Active' : 'Inactive'}</span></div>
                                            </div>
                                            <div className="p-5 flex-1 flex flex-col">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={cn("text-xs font-semibold px-2 py-1 rounded-md mb-2", course.isCompliance ? "bg-amber-100 text-amber-800" : "text-cyan-600 bg-cyan-50")}>{course.subCategory?.category?.name || course.category}</span>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleToggleActive(course.id, course.isActive)} className="p-1.5 hover:bg-slate-100 rounded-md" title={course.isActive ? "Deactivate" : "Activate"}><Power className="h-4 w-4 text-slate-400" /></button>
                                                        <button onClick={() => handleEditClick(course)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-md" title="Edit"><Edit className="h-4 w-4" /></button>
                                                        <button onClick={() => handleDelete(course.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded-md" title="Delete"><Trash2 className="h-4 w-4" /></button>
                                                    </div>
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">{course.title}</h3>
                                                <p className="text-sm text-slate-500 mb-4 line-clamp-3">{course.description || "No description."}</p>

                                                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                                    <span className={cn("text-xs font-medium", (course._count?.enrollments || 0) > 0 ? "text-slate-600" : "text-slate-400 italic")}>
                                                        {(course._count?.enrollments || 0) > 0
                                                            ? `Assigned: ${course._count.enrollments} ${course._count.enrollments === 1 ? 'user' : 'users'}`
                                                            : 'Not Assigned'}
                                                    </span>
                                                    <Link href={`/learn/${course.id}?preview=true`} className="text-sm font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 transition-colors group-hover:translate-x-1 duration-300">
                                                        Preview <ArrowRight className="h-4 w-4" />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* Pagination Controls */}
                            {hasMore && (
                                <div className="bg-transparent mt-6 flex justify-center pb-4">
                                    <button
                                        onClick={() => fetchCourses(false)}
                                        className="px-6 py-2 border-2 border-slate-300 text-slate-700 font-bold rounded-full hover:bg-slate-100 hover:text-cyan-700 transition-all flex items-center gap-2"
                                    >
                                        <ArrowRight className="h-4 w-4" /> Load More Courses
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ADD VIEW */}
                {viewMode === 'add' && (
                    <div className="flex-1 overflow-y-auto scrollbar-hover pr-2 animate-in fade-in slide-in-from-bottom-4">
                        {(status === 'idle' || status === 'review') ? (
                            <div className="flex flex-col gap-6 max-w-5xl mx-auto">
                                {/* Main Form */}
                                {status === 'idle' && (
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                                        {isEditing && (
                                            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                                <h3 className="font-bold text-lg text-slate-800">Edit: {courseTitle}</h3>
                                            </div>
                                        )}

                                        {/* TAB NAVIGATION */}
                                        <div className="flex items-center gap-2 mb-6 bg-slate-50/50 p-1 rounded-xl border border-slate-100">
                                            {['content', 'cover', 'details'].map((tab) => {
                                                const isActive = activeTab === tab;
                                                const isCompleted = (tab === 'content' && (file || aiGeneratedContent)) || (tab === 'cover' && (coverFile || generatedCoverUrl || coverPreview));

                                                return (
                                                    <button
                                                        key={tab}
                                                        onClick={() => setActiveTab(tab as any)}
                                                        className={cn(
                                                            "flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
                                                            isActive
                                                                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md"
                                                                : "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                                        )}
                                                    >
                                                        {isCompleted && !isActive && <CheckCircle className="h-4 w-4 text-green-500" />}
                                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* DETAIL TAB CONTENT */}
                                        {activeTab === 'details' && (
                                            <>
                                                {/* Title & Basics */}
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                                            <textarea
                                                                value={courseTitle}
                                                                onChange={(e) => setCourseTitle(e.target.value)}
                                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
                                                                placeholder="e.g. Sales Mastery (Press Enter for new line)"
                                                                rows={2}
                                                            />
                                                        </div>
                                                        <div className="flex items-end">
                                                            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 w-full">
                                                                <input type="checkbox" checked={isCompliance} onChange={(e) => setIsCompliance(e.target.checked)} className="h-5 w-5 text-cyan-600" />
                                                                <label className="text-sm font-medium text-slate-700">Mark as Compliance/Policy</label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isCompliance && (
                                                        <div className="space-y-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                                                            <div>
                                                                <label className="block text-sm font-medium text-slate-700 mb-1">Document Number</label>
                                                                <input type="text" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg font-mono text-sm" placeholder="POL-001" />
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-slate-700 mb-1">No. of Questions</label>
                                                                    <select
                                                                        value={quizQuestionCount}
                                                                        onChange={(e) => setQuizQuestionCount(parseInt(e.target.value))}
                                                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none bg-white"
                                                                    >
                                                                        <option value={5}>5 Questions</option>
                                                                        <option value={10}>10 Questions</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Pass Percentage (%)</label>
                                                                    <div className="relative">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max="100"
                                                                            value={isNaN(quizMinScore) ? '' : quizMinScore}
                                                                            onChange={(e) => {
                                                                                const val = parseInt(e.target.value);
                                                                                setQuizMinScore(isNaN(val) ? 0 : val);
                                                                            }}
                                                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                                                                        />
                                                                        <span className="absolute right-3 top-2 text-slate-400">%</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="flex justify-between items-center mb-1">
                                                            <label className="block text-sm font-medium text-slate-700">Description</label>
                                                            <button
                                                                onClick={() => handleGenerateDescription()}
                                                                disabled={isGeneratingDescription || !courseTitle}
                                                                className="text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-md transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title="Generate description based on title"
                                                            >
                                                                {isGeneratingDescription ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                                                Scan Title & Assist
                                                            </button>
                                                        </div>
                                                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none" rows={2} placeholder="Brief summary of the content..." />
                                                    </div>
                                                </div>

                                                {/* Categories */}
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                                                    <div className="flex flex-wrap gap-2 mb-4">
                                                        {categories.map((cat: any) => {
                                                            const isPolicy = cat.name.toLowerCase() === 'policy';
                                                            const isDisabled = isCompliance && !isPolicy;
                                                            return (
                                                                <button key={cat.id} onClick={() => { if (!isDisabled) { setSelectedCategory(cat.id); setSelectedSubCategory(''); } }} disabled={isDisabled}
                                                                    className={cn("px-4 py-2 rounded-lg text-sm font-medium border transition-all", selectedCategory === cat.id ? "bg-cyan-50 border-cyan-500 text-cyan-700 ring-1 ring-cyan-500" : isDisabled ? "bg-slate-50 text-slate-300 cursor-not-allowed" : "bg-white text-slate-600 hover:border-cyan-300")}>
                                                                    {cat.name}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    {selectedCategory && currentSubCategories.length > 0 && (
                                                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Sub-Category</label>
                                                            <div className="flex flex-wrap gap-2">
                                                                {currentSubCategories.map((sub: any) => (
                                                                    <button key={sub.id} onClick={() => setSelectedSubCategory(sub.id)} className={cn("px-3 py-1.5 rounded-md text-sm border", selectedSubCategory === sub.id ? "bg-white border-cyan-500 text-cyan-700 shadow-sm" : "bg-transparent border-transparent text-slate-600")}>{sub.name}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}

                                        {/* COVER IMAGE TAB CONTENT */}
                                        {activeTab === 'cover' && (
                                            <div className="pt-2">
                                                <div className="flex gap-0 mb-4 bg-slate-100 p-1 rounded-lg w-max">
                                                    <button onClick={() => setCoverMode('upload')} className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", coverMode === 'upload' ? "bg-white shadow-sm text-slate-900" : "text-slate-500")}>Upload File</button>
                                                    <button onClick={() => setCoverMode('gradient')} className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2", coverMode === 'gradient' ? "bg-white shadow-sm text-pink-600" : "text-slate-500")}><Palette className="h-3 w-3" /> Gradient</button>
                                                </div>

                                                {coverMode === 'upload' && (
                                                    <div className={cn("relative w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50", coverFile ? "border-cyan-500 bg-cyan-50" : "border-slate-300 hover:border-cyan-400")}>
                                                        <input type="file" accept="image/*" onChange={handleCoverChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                        {!coverPreview ? (
                                                            <div className="text-center p-6">
                                                                <ImageIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                                                                <p className="text-sm font-medium text-slate-600">Click to upload or drag & drop</p>
                                                                <p className="text-xs text-slate-400 mt-1">Recommend 16:9 ratio</p>
                                                            </div>
                                                        ) : (
                                                            <CourseImage src={coverPreview} alt="Cover Preview" className="object-cover rounded-lg" />
                                                        )}
                                                    </div>
                                                )}



                                                {coverMode === 'gradient' && (
                                                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                                        {/* Type Selector */}
                                                        <div className="flex gap-4 mb-6">
                                                            <button onClick={() => setDesignType('solid')} className={cn("px-4 py-2 rounded-lg text-sm font-bold border transition-all", designType === 'solid' ? "bg-white border-slate-300 shadow-sm text-slate-900" : "bg-transparent border-transparent text-slate-500")}>Solid Color</button>
                                                            <button onClick={() => setDesignType('gradient')} className={cn("px-4 py-2 rounded-lg text-sm font-bold border transition-all", designType === 'gradient' ? "bg-white border-slate-300 shadow-sm text-slate-900" : "bg-transparent border-transparent text-slate-500")}>Gradient</button>
                                                        </div>

                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                                                            Select Design {designTheme === 'Custom' && <span className="text-cyan-600 ml-2">(Custom)</span>}
                                                        </label>
                                                        <div className="flex flex-wrap gap-3 mb-6">
                                                            {/* Render Presets */}
                                                            {designType === 'gradient' ?
                                                                Object.entries(GRADIENT_THEMES).map(([name, colors]) => (
                                                                    <button
                                                                        key={name}
                                                                        onClick={() => {
                                                                            setDesignTheme(name);
                                                                            setDesignColors(colors);
                                                                        }}
                                                                        className={cn(
                                                                            "px-4 py-2 rounded-lg text-sm font-bold border-2 transition-all flex items-center gap-2",
                                                                            designTheme === name
                                                                                ? "border-slate-800 bg-white shadow-md text-slate-900"
                                                                                : "border-transparent bg-slate-200 text-slate-600 hover:bg-slate-300"
                                                                        )}
                                                                    >
                                                                        <div className="h-3 w-3 rounded-full" style={{ background: `linear-gradient(to bottom right, ${colors[0]}, ${colors[1]})` }} />
                                                                        {name}
                                                                    </button>
                                                                ))
                                                                :
                                                                Object.entries(SOLID_THEMES).map(([name, color]) => (
                                                                    <button
                                                                        key={name}
                                                                        onClick={() => {
                                                                            setDesignTheme(name);
                                                                            setDesignColors([color]);
                                                                        }}
                                                                        className={cn(
                                                                            "px-4 py-2 rounded-lg text-sm font-bold border-2 transition-all flex items-center gap-2",
                                                                            designTheme === name
                                                                                ? "border-slate-800 bg-white shadow-md text-slate-900"
                                                                                : "border-transparent bg-slate-200 text-slate-600 hover:bg-slate-300"
                                                                        )}
                                                                    >
                                                                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                                                                        {name}
                                                                    </button>
                                                                ))
                                                            }

                                                            {/* Custom Button */}
                                                            <button
                                                                onClick={() => setDesignTheme('Custom')}
                                                                className={cn(
                                                                    "px-4 py-2 rounded-lg text-sm font-bold border-2 transition-all flex items-center gap-2",
                                                                    designTheme === 'Custom'
                                                                        ? "border-slate-800 bg-white shadow-md text-slate-900"
                                                                        : "border-transparent bg-slate-200 text-slate-600 hover:bg-slate-300"
                                                                )}
                                                            >
                                                                <div className="h-3 w-3 rounded-full bg-gradient-to-br from-gray-400 to-gray-600" />
                                                                Custom
                                                            </button>
                                                        </div>

                                                        {/* Custom Color Pickers */}
                                                        {designTheme === 'Custom' && (
                                                            <div className="mb-6 p-4 bg-slate-100 rounded-lg border border-slate-200">
                                                                <div className="text-xs font-bold text-slate-500 uppercase mb-2">Pick Colors</div>
                                                                <div className="flex gap-4 items-center">
                                                                    {designType === 'solid' ? (
                                                                        <div>
                                                                            <label className="text-xs text-slate-500 mr-2">Color</label>
                                                                            <input
                                                                                type="color"
                                                                                value={designColors[0] || '#000000'}
                                                                                onChange={(e) => setDesignColors([e.target.value])}
                                                                                className="h-8 w-16 p-0 border-0 rounded cursor-pointer"
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            <div>
                                                                                <label className="text-xs text-slate-500 mr-2">Start</label>
                                                                                <input
                                                                                    type="color"
                                                                                    value={designColors[0] || '#fa709a'}
                                                                                    onChange={(e) => setDesignColors([e.target.value, designColors[1] || '#fee140'])}
                                                                                    className="h-8 w-16 p-0 border-0 rounded cursor-pointer"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-xs text-slate-500 mr-2">End</label>
                                                                                <input
                                                                                    type="color"
                                                                                    value={designColors[1] || '#fee140'}
                                                                                    onChange={(e) => setDesignColors([designColors[0] || '#fa709a', e.target.value])}
                                                                                    className="h-8 w-16 p-0 border-0 rounded cursor-pointer"
                                                                                />
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Font Color Picker */}
                                                        <div className="mb-6 p-4 bg-slate-100 rounded-lg border border-slate-200">
                                                            <div className="text-xs font-bold text-slate-500 uppercase mb-2">Font Color</div>
                                                            <div className="flex gap-4 items-center">
                                                                <div>
                                                                    <label className="text-xs text-slate-500 mr-2">Color</label>
                                                                    <input
                                                                        type="color"
                                                                        value={coverFontColor}
                                                                        onChange={(e) => setCoverFontColor(e.target.value)}
                                                                        className="h-8 w-16 p-0 border-0 rounded cursor-pointer"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 mb-4">
                                                            <input type="checkbox" checked={showAuthorDetails} onChange={(e) => setShowAuthorDetails(e.target.checked)} className="h-4 w-4 text-cyan-600 rounded cursor-pointer" id="showDetails" />
                                                            <label htmlFor="showDetails" className="text-sm font-medium text-slate-700 cursor-pointer">Show Author Details on Cover</label>
                                                        </div>

                                                        {showAuthorDetails && (
                                                            <div className="grid grid-cols-2 gap-4 mb-6">
                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Author</label>
                                                                    <input type="text" value={coverAuthor} onChange={(e) => setCoverAuthor(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="3Vidya" />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Published Year</label>
                                                                    <input type="text" value={coverYear} onChange={(e) => setCoverYear(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="2026" />
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="flex justify-end">
                                                            <button onClick={handleGenerateCover} disabled={isGeneratingCover} className="px-6 py-2 bg-pink-600 text-white rounded-lg font-bold hover:bg-pink-700 transition-colors flex items-center gap-2 disabled:opacity-50">
                                                                {isGeneratingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Palette className="h-4 w-4" />}
                                                                Generate Cover
                                                            </button>
                                                        </div>

                                                        {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</div>}

                                                        {generatedCoverUrl && (
                                                            <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-200 mt-4 shadow-sm group">
                                                                <Image src={generatedCoverUrl} alt="Generated Cover" fill className="object-cover" />
                                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <p className="text-white text-xs font-medium">Gradient Generated Locally</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* CONTENT TAB CONTENT */}
                                        {activeTab === 'content' && (
                                            <div className="pt-2">

                                                <div className="flex gap-0 mb-4 bg-slate-100 p-1 rounded-lg w-max">
                                                    <button onClick={() => setContentMode('upload')} className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", contentMode === 'upload' ? "bg-white shadow-sm text-slate-900" : "text-slate-500")}>Upload File</button>
                                                    <button
                                                        onClick={() => setContentMode('ai')}
                                                        className={cn(
                                                            "px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                                                            contentMode === 'ai' ? "bg-white shadow-sm text-purple-600" : "text-slate-500",
                                                            "hover:text-purple-600 hover:bg-white"
                                                        )}
                                                        title="AI Content Assistant"
                                                    >
                                                        <Bot className="h-3 w-3" /> AI Assistant
                                                    </button>
                                                </div>

                                                {
                                                    contentMode === 'upload' && (
                                                        <div className="space-y-4">
                                                            <div className={cn("relative w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50", file ? "border-cyan-500 bg-cyan-50" : "border-slate-300 hover:border-cyan-400 group")}>
                                                                {!file && <input type="file" accept=".pdf,.docx,.mp4,.webm,.mov" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />}
                                                                {file ? (
                                                                    <div className="relative z-20 w-full h-full flex flex-col items-center justify-center">
                                                                        <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors z-30" title="Remove File">
                                                                            <X className="h-5 w-5" />
                                                                        </button>
                                                                        <FileText className="h-12 w-12 text-cyan-600 mb-2" />
                                                                        <p className="text-sm font-bold text-cyan-800 truncate max-w-[300px] mb-1">{file.name}</p>
                                                                        <p className="text-xs text-cyan-600 font-medium">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                                                    </div>
                                                                ) : <div className="text-center p-8 group-hover:scale-105 transition-transform"><UploadCloud className="h-10 w-10 text-slate-400 mx-auto mb-3" /><p className="text-sm text-slate-600 font-medium">Click to Upload Document/Video</p><p className="text-xs text-slate-400 mt-1">Supports PDF, DOCX, MP4</p></div>}
                                                            </div>
                                                            {/* Ingestion Type */}
                                                            {file && (
                                                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Ingestion settings</label>
                                                                    <div className="flex items-center gap-6">
                                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                                            <input type="radio" checked={ingestType === 'extract'} onChange={() => setIngestType('extract')} className="text-cyan-600 focus:ring-cyan-500" />
                                                                            <span className="text-sm font-medium text-slate-700">Plain Extract</span>
                                                                        </label>
                                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                                            <input type="radio" checked={ingestType === 'summarize'} onChange={() => setIngestType('summarize')} className="text-cyan-600 focus:ring-cyan-500" />
                                                                            <span className="text-sm font-medium text-slate-700 flex items-center gap-1"><Sparkles className="h-3 w-3 text-purple-500" /> AI Summarize (Recommended)</span>
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                }

                                                {
                                                    contentMode === 'ai' && (
                                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                                                            {/* AI Wizard or Chat */}
                                                            {!aiContextType ? (
                                                                <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-6">
                                                                    <Bot className="h-16 w-16 text-purple-200" />
                                                                    <div>
                                                                        <h4 className="text-xl font-bold text-slate-800">AI Content Assistant</h4>
                                                                        <p className="text-slate-500 max-w-sm mx-auto">I can generate policies, documentation, or detailed modules for you.</p>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                                                        <button onClick={() => startAiWizard('policy')} className="p-4 border border-slate-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left group">
                                                                            <Shield className="h-8 w-8 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
                                                                            <h5 className="font-bold text-slate-800">Policy</h5>
                                                                            <p className="text-xs text-slate-500">NDA, Compliance, Audit...</p>
                                                                        </button>
                                                                        <button onClick={() => startAiWizard('course')} className="p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group">
                                                                            <Book className="h-8 w-8 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                                                                            <h5 className="font-bold text-slate-800">Course</h5>
                                                                            <p className="text-xs text-slate-500">Modules, Chapters, Tests...</p>
                                                                        </button>
                                                                        <button onClick={() => startAiWizard('library')} className="p-4 border border-slate-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left group">
                                                                            <Sparkles className="h-8 w-8 text-green-500 mb-2 group-hover:scale-110 transition-transform" />
                                                                            <h5 className="font-bold text-slate-800">Library</h5>
                                                                            <p className="text-xs text-slate-500">Articles, Concepts, Research...</p>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col h-[500px]">
                                                                    {/* Header */}
                                                                    <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                                                            <Bot className="h-4 w-4" /> AI Assistant • {aiContextType} Mode
                                                                        </span>
                                                                        <button onClick={() => setAiContextType(null)} className="text-xs text-slate-400 hover:text-red-500">Reset</button>
                                                                    </div>
                                                                    {/* Messages */}
                                                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                                                                        {chatMessages.map((msg, idx) => (
                                                                            <div key={idx} className={cn("flex w-full mb-4", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                                                                <div className={cn("max-w-[85%] rounded-2xl p-4 text-sm",
                                                                                    msg.role === 'user' ? "bg-purple-600 text-white rounded-tr-none shadow-md" : "bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm",
                                                                                    msg.isWarning && "border-amber-400 bg-amber-50 text-amber-900"
                                                                                )}>
                                                                                    {msg.isWarning && <div className="flex items-center gap-2 mb-2 font-bold text-amber-700"><AlertTriangle className="h-4 w-4" /> Out of Context</div>}
                                                                                    {msg.role === 'assistant' && msg.content.includes('#') ? (
                                                                                        <div className="prose prose-sm prose-slate max-w-none">
                                                                                            <style jsx>{`
                                                                                            .prose h1 { @apply text-2xl font-black text-slate-900 mb-3 pb-2 border-b-2 border-purple-400; }
                                                                                            .prose h2 { @apply text-xl font-bold text-slate-800 mt-6 mb-2; }
                                                                                            .prose h2::before { content: "▸"; @apply text-purple-600 mr-2; }
                                                                                            .prose h3 { @apply text-lg font-bold text-slate-700 mt-4 mb-2 bg-purple-50 px-3 py-1 rounded border-l-4 border-purple-500; }
                                                                                            .prose h4 { @apply text-base font-semibold text-slate-600 mt-3 mb-1; }
                                                                                            .prose p { @apply text-sm leading-relaxed text-slate-600 mb-2; }
                                                                                            .prose strong { @apply text-slate-900 font-bold bg-yellow-100 px-1 rounded; }
                                                                                            .prose ul { @apply space-y-1 my-3; }
                                                                                            .prose li { @apply text-slate-700 leading-relaxed; }
                                                                                            .prose li::marker { @apply text-purple-600 font-bold; }
                                                                                            .prose ol { @apply space-y-2 my-3; }
                                                                                            .prose ol li { @apply bg-slate-50 p-2 rounded border-l-2 border-indigo-400; }
                                                                                            .prose blockquote { @apply border-l-4 border-purple-500 bg-purple-50 italic pl-4 py-2 my-3 rounded-r; }
                                                                                            .prose hr { @apply my-4 border-t-2 border-slate-200; }
                                                                                            .prose code { @apply bg-slate-100 text-purple-700 px-1 rounded text-xs; }
                                                                                        `}</style>
                                                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                        {isChatLoading && (
                                                                            <div className="flex justify-start w-full"><div className="bg-white border border-slate-200 rounded-2xl p-4 rounded-tl-none shadow-sm"><Loader2 className="h-5 w-5 animate-spin text-purple-500" /></div></div>
                                                                        )}
                                                                        <div ref={chatEndRef} />
                                                                    </div>
                                                                    {/* Input */}
                                                                    <div className="p-4 bg-white border-t border-slate-200">
                                                                        <div className="flex gap-2">
                                                                            <button
                                                                                onClick={toggleVoiceInput}
                                                                                title={isListening ? "Stop Recording" : "Voice Input"}
                                                                                className={cn(
                                                                                    "p-2 border rounded-lg transition-all",
                                                                                    isListening
                                                                                        ? "bg-red-500 text-white border-red-600 animate-pulse"
                                                                                        : "border-slate-200 hover:bg-purple-50 text-purple-600"
                                                                                )}
                                                                            >
                                                                                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                                                                            </button>
                                                                            <input
                                                                                type="text"
                                                                                value={chatInput}
                                                                                onChange={(e) => setChatInput(e.target.value)}
                                                                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                                                                placeholder={isListening ? "Listening... speak now" : "Type your message..."}
                                                                                className="flex-1 border border-slate-200 rounded-lg px-4 focus:ring-2 focus:ring-purple-500 outline-none"
                                                                                disabled={isListening}
                                                                            />
                                                                            <button
                                                                                id="voice-send-btn"
                                                                                onClick={handleSendMessage}
                                                                                disabled={!chatInput.trim() || isChatLoading}
                                                                                className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all"
                                                                            >
                                                                                <ArrowRight className="h-5 w-5" />
                                                                            </button>
                                                                        </div>
                                                                        {isListening && (
                                                                            <div className="mt-2 text-xs text-center text-purple-600 flex items-center justify-center gap-2">
                                                                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                                                Recording... Will auto-send after 2 seconds of silence
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                }
                                            </div>
                                        )}

                                        {/* ACTION BAR / NAVIGATION */}
                                        <div className="flex justify-between items-center pt-6 mt-4 border-t border-slate-100">
                                            {/* BACK BUTTON */}
                                            {activeTab !== 'content' ? (
                                                <button
                                                    onClick={() => setActiveTab(activeTab === 'details' ? 'cover' : 'content')}
                                                    className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-medium"
                                                >
                                                    Back
                                                </button>
                                            ) : (
                                                <div></div> // Spacer
                                            )}

                                            {/* NEXT / SUBMIT BUTTONS */}
                                            {activeTab === 'content' && (
                                                <button
                                                    onClick={() => setActiveTab('cover')}
                                                    className="px-6 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors font-bold flex items-center gap-2 shadow-sm"
                                                >
                                                    Next: Cover Image <ArrowRight className="h-4 w-4" />
                                                </button>
                                            )}

                                            {activeTab === 'cover' && (
                                                <button
                                                    onClick={() => setActiveTab('details')}
                                                    className="px-6 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors font-bold flex items-center gap-2 shadow-sm"
                                                >
                                                    Next: Details <ArrowRight className="h-4 w-4" />
                                                </button>
                                            )}

                                            {activeTab === 'details' && (
                                                <button
                                                    onClick={startUpload}
                                                    className={cn("px-8 py-3 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center gap-2", "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:scale-105")}
                                                >
                                                    {isEditing ? <CheckCircle className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
                                                    {isEditing ? "Update Content" : "Start Ingestion"}
                                                </button>
                                            )}
                                        </div>
                                        {error && <p className="text-center text-red-500 font-medium mt-4">{error}</p>}
                                    </div >
                                )
                                }

                                {/* REVIEW MODE */}
                                {
                                    status === 'review' && (
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-8">
                                            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white flex justify-between items-center">
                                                <div>
                                                    <h2 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-yellow-300" /> Review Generated Content</h2>
                                                    <p className="text-purple-100 opacity-90">Review the beautifully formatted content below</p>
                                                </div>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => {
                                                            // Download as PDF
                                                            const content = extractedData?.summary || aiGeneratedContent || '';
                                                            const blob = new Blob([content], { type: 'text/markdown' });
                                                            const url = URL.createObjectURL(blob);
                                                            const a = document.createElement('a');
                                                            a.href = url;
                                                            a.download = `${courseTitle || 'document'}.md`;
                                                            a.click();
                                                            URL.revokeObjectURL(url);
                                                        }}
                                                        className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-md transition-colors text-sm font-medium flex items-center gap-2"
                                                    >
                                                        <Download className="h-4 w-4" /> Download
                                                    </button>
                                                    <button onClick={() => setStatus('idle')} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-md transition-colors text-sm font-medium">Edit</button>
                                                    <button onClick={handleApproveContent} className="px-6 py-2 bg-white text-purple-700 hover:bg-purple-50 rounded-lg shadow-md font-bold transition-transform hover:scale-105">Approve & Publish</button>
                                                </div>
                                            </div>
                                            <div className="p-8 max-h-[700px] overflow-y-auto bg-gradient-to-b from-slate-50 to-white">
                                                <div className="prose prose-lg prose-slate max-w-none bg-white p-10 rounded-2xl shadow-lg border border-slate-100">
                                                    <style jsx global>{`
                                                    .prose h1 {
                                                        @apply text-4xl font-black text-slate-900 mb-8 pb-6 mt-8 border-b-4 border-purple-500;
                                                    }
                                                    .prose h2 {
                                                        @apply text-3xl font-bold text-slate-800 mt-16 mb-6 pt-8 flex items-center gap-3;
                                                    }
                                                    .prose h2::before {
                                                        content: "▸";
                                                        @apply text-purple-600 text-4xl;
                                                    }
                                                    .prose h3 {
                                                        @apply text-2xl font-bold text-slate-700 mt-12 mb-5 bg-gradient-to-r from-purple-50 to-transparent px-4 py-3 rounded-lg border-l-4 border-purple-500;
                                                    }
                                                    .prose h4 {
                                                        @apply text-xl font-semibold text-slate-600 mt-8 mb-4;
                                                    }
                                                    .prose p {
                                                        @apply text-base leading-loose text-slate-600 mb-6;
                                                    }
                                                    .prose strong {
                                                        @apply text-slate-900 font-bold bg-yellow-50 px-1.5 py-0.5 rounded;
                                                    }
                                                    .prose ul {
                                                        @apply space-y-3 my-8 ml-2;
                                                    }
                                                    .prose li {
                                                        @apply text-slate-700 leading-loose pl-3 mb-2;
                                                    }
                                                    .prose li::marker {
                                                        @apply text-purple-600 text-xl font-bold;
                                                    }
                                                    .prose ol {
                                                        @apply space-y-4 my-8;
                                                    }
                                                    .prose ol li {
                                                        @apply bg-slate-50 p-4 rounded-lg border-l-4 border-indigo-400 mb-3;
                                                    }
                                                    .prose blockquote {
                                                        @apply border-l-4 border-purple-500 bg-purple-50 italic pl-6 py-5 my-8 rounded-r-lg;
                                                    }
                                                    .prose hr {
                                                        @apply my-12 border-t-2 border-slate-200;
                                                    }
                                                    .prose code {
                                                        @apply bg-slate-100 text-purple-700 px-2 py-1 rounded font-mono text-sm;
                                                    }
                                                    .prose table {
                                                        @apply w-full my-8 border-collapse;
                                                    }
                                                    .prose th {
                                                        @apply bg-purple-600 text-white font-bold p-4 text-left;
                                                    }
                                                    .prose td {
                                                        @apply border border-slate-200 p-4;
                                                    }
                                                    .prose a {
                                                        @apply text-purple-600 hover:text-purple-800 underline font-medium;
                                                    }
                                                    /* Add spacing after sections */
                                                    .prose > * + * {
                                                        @apply mt-6;
                                                    }
                                                    .prose > h2 + * {
                                                        @apply mt-6;
                                                    }
                                                    .prose > h3 + * {
                                                        @apply mt-5;
                                                    }
                                                `}</style>
                                                    {extractedData?.summary || aiGeneratedContent ? (
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {extractedData?.summary || aiGeneratedContent || ''}
                                                        </ReactMarkdown>
                                                    ) : (
                                                        <p className="text-slate-400 italic text-center py-12">No content generated.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }
                            </div >
                        ) : (
                            /* Other Status Views (Uploading, Success) */
                            <div className="max-w-md mx-auto mt-10">
                                {status === 'uploading' && (
                                    <div className="text-center">
                                        <Loader2 className="h-12 w-12 text-cyan-500 animate-spin mx-auto mb-4" />
                                        <h3 className="text-xl font-bold text-slate-800">Uploading... {progress}%</h3>
                                        <div className="w-full bg-slate-200 h-3 rounded-full mt-4 overflow-hidden"><div className="bg-cyan-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>
                                    </div>
                                )}
                                {status === 'processing' && (
                                    <div className="text-center">
                                        <div className="relative inline-block"><div className="absolute inset-0 bg-cyan-500 rounded-full animate-ping opacity-20" /><Bot className="h-16 w-16 text-cyan-600 relative z-10" /></div>
                                        <h3 className="text-xl font-bold text-slate-800 mt-6">Processing content...</h3>
                                    </div>
                                )}
                                {status === 'success' && (
                                    <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-200 text-center animate-in zoom-in">
                                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                        <h2 className="text-3xl font-bold text-slate-900 mb-2">Success!</h2>
                                        <p className="text-slate-600 mb-8">{isEditing ? "Course updated successfully." : "Course created successfully."}</p>
                                        <button onClick={() => { setViewMode('list'); resetForm(); }} className="px-6 py-3 bg-slate-900 text-white rounded-lg font-bold">Back to Content List</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div >
                )
                }
            </div >

            {/* Duplicate Content Modal */}
            {showDuplicateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center justify-center mb-6">
                            <div className="bg-amber-100 p-4 rounded-full mb-4">
                                <AlertTriangle className="h-10 w-10 text-amber-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 text-center">Duplicate Content Detected</h3>
                        </div>

                        <p className="text-slate-600 text-center mb-8 leading-relaxed">
                            {duplicateErrorMsg || "A course with this title already exists. Please change the title or check the existing content."}
                        </p>

                        <div className="flex justify-center">
                            <button
                                onClick={() => setShowDuplicateModal(false)}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-lg font-bold transition-all transform hover:scale-105"
                            >
                                Okay, I'll Check
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
