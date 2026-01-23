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
    MicOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ProfileDropdown from '@/components/ProfileDropdown';
import { uploadChunk, finalizeUpload } from '@/app/actions/ingest';
import { getAdminCourses, toggleCourseStatus, deleteCourse, updateCourse, getCategories } from '@/app/actions/courses';
import { generateCoverImageAction, generateContentSummaryAction, aiAssistantChatAction } from '@/app/actions/aiMock';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const CourseImage = ({ src, alt, className }: { src: string, alt: string, className?: string }) => {
    const [imgSrc, setImgSrc] = useState(src);

    useEffect(() => {
        setImgSrc(src);
    }, [src]);

    return (
        <Image
            src={imgSrc}
            alt={alt}
            fill
            className={className}
            onError={() => setImgSrc('/assets/placeholder-course.png')}
        />
    );
};

export default function AdminUploadPage() {
    const router = useRouter();
    const chatEndRef = useRef<HTMLDivElement>(null);

    // View Mode: List vs Add
    const [viewMode, setViewMode] = useState<'list' | 'add'>('list');

    // Data States
    const [adminCourses, setAdminCourses] = useState<any[]>([]);
    const [isLoadingCourses, setIsLoadingCourses] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
    const [sortOption, setSortOption] = useState('latest');

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
    const [extractedData, setExtractedData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // --- AI Feature States ---
    const [coverMode, setCoverMode] = useState<'upload' | 'ai'>('upload');
    const [contentMode, setContentMode] = useState<'upload' | 'ai'>('upload');

    // AI Cover
    const [aiCoverTheme, setAiCoverTheme] = useState('Modern Blue');
    const [isGeneratingCover, setIsGeneratingCover] = useState(false);
    const [generatedCoverUrl, setGeneratedCoverUrl] = useState<string | null>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);

    // AI Content Assistant
    const [aiContextType, setAiContextType] = useState<'policy' | 'document' | 'details' | null>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [aiWarning, setAiWarning] = useState<string | null>(null);
    const [aiGeneratedContent, setAiGeneratedContent] = useState<string | null>(null);

    // Ingestion Options
    const [ingestType, setIngestType] = useState<'extract' | 'summarize'>('extract');

    // Voice Input States
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch Initial Data
    useEffect(() => {
        fetchCategories();
        if (viewMode === 'list') {
            fetchCourses();
        }
    }, [viewMode]);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages]);

    const fetchCategories = async () => {
        const res = await getCategories();
        if (res.success) {
            setCategories(res.data || []);
        }
    };

    const fetchCourses = async () => {
        setIsLoadingCourses(true);
        const res = await getAdminCourses();
        if (res.success) {
            setAdminCourses(res.data || []);
        } else {
            console.error(res.error);
        }
        setIsLoadingCourses(false);
    };

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
                setCourseTitle(name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
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

    // AI Cover Generation
    const handleGenerateCover = async () => {
        if (!courseTitle) {
            setError("Please enter a Title first to generate a relevant cover.");
            return;
        }
        setIsGeneratingCover(true);
        setError(null);
        try {
            // Clean title to prevent encoding artifacts
            const cleanTitle = courseTitle.replace(/\n/g, ' ').trim();
            const res = await generateCoverImageAction({ title: cleanTitle, theme: aiCoverTheme });
            if (res.success) {
                setGeneratedCoverUrl(res.url);
                setCoverPreview(res.url); // Show preview
                // Note: We don't have a File object yet, we might need to fetch and convert if we want to upload it as a file,
                // OR just pass the URL to backend. Let's assume backend accepts URL or File.
                // For this mock, we set preview.
            }
        } catch (e) {
            setError("Failed to generate cover.");
        }
        setIsGeneratingCover(false);
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
                setAiGeneratedContent(res.message);
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

    const startAiWizard = (type: 'policy' | 'document' | 'details') => {
        setAiContextType(type);
        setChatMessages([{ role: 'assistant', content: `I'm ready to help you create a ${type}. What are the key details or main topic?` }]);
        setAiGeneratedContent(null);
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
    };

    const handleEditClick = (course: any) => {
        setIsEditing(true);
        setEditingId(course.id);
        const name = course.title;
        setCourseTitle(name);
        setDescription(course.description || '');
        setIsCompliance(course.isCompliance || false);
        setDocumentNumber(course.documentNumber || '');

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
            if (coverMode === 'ai' && !generatedCoverUrl) errors.push("Generated Cover");

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
            if (coverMode === 'ai' && generatedCoverUrl) {
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
            } else if (coverPreview) {
                thumbnailUrl = coverPreview; // Existing
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
                documentNumber: isCompliance ? documentNumber : undefined
            };

            // 3. Handle Content Ingestion
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
                if (isCompliance && documentNumber) finalFormData.append('documentNumber', documentNumber);

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
                    fetchCourses();
                } else {
                    throw new Error(ingestRes.error);
                }
            } else if (isEditing) {
                // Metadata Update Only
                // Call update logic (simplified)
                setStatus('success');
                fetchCourses();
            }

        } catch (e: any) {
            console.error(e);
            setError(e.message || "An error occurred during upload.");
            setStatus('idle');
        }
    };

    // Final Approval from Review Mode
    const handleApproveContent = () => {
        setStatus('success');
        fetchCourses();
    };

    // Filter & Sort Helper
    const filteredCourses = adminCourses.filter(c =>
        (searchTerm === '' || c.title.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedCategoryFilter === 'All' || c.category === categories.find(cat => cat.id === selectedCategoryFilter)?.name || c.subCategory?.categoryId === selectedCategoryFilter)
    ).sort((a, b) => {
        switch (sortOption) {
            case 'oldest': return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
            case 'a_z': return a.title.localeCompare(b.title);
            case 'z_a': return b.title.localeCompare(a.title);
            case 'latest':
            default:
                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
    });

    const currentSubCategories = selectedCategory
        ? categories.find(c => c.id === selectedCategory)?.subCategories || []
        : [];

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <nav className="sticky top-0 z-50 bg-slate-900 border-b border-white/10 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
                                <ChevronLeft className="h-5 w-5" />
                            </Link>
                            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                <Shield className="h-5 w-5 text-cyan-400" /> Content Master
                            </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <ProfileDropdown />
                        </div>
                    </div>
                </div>
            </nav>

            {/* Sub-Header */}
            <div className="bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-full relative">
                        <button onClick={() => setViewMode('list')} className={cn("relative z-10 px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300", viewMode === 'list' ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-700")}>Existing Content</button>
                        <button onClick={() => { setViewMode('add'); resetForm(); }} className={cn("relative z-10 px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300", viewMode === 'add' ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-700")}>{isEditing ? 'Edit Content' : 'Add New'}</button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* LIST VIEW */}
                {viewMode === 'list' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        {/* Filters */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-center justify-between">
                            <div className="relative flex-1 min-w-[300px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input type="text" placeholder="Search content..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none" />
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-500">Sort by:</span>
                                    <select
                                        value={sortOption}
                                        onChange={(e) => setSortOption(e.target.value)}
                                        className="pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none bg-white cursor-pointer hover:border-cyan-400 transition-colors"
                                    >
                                        <option value="latest">Latest</option>
                                        <option value="oldest">Older</option>
                                        <option value="a_z">A-Z</option>
                                        <option value="z_a">Z-A</option>
                                    </select>
                                </div>
                                <button onClick={fetchCourses} className="p-2 text-slate-500 hover:text-cyan-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"><RefreshCw className={cn("h-5 w-5", isLoadingCourses && "animate-spin")} /></button>
                            </div>
                        </div>

                        {/* Grid */}
                        {isLoadingCourses ? (
                            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-cyan-600" /></div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredCourses.map((course) => (
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

                                            <div className="mt-auto pt-4 border-t border-slate-100 flex justify-end">
                                                <Link href={`/learn/${course.id}?preview=true`} target="_blank" className="text-sm font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 transition-colors group-hover:translate-x-1 duration-300">
                                                    Preview <ArrowRight className="h-4 w-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ADD VIEW */}
                {viewMode === 'add' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        {(status === 'idle' || status === 'review') ? (
                            <div className="flex flex-col gap-6 max-w-5xl mx-auto">
                                {/* Main Form */}
                                {status === 'idle' && (
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                            <h3 className="font-bold text-lg text-slate-800">{isEditing ? `Edit: ${courseTitle}` : 'Content Details'}</h3>
                                        </div>

                                        {/* Title & Basics */}
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                                    <input type="text" value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none" placeholder="e.g. Sales Mastery" />
                                                </div>
                                                <div className="flex items-end">
                                                    <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 w-full">
                                                        <input type="checkbox" checked={isCompliance} onChange={(e) => setIsCompliance(e.target.checked)} className="h-5 w-5 text-cyan-600" />
                                                        <label className="text-sm font-medium text-slate-700">Mark as Compliance/Policy</label>
                                                    </div>
                                                </div>
                                            </div>
                                            {isCompliance && (
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Document Number</label>
                                                    <input type="text" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg font-mono text-sm" placeholder="POL-001" />
                                                </div>
                                            )}
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg" rows={2} />
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

                                        {/* COVER IMAGE SECTION */}
                                        <div className="pt-4 border-t border-slate-100">
                                            <label className="block text-sm font-bold text-slate-800 mb-2">Cover Image</label>
                                            <div className="flex gap-0 mb-4 bg-slate-100 p-1 rounded-lg w-max">
                                                <button onClick={() => setCoverMode('upload')} className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", coverMode === 'upload' ? "bg-white shadow-sm text-slate-900" : "text-slate-500")}>Upload File</button>
                                                <button onClick={() => setCoverMode('ai')} className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2", coverMode === 'ai' ? "bg-white shadow-sm text-purple-600" : "text-slate-500")}><Sparkles className="h-3 w-3" /> AI Generate</button>
                                            </div>

                                            {coverMode === 'upload' && (
                                                <div className={cn("relative w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50", coverFile ? "border-cyan-500 bg-cyan-50" : "border-slate-300 hover:border-cyan-400")}>
                                                    <input type="file" accept="image/*" onChange={handleCoverChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                    {coverPreview ? <Image src={coverPreview} alt="Cover" fill className="object-contain" /> : <div className="text-center p-4"><ImageIcon className="h-8 w-8 text-slate-400 mx-auto mb-2" /><span className="text-sm text-slate-500">Click to Upload Cover</span></div>}
                                                </div>
                                            )}

                                            {coverMode === 'ai' && (
                                                <div className="bg-purple-50 rounded-xl border border-purple-100 p-6">
                                                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                                        <div className="relative z-20">
                                                            <label className="block text-xs font-bold text-purple-800 uppercase tracking-wide mb-3">Color Palette</label>

                                                            {/* Hive / Honeycomb Layout */}
                                                            {/* Hive / Honeycomb Popover Trigger */}
                                                            <div className="relative">
                                                                <button
                                                                    onClick={() => setShowColorPicker(!showColorPicker)}
                                                                    className="flex items-center gap-3 px-4 py-2 bg-white border border-purple-200 rounded-xl shadow-sm hover:border-purple-400 hover:shadow-md transition-all w-full md:w-auto min-w-[140px]"
                                                                >
                                                                    <div
                                                                        className="w-8 h-8 rounded-full border border-slate-200 shadow-inner ring-2 ring-white"
                                                                        style={{ backgroundColor: aiCoverTheme.startsWith('#') ? aiCoverTheme : '#0047AB' }}
                                                                    />
                                                                    <div className="flex flex-col items-start">
                                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selected Color</span>
                                                                        <span className="text-sm font-mono text-slate-700 font-medium">{aiCoverTheme}</span>
                                                                    </div>
                                                                </button>

                                                                {/* Hive Popover */}
                                                                {showColorPicker && (
                                                                    <div className="absolute top-14 left-0 z-50 bg-white p-4 rounded-2xl shadow-xl border border-purple-100 animate-in fade-in zoom-in-95 origin-top-left" style={{ width: '320px' }}>
                                                                        <div className="flex justify-between items-center mb-3">
                                                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Palette</span>
                                                                            <button onClick={() => setShowColorPicker(false)} className="text-slate-400 hover:text-slate-600 text-xs font-medium">Close</button>
                                                                        </div>
                                                                        <div className="flex flex-wrap gap-1 justify-center">
                                                                            {[
                                                                                '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
                                                                                '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
                                                                                '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
                                                                                '#EC4899', '#F43F5E', '#1F2937', '#4B5563', '#6B7280',
                                                                                '#9CA3AF', '#D1D5DB', '#F3F4F6', '#FFFFFF', '#000000',
                                                                                '#0047AB', '#FF5733', '#1A1A2E', '#2C3E50', '#800080'
                                                                            ].map((hex, idx) => (
                                                                                <button
                                                                                    key={hex}
                                                                                    onClick={() => { setAiCoverTheme(hex); setShowColorPicker(false); }}
                                                                                    className={cn(
                                                                                        "w-9 h-10 relative transition-transform hover:scale-125 hover:z-10 focus:outline-none",
                                                                                    )}
                                                                                    style={{
                                                                                        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                                                                                        backgroundColor: hex,
                                                                                        marginTop: '-5px',
                                                                                        marginLeft: idx % 10 === 0 ? '0px' : '-2px',
                                                                                    }}
                                                                                    title={hex}
                                                                                >
                                                                                    {aiCoverTheme === hex && (
                                                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                                                            <div className={cn("h-1.5 w-1.5 rounded-full", ['#FFFFFF', '#F3F4F6', '#D1D5DB'].includes(hex) ? "bg-black" : "bg-white")} />
                                                                                        </div>
                                                                                    )}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Invisible Backdrop to close on click outside */}
                                                                {showColorPicker && (
                                                                    <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex-shrink-0">
                                                            <button
                                                                onClick={handleGenerateCover}
                                                                disabled={isGeneratingCover || !courseTitle}
                                                                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                                                            >
                                                                {isGeneratingCover ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                                                                Generate Cover
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {generatedCoverUrl && (
                                                        <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg border border-purple-200 bg-white">
                                                            <Image src={generatedCoverUrl} alt="AI Generated" fill className="object-cover" />
                                                            <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-end justify-end p-4">
                                                                <a href={generatedCoverUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/90 rounded-full shadow-sm hover:scale-110 transition-transform mr-2" title="View Full"><Eye className="h-4 w-4 text-slate-700" /></a>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* CONTENT SECTION */}
                                        <div className="pt-4 border-t border-slate-100">
                                            <label className="block text-sm font-bold text-slate-800 mb-2">Course Content</label>
                                            <div className="flex gap-0 mb-4 bg-slate-100 p-1 rounded-lg w-max">
                                                <button onClick={() => setContentMode('upload')} className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", contentMode === 'upload' ? "bg-white shadow-sm text-slate-900" : "text-slate-500")}>Upload File</button>
                                                <button onClick={() => setContentMode('ai')} className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2", contentMode === 'ai' ? "bg-white shadow-sm text-purple-600" : "text-slate-500")}><Bot className="h-3 w-3" /> AI Assistant</button>
                                            </div>

                                            {contentMode === 'upload' && (
                                                <div className="space-y-4">
                                                    <div className={cn("relative w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50", file ? "border-cyan-500 bg-cyan-50" : "border-slate-300 hover:border-cyan-400")}>
                                                        <input type="file" accept=".pdf,.docx,.mp4,.webm,.mov" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                        {file ? <div className="text-center p-4"><FileText className="h-8 w-8 text-cyan-600 mx-auto mb-2" /><p className="text-sm font-medium text-cyan-700 truncate max-w-[200px]">{file.name}</p></div> : <div className="text-center p-4"><UploadCloud className="h-8 w-8 text-slate-400 mx-auto mb-2" /><p className="text-sm text-slate-500 font-medium">Click to Upload Document/Video</p></div>}
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
                                            )}

                                            {contentMode === 'ai' && (
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
                                                                <button onClick={() => startAiWizard('document')} className="p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group">
                                                                    <Book className="h-8 w-8 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                                                                    <h5 className="font-bold text-slate-800">Document</h5>
                                                                    <p className="text-xs text-slate-500">Manuals, Guides, Books...</p>
                                                                </button>
                                                                <button onClick={() => startAiWizard('details')} className="p-4 border border-slate-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left group">
                                                                    <Sparkles className="h-8 w-8 text-green-500 mb-2 group-hover:scale-110 transition-transform" />
                                                                    <h5 className="font-bold text-slate-800">Details</h5>
                                                                    <p className="text-xs text-slate-500">Productivity, Concepts...</p>
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
                                                                    <button title="Upload Reference" className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500"><UploadCloud className="h-5 w-5" /></button>
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
                                            )}
                                        </div>

                                        {/* Action Bar */}
                                        <div className="flex justify-end pt-6">
                                            <button onClick={startUpload} className={cn("px-8 py-3 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center gap-2", "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:scale-105")}>
                                                {isEditing ? <CheckCircle className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />} {isEditing ? "Update Content" : "Start Ingestion"}
                                            </button>
                                        </div>
                                        {error && <p className="text-center text-red-500 font-medium mt-4">{error}</p>}
                                    </div>
                                )}

                                {/* REVIEW MODE */}
                                {status === 'review' && (
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
                                )}
                            </div>
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
                    </div>
                )}
            </div>
        </div >
    );
}
