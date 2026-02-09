import React from 'react';
import { Loader2 } from 'lucide-react';

interface PageLoaderProps {
    message?: string;
}

export default function PageLoader({ message = 'Loading...' }: PageLoaderProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-cyan-600" />
                <p className="text-lg font-medium text-slate-600 animate-pulse">{message}</p>
            </div>
        </div>
    );
}
