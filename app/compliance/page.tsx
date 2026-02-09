'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, FileText, CheckCircle, Clock, ChevronLeft, ShieldCheck, PenTool } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { getComplianceCourses } from '@/app/actions/courses';
import { cn } from '@/lib/utils';
import PageLoader from '@/components/PageLoader';

const CourseImage = ({ src, alt, className }: { src: string, alt: string, className?: string }) => {
    const [imgSrc, setImgSrc] = useState(src);
    const [error, setError] = useState(false);

    useEffect(() => { setImgSrc(src); }, [src]);

    return (
        <Image
            src={imgSrc}
            alt={alt}
            fill
            className={className}
            onError={() => {
                if (!error) {
                    setImgSrc('/assets/placeholder-course.png');
                    setError(true);
                }
            }}
        />
    );
};

export default function ComplianceDashboard() {
    const { user, isLoading: authLoading } = useAuth();
    const [docs, setDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'pending' | 'signed'>('pending');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (user) {
            fetchDocs();
        }
    }, [user]);

    const fetchDocs = async () => {
        if (!user?.id) return;
        setLoading(true);
        const res = await getComplianceCourses(user.id);
        if (res.success) {
            setDocs(res.data || []);
        }
        setLoading(false);
    };

    const filteredDocs = docs.filter(d => {
        const matchesSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTab = tab === 'pending' ? !d.isSigned : d.isSigned;
        return matchesSearch && matchesTab;
    });

    if (authLoading || loading) return <PageLoader message="Loading Policy Center..." />;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all">
                            <ChevronLeft className="h-6 w-6" />
                        </Link>
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <ShieldCheck className="h-6 w-6 text-indigo-600" />
                            Compliance Center
                        </h1>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Stats / Welcome */}
                <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-8 text-white mb-8 shadow-xl relative overflow-hidden">
                    <div className="relative z-10 max-w-2xl">
                        <h2 className="text-3xl font-bold mb-4">Policy & Compliance Documents</h2>
                        <p className="text-indigo-200 text-lg mb-6">
                            Review and sign mandatory company policies, safety manuals, and compliance guidelines.
                        </p>
                        <div className="flex gap-6">
                            <div className="flex flex-col">
                                <span className="text-3xl font-bold">{docs.filter(d => !d.isSigned).length}</span>
                                <span className="text-sm text-indigo-300">Pending Action</span>
                            </div>
                            <div className="w-px bg-white/20 h-full"></div>
                            <div className="flex flex-col">
                                <span className="text-3xl font-bold">{docs.filter(d => d.isSigned).length}</span>
                                <span className="text-sm text-indigo-300">Signed & Verified</span>
                            </div>
                        </div>
                    </div>
                    <FileText className="absolute right-[-20px] bottom-[-40px] h-64 w-64 text-white/5 rotate-12" />
                </div>

                {/* Tabs & Search */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex">
                        <button
                            onClick={() => setTab('pending')}
                            className={cn(
                                "px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                                tab === 'pending' ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-slate-500 hover:bg-slate-50"
                            )}
                        >
                            <Clock className="h-4 w-4" /> Pending Signature
                        </button>
                        <button
                            onClick={() => setTab('signed')}
                            className={cn(
                                "px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                                tab === 'signed' ? "bg-green-50 text-green-700 shadow-sm" : "text-slate-500 hover:bg-slate-50"
                            )}
                        >
                            <CheckCircle className="h-4 w-4" /> Signed History
                        </button>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        />
                    </div>
                </div>

                {/* Grid */}
                {filteredDocs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredDocs.map((doc) => (
                            <Link href={`/compliance/${doc.id}`} key={doc.id} className="group">
                                <div className="bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 h-full flex flex-col overflow-hidden relative group-hover:-translate-y-1">
                                    <div className="relative h-48 bg-slate-100">
                                        {doc.thumbnail ? (
                                            <CourseImage src={doc.thumbnail} alt={doc.title} className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-slate-300">
                                                <FileText className="h-12 w-12" />
                                            </div>
                                        )}
                                        <div className="absolute top-3 left-3">
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md text-white shadow-sm",
                                                doc.isSigned ? "bg-green-600/90" : "bg-amber-600/90"
                                            )}>
                                                {doc.isSigned ? "Signed" : "Action Required"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="mb-2">
                                            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                                                {doc.category}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-indigo-700 transition-colors">
                                            {doc.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                                            {doc.description || "No description provided."}
                                        </p>

                                        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                            <span className="text-xs text-slate-400">
                                                {new Date(doc.createdAt).toLocaleDateString()}
                                            </span>
                                            <span className={cn(
                                                "flex items-center gap-2 text-sm font-bold",
                                                doc.isSigned ? "text-green-600" : "text-indigo-600"
                                            )}>
                                                {doc.isSigned ? (
                                                    <><CheckCircle className="h-4 w-4" /> Viewed</>
                                                ) : (
                                                    <><PenTool className="h-4 w-4" /> Sign Now</>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900">No {tab} documents</h3>
                        <p className="text-slate-500">You are all caught up!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
