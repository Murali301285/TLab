'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, FileText, BookOpen, ScrollText, Loader2, Calendar, Search, Filter, Lock, Trash2, GraduationCap, Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface UserAssignmentsModalProps {
    userId: string;
    userName: string;
    onClose: () => void;
    onUpdate?: () => void;
}

interface AssignedItem {
    id: string;
    title: string;
    description?: string;
    thumbnail?: string;
    type: 'COURSE' | 'LIBRARY' | 'POLICY';
    assignedAt: string;
    lastAccessed?: string;
    moduleCount?: number;
    status: string;
    progress: number;
}

interface QuizHistoryItem {
    id: string;
    courseName: string;
    score: number;
    totalQuestions: number;
    passed: boolean;
    date: string;
}

export default function UserAssignmentsModal({ userId, userName, onClose, onUpdate }: UserAssignmentsModalProps) {
    const [activeTab, setActiveTab] = useState<'assignments' | 'quiz'>('assignments');
    const [assignments, setAssignments] = useState<AssignedItem[]>([]);
    const [quizHistory, setQuizHistory] = useState<QuizHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters & Sort
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'COURSE' | 'LIBRARY' | 'POLICY'>('ALL');
    const [sortOrder, setSortOrder] = useState('newest');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/admin/users/${userId}/assignments`);
                if (!res.ok) throw new Error('Failed to fetch data');
                const data = await res.json();
                setAssignments(data.assignments || []);
                setQuizHistory(data.quizHistory || []);
            } catch (error) {
                console.error(error);
                toast.error('Could not load user data');
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchData();
        }
    }, [userId]);

    const handleDelete = async (courseId: string, courseTitle: string) => {
        if (!confirm(`Are you sure you want to unassign "${courseTitle}"? This will remove access for the user.`)) return;

        try {
            const res = await fetch(`/api/admin/users/${userId}/assignments?courseId=${courseId}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Failed to unassign course');

            toast.success('Course unassigned successfully');
            // Remove from local state
            setAssignments(prev => prev.filter(a => a.id !== courseId));
            // Notify parent
            onUpdate?.();
        } catch (error) {
            console.error(error);
            toast.error('Failed to unassign course');
        }
    };

    // Derived Data
    const filteredAssignments = assignments.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
        return matchesSearch && matchesType;
    }).sort((a, b) => {
        if (sortOrder === 'newest') return new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime();
        if (sortOrder === 'oldest') return new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime();
        return a.title.localeCompare(b.title);
    });

    const paginatedAssignments = filteredAssignments.slice(0, itemsPerPage); // Simple pagination for now (slice)

    const CourseCard = ({ item }: { item: AssignedItem }) => (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full">
            <div className="relative h-40 bg-slate-100">
                {item.thumbnail ? (
                    <Image
                        src={item.thumbnail}
                        alt={item.title}
                        fill
                        className="object-cover"
                        onError={(e) => {
                            // Hide image and show placeholder on error
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('image-error');
                        }}
                    />
                ) : null}

                {/* Fallback for null thumbnail or error (using CSS check or simple overlay) */}
                <div className={cn("flex items-center justify-center h-full text-slate-300", item.thumbnail ? "image-error-fallback hidden" : "")}>
                    {item.type === 'POLICY' ? <ScrollText className="h-12 w-12" /> :
                        item.type === 'LIBRARY' ? <BookOpen className="h-12 w-12" /> :
                            <FileText className="h-12 w-12" />}
                </div>
                <div className="absolute top-3 left-3">
                    <span className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md",
                        item.type === 'POLICY' ? 'bg-amber-100/90 text-amber-800' :
                            item.type === 'LIBRARY' ? 'bg-emerald-100/90 text-emerald-800' : 'bg-blue-100/90 text-blue-800'
                    )}>
                        {item.type}
                    </span>
                </div>
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-full px-2 py-0.5 text-[10px] font-bold text-slate-600 shadow-sm">
                    {item.moduleCount || 0} Modules
                </div>
            </div>

            <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-slate-900 line-clamp-2 mb-1" title={item.title}>{item.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">
                    {item.description || "No description provided."}
                </p>

                <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Assigned: {new Date(item.assignedAt).toLocaleDateString()}</span>
                    </div>
                    {item.lastAccessed && (
                        <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Last Access: {new Date(item.lastAccessed).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>

                <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700">In Progress</span>
                        <span className="text-slate-900">{item.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${item.progress}%` }}
                        />
                    </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
                        View Content
                    </button>
                    <div className="flex gap-2">
                        {item.status !== 'ACTIVE' && <Lock className="h-4 w-4 text-slate-400" />}
                        <button
                            onClick={() => handleDelete(item.id, item.title)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                            title="Unassign Course"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">User Progress & History</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                                {userName.charAt(0)}
                            </div>
                            <p className="text-slate-500">For <span className="font-semibold text-slate-900">{userName}</span></p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 border-b border-slate-100 bg-white shrink-0">
                    <div className="flex gap-8">
                        <button
                            onClick={() => setActiveTab('assignments')}
                            className={cn(
                                "py-4 text-sm font-bold border-b-2 transition-colors relative",
                                activeTab === 'assignments' ? "text-indigo-600 border-indigo-600" : "text-slate-500 border-transparent hover:text-slate-700"
                            )}
                        >
                            Assigned Content <span className="ml-2 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{assignments.length}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('quiz')}
                            className={cn(
                                "py-4 text-sm font-bold border-b-2 transition-colors relative",
                                activeTab === 'quiz' ? "text-indigo-600 border-indigo-600" : "text-slate-500 border-transparent hover:text-slate-700"
                            )}
                        >
                            Quiz History
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 className="h-10 w-10 animate-spin mb-4 text-indigo-500" />
                            <p>Loading data...</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'assignments' && (
                                <div className="space-y-6">
                                    {/* Toolbar */}
                                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                                        <div className="relative w-full md:w-96">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Search courses..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                                            <select
                                                value={sortOrder}
                                                onChange={(e) => setSortOrder(e.target.value)}
                                                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="newest">Newest Assigned</option>
                                                <option value="oldest">Oldest Assigned</option>
                                                <option value="alpha">A-Z</option>
                                            </select>
                                            <select
                                                value={itemsPerPage}
                                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none w-20"
                                            >
                                                <option value={10}>10</option>
                                                <option value={20}>20</option>
                                                <option value={50}>50</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Filters */}
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {[
                                            { id: 'ALL', label: 'All', count: assignments.length },
                                            { id: 'COURSE', label: 'Course', count: assignments.filter(a => a.type === 'COURSE').length },
                                            { id: 'POLICY', label: 'Policy', count: assignments.filter(a => a.type === 'POLICY').length },
                                            { id: 'LIBRARY', label: 'Library', count: assignments.filter(a => a.type === 'LIBRARY').length },
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => setTypeFilter(f.id as any)}
                                                className={cn(
                                                    "px-4 py-1.5 rounded-full text-xs font-bold transition-colors border",
                                                    typeFilter === f.id
                                                        ? "bg-indigo-600 text-white border-indigo-600"
                                                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                                                )}
                                            >
                                                {f.label} ({f.count})
                                            </button>
                                        ))}
                                    </div>

                                    {/* Grid */}
                                    {paginatedAssignments.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                            {paginatedAssignments.map(item => (
                                                <CourseCard key={item.id} item={item} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
                                            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                            <h3 className="font-bold text-slate-900">No content found</h3>
                                            <p className="text-slate-500 text-sm">Try adjusting your search or filters.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'quiz' && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Course Name</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Score</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Result</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {quizHistory.length > 0 ? (
                                                    quizHistory.map(q => (
                                                        <tr key={q.id} className="hover:bg-slate-50/50">
                                                            <td className="px-6 py-4 font-medium text-slate-900">{q.courseName}</td>
                                                            <td className="px-6 py-4 text-sm text-slate-500">{new Date(q.date).toLocaleDateString()}</td>
                                                            <td className="px-6 py-4 text-sm font-bold text-slate-700">{q.score}%</td>
                                                            <td className="px-6 py-4">
                                                                <span className={cn(
                                                                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold",
                                                                    q.passed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                                                )}>
                                                                    {q.passed ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                                                    {q.passed ? 'Passed' : 'Failed'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={4} className="p-12 text-center text-slate-500">
                                                            No quiz attempts recorded.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
