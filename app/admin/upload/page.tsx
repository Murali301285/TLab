'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    UploadCloud,
    FileText,
    CheckCircle,
    Loader2,
    ChevronLeft,
    ArrowRight,
    AlertCircle,
    Book,
    Layers,
    File,
    Upload,
    Shield,
    X,
    Video,
    Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ProfileDropdown from '@/components/ProfileDropdown';

export default function AdminUploadPage() {
    const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'review' | 'success'>('idle');
    const [progress, setProgress] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const [newCategory, setNewCategory] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [categories, setCategories] = useState([
        { id: 'library', name: 'Library (General Knowledge)' },
        { id: 'hr', name: 'HR & Policies' },
        { id: 'engineering', name: 'Engineering & Tech' },
        { id: 'compliance', name: 'Legal & Compliance' },
        { id: 'sales', name: 'Sales & Marketing' }
    ]);

    interface ContentItem {
        id: string;
        title: string;
        category: string;
        type: 'pdf' | 'video' | 'doc';
        size: string;
        date: string;
        status: 'active' | 'inactive';
    }

    const [contentItems, setContentItems] = useState<ContentItem[]>([
        { id: '1', title: 'Corporate Sales Playbook 2024', category: 'sales', type: 'pdf', size: '12 MB', date: 'Oct 12, 2023', status: 'active' },
        { id: '2', title: 'Engineering Onboarding', category: 'engineering', type: 'video', size: '450 MB', date: 'Nov 01, 2023', status: 'active' },
        { id: '3', title: 'HR Policy Handbook', category: 'hr', type: 'pdf', size: '5 MB', date: 'Sep 15, 2023', status: 'active' },
        { id: '4', title: 'Q4 Marketing Strategy', category: 'sales', type: 'doc', size: '2 MB', date: 'Dec 01, 2023', status: 'inactive' },
    ]);

    const toggleStatus = (id: string) => {
        setContentItems(items => items.map(item =>
            item.id === id ? { ...item, status: item.status === 'active' ? 'inactive' : 'active' } : item
        ));
    };

    // Mock extracted data
    const [extractedData, setExtractedData] = useState<any>(null);

    const handleAddCategory = () => {
        if (newCategory.trim()) {
            const id = newCategory.toLowerCase().replace(/\s+/g, '-');
            setCategories([...categories, { id, name: newCategory }]);
            setSelectedCategory(id);
            setNewCategory('');
            setIsAddingCategory(false);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (file: File) => {
        const validTypes = ['application/pdf', 'video/mp4', 'video/webm', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (validTypes.includes(file.type) || file.name.endsWith('.pdf') || file.name.endsWith('.docx')) {
            setFile(file);
            setStatus('idle');
            setError(null);
        } else {
            setError("Please upload a valid PDF, Word, or Video file.");
            setFile(null);
        }
    };

    const startUpload = async () => {
        if (!selectedCategory) {
            setError("Please select a category first.");
            return;
        }
        if (!file) return;

        setStatus('uploading');
        setError(null);

        // Simulate upload progress visual only
        let p = 0;
        const interval = setInterval(() => {
            p += 5;
            if (p < 90) setProgress(p);
        }, 100);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', selectedCategory);

            // Transition to processing state
            setTimeout(() => setStatus('processing'), 1000);

            const response = await fetch('/api/ingest', {
                method: 'POST',
                body: formData,
            });

            clearInterval(interval);
            setProgress(100);

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            setExtractedData(data);
            setStatus('review');

        } catch (error) {
            console.error(error);
            setError("Failed to process document. Please try again.");
            setStatus('idle');
        }
    };

    const handleSave = () => {
        setStatus('success');
        // In a real app, this would save to the database
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Navigation */}
            <nav className="sticky top-0 z-50 bg-slate-900 border-b border-white/10 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative flex items-center justify-center h-16">
                        <div className="absolute left-0 flex items-center gap-4">
                            <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                                <ChevronLeft className="h-5 w-5" />
                                <span className="font-medium">Back to Dashboard</span>
                            </Link>
                        </div>
                        <div className="text-white font-bold text-lg">Admin Content Ingestion</div>
                        <div className="absolute right-0 flex items-center gap-4">
                            <ProfileDropdown />
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto px-4 py-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Content Management</h1>
                    <p className="text-slate-600">
                        Upload new courses or manage existing materials. Supports PDF, Word, and Video.
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={cn(
                            "px-4 py-2 text-sm font-bold border-b-2 transition-colors",
                            activeTab === 'upload' ? "border-cyan-500 text-cyan-700" : "border-transparent text-slate-500 hover:text-slate-800"
                        )}
                    >
                        Upload New
                    </button>
                    <button
                        onClick={() => setActiveTab('manage')}
                        className={cn(
                            "px-4 py-2 text-sm font-bold border-b-2 transition-colors",
                            activeTab === 'manage' ? "border-cyan-500 text-cyan-700" : "border-transparent text-slate-500 hover:text-slate-800"
                        )}
                    >
                        Manage Content
                    </button>
                </div>

                {activeTab === 'upload' ? (
                    <>
                        {/* Upload Area */}
                        {status === 'idle' && (
                            <div className="space-y-6">
                                {/* Category Selection */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Select Section / Category
                                    </label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {categories.map((cat) => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setSelectedCategory(cat.id)}
                                                className={cn(
                                                    "px-4 py-3 rounded-lg text-sm font-medium border transition-all text-left",
                                                    selectedCategory === cat.id
                                                        ? "bg-cyan-50 border-cyan-500 text-cyan-700 ring-1 ring-cyan-500"
                                                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-cyan-300 hover:bg-white"
                                                )}
                                            >
                                                {cat.name}
                                            </button>
                                        ))}
                                        {isAddingCategory ? (
                                            <div className="flex items-center gap-2 px-2">
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                                    placeholder="Category Name"
                                                    value={newCategory}
                                                    onChange={(e) => setNewCategory(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleAddCategory();
                                                        if (e.key === 'Escape') setIsAddingCategory(false);
                                                    }}
                                                />
                                                <button onClick={handleAddCategory} className="p-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                                                    <CheckCircle className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => setIsAddingCategory(false)} className="p-2 text-slate-400 hover:text-slate-600">
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setIsAddingCategory(true)}
                                                className="px-4 py-3 rounded-lg text-sm font-medium border border-dashed border-slate-300 text-slate-500 hover:border-cyan-400 hover:text-cyan-600 hover:bg-cyan-50 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Plus className="h-4 w-4" /> Add New Category
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div
                                    className={cn(
                                        "border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-all bg-white",
                                        dragActive ? "border-cyan-500 bg-cyan-50" : "border-slate-300 hover:border-cyan-400"
                                    )}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                >
                                    <div className="w-20 h-20 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center mb-6">
                                        {file ? <FileText className="h-10 w-10" /> : <UploadCloud className="h-10 w-10" />}
                                    </div>

                                    {file ? (
                                        <div className="mb-6">
                                            <p className="text-xl font-bold text-slate-900 mb-2">{file.name}</p>
                                            <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            <button
                                                onClick={() => setFile(null)}
                                                className="text-red-500 text-sm hover:underline mt-2"
                                            >
                                                Remove file
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="mb-6">
                                            <p className="text-xl font-bold text-slate-900 mb-2">Drag & Drop your document here</p>
                                            <p className="text-slate-500 mb-4">Supports PDF, DOCX, MP4 (Max 50MB)</p>
                                        </div>
                                    )}

                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="file-upload"
                                            className="hidden"
                                            onChange={handleChange}
                                            accept=".pdf,.docx,.doc,video/*"
                                        />
                                        {!file && (
                                            <label
                                                htmlFor="file-upload"
                                                className="px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 cursor-pointer transition-colors inline-flex items-center gap-2"
                                            >
                                                Browse Files
                                            </label>
                                        )}
                                        {file && (
                                            <button
                                                onClick={startUpload}
                                                disabled={!selectedCategory}
                                                className={cn(
                                                    "px-8 py-3 rounded-lg font-bold transition-all inline-flex items-center gap-2",
                                                    selectedCategory
                                                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:shadow-lg hover:scale-105"
                                                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                                )}
                                            >
                                                Start Processing <ArrowRight className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                    {error && (
                                        <p className="text-red-500 text-sm mt-4 font-medium flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4" /> {error}
                                        </p>
                                    )}
                                </div>

                                <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3 text-sm text-blue-700 border border-blue-100">
                                    <Shield className="h-5 w-5 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold mb-1">Data Security Note</p>
                                        <p>
                                            Text extraction is performed locally on this server.
                                            If an API Key is configured, only the extracted text is sent to the AI provider for analysis.
                                            No files are stored permanently on external servers.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Progress State */}
                        {(status === 'uploading' || status === 'processing') && (
                            <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-200 text-center">
                                <div className="w-20 h-20 mx-auto bg-cyan-50 text-cyan-600 rounded-full flex items-center justify-center mb-6 relative">
                                    {status === 'processing' ? (
                                        <Loader2 className="h-10 w-10 animate-spin" />
                                    ) : (
                                        <UploadCloud className="h-10 w-10 animate-bounce" />
                                    )}
                                </div>

                                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                    {status === 'uploading' ? 'Uploading Document...' : 'AI Processing...'}
                                </h2>
                                <p className="text-slate-500 mb-8 max-w-md mx-auto">
                                    {status === 'uploading'
                                        ? 'Please wait while we securely upload your file.'
                                        : 'Our AI is analyzing the content, extracting chapters, and generating study materials.'}
                                </p>

                                <div className="max-w-md mx-auto">
                                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                                        <span>Progress</span>
                                        <span>{status === 'processing' ? 'Analyzing...' : `${progress}%`}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all duration-500",
                                                status === 'processing' ? "bg-purple-500 w-full animate-pulse" : "bg-cyan-500"
                                            )}
                                            style={{ width: status === 'processing' ? '100%' : `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Review State */}
                        {status === 'review' && extractedData && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-800">
                                    <CheckCircle className="h-5 w-5" />
                                    <span className="font-medium">Analysis Complete! Review the extracted structure below.</span>
                                </div>

                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900">{extractedData.title}</h2>
                                            <p className="text-sm text-slate-500">
                                                Extracted from {file?.name} • <span className="font-medium text-cyan-600">{extractedData.category}</span>
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold border border-purple-200">
                                                {extractedData.chapters.length} Chapters
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-6">
                                        {extractedData.chapters.map((chapter: any, idx: number) => (
                                            <div key={idx} className="border border-slate-200 rounded-xl p-4 hover:border-cyan-200 transition-colors">
                                                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                                                    <Book className="h-4 w-4 text-cyan-600" />
                                                    {chapter.title}
                                                </h3>
                                                <div className="pl-6 space-y-2">
                                                    {chapter.topics.map((topic: string, tIdx: number) => (
                                                        <div key={tIdx} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                                                            <File className="h-3 w-3 text-slate-400" />
                                                            {topic}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-4">
                                        <button
                                            onClick={() => setStatus('idle')}
                                            className="px-6 py-2 text-slate-600 font-medium hover:text-slate-900"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            className="px-6 py-2 bg-cyan-600 text-white rounded-lg font-bold hover:bg-cyan-700 shadow-lg shadow-cyan-500/20"
                                        >
                                            Confirm & Create Course
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Success State */}
                        {status === 'success' && (
                            <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-200 text-center animate-in zoom-in duration-300">
                                <div className="w-20 h-20 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                                    <CheckCircle className="h-10 w-10" />
                                </div>
                                <h2 className="text-3xl font-bold text-slate-900 mb-4">Course Created Successfully!</h2>
                                <p className="text-slate-600 mb-8 max-w-md mx-auto">
                                    The content has been ingested and AI study aids have been generated. You can now assign this course to users.
                                </p>
                                <div className="flex justify-center gap-4">
                                    <button
                                        onClick={() => setStatus('idle')}
                                        className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
                                    >
                                        Upload Another
                                    </button>
                                    <Link
                                        href="/dashboard"
                                        className="px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800"
                                    >
                                        Go to Dashboard
                                    </Link>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="space-y-8">
                        {categories.map(category => {
                            const categoryItems = contentItems.filter(item => item.category === category.id);
                            if (categoryItems.length === 0) return null;

                            return (
                                <div key={category.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                            <Layers className="h-5 w-5 text-cyan-600" />
                                            {category.name}
                                        </h3>
                                        <span className="text-xs font-bold bg-white px-2 py-1 rounded border border-slate-200 text-slate-500">
                                            {categoryItems.length} Items
                                        </span>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {categoryItems.map(item => (
                                            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "h-12 w-12 rounded-lg flex items-center justify-center",
                                                        item.status === 'active' ? "bg-cyan-50 text-cyan-600" : "bg-slate-100 text-slate-400"
                                                    )}>
                                                        {item.type === 'video' ? <Video className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                                                    </div>
                                                    <div>
                                                        <h4 className={cn("font-bold", item.status === 'active' ? "text-slate-900" : "text-slate-500")}>
                                                            {item.title}
                                                        </h4>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                                            <span>{item.date}</span>
                                                            <span>•</span>
                                                            <span>{item.size}</span>
                                                            {item.status === 'inactive' && (
                                                                <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium">Inactive</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => alert(`Edit ${item.title}`)}
                                                        className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors border border-transparent hover:border-cyan-100"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => toggleStatus(item.id)}
                                                        className={cn(
                                                            "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border",
                                                            item.status === 'active'
                                                                ? "text-red-600 hover:bg-red-50 border-transparent hover:border-red-100"
                                                                : "text-green-600 hover:bg-green-50 border-transparent hover:border-green-100"
                                                        )}
                                                    >
                                                        {item.status === 'active' ? 'Mark Inactive' : 'Activate'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                        {contentItems.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>No content found.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
