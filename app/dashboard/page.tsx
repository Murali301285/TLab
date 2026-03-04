'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, Clock, Award, ArrowRight, Bot, Users, FileText, Settings, UserCog, ShieldCheck } from 'lucide-react';
import MainHeader from '@/components/MainHeader';
import { useAuth } from '@/components/AuthProvider';
import PageLoader from '@/components/PageLoader';
import DashboardLoader from '@/components/DashboardLoader';
import { getDashboardData } from '@/app/actions/courses';

import { motion, AnimatePresence, Variants } from 'framer-motion';
import SuperAdminStats from '@/components/admin/SuperAdminStats';

// ... (keep imports)

export default function Dashboard() {
    const { user, isLoading: authLoading, logout, authError } = useAuth();
    const [courses, setCourses] = useState<any[]>([]);
    const [recentCourses, setRecentCourses] = useState<any[]>([]);
    const [complianceDocs, setComplianceDocs] = useState<any[]>([]);
    // Default dataLoading to true to prevent flash of content before load
    const [dataLoading, setDataLoading] = useState(true);
    const [showLoader, setShowLoader] = useState(true);

    const [sortOption, setSortOption] = useState('latest_read');

    useEffect(() => {
        // If auth finishes and no user, stop data loading to prevent infinite loader
        if (!authLoading && !user) {
            setDataLoading(false);
        }

        async function loadCourses() {
            if (!user?.id) return;

            // Attempt to load from cache first for instant gratification
            const cacheKey = `dashboardData_${user.id}`;
            const cachedData = sessionStorage.getItem(cacheKey);

            if (cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    setCourses(parsed.myCourses || []);
                    setRecentCourses(parsed.recentCourses || []);
                    setComplianceDocs(parsed.complianceDocs || []);
                    setDataLoading(false); // Stop loader immediately
                } catch (e) {
                    console.error("Failed to parse cached dashboard data", e);
                }
            } else {
                setDataLoading(true); // Only show loader if no cache
            }

            try {
                const isAdminUser = user.role === 'admin' || user.role === 'SUPER_ADMIN' || user.role === 'COMPANY_ADMIN';
                const dashboardDataRes = await getDashboardData(user.id, isAdminUser);

                if (dashboardDataRes.success && dashboardDataRes.data) {
                    setCourses(dashboardDataRes.data.myCourses || []);
                    setRecentCourses(dashboardDataRes.data.recentCourses || []);
                    setComplianceDocs(dashboardDataRes.data.complianceDocs || []);
                    // Update cache silently in background
                    sessionStorage.setItem(cacheKey, JSON.stringify(dashboardDataRes.data));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setDataLoading(false); // Ensure loader is off
            }
        }

        if (user) {
            loadCourses();
        }
    }, [user, authLoading]);

    useEffect(() => {
        // Add scrollbar-hover class to html element to hide scrollbar by default
        document.documentElement.classList.add('scrollbar-hover');
        return () => {
            document.documentElement.classList.remove('scrollbar-hover');
        };
    }, []);

    // Removed early return for loader to allow background rendering

    const isAdmin = user?.role === 'admin' || user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN';
    const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'admin';
    const isCompanyAdmin = user?.role === 'COMPANY_ADMIN';
    const isContentManager = user?.role === 'CONTENT_MANAGER';

    const completedCount = courses.filter(c => c.completedAt).length;
    const totalSeconds = courses.reduce((acc, c) => acc + (c.totalTime || 0), 0);
    const learningHours = (totalSeconds / 3600).toFixed(1);
    const pendingPolicies = complianceDocs.filter(d => !d.isSigned).length;

    // Sorting Logic
    const sortedCourses = [...courses].sort((a, b) => {
        switch (sortOption) {
            case 'a_z': return a.title.localeCompare(b.title);
            case 'z_a': return b.title.localeCompare(a.title);
            case 'date_desc': return new Date(b.assignedAt || 0).getTime() - new Date(a.assignedAt || 0).getTime();
            case 'date_asc': return new Date(a.assignedAt || 0).getTime() - new Date(b.assignedAt || 0).getTime();
            case 'completion_desc': return (b.progress || 0) - (a.progress || 0);
            case 'completion_asc': return (a.progress || 0) - (b.progress || 0);
            case 'latest_read':
            default:
                return new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime();
        }
    });

    // Find latest activity
    const lastActiveDate = courses.reduce((latest, c) => {
        const current = c.lastActiveAt ? new Date(c.lastActiveAt).getTime() : 0;
        return current > latest ? current : latest;
    }, 0);

    const lastActiveString = lastActiveDate > 0
        ? new Date(lastActiveDate).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata'
        })
        : 'Never';

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };



    return (
        <div className="min-h-screen bg-slate-50 relative">
            <AnimatePresence>
                {(authLoading || showLoader) && (
                    <DashboardLoader
                        key="loader"
                        isLoading={dataLoading}
                        message="Loading your dashboard..."
                        onFinish={() => setShowLoader(false)}
                    />
                )}
            </AnimatePresence>

            {/* Top Navigation */}
            <MainHeader />

            {/* Hero Header */}
            <div className="pt-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                                {(() => {
                                    const hour = new Date().getHours();
                                    const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
                                    return `${greeting}, ${user?.name || 'User'}`;
                                })()}
                            </h1>
                            <p className="text-slate-600 text-lg font-medium">
                                {isAdmin ? "Manage your platform and users." : "Ready to continue your learning journey?"}
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-right"
                        >
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Last Active On</p>
                            <p className="text-sm font-bold text-cyan-600 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-100 inline-block mt-1 shadow-sm">
                                {lastActiveString}
                            </p>
                        </motion.div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 relative z-10">

                {/* Super Admin Stats */}
                {isAdmin && <SuperAdminStats />}

                {/* Quick Stats - Visible to All (Learners) */}
                {!isAdmin && (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10"
                    >
                        <Link href="/learning" className="block h-full">
                            <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} className="glass-card py-8 px-6 rounded-xl flex flex-col items-center justify-center bg-cyan-50 shadow-sm transition-all text-center border border-slate-100 h-full hover:shadow-lg hover:border-cyan-100 cursor-pointer">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Assigned courses</p>
                                <p className="text-4xl font-extrabold text-slate-900">{courses.length}</p>
                            </motion.div>
                        </Link>
                        <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} className="glass-card py-8 px-6 rounded-xl flex flex-col items-center justify-center bg-green-50 shadow-sm text-center border border-slate-100 h-full hover:shadow-lg hover:border-green-100 transition-all">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Completed courses</p>
                            <p className="text-4xl font-extrabold text-green-600">{completedCount}</p>
                        </motion.div>
                        <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} className="glass-card py-8 px-6 rounded-xl flex flex-col items-center justify-center bg-blue-50 shadow-sm text-center border border-slate-100 h-full hover:shadow-lg hover:border-cyan-100 transition-all">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Learning hours</p>
                            <p className="text-4xl font-extrabold text-slate-900">{learningHours}</p>
                        </motion.div>
                        <Link href="/compliance" className="block h-full">
                            <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} className="glass-card py-8 px-6 rounded-xl flex flex-col items-center justify-center bg-amber-50 shadow-sm transition-all text-center border border-slate-100 h-full hover:shadow-lg hover:border-amber-100 cursor-pointer">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Policy review</p>
                                <p className="text-4xl font-extrabold text-amber-600">{pendingPolicies}</p>
                            </motion.div>
                        </Link>
                    </motion.div>
                )}

                {/* Main Modules Navigation */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="mb-10 space-y-6"
                >

                    {/* User Features */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Link href="/learning" className="group">
                            <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="glass-card p-6 rounded-xl border border-slate-200 hover:border-cyan-300 hover:shadow-lg transition-all h-full bg-white flex flex-col items-center text-center">
                                <div className="p-3 bg-cyan-50 rounded-lg mb-4 group-hover:bg-cyan-100 transition-colors">
                                    <BookOpen className="h-8 w-8 text-cyan-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-cyan-600 mb-2">Knowledge Centre</h3>
                                <p className="text-sm text-slate-500 mb-4 flex-1">
                                    Access your assigned courses, playbooks, and compliance modules.
                                </p>
                                <span className="text-cyan-600 font-semibold text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    Go to Library <ArrowRight className="h-4 w-4" />
                                </span>
                            </motion.div>
                        </Link>

                        <Link href="/mentors" className="group">
                            <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="glass-card p-6 rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all h-full bg-white flex flex-col items-center text-center">
                                <div className="p-3 bg-purple-50 rounded-lg mb-4 group-hover:bg-purple-100 transition-colors">
                                    <Users className="h-8 w-8 text-purple-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-purple-600 mb-2">Mentors Circle</h3>
                                <p className="text-sm text-slate-500 mb-4 flex-1">
                                    Connect with subject matter experts and get guidance on your career path.
                                </p>
                                <span className="text-purple-600 font-semibold text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    Find a Mentor <ArrowRight className="h-4 w-4" />
                                </span>
                            </motion.div>
                        </Link>

                        <Link href="/coach" className="group">
                            <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="glass-card p-6 rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-lg transition-all h-full bg-white flex flex-col items-center text-center">
                                <div className="p-3 bg-amber-50 rounded-lg mb-4 group-hover:bg-amber-100 transition-colors">
                                    <Bot className="h-8 w-8 text-amber-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-amber-600 mb-2">Coaching Corner</h3>
                                <p className="text-sm text-slate-500 mb-4 flex-1">
                                    Enhance skills with Language, Concept, and AI Voice coaching.
                                </p>
                                <span className="text-amber-600 font-semibold text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    Start Coaching <ArrowRight className="h-4 w-4" />
                                </span>
                            </motion.div>
                        </Link>

                        <Link href="/compliance" className="group">
                            <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="glass-card p-6 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all h-full bg-white flex flex-col items-center text-center">
                                <div className="p-3 bg-indigo-50 rounded-lg mb-4 group-hover:bg-indigo-100 transition-colors">
                                    <ShieldCheck className="h-8 w-8 text-indigo-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 mb-2">Compliance Centre</h3>
                                <p className="text-sm text-slate-500 mb-4 flex-1">
                                    Review and sign mandatory policies and compliance documents.
                                </p>
                                <span className="text-indigo-600 font-semibold text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    View Documents <ArrowRight className="h-4 w-4" />
                                </span>
                            </motion.div>
                        </Link>
                    </div>

                    {/* Admin Features */}
                    {(isSuperAdmin || isCompanyAdmin || isContentManager) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                            {(isSuperAdmin || isCompanyAdmin || isContentManager) && (
                                <Link href="/admin/upload" className="group">
                                    <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="glass-card p-6 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all h-full bg-white flex flex-col items-center text-center">
                                        <div className="p-3 bg-blue-50 rounded-lg mb-4 group-hover:bg-blue-100 transition-colors">
                                            <FileText className="h-8 w-8 text-blue-600" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 mb-2">Content Management</h3>
                                        <p className="text-sm text-slate-500 mb-4 flex-1">
                                            Upload new content, extract chapters, and generate AI study aids.
                                        </p>
                                        <span className="text-blue-600 font-semibold text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                            Manage Content <ArrowRight className="h-4 w-4" />
                                        </span>
                                    </motion.div>
                                </Link>
                            )}

                            {(isSuperAdmin || isCompanyAdmin) && (
                                <Link href="/admin/users" className="group">
                                    <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="glass-card p-6 rounded-xl border border-slate-200 hover:border-green-300 hover:shadow-lg transition-all h-full bg-white flex flex-col items-center text-center">
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
                                    </motion.div>
                                </Link>
                            )}

                            {(isSuperAdmin || isCompanyAdmin) && (
                                <Link href="/admin/configurations" className="group">
                                    <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="glass-card p-6 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all h-full bg-white flex flex-col items-center text-center">
                                        <div className="p-3 bg-slate-100 rounded-lg mb-4 group-hover:bg-slate-200 transition-colors">
                                            <Settings className="h-8 w-8 text-slate-700" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-slate-700 mb-2">Configuration Management</h3>
                                        <p className="text-sm text-slate-500 mb-4 flex-1">
                                            System settings, integration preferences, and platform defaults.
                                        </p>
                                        <span className="text-slate-700 font-semibold text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                            Configure <ArrowRight className="h-4 w-4" />
                                        </span>
                                    </motion.div>
                                </Link>
                            )}
                        </div>
                    )}

                </motion.div>

                {/* Continue Learning */}
                {recentCourses.length > 0 && (
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
                                    <Clock className="h-6 w-6 text-cyan-600" />
                                </motion.div>
                                Continue Learning
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {recentCourses.map((course) => (
                                <Link
                                    href={`/learn/${course.id}${course.completedAt ? '?preview=true' : ''}`}
                                    key={course.id}
                                    className="group"
                                >
                                    <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} className="glass-card rounded-xl overflow-hidden border border-white/50 shadow-sm transition-all duration-300 h-full flex flex-col bg-white">
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
                                            <h3 className="text-2xl font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-cyan-600 transition-colors">
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
                                    </motion.div>
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>
        </div >
    );
}
