'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MENTORS, Mentor } from '@/data/mockData';
import {
    Search,
    Filter,
    Star,
    Calendar,
    MessageSquare,
    Video,
    ChevronLeft,
    Briefcase,
    Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ProfileDropdown from '@/components/ProfileDropdown';

export default function MentorsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedExpertise, setSelectedExpertise] = useState('All');

    // Get unique expertise list
    const allExpertise = ['All', ...Array.from(new Set(MENTORS.flatMap(m => m.expertise)))];

    const filteredMentors = MENTORS.filter(mentor => {
        const matchesSearch = mentor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            mentor.role.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesExpertise = selectedExpertise === 'All' || mentor.expertise.includes(selectedExpertise);
        return matchesSearch && matchesExpertise;
    });

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
                        <div className="text-white font-bold text-lg">Mentors Hub</div>
                        <div className="absolute right-0 flex items-center gap-4">
                            <ProfileDropdown />
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                {/* Header */}
                <div className="mb-10 text-center">
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">Find Your Perfect Mentor</h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Connect with industry experts, get career guidance, and accelerate your professional growth through one-on-one mentorship.
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-10">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name or role..."
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                            <Filter className="h-5 w-5 text-slate-400 shrink-0" />
                            <div className="flex gap-2">
                                {allExpertise.slice(0, 5).map(exp => (
                                    <button
                                        key={exp}
                                        onClick={() => setSelectedExpertise(exp)}
                                        className={cn(
                                            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border",
                                            selectedExpertise === exp
                                                ? "bg-purple-100 text-purple-700 border-purple-200"
                                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                        )}
                                    >
                                        {exp}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mentors Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredMentors.map((mentor) => (
                        <div key={mentor.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow group">
                            <div className="relative h-32 bg-gradient-to-r from-purple-600 to-indigo-600">
                                <div className="absolute -bottom-12 left-6">
                                    <div className="h-24 w-24 rounded-full border-4 border-white overflow-hidden bg-slate-200">
                                        <img src={mentor.image} alt={mentor.name} className="h-full w-full object-cover" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-14 p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">{mentor.name}</h3>
                                        <p className="text-purple-600 font-medium text-sm">{mentor.role}</p>
                                        <p className="text-slate-500 text-xs flex items-center gap-1 mt-1">
                                            <Briefcase className="h-3 w-3" /> {mentor.company}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                        <span className="text-sm font-bold text-yellow-700">{mentor.rating}</span>
                                    </div>
                                </div>

                                <p className="text-slate-600 text-sm mb-6 line-clamp-3 leading-relaxed">
                                    {mentor.bio}
                                </p>

                                <div className="flex flex-wrap gap-2 mb-6">
                                    {mentor.expertise.map((exp, i) => (
                                        <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">
                                            {exp}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex items-center gap-4 text-xs text-slate-500 mb-6 py-3 border-t border-b border-slate-100">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="h-4 w-4 text-slate-400" />
                                        {mentor.availability}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Award className="h-4 w-4 text-slate-400" />
                                        Top Mentor
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors">
                                        <MessageSquare className="h-4 w-4" /> Chat
                                    </button>
                                    <button className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-colors">
                                        <Video className="h-4 w-4" /> Book Session
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
