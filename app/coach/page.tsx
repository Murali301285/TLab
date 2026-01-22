'use client';

import Link from 'next/link';
import { ChevronLeft, Languages, Brain, Mic, Bot, ArrowRight } from 'lucide-react';
import ProfileDropdown from '@/components/ProfileDropdown';

export default function CoachPage() {
    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Top Navigation */}
            <nav className="sticky top-0 z-50 bg-slate-900 border-b border-white/10 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative flex items-center justify-center h-16">
                        <div className="absolute left-0 flex items-center gap-4">
                            <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                                <ChevronLeft className="h-5 w-5" />
                                <span className="font-medium">Back to Dashboard</span>
                            </Link>
                        </div>
                        <div className="text-white font-bold text-lg">AI Coach</div>
                        <div className="absolute right-0 flex items-center gap-4">
                            <ProfileDropdown />
                        </div>
                    </div>
                </div>
            </nav>

            {/* Header Content */}
            <div className="relative bg-amber-600 py-16 overflow-hidden">
                <div className="absolute inset-0 bg-[url('/assets/header.png')] opacity-10 bg-cover bg-center" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center text-white">
                    <div className="inline-flex p-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
                        <Bot className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                        Your Personal AI Coach
                    </h1>
                    <p className="text-xl text-amber-100 max-w-2xl mx-auto leading-relaxed">
                        Elevate your skills with personalized guidance. Choose a specialized coach to start your journey.
                    </p>
                </div>
            </div>

            {/* Coach Selection Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Link href="/coach/language" className="group">
                        <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-slate-100 h-full flex flex-col items-center text-center relative overflow-hidden group-hover:-translate-y-1">
                            <div className="h-20 w-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Languages className="h-10 w-10" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-3">Language Coach</h3>
                            <p className="text-slate-500 mb-8 leading-relaxed">
                                Improve your communication skills, grammar, and vocabulary with interactive exercises.
                            </p>
                            <span className="mt-auto px-6 py-2.5 rounded-full bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors inline-flex items-center gap-2">
                                Start Session <ArrowRight className="h-4 w-4" />
                            </span>
                        </div>
                    </Link>

                    {/* Concept Coach */}
                    <Link href="/coach/concept" className="group">
                        <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-slate-100 h-full flex flex-col items-center text-center relative overflow-hidden group-hover:-translate-y-1">
                            <div className="h-20 w-20 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Brain className="h-10 w-10" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-3">Concept Coach</h3>
                            <p className="text-slate-500 mb-8 leading-relaxed">
                                Deep dive into complex topics, break down theories, and master new concepts effectively.
                            </p>
                            <span className="mt-auto px-6 py-2.5 rounded-full bg-purple-600 text-white font-medium text-sm hover:bg-purple-700 transition-colors inline-flex items-center gap-2">
                                Start Session <ArrowRight className="h-4 w-4" />
                            </span>
                        </div>
                    </Link>

                    {/* Communication Coach */}
                    <Link href="/coach/roleplay" className="group">
                        <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-slate-100 h-full flex flex-col items-center text-center relative overflow-hidden group-hover:-translate-y-1">
                            <div className="h-20 w-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Mic className="h-10 w-10" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-3">Communication Coach</h3>
                            <p className="text-slate-500 mb-8 leading-relaxed">
                                Master roleplays for performance reviews, client pitches, and difficult conversations.
                            </p>
                            <span className="mt-auto px-6 py-2.5 rounded-full bg-rose-600 text-white font-medium text-sm hover:bg-rose-700 transition-colors inline-flex items-center gap-2">
                                Start Session <ArrowRight className="h-4 w-4" />
                            </span>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
