'use client';

import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Bell, ChevronLeft } from 'lucide-react';
import ProfileDropdown from '@/components/ProfileDropdown';

export default function MainHeader() {
    const router = useRouter();
    const pathname = usePathname();

    const isDashboard = pathname === '/dashboard';

    return (
        <nav className="sticky top-0 z-50 bg-slate-900 border-b border-white/10 shadow-md flex-shrink-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-4">
                        {!isDashboard && (
                            <button
                                onClick={() => router.back()}
                                className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/10"
                                title="Go Back"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </button>
                        )}

                        <div className="relative w-48 h-12">
                            <Image src="/assets/logo.png" alt="3Vidya Logo" fill className="object-contain" />
                        </div>
                        <span className="hidden md:inline-block text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 border-l border-slate-700 pl-4 ml-2">
                            A Learning, Training & Compliance Platform
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
    );
}
