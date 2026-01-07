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
    Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ProfileDropdown from '@/components/ProfileDropdown';

export default function MyLearningPage() {
    const [activeTab, setActiveTab] = useState<'courses' | 'library'>('courses');
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [isBrowseMode, setIsBrowseMode] = useState(false);

    // Mock User State (In real app, this comes from auth context)
    // Mock User State (In real app, this comes from auth context)
    const [myLibraryIds, setMyLibraryIds] = useState<string[]>(['b1', 'b2']);
    const [myCourseIds, setMyCourseIds] = useState<string[]>(['c1', 'c2', 'c3']);
    const [allCourses, setAllCourses] = useState<any[]>(COURSES);

    useEffect(() => {
        // Fetch real courses from API
        const fetchCourses = async () => {
            try {
                const res = await fetch('/api/courses');
                if (res.ok) {
                    const data = await res.json();
                    setAllCourses(data); // Replace static courses with DB courses
                    // For demo, assume user owns all courses or use a logic
                    const allIds = data.map((c: any) => c.id);
                    setMyCourseIds(allIds);
                }
            } catch (error) {
                console.error("Failed to fetch courses", error);
            }
        };

        fetchCourses();
    }, []);

    // Derived Data
    const myCourses = allCourses.filter(c => myCourseIds.includes(c.id));
    const myBooks = BOOKS.filter(b => myLibraryIds.includes(b.id));

    // Get Categories with Counts
    const getCategories = () => {
        const items = activeTab === 'courses' ? myCourses : myBooks;
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
    const filteredContent = (activeTab === 'courses' ? myCourses : myBooks).filter(item => {
        const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

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
                            <div className="flex gap-2 w-full md:w-auto">
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
                                onClick={() => { setActiveTab('library'); setActiveCategory('All'); setIsBrowseMode(false); }}
                                className={cn(
                                    "px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2",
                                    activeTab === 'library' ? "border-purple-500 text-purple-600" : "border-transparent text-slate-500 hover:text-slate-800"
                                )}
                            >
                                <Library className="h-4 w-4" /> My Library
                            </button>
                        </div>

                        {/* Category Filters */}
                        {!isBrowseMode && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat.name}
                                        onClick={() => setActiveCategory(cat.name)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                                            activeCategory === cat.name
                                                ? (activeTab === 'courses' ? "bg-cyan-50 text-cyan-700 border-cyan-200" : "bg-purple-50 text-purple-700 border-purple-200")
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
                                                        <h4 className="font-bold text-slate-900 truncate">{item.title}</h4>
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
                            {filteredContent.length > 0 ? (
                                filteredContent.map((item: any) => (
                                    <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6">
                                        <div className="w-full md:w-40 h-28 rounded-xl bg-slate-200 overflow-hidden shrink-0 relative group">
                                            <img src={item.thumbnail || item.cover} alt={item.title} className="w-full h-full object-cover" />
                                            {activeTab === 'courses' && (
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
                                                        activeTab === 'courses' ? "text-cyan-600 bg-cyan-50" : "text-purple-600 bg-purple-50"
                                                    )}>
                                                        {item.category}
                                                    </span>
                                                    <button
                                                        onClick={(e) => handleDeleteCourse(e, item.id, item.title)}
                                                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                                        title="Remove from collection"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-900 mb-1">{item.title}</h3>
                                                <p className="text-xs text-slate-500 mb-3 line-clamp-1">
                                                    {activeTab === 'courses' ? `${item.totalModules} Modules • 2h 15m` : `${item.author} • ${item.readTime} read`}
                                                </p>
                                            </div>

                                            {activeTab === 'courses' ? (
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs font-medium">
                                                        <span className="text-slate-700">{item.progress}% Complete</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                        <div
                                                            className="bg-cyan-500 h-full rounded-full transition-all duration-1000"
                                                            style={{ width: `${item.progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-600 line-clamp-2">{item.description}</p>
                                            )}
                                        </div>

                                        <div className="flex items-end">
                                            {activeTab === 'courses' ? (
                                                <Link
                                                    href={`/learn/${item.id}`}
                                                    className="w-full md:w-auto px-5 py-2.5 bg-slate-900 text-white text-sm rounded-xl font-bold hover:bg-slate-800 transition-colors text-center"
                                                >
                                                    {item.progress === 0 ? 'Start' : 'Continue'}
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
                                    <button onClick={() => { setSearchQuery(' '); setIsBrowseMode(true); }} className="text-cyan-600 font-bold hover:underline mt-2">
                                        Browse Catalog
                                    </button>
                                </div>
                            )}
                        </div>
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
                                    <p className="text-2xl font-bold">12.5</p>
                                </div>
                                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Courses</p>
                                    <p className="text-2xl font-bold">{myCourses.length}</p>
                                </div>
                                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Books</p>
                                    <p className="text-2xl font-bold text-purple-400">{myBooks.length}</p>
                                </div>
                                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Avg Score</p>
                                    <p className="text-2xl font-bold text-green-400">92%</p>
                                </div>
                            </div>
                        </div>

                        {/* Certificates */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Award className="h-5 w-5 text-yellow-500" /> Certificates
                            </h3>
                            <div className="space-y-4">
                                <div className="group cursor-pointer">
                                    <div className="relative h-32 rounded-xl overflow-hidden mb-2 border border-slate-200">
                                        <img src="https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&q=80" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white text-xs font-bold border border-white px-3 py-1 rounded-full">View PDF</span>
                                        </div>
                                    </div>
                                    <p className="font-bold text-slate-900 text-sm">Communication Mastery</p>
                                    <p className="text-xs text-slate-500">Issued Sep 20, 2023</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
