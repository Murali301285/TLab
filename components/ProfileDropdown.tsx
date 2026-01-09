'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Settings, UserCircle } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function ProfileDropdown() {
    const { user, logout: contextLogout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            contextLogout(); // Updates context state
            router.push('/login');
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    if (!user) return null; // Or a loading skeleton

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white border border-white/20 shadow-sm hover:shadow-md transition-all uppercase overflow-hidden relative"
            >
                {user.image ? (
                    <img
                        src={user.image}
                        alt={user.name}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    user.name ? user.name.charAt(0) : 'U'
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>

                    <div className="py-1">
                        <Link
                            href="/profile"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-cyan-600 transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            <UserCircle className="h-4 w-4" />
                            My Profile
                        </Link>
                        <Link
                            href="/settings"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-cyan-600 transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            <Settings className="h-4 w-4" />
                            Settings
                        </Link>
                    </div>

                    <div className="border-t border-slate-100 py-1">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
