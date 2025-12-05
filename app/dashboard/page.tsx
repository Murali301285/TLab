'use client';

import Image from 'next/image';
import Link from 'next/link';
import { COURSES } from '@/data/mockData';
import { BookOpen, Users, Trophy, Clock, Search, Bell, ArrowRight } from 'lucide-react';
import ProfileDropdown from '@/components/ProfileDropdown';

export default function Dashboard() {
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
            <div className="relative w-full h-48 md:h-64 lg:h-72 overflow-hidden">
                <Image
                    src="/assets/header.png"
                    alt="Dashboard Header"
                    fill
                    className="object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/30 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full p-6 md:p-10">
                    <div className="max-w-7xl mx-auto">
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                            Good Afternoon, Admin
                        </h1>
                        <p className="text-slate-600 text-lg font-medium">
                            Ready to continue your learning journey?
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="glass-card p-6 rounded-xl flex items-center gap-4 bg-white shadow-sm">
                        <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Active Courses</p>
                            <p className="text-2xl font-bold text-slate-900">3</p>
                        </div>
                    </div>
                    <div className="glass-card p-6 rounded-xl flex items-center gap-4 bg-white shadow-sm">
                        <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Learning Hours</p>
                            <p className="text-2xl font-bold text-slate-900">12.5</p>
                        </div>
                    </div>
                    <div className="glass-card p-6 rounded-xl flex items-center gap-4 bg-white shadow-sm">
                        <div className="p-3 bg-yellow-100 rounded-lg text-yellow-600">
                            <Trophy className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Certificates</p>
                            <p className="text-2xl font-bold text-slate-900">1</p>
                        </div>
                    </div>
                </div>

                {/* Main Modules */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                    <Link href="/learning" className="group">
                        <div className="glass-card p-8 rounded-2xl border-l-4 border-cyan-500 hover:bg-white transition-all h-full relative overflow-hidden shadow-sm hover:shadow-md bg-white">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <BookOpen className="h-32 w-32 text-cyan-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-cyan-600 transition-colors">Learning Centre</h2>
                            <p className="text-slate-500 mb-6 max-w-sm">
                                Access your assigned courses, playbooks, and compliance training modules.
                            </p>
                            <span className="inline-flex items-center text-cyan-600 font-medium group-hover:translate-x-2 transition-transform">
                                Go to Library <ArrowRight className="ml-2 h-4 w-4" />
                            </span>
                        </div>
                    </Link>

                    <Link href="/mentors" className="group">
                        <div className="glass-card p-8 rounded-2xl border-l-4 border-purple-500 hover:bg-white transition-all h-full relative overflow-hidden cursor-pointer shadow-sm hover:shadow-md bg-white">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Users className="h-32 w-32 text-purple-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-purple-600 transition-colors">Mentors Hub</h2>
                            <p className="text-slate-500 mb-6 max-w-sm">
                                Connect with subject matter experts and get guidance on your career path.
                            </p>
                            <span className="inline-flex items-center text-purple-600 font-medium group-hover:translate-x-2 transition-transform">
                                Find a Mentor <ArrowRight className="ml-2 h-4 w-4" />
                            </span>
                        </div>
                    </Link>

                    <Link href="/admin/upload" className="group">
                        <div className="glass-card p-8 rounded-2xl border-l-4 border-slate-900 hover:bg-white transition-all h-full relative overflow-hidden shadow-sm hover:shadow-md bg-white">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <BookOpen className="h-32 w-32 text-slate-900" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-slate-700 transition-colors">Admin Upload</h2>
                            <p className="text-slate-500 mb-6 max-w-sm">
                                Upload new content, extract chapters, and generate AI study aids.
                            </p>
                            <span className="inline-flex items-center text-slate-900 font-medium group-hover:translate-x-2 transition-transform">
                                Upload Content <ArrowRight className="ml-2 h-4 w-4" />
                            </span>
                        </div>
                    </Link>

                    <Link href="/admin/users" className="group">
                        <div className="glass-card p-8 rounded-2xl border-l-4 border-green-600 hover:bg-white transition-all h-full relative overflow-hidden shadow-sm hover:shadow-md bg-white">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Users className="h-32 w-32 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-green-700 transition-colors">User Management</h2>
                            <p className="text-slate-500 mb-6 max-w-sm">
                                Manage employees, assign courses, and track learning progress.
                            </p>
                            <span className="inline-flex items-center text-green-700 font-medium group-hover:translate-x-2 transition-transform">
                                Manage Users <ArrowRight className="ml-2 h-4 w-4" />
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Assigned Courses List */}
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <span className="w-1 h-6 bg-cyan-500 rounded-full block"></span>
                    Continue Learning
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {COURSES.map((course) => (
                        <Link href={`/learn/${course.id}`} key={course.id} className="group">
                            <div className="glass-card rounded-xl overflow-hidden hover:ring-2 hover:ring-cyan-500/50 transition-all h-full flex flex-col bg-white shadow-sm hover:shadow-lg">
                                <div className="relative h-40 w-full">
                                    <Image
                                        src={course.thumbnail}
                                        alt={course.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                                    <div className="absolute bottom-3 left-3">
                                        <span className="px-2 py-1 bg-white/20 text-white text-xs font-bold rounded border border-white/30 backdrop-blur-md">
                                            {course.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-5 flex-1 flex flex-col">
                                    <h4 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-cyan-600 transition-colors">
                                        {course.title}
                                    </h4>
                                    <div className="mt-auto space-y-3">
                                        <div className="flex justify-between text-xs text-slate-500 font-medium">
                                            <span>{course.progress}% Complete</span>
                                            <span>{course.totalModules} Modules</span>
                                        </div>
                                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-1000"
                                                style={{ width: `${course.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
