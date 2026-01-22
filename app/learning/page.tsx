'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { COURSES, BOOKS, Book, Course } from '@/data/mockData';
import {
    BookOpen,
    Clock,
    Award,
    ChevronLeft,
    PlayCircle,
    CheckCircle,
    BarChart,
    Calendar,
    Library,
    Search,
    Plus,
    Bookmark,
    Trash2,
    CheckSquare
} from 'lucide-react';
import QuizHistoryList from '@/components/quiz/QuizHistoryList';
import CertificateCard from '@/components/CertificateCard';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import ProfileDropdown from '@/components/ProfileDropdown';
import { useAuth } from '@/components/AuthProvider';
import { getMyCourses } from '@/app/actions/courses';

export default function MyLearningPage() {
    const [activeTab, setActiveTab] = useState<'courses' | 'library' | 'completed' | 'quizzes' | 'certificates'>('courses');
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [sortOption, setSortOption] = useState<string>('latest_read'); // Default sort
    const [searchQuery, setSearchQuery] = useState('');
    const [isBrowseMode, setIsBrowseMode] = useState(false);

    const { user } = useAuth();
    const [myLibraryIds, setMyLibraryIds] = useState<string[]>([]);
    const [myCourseIds, setMyCourseIds] = useState<string[]>([]);
    const [allCourses, setAllCourses] = useState<any[]>(COURSES);
    const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);

    // Certificates State
    const [circles, setCircles] = useState<any[]>([]); // Circles? No, Certificates
    const [certificates, setCertificates] = useState<any[]>([]);
    const [isLoadingCertificates, setIsLoadingCertificates] = useState(false);

    useEffect(() => {
        // Fetch real courses from API (Catalog)
        const fetchCatalog = async () => {
            try {
                const res = await fetch('/api/courses');
                if (res.ok) {
                    const data = await res.json();
                    setAllCourses(data);
                }
            } catch (error) {
                console.error("Failed to fetch catalog", error);
            }
        };

        fetchCatalog();
    }, []);

    useEffect(() => {
        const fetchEnrollments = async () => {
            if (user?.id) {
                const res = await getMyCourses(user.id);
                if (res.success && res.data) {
                    setEnrolledCourses(res.data);
                    setMyCourseIds(res.data.map((c: any) => c.id));
                }
            }
        };
        fetchEnrollments();
        fetchEnrollments();
    }, [user]);

    // Fetch Certificates
    useEffect(() => {
        const fetchCertificates = async () => {
            if (activeTab === 'certificates') {
                setIsLoadingCertificates(true);
                try {
                    const res = await fetch('/api/certificates/my-collection');
                    if (res.ok) {
                        setCertificates(await res.json());
                    }
                } catch (error) {
                    console.error('Error fetching certificates');
                } finally {
                    setIsLoadingCertificates(false);
                }
            }
        };
        fetchCertificates();
    }, [activeTab]);

    // Derived Data
    // Use enrolledCourses if available, otherwise filter allCourses (fallback)
    const myCourses = enrolledCourses.length > 0 ? enrolledCourses : allCourses.filter(c => myCourseIds.includes(c.id));
    const myBooks = BOOKS.filter(b => myLibraryIds.includes(b.id));

    // Get Categories with Counts
    const getCategories = () => {
        let items = [];
        if (activeTab === 'courses') items = myCourses.filter(c => !c.completedAt);
        else if (activeTab === 'completed') items = myCourses.filter(c => c.completedAt);
        else if (activeTab === 'certificates') return [{ name: 'All', count: certificates.length }]; // Simple filter for certificates
        else items = myBooks;

        const allCats = items.map(i => i.category);
        const uniqueCats = Array.from(new Set(allCats));

        return [
            { name: 'All', count: items.length },
            ...uniqueCats.map(cat => ({
                name: cat,
                count: items.filter(i => i.category === cat).length
            }))
        ];
    };

    const categories = getCategories();

    // Filtered Content
    const getFilteredItems = () => {
        let baseItems = [];
        if (activeTab === 'courses') {
            baseItems = myCourses.filter(c => !c.completedAt); // Active only
        } else if (activeTab === 'completed') {
            baseItems = myCourses.filter(c => c.completedAt); // Completed only
        } else if (activeTab === 'certificates') {
            baseItems = certificates;
        } else {
            baseItems = myBooks;
        }

        const filtered = baseItems.filter(item => {
            const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
            const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });

        // Apply Sorting
        return filtered.sort((a, b) => {
            switch (sortOption) {
                case 'a_z': return a.title.localeCompare(b.title);
                case 'z_a': return b.title.localeCompare(a.title);
                case 'date_desc': return new Date(b.enrolledAt || b.createdAt || 0).getTime() - new Date(a.enrolledAt || a.createdAt || 0).getTime();
                case 'date_asc': return new Date(a.enrolledAt || a.createdAt || 0).getTime() - new Date(b.enrolledAt || b.createdAt || 0).getTime();
                case 'completion_desc': return (b.progress || 0) - (a.progress || 0);
                case 'completion_asc': return (a.progress || 0) - (b.progress || 0);
                case 'latest_read':
                default:
                    return new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime();
            }
        });
    };

    const filteredContent = getFilteredItems();

    // Stats Calculation
    const completedCourses = myCourses.filter(c => c.completedAt);
    const totalLearningSeconds = myCourses.reduce((acc, curr) => acc + (curr.totalTime || 0), 0);
    const totalLearningHours = (totalLearningSeconds / 3600).toFixed(1);

    // Calculate Overall Completion Percentage (of allocated active courses)
    const activeCourses = myCourses.filter(c => !c.completedAt);
    const avgCompletion = activeCourses.length > 0
        ? Math.round(activeCourses.reduce((acc, curr) => acc + (curr.progress || 0), 0) / activeCourses.length)
        : 0;

    // Calculate Avg Read/Day
    const getAvgReadPerDay = () => {
        if (myCourses.length === 0) return '0m';

        // Find earliest enrollment date
        const dates = myCourses
            .map(c => c.enrolledAt ? new Date(c.enrolledAt).getTime() : Date.now())
            .filter(t => t > 0)
            .sort((a, b) => a - b);

        if (dates.length === 0) return '0m';

        const start = dates[0];
        const now = Date.now();
        const diffTime = Math.abs(now - start);
        const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        const avgSeconds = totalLearningSeconds / diffDays;

        if (avgSeconds < 3600) {
            return `${Math.round(avgSeconds / 60)}m`;
        } else {
            return `${(avgSeconds / 3600).toFixed(1)}h`;
        }
    };

    const avgReadDay = getAvgReadPerDay();

    // Helper to format date
    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Helper for duration
    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    // Helper for precise duration calc (Requested format: X days Y hrs Z minutes)
    const calculateDuration = (start: string | Date, end: string | Date) => {
        if (!start || !end) return 'N/A';
        const s = new Date(start).getTime();
        const e = new Date(end).getTime();
        const diffMs = Math.abs(e - s);

        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        const parts = [];
        if (days > 0) parts.push(`${days} days`);
        if (hours > 0) parts.push(`${hours} hrs`);
        parts.push(`${minutes} minutes`);

        return parts.join(' ');
    };

    // ... existing helpers ...

    // ... (keep catalogResults and handle functions) ...
    // Note: I'm skipping the middle lines to matching existing content, assuming standard implementation.
    // Actually, I need to match the replacement block carefully.

    // Let's replace the whole Stats Card rendering block logic or just the calculation setup first?
    // The previous view shows the calculation setup at 119.
    // I will replace from 119 to 136 to insert the helper properly.

    // Wait, I should insert the calculation logic first, then update the UI. 
    // Actually, I can do it in one go if I include the JSX update.
    // BUT replace_file_content is for contiguous blocks. The UI is far down (lines 446-463).
    // So I need TWO edits or ONE multi_replace.
    // I will use multi_replace.

    // ... wait, I'll use multi_replace.


    // Browse Catalog Logic
    const catalogResults = (activeTab === 'courses' ? COURSES : BOOKS).filter(item => {
        const isOwned = activeTab === 'courses' ? myCourseIds.includes(item.id) : myLibraryIds.includes(item.id);
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
        return !isOwned && matchesSearch;
    });

    const handleAddToLibrary = (id: string) => {
        if (activeTab === 'courses') {
            setMyCourseIds([...myCourseIds, id]);
        } else {
            setMyLibraryIds([...myLibraryIds, id]);
        }
        alert("Added to your collection!");
    };

    const handleDeleteCourse = (e: React.MouseEvent, id: string, title: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

        // 1. Remove from State
        setMyCourseIds(prev => prev.filter(cid => cid !== id));
        setAllCourses(prev => prev.filter(c => c.id !== id));

        // 2. Remove from LocalStorage if it's a custom course
        if (id.startsWith('custom-')) {
            try {
                const custom = localStorage.getItem('customCourses');
                if (custom) {
                    const courses = JSON.parse(custom);
                    const updated = courses.filter((c: any) => c.id !== id);
                    localStorage.setItem('customCourses', JSON.stringify(updated));
                }
            } catch (err) {
                console.error("Error deleting from local storage", err);
            }
        }
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
                        <div className="text-white font-bold text-lg">My Learning Centre</div>
                        <div className="absolute right-0 flex items-center gap-4">
                            <ProfileDropdown />
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Header & Search */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 mb-1">My Collection</h1>
                                <p className="text-slate-600 text-sm">Manage your courses and library resources.</p>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto items-center">
                                {/* Sort Dropdown */}
                                <div className="relative">
                                    <select
                                        className="appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white min-w-[130px]"
                                        value={sortOption}
                                        onChange={(e) => setSortOption(e.target.value)}
                                    >
                                        <option value="latest_read">Last Read</option>
                                        <option value="a_z">Title (A-Z)</option>
                                        <option value="z_a">Title (Z-A)</option>
                                        <option value="date_desc">Newest</option>
                                        <option value="date_asc">Oldest</option>
                                        <option value="completion_desc">Progress (High)</option>
                                        <option value="completion_asc">Progress (Low)</option>
                                    </select>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>

                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search library & catalog..."
                                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            if (e.target.value.length > 0) setIsBrowseMode(true);
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={() => { setIsBrowseMode(true); setSearchQuery(''); }}
                                    className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 whitespace-nowrap"
                                >
                                    + Add New
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-200">
                            <button
                                onClick={() => { setActiveTab('courses'); setActiveCategory('All'); setIsBrowseMode(false); }}
                                className={cn(
                                    "px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2",
                                    activeTab === 'courses' ? "border-cyan-500 text-cyan-600" : "border-transparent text-slate-500 hover:text-slate-800"
                                )}
                            >
                                <BookOpen className="h-4 w-4" /> My Courses
                            </button>
                            <button
                                onClick={() => { setActiveTab('completed'); setActiveCategory('All'); setIsBrowseMode(false); }}
                                className={cn(
                                    "px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2",
                                    activeTab === 'completed' ? "border-green-500 text-green-600" : "border-transparent text-slate-500 hover:text-slate-800"
                                )}
                            >
                                <CheckCircle className="h-4 w-4" /> Completed
                            </button>
                            <button
                                onClick={() => { setActiveTab('library'); setActiveCategory('All'); setIsBrowseMode(false); }}
                                className={cn(
                                    "px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2",
                                    activeTab === 'library' ? "border-purple-500 text-purple-600" : "border-transparent text-slate-500 hover:text-slate-800"
                                )}
                            >
                                <Library className="h-4 w-4" /> My Library
                            </button>
                            <button
                                onClick={() => { setActiveTab('quizzes'); setActiveCategory('All'); setIsBrowseMode(false); }}
                                className={cn(
                                    "px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2",
                                    activeTab === 'quizzes' ? "border-amber-500 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-800"
                                )}
                            >
                                <CheckSquare className="h-4 w-4" /> My Quizzes
                            </button>
                            <button
                                onClick={() => { setActiveTab('certificates'); setActiveCategory('All'); setIsBrowseMode(false); }}
                                className={cn(
                                    "px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2",
                                    activeTab === 'certificates' ? "border-cyan-500 text-cyan-600" : "border-transparent text-slate-500 hover:text-slate-800"
                                )}
                            >
                                <Award className="h-4 w-4" /> Certificates
                            </button>
                        </div>

                        {/* Quiz Content */}
                        {activeTab === 'quizzes' && (
                            <div className="pt-4">
                                <QuizHistoryList />
                            </div>
                        )}

                        {/* Category Filters */}
                        {!isBrowseMode && activeTab !== 'quizzes' && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat.name}
                                        onClick={() => setActiveCategory(cat.name)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                                            activeCategory === cat.name
                                                ? (activeTab === 'courses' ? "bg-cyan-50 text-cyan-700 border-cyan-200" : (activeTab === 'completed' ? "bg-green-50 text-green-700 border-green-200" : "bg-purple-50 text-purple-700 border-purple-200"))
                                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                        )}
                                    >
                                        {cat.name} ({cat.count})
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Content Grid */}
                        <div className="space-y-4">
                            {/* Browse Mode Results */}
                            {isBrowseMode && searchQuery && (
                                <div className="mb-8">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                                        Search Results from Global Catalog
                                    </h3>
                                    {catalogResults.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {catalogResults.map((item: any) => (
                                                <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 flex gap-4 hover:shadow-md transition-shadow">
                                                    <div className="h-20 w-16 bg-slate-200 rounded-lg shrink-0 overflow-hidden">
                                                        <img src={item.thumbnail || item.cover} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-xl font-bold text-slate-900 truncate">{item.title}</h4>
                                                        <p className="text-xs text-slate-500 mb-2">{item.category}</p>
                                                        <button
                                                            onClick={() => handleAddToLibrary(item.id)}
                                                            className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-slate-800 flex items-center gap-1"
                                                        >
                                                            <Plus className="h-3 w-3" /> Add to Collection
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 text-sm italic">No new items found matching "{searchQuery}".</p>
                                    )}
                                    <div className="border-t border-slate-200 my-6"></div>
                                </div>
                            )}

                            {/* My Collection Items */}
                            {activeTab !== 'quizzes' && activeTab !== 'certificates' && (filteredContent.length > 0 ? (
                                filteredContent.map((item: any) => (
                                    <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6">
                                        <div className="w-full md:w-40 h-28 rounded-xl bg-slate-200 overflow-hidden shrink-0 relative group">
                                            <img src={item.thumbnail || item.cover} alt={item.title} className="w-full h-full object-cover" />
                                            {(activeTab === 'courses' || activeTab === 'completed') && (
                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <PlayCircle className="h-10 w-10 text-white drop-shadow-lg" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={cn(
                                                        "text-xs font-bold px-2 py-1 rounded uppercase tracking-wider",
                                                        activeTab === 'courses' ? "text-cyan-600 bg-cyan-50" : (activeTab === 'completed' ? "text-green-600 bg-green-50" : "text-purple-600 bg-purple-50")
                                                    )}>
                                                        {item.category}
                                                    </span>
                                                </div>
                                                <h3 className="text-2xl font-bold text-slate-900 mb-1">{item.title}</h3>
                                                <p className="text-xs text-slate-500 mb-3 line-clamp-1">
                                                    {(activeTab === 'courses' || activeTab === 'completed')
                                                        ? `${item.chapters?.length || 0} Chapters • ${item.totalTopics || 0} Topics • ${activeTab === 'courses' ? calculateDuration(item.enrolledAt, new Date()) : calculateDuration(item.enrolledAt, item.completedAt)}`
                                                        : `${item.author} • ${item.readTime || 'N/A'} read`}
                                                </p>

                                            </div>

                                            {activeTab === 'completed' && (
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600 bg-green-50/50 p-3 rounded-lg border border-green-100 mb-4">
                                                    <div>
                                                        <span className="block font-bold text-slate-400 uppercase text-[10px]">Started</span>
                                                        {formatDate(item.enrolledAt)}
                                                    </div>
                                                    <div>
                                                        <span className="block font-bold text-slate-400 uppercase text-[10px]">Finished</span>
                                                        {formatDate(item.completedAt)}
                                                    </div>
                                                    <div className="col-span-2 pt-2 border-t border-green-200 mt-2">
                                                        <span className="block font-bold text-slate-400 uppercase text-[10px]">Total Time</span>
                                                        <span className="font-bold text-slate-900">{formatDuration(item.totalTime || 0)}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'courses' ? (
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs font-medium">
                                                        <span className="text-slate-700">{item.progress || 0}% Complete</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                        <div
                                                            className="bg-cyan-500 h-full rounded-full transition-all duration-1000"
                                                            style={{ width: `${item.progress || 0}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : activeTab === 'library' ? (
                                                <div className="space-y-2 text-xs">
                                                    <p className="text-sm text-slate-600 line-clamp-2">{item.description}</p>
                                                    {/* Book Details */}
                                                    <div className="flex justify-between items-center text-slate-500 pt-2 border-t border-slate-100">
                                                        <span>Undefined Modules</span>
                                                        <span>No Modules</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-slate-500">
                                                        <span>Exp. Read Time: {item.readTime || '2h'}</span>
                                                        <span>Read: 0h</span>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="flex items-end">
                                            {activeTab === 'courses' ? (
                                                (item.progress === 100 || item.completedAt) ? (
                                                    <Link
                                                        href={`/learn/${item.id}?preview=true`}
                                                        className="w-full md:w-auto px-5 py-2.5 bg-emerald-600 text-white text-sm rounded-xl font-bold hover:bg-emerald-700 transition-colors text-center flex items-center justify-center gap-2"
                                                    >
                                                        <BookOpen className="h-4 w-4" /> Review
                                                    </Link>
                                                ) : (
                                                    <Link
                                                        href={`/learn/${item.id}`}
                                                        className="w-full md:w-auto px-5 py-2.5 bg-slate-900 text-white text-sm rounded-xl font-bold hover:bg-slate-800 transition-colors text-center"
                                                    >
                                                        {item.progress === 0 ? 'Start' : 'Continue'}
                                                    </Link>
                                                )
                                            ) : activeTab === 'completed' ? (
                                                <Link
                                                    href={`/learn/${item.id}?preview=true`}
                                                    className="w-full md:w-auto px-5 py-2.5 border border-slate-200 text-slate-700 text-sm rounded-xl font-bold hover:bg-slate-50 transition-colors text-center flex items-center justify-center gap-2"
                                                >
                                                    <BookOpen className="h-4 w-4" /> Read Again
                                                </Link>
                                            ) : (
                                                <button className="w-full md:w-auto px-5 py-2.5 border border-slate-200 text-slate-700 text-sm rounded-xl font-bold hover:bg-slate-50 transition-colors text-center flex items-center justify-center gap-2">
                                                    <BookOpen className="h-4 w-4" /> Read Now
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-slate-500">
                                    <p>No items found in this category.</p>
                                    {activeTab !== 'completed' && (
                                        <button onClick={() => { setSearchQuery(' '); setIsBrowseMode(true); }} className="text-cyan-600 font-bold hover:underline mt-2">
                                            Browse Catalog
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Certificates Tab */}
                        {activeTab === 'certificates' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                                {filteredContent.length === 0 ? (
                                    <div className="col-span-full text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Award className="h-8 w-8 text-slate-300" />
                                        </div>
                                        <h3 className="text-lg font-medium text-slate-900">No Certificates Earned Yet</h3>
                                        <p className="text-slate-500 max-w-sm mx-auto mt-2">
                                            Complete courses to earn certificates and track your achievements here.
                                        </p>
                                    </div>
                                ) : (
                                    filteredContent.map((cert: any) => (
                                        <CertificateCard key={cert.id} cert={cert} />
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sidebar: Stats & Achievements */}
                    <div className="space-y-8">
                        {/* Stats Card */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <BarChart className="h-5 w-5 text-cyan-400" /> Learning Stats
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Hours</p>
                                    <p className="text-2xl font-bold">{totalLearningHours}</p>
                                </div>
                                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Courses</p>
                                    <p className="text-2xl font-bold">{completedCourses.length} <span className="text-sm font-normal text-slate-400">/ {enrolledCourses.length}</span></p>
                                </div>
                                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Avg Read/Day</p>
                                    <p className="text-2xl font-bold text-purple-400">{avgReadDay}</p>
                                </div>
                                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Completion</p>
                                    <p className="text-2xl font-bold text-green-400">{avgCompletion}%</p>
                                </div>
                            </div>
                        </div>



                    </div>
                </div>
            </div>
        </div>
    );
}
