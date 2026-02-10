'use client';

import { useEffect, useState } from 'react';
import { Building2, Users, Crown, BookOpen, TrendingUp } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

interface StatsData {
    companies: number;
    users: number;
    plans: number;
    courses: number;
}

export default function SuperAdminStats() {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/stats')
            .then(res => res.json())
            .then((data: StatsData) => {
                setStats(data);
                setLoading(false);
            })
            .catch(err => setLoading(false));
    }, []);

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    if (loading) return <div className="h-32 bg-slate-100 rounded-xl animate-pulse w-full mb-10"></div>;
    if (!stats) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Building2 className="h-8 w-8" />
                </div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">Total Companies</p>
                    <h3 className="text-2xl font-bold text-slate-900">{stats.companies}</h3>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-pink-50 text-pink-600 rounded-lg">
                    <Users className="h-8 w-8" />
                </div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">Total Users</p>
                    <h3 className="text-2xl font-bold text-slate-900">{stats.users}</h3>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                    <Crown className="h-8 w-8" />
                </div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">Active Plans</p>
                    <h3 className="text-2xl font-bold text-slate-900">{stats.plans}</h3>
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-cyan-50 text-cyan-600 rounded-lg">
                    <BookOpen className="h-8 w-8" />
                </div>
                <div>
                    <p className="text-sm text-slate-500 font-medium">Total Courses</p>
                    <h3 className="text-2xl font-bold text-slate-900">{stats.courses}</h3>
                </div>
            </motion.div>
        </div>
    );
}
