'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { getCourseById } from '@/app/actions/courses';
import { ChevronLeft, CheckCircle, PlayCircle, FileText, Menu, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CoursePlayerPage() {
    const params = useParams();
    const courseId = params?.courseId as string;

    const [course, setCourse] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTopic, setActiveTopic] = useState<any>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        if (courseId) {
            loadCourse();
        }
    }, [courseId]);

    const loadCourse = async () => {
        setIsLoading(true);
        const res = await getCourseById(courseId);
        if (res.success && res.data) {
            setCourse(res.data);
            // Auto select first topic
            if (res.data.chapters?.length > 0 && res.data.chapters[0].topics?.length > 0) {
                setActiveTopic(res.data.chapters[0].topics[0]);
            }
        }
        setIsLoading(false);
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading course content...</div>;
    }

    if (!course) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500">
                <p className="mb-4">Course not found.</p>
                <Link href="/dashboard" className="px-4 py-2 bg-slate-900 text-white rounded-lg">Back to Dashboard</Link>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar */}
            <div className={cn(
                "fixed inset-y-0 left-0 w-80 bg-white border-r border-slate-200 transform transition-transform duration-300 z-40 flex flex-col",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full",
                "md:relative"
            )}>
                <div className="p-4 border-b border-slate-200 flex items-center gap-3">
                    <Link href="/dashboard" className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                    <h2 className="font-bold text-slate-900 line-clamp-1">{course.title}</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {course.chapters?.map((chapter: any, idx: number) => (
                        <div key={chapter.id}>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
                                Chapter {idx + 1}: {chapter.title}
                            </h3>
                            <div className="space-y-1">
                                {chapter.topics?.map((topic: any) => (
                                    <button
                                        key={topic.id}
                                        onClick={() => setActiveTopic(topic)}
                                        className={cn(
                                            "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors",
                                            activeTopic?.id === topic.id
                                                ? "bg-cyan-50 text-cyan-700 font-medium"
                                                : "text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        {topic.type === 'video' ? <PlayCircle className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}
                                        <span className="line-clamp-1">{topic.title}</span>
                                    </button>
                                ))}
                                {(!chapter.topics || chapter.topics.length === 0) && (
                                    <p className="text-xs text-slate-400 px-3 italic">No topics yet</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Mobile Toggle */}
                <div className="md:hidden absolute top-4 left-4 z-50">
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 bg-white shadow-md rounded-full border border-slate-200">
                        {isSidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-10">
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-6">
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">{activeTopic?.title || course.title}</h1>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <span className="bg-slate-100 px-2 py-1 rounded-md">{course.category}</span>
                                {course.subCategory && (
                                    <>
                                        <ChevronRight className="h-3 w-3" />
                                        <span className="bg-slate-100 px-2 py-1 rounded-md">{course.subCategory.name}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Content Area */}

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 min-h-[400px]">
                            {activeTopic ? (
                                <div className="prose prose-slate max-w-none">
                                    {/* Placeholder content if empty */}
                                    {activeTopic.content ? (
                                        <div dangerouslySetInnerHTML={{ __html: activeTopic.content }} />
                                    ) : (
                                        <div className="text-center py-20 text-slate-500">
                                            {course.fileUrl && course.fileUrl.endsWith('.pdf') ? (
                                                <div>
                                                    <FileText className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                                                    <p className="mb-4">This course content is available in the attached PDF.</p>
                                                    <Link href={course.fileUrl} target="_blank" className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-xl font-bold hover:bg-cyan-700 transition-colors">
                                                        Open PDF Document
                                                    </Link>
                                                </div>
                                            ) : (
                                                <>
                                                    <FileText className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                                                    <p>Topic content placeholder.</p>
                                                    <p className="text-sm">In a real app, markdown/video content would render here.</p>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-20 text-slate-400">
                                    <p>Select a topic to start learning.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
