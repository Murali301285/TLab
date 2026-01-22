'use client';

import { useState, useEffect } from 'react';
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
    Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ProfileDropdown from '@/components/ProfileDropdown';
import { uploadChunk, finalizeUpload } from '@/app/actions/ingest';
import { getAdminCourses, toggleCourseStatus, deleteCourse, updateCourse, getCategories } from '@/app/actions/courses';
import { useRouter } from 'next/navigation';

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

    const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'review'>('idle');
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

    // Fetch Initial Data
    useEffect(() => {
        fetchCategories();
        if (viewMode === 'list') {
            fetchCourses();
        }
    }, [viewMode]);

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

    // Form Handlers
    // Old handleFileChange removed/merged above

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
            // Do NOT clear sub-category automatically so user can select one
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

            // Auto-Generate Cover for PDF
            if (selectedFile.type === 'application/pdf') {
                // Show temporary loading or status if needed (optional)
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
        if (!isEditing && !coverFile) errors.push("Cover Image");
        if (!isEditing && !file) errors.push("Document/Video");

        if (errors.length > 0) {
            setError(`Please complete: ${errors.join(', ')}.`);
            return;
        }

        setStatus('uploading');
        setProgress(0);
        setError(null);

        try {
            let thumbnailUrl = coverPreview || '';

            // 1. Upload Cover Image (if new one selected)
            if (coverFile) {
                const coverFormData = new FormData();
                coverFormData.append('file', coverFile);

                try {
                    const imgRes = await fetch('/api/upload/image', { method: 'POST', body: coverFormData });

                    if (!imgRes.ok) {
                        const errData = await imgRes.json();
                        throw new Error(errData.error || "Failed to upload cover image");
                    }

                    const imgData = await imgRes.json();
                    if (imgData.url) {
                        thumbnailUrl = imgData.url;
                    } else {
                        throw new Error("Invalid response from server during cover upload");
                    }
                } catch (err: any) {
                    console.error("Cover Upload Failed:", err);
                    setError(`Cover Image Upload Failed: ${err.message}`);
                    setStatus('idle');
                    return;
                }
            }

            // Find category name for legacy string field
            const catObj = categories.find(c => c.id === selectedCategory);
            const categoryName = catObj ? catObj.name : selectedCategory;

            // 2. Editing existing course (Metadata only or File replacement)
            if (isEditing && editingId) {
                let updatedData: any = {
                    title: courseTitle,
                    description,
                    categoryName,
                    subCategoryId: selectedSubCategory || undefined,
                    thumbnailUrl,
                    isActive: true,
                    isCompliance: isCompliance,
                    documentNumber: isCompliance ? documentNumber : undefined
                };
                return;
            }

            // 3. New Upload (Chunked)
            let finalThumbnailUrl = thumbnailUrl;

            // 3a. Upload Cover Image First (if exists)
            if (coverFile) {
                try {
                    setStatus('uploading');
                    const imageFormData = new FormData();
                    imageFormData.append('file', coverFile);

                    const imgRes = await fetch('/api/upload/image', {
                        method: 'POST',
                        body: imageFormData
                    });

                    if (imgRes.ok) {
                        const imgData = await imgRes.json();
                        console.log("Cover upload response:", imgData);
                        if (imgData.success) {
                            finalThumbnailUrl = imgData.url;
                            console.log("finalThumbnailUrl set to:", finalThumbnailUrl);
                            if (imgData.debugPath) {
                                console.log("[DEBUG] Server wrote to:", imgData.debugPath);
                            }
                        }
                    }
                } catch (err) {
                    console.error("Cover upload failed", err);
                    // Continue without cover or handle error
                }
            }

            if (!file) {
                // Check if it's metadata only (no file) which might happen in some cases, 
                // but here we enforce file for new uploads unless we want to support "Manual Course"
                // For now, let's assume file is required as per existing logic, or if only cover is there?
                // Existing logic requires !file return.
                if (!file) return;
            }

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
            finalFormData.append('category', categoryName); // Legacy string
            finalFormData.append('subCategoryId', selectedSubCategory); // New Relation
            finalFormData.append('title', courseTitle);
            finalFormData.append('description', description);
            finalFormData.append('thumbnailUrl', finalThumbnailUrl || "");
            finalFormData.append('isCompliance', isCompliance.toString());
            if (isCompliance && documentNumber) finalFormData.append('documentNumber', documentNumber);

            const ingestRes = await finalizeUpload(finalFormData);

            if (ingestRes.success) {
                setExtractedData(ingestRes.data);
                setStatus('success');
                fetchCourses(); // refresh list
            } else {
                throw new Error(ingestRes.error);
            }

        } catch (e: any) {
            console.error(e);
            setError(e.message || "An error occurred during upload.");
            setStatus('idle');
        }
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

    // Get current subcategories based on selection
    const currentSubCategories = selectedCategory
        ? categories.find(c => c.id === selectedCategory)?.subCategories || []
        : [];

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Dark Header (Dashboard Style) */}
            <nav className="sticky top-0 z-50 bg-slate-900 border-b border-white/10 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors" title="Back to Dashboard">
                                <ChevronLeft className="h-5 w-5" />
                            </Link>
                            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                <Shield className="h-5 w-5 text-cyan-400" /> Content Master
                            </h1>
                        </div>

                        <div className="flex items-center gap-4">
                            <button className="p-2 text-slate-400 hover:text-white transition-colors">
                                <Search className="h-5 w-5" />
                            </button>
                            <button className="p-2 text-slate-400 hover:text-white transition-colors relative">
                                <Bell className="h-5 w-5" />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            </button>
                            <ProfileDropdown />
                        </div>
                    </div>
                </div>
            </nav>

            {/* Sub-Header with Actions */}
            <div className="bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-full relative">
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "relative z-10 px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300",
                                viewMode === 'list' ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Existing Content
                        </button>
                        <button
                            onClick={() => { setViewMode('add'); resetForm(); }}
                            className={cn(
                                "relative z-10 px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300",
                                viewMode === 'add' ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            {isEditing ? 'Edit Content' : 'Add New'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* LIST View */}
                {viewMode === 'list' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        {/* Filters */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-center justify-between">
                            <div className="relative flex-1 min-w-[300px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search content by title..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 mr-2 border-r border-slate-200 pr-4">
                                    <span className="text-sm text-slate-500 font-medium">Sort:</span>
                                    <select
                                        className="px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                                        value={sortOption}
                                        onChange={(e) => setSortOption(e.target.value)}
                                    >
                                        <option value="latest">Latest</option>
                                        <option value="oldest">Older</option>
                                        <option value="a_z">A-Z</option>
                                        <option value="z_a">Z-A</option>
                                    </select>
                                </div>
                                <Filter className="h-5 w-5 text-slate-400" />
                                <select
                                    className="px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-cyan-500 max-w-[200px]"
                                    value={selectedCategoryFilter}
                                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                                >
                                    <option value="All">All Categories</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <button onClick={fetchCourses} className="p-2 text-slate-500 hover:text-cyan-600 transition-colors">
                                <RefreshCw className={cn("h-5 w-5", isLoadingCourses && "animate-spin")} />
                            </button>
                        </div>

                        {/* Content Grid */}
                        {isLoadingCourses ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="h-8 w-8 animate-spin text-cyan-600 text-center" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredCourses.map((course) => (
                                    <div key={course.id} className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col">
                                        <div className="relative h-48 w-full bg-slate-100">
                                            {course.thumbnail ? (
                                                <CourseImage src={course.thumbnail} alt={course.title} className="object-contain group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-slate-300">
                                                    <ImageIcon className="h-12 w-12" />
                                                </div>
                                            )}
                                            <div className="absolute top-3 left-3">
                                                <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md", course.isActive ? "bg-green-500/90 text-white" : "bg-slate-500/90 text-white")}>
                                                    {course.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-5 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={cn(
                                                    "text-xs font-semibold px-2 py-1 rounded-md mb-2 inline-block",
                                                    course.isCompliance
                                                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                                                        : "text-cyan-600 bg-cyan-50"
                                                )}>
                                                    {/* Display Category Name */}
                                                    {course.subCategory?.category?.name || course.category}
                                                </span>
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleToggleActive(course.id, course.isActive)} className={cn("p-1.5 rounded-md hover:bg-slate-100", course.isActive ? "text-green-600" : "text-slate-400")} title={course.isActive ? "Deactivate" : "Activate"}><Power className="h-4 w-4" /></button>
                                                    <button onClick={() => handleEditClick(course)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Edit"><Edit className="h-4 w-4" /></button>
                                                    <button onClick={() => handleDelete(course.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md" title="Delete"><Trash2 className="h-4 w-4" /></button>
                                                </div>
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">{course.title}</h3>
                                            <p className="text-sm text-slate-500 mb-4 line-clamp-3 flex-1">{course.description || "No description provided."}</p>
                                            <div className="mt-auto border-t border-slate-100 pt-4 flex justify-between items-center text-sm text-slate-500">
                                                <span>{/* Chapters count */}</span>
                                                {course.isCompliance ? (
                                                    <Link href={`/compliance/${course.id}?preview=true`} className="flex items-center gap-1 text-cyan-600 font-semibold hover:gap-2 transition-all">
                                                        Preview <ArrowRight className="h-4 w-4" />
                                                    </Link>
                                                ) : (
                                                    <Link href={`/learn/${course.id}?preview=true`} className="flex items-center gap-1 text-cyan-600 font-semibold hover:gap-2 transition-all">
                                                        Preview <ArrowRight className="h-4 w-4" />
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {filteredCourses.length === 0 && (
                                    <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                                        <Book className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                        <p>No content found matching your search.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ADD / EDIT View */}
                {viewMode === 'add' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        {status === 'idle' && (
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 max-w-4xl mx-auto">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                    <h3 className="font-bold text-lg text-slate-800">{isEditing ? `Edit Course: ${courseTitle}` : '1. Content Details'}</h3>
                                    {isEditing && <button onClick={() => { setViewMode('list'); resetForm(); }} className="text-sm text-slate-500 hover:text-slate-800">Cancel Editing</button>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                    <input type="text" maxLength={150} value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} placeholder="e.g. Advanced Sales Tactics 2025" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none" />
                                </div>

                                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <input
                                        type="checkbox"
                                        id="isCompliance"
                                        checked={isCompliance}
                                        onChange={(e) => setIsCompliance(e.target.checked)}
                                        className="h-5 w-5 text-cyan-600 rounded focus:ring-cyan-500 border-gray-300"
                                    />
                                    <label htmlFor="isCompliance" className="text-sm font-medium text-slate-700 select-none cursor-pointer">
                                        Mark as Compliance/Policy Document
                                        <p className="text-xs text-slate-500 font-normal mt-0.5">Will be shown in Compliance Dashboard instead of Course Library</p>
                                    </label>
                                </div>

                                {/* Document Number (Compliance Only) */}
                                {isCompliance && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Document Number</label>
                                        <input
                                            type="text"
                                            value={documentNumber}
                                            onChange={(e) => setDocumentNumber(e.target.value)}
                                            placeholder="e.g. POL-2025-001"
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none font-mono text-sm"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter a brief description..." className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none resize-y min-h-[4.5rem]" rows={2} />
                                </div>

                                {/* Compliance Effect logic moved up */}

                                {/* Modern Category Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-3">Category</label>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {categories.map((cat: any) => {
                                            const isPolicy = cat.name.toLowerCase() === 'policy';
                                            const isDisabled = isCompliance && !isPolicy;

                                            return (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => {
                                                        if (!isDisabled) {
                                                            setSelectedCategory(cat.id);
                                                            setSelectedSubCategory('');
                                                        }
                                                    }}
                                                    disabled={isDisabled}
                                                    className={cn(
                                                        "px-4 py-2 rounded-lg text-sm font-medium border transition-all",
                                                        selectedCategory === cat.id
                                                            ? "bg-cyan-50 border-cyan-500 text-cyan-700 ring-1 ring-cyan-500"
                                                            : isDisabled
                                                                ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                                                                : "bg-white border-slate-200 text-slate-600 hover:border-cyan-300 hover:text-cyan-600"
                                                    )}
                                                >
                                                    {cat.name}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* SubCategory Selection */}
                                    {selectedCategory && currentSubCategories.length > 0 && (
                                        <div className="animate-in fade-in slide-in-from-top-2 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Sub-Category</label>
                                            <div className="flex flex-wrap gap-2">
                                                {currentSubCategories.map((sub: any) => (
                                                    <button
                                                        key={sub.id}
                                                        onClick={() => setSelectedSubCategory(sub.id)}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-md text-sm transition-all border",
                                                            selectedSubCategory === sub.id
                                                                ? "bg-white border-cyan-500 text-cyan-700 shadow-sm"
                                                                : "bg-transparent border-transparent hover:bg-white hover:border-slate-200 text-slate-600"
                                                        )}
                                                    >
                                                        {sub.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-800 mb-2">Cover Image {isEditing && "(Optional)"}</label>
                                        <div className={cn("relative w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden", coverFile ? "border-cyan-500 bg-cyan-50" : "border-slate-300 hover:border-cyan-400 bg-slate-50")}>
                                            <input type="file" accept="image/*" onChange={handleCoverChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                            {coverPreview ? <Image src={coverPreview} alt="Cover" fill className="object-contain" /> : <div className="text-center p-4"><ImageIcon className="h-8 w-8 text-slate-400 mx-auto mb-2" /><span className="text-sm text-slate-500">Upload Cover</span></div>}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-800 mb-2">{isEditing ? "Replace Content (Optional)" : "Course Content"}</label>
                                        <div className={cn("relative w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50", file ? "border-cyan-500 bg-cyan-50" : "border-slate-300 hover:border-cyan-400")}>
                                            <input type="file" accept=".pdf,.docx,.mp4,.webm,.mov" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                            {file ? <div className="text-center p-4"><FileText className="h-8 w-8 text-cyan-600 mx-auto mb-2 animate-bounce" /><p className="text-sm font-medium text-cyan-700 truncate max-w-[200px]">{file.name}</p></div> : <div className="text-center p-4"><UploadCloud className="h-8 w-8 text-slate-400 mx-auto mb-2" /><p className="text-sm text-slate-500 font-medium">Click to Upload</p><p className="text-xs text-slate-400 mt-1">PDF, DOCX, Video</p></div>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-6">
                                    <button onClick={startUpload} className={cn("px-8 py-3 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center gap-2", "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:scale-105")}>
                                        {isEditing ? <CheckCircle className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />} {isEditing ? "Update Content" : "Start Ingestion"}
                                    </button>
                                </div>
                                {error && <p className="text-center text-red-500 font-medium mt-4">{error}</p>}
                            </div>
                        )}
                        {/* Status Views ... */}
                        {status === 'uploading' && (
                            <div className="max-w-md mx-auto mt-10 text-center">
                                <Loader2 className="h-12 w-12 text-cyan-500 animate-spin mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-800">Uploading... {progress}%</h3>
                                <div className="w-full bg-slate-200 h-3 rounded-full mt-4 overflow-hidden"><div className="bg-cyan-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>
                            </div>
                        )}
                        {status === 'processing' && (
                            <div className="max-w-md mx-auto mt-10 text-center">
                                <div className="relative inline-block"><div className="absolute inset-0 bg-cyan-500 rounded-full animate-ping opacity-20" /><Bot className="h-16 w-16 text-cyan-600 relative z-10" /></div>
                                <h3 className="text-xl font-bold text-slate-800 mt-6">Processing with AI</h3>
                                <p className="text-slate-500 mt-2">Analyzing structure and generating topics...</p>
                            </div>
                        )}
                        {status === 'success' && (
                            <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-200 text-center animate-in zoom-in max-w-2xl mx-auto">
                                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                <h2 className="text-3xl font-bold text-slate-900 mb-2">Success!</h2>
                                <p className="text-slate-600 mb-8">{isEditing ? "Course updated successfully." : "Course created successfully."}</p>
                                <button onClick={() => { setViewMode('list'); resetForm(); }} className="px-6 py-3 bg-slate-900 text-white rounded-lg font-bold">Back to Content List</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
