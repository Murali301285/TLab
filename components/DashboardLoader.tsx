'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface DashboardLoaderProps {
    onFinish?: () => void;
    isLoading?: boolean;
    message?: string;
}

export default function DashboardLoader({ onFinish, isLoading = false, message = "Your data is loading..." }: DashboardLoaderProps) {
    const [minTimeElapsed, setMinTimeElapsed] = useState(false);

    useEffect(() => {
        // Set minimum display time to 2 seconds
        const timer = setTimeout(() => {
            setMinTimeElapsed(true);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        // Only finish when BOTH minimum time has passed AND actual loading is done
        if (minTimeElapsed && !isLoading) {
            if (onFinish) onFinish();
        }
    }, [minTimeElapsed, isLoading, onFinish]);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md transition-opacity duration-500">
            <div className="flex flex-col items-center gap-6 p-8 max-w-md text-center">

                {/* Logo or Icon */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative w-20 h-20 mb-4"
                >
                    <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full animate-ping" />
                    <div className="absolute inset-0 border-4 border-cyan-400 rounded-full border-t-transparent animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                    </div>
                </motion.div>

                {/* Text Animation */}
                <div className="h-16 flex items-center justify-center">
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xl font-medium text-white tracking-wide"
                    >
                        {message}
                    </motion.p>
                </div>

                {/* Progress Bar (Decorative) */}
                <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden mt-4">
                    <motion.div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2, ease: "linear" }}
                    />
                </div>
            </div>
        </div>
    );
}
