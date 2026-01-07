'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Bell, BookOpen, Clock, Award, ArrowRight, Bot, Users, FileText, Settings, UserCog } from 'lucide-react';
import ProfileDropdown from '@/components/ProfileDropdown';
import { getMyCourses, getRecentLearning } from '@/app/actions/courses';

export default function Dashboard() {
    const [courses, setCourses] = useState<any[]>([]);
    const [recentCourses, setRecentCourses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadCourses() {
            try {
                // Hardcoded userId "u1" for demo purposes
                const [myCoursesRes, recentRes] = await Promise.all([
                    getMyCourses("u1"),
                    getRecentLearning("u1")
                ]);

                if (myCoursesRes.success) {
                    setCourses(myCoursesRes.data || []);
                }
                if (recentRes.success) {
                    setRecentCourses(recentRes.data || []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        }
        loadCourses();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Top Navigation */}
            <nav className="sticky top-0 z-50 bg-slate-900 border-b border-white/10 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <div className="relative w-10 h-10">
                                <Image src="/assets/logo.png" alt="Logo" fill className="object-contain" />
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                                A Learning and Training Platform
                            </span>
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

            {/* Hero Header */}
            <div className="relative w-full h-32 md:h-40 lg:h-48 overflow-hidden">
                <Image
                    src="/assets/header.png"
                    alt="Dashboard Header"
                    fill
                    className="object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/30 to-transparent" />
                <div className="absolute inset-0 flex items-center w-full p-6 md:px-10">
                    <div className="max-w-7xl mx-auto">
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                            {(() => {
                                const hour = new Date().getHours();
                                if (hour < 12) return "Good Morning, Admin";
                                if (hour < 18) return "Good Afternoon, Admin";
                                return "Good Evening, Admin";
                            })()}
                        </h1>
                        <p className="text-slate-600 text-lg font-medium">
                            Ready to continue your learning journey?
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="glass-card p-6 rounded-xl flex items-center gap-4 bg-white shadow-sm">
                        <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Assigned Courses</p>
                            <p className="text-2xl font-bold text-slate-900">{courses.length}</p>
                        </div>
                    </div>
                    <div className="glass-card p-6 rounded-xl flex items-center gap-4 bg-white shadow-sm">
                        <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Learning Hours</p>
                            <p className="text-2xl font-bold text-slate-900">0</p>
                        </div>
                    </div>
                    <div className="glass-card p-6 rounded-xl flex items-center gap-4 bg-white shadow-sm">
                        <div className="p-3 bg-orange-100 rounded-lg text-orange-600">
                            <Award className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Certificates</p>
                            <p className="text-2xl font-bold text-slate-900">0</p>
                        </div>
                    </div>
                </div>

                {/* Main Modules Navigation (Kept for Access) */}
                {/* Main Modules Navigation */}
                <div className="mb-10 space-y-6">
                    {/* Row 1: Learner Features */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Link href="/learning" className="group">
                            <div className="glass-card p-6 rounded-xl border border-slate-200 hover:border-cyan-300 hover:shadow-lg transition-all h-full bg-white flex flex-col items-start">
                                <div className="p-3 bg-cyan-50 rounded-lg mb-4 group-hover:bg-cyan-100 transition-colors">
                                    <BookOpen className="h-8 w-8 text-cyan-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-cyan-600 mb-2">Learning Centre</h3>
                                <p className="text-sm text-slate-500 mb-4 flex-1">
                                    Access your assigned courses, playbooks, and compliance training modules.
                                </p>
                                <span className="text-cyan-600 font-semibold text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    Go to Library <ArrowRight className="h-4 w-4" />
                                </span>
                            </div>
                        </Link>

                        <Link href="/mentors" className="group">
                            <div className="glass-card p-6 rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all h-full bg-white flex flex-col items-start">
                                <div className="p-3 bg-purple-50 rounded-lg mb-4 group-hover:bg-purple-100 transition-colors">
                                    <Users className="h-8 w-8 text-purple-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-purple-600 mb-2">Mentors Hub</h3>
                                <p className="text-sm text-slate-500 mb-4 flex-1">
                                    Connect with subject matter experts and get guidance on your career path.
                                </p>
                                <span className="text-purple-600 font-semibold text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    Find a Mentor <ArrowRight className="h-4 w-4" />
                                </span>
                            </div>
                        </Link>

                        <Link href="/coach" className="group">
                            <div className="glass-card p-6 rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all h-full bg-white flex flex-col items-start">
                                <div className="p-3 bg-amber-50 rounded-lg mb-4 group-hover:bg-amber-100 transition-colors">
                                    <Bot className="h-8 w-8 text-amber-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-amber-600 mb-2">AI Coach</h3>
                                <p className="text-sm text-slate-500 mb-4 flex-1">
                                    Enhance skills with Language, Concept, and AI Voice coaching.
                                </p>
                                <span className="text-amber-600 font-semibold text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    Start Coaching <ArrowRight className="h-4 w-4" />
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* Row 2: Admin / Management */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Link href="/admin/upload" className="group">
                            <div className="glass-card p-6 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all h-full bg-white flex flex-col items-start">
                                <div className="p-3 bg-blue-50 rounded-lg mb-4 group-hover:bg-blue-100 transition-colors">
                                    <FileText className="h-8 w-8 text-blue-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 mb-2">Content Master</h3>
                                <p className="text-sm text-slate-500 mb-4 flex-1">
                                    Upload new content, extract chapters, and generate AI study aids.
                                </p>
                                <span className="text-blue-600 font-semibold text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    Manage Content <ArrowRight className="h-4 w-4" />
                                </span>
                            </div>
                        </Link>

                        <Link href="/admin/users" className="group">
                            <div className="glass-card p-6 rounded-xl border border-slate-200 hover:border-green-300 hover:shadow-lg transition-all h-full bg-white flex flex-col items-start">
                                <div className="p-3 bg-green-50 rounded-lg mb-4 group-hover:bg-green-100 transition-colors">
                                    <UserCog className="h-8 w-8 text-green-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-green-600 mb-2">User Management</h3>
                                <p className="text-sm text-slate-500 mb-4 flex-1">
                                    Manage employees, assign courses, and track learning progress.
                                </p>
                                <span className="text-green-600 font-semibold text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    Manage Users <ArrowRight className="h-4 w-4" />
                                </span>
                            </div>
                        </Link>

                        <Link href="/admin/configurations" className="group">
                            <div className="glass-card p-6 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all h-full bg-white flex flex-col items-start">
                                <div className="p-3 bg-slate-100 rounded-lg mb-4 group-hover:bg-slate-200 transition-colors">
                                    <Settings className="h-8 w-8 text-slate-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-slate-700 mb-2">Configuration</h3>
                                <p className="text-sm text-slate-500 mb-4 flex-1">
                                    System settings, integration preferences, and platform defaults.
                                </p>
                                <span className="text-slate-600 font-semibold text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    Configure <ArrowRight className="h-4 w-4" />
                                </span>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Continue Learning */}
                {recentCourses.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                <Clock className="h-6 w-6 text-cyan-600" />
                                Continue Learning
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {recentCourses.map((course) => (
                                <Link href={`/learning/${course.id}`} key={course.id} className="group">
                                    <div className="glass-card rounded-xl overflow-hidden border border-white/50 shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col hover:-translate-y-1 bg-white">
                                        <div className="relative h-48 w-full bg-slate-200">
                                            {course.thumbnail ? (
                                                <Image
                                                    src={course.thumbnail}
                                                    alt={course.title}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-slate-400">No Image</div>
                                            )}
                                            <div className="absolute top-3 left-3">
                                                <span className="glass px-3 py-1 rounded-full text-xs font-bold text-white bg-black/30 backdrop-blur-md border border-white/10 uppercase tracking-wider">
                                                    {course.category}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-5 flex-1 flex flex-col">
                                            <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-cyan-600 transition-colors">
                                                {course.title}
                                            </h3>
                                            <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">
                                                {course.description || "No description."}
                                            </p>

                                            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                                <span className="text-xs text-slate-500">
                                                    Resume
                                                </span>
                                                <span className="flex items-center text-sm font-semibold text-cyan-600 gap-1">
                                                    Continue <ArrowRight className="h-4 w-4" />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
