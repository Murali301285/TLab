
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string;
    companyId?: string;
    company?: {
        name: string;
        shortName: string;
    };
    lastLogin?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    authError?: string | null; // New
    login: (token: string) => void; // Token handling is cookie-based, but we might refresh state
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    login: () => { },
    logout: () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [authError, setAuthError] = useState<string | null>(null); // New state
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const fetchUser = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                console.log("[AuthProvider] /api/auth/me response:", data);

                if (data.user) {
                    setUser(data.user);
                    setAuthError(null);
                } else {
                    // Session invalid (e.g. user deleted), but token might still exist
                    // Force logout / redirect
                    console.warn("[AuthProvider] Session invalid, redirecting to login");
                    setUser(null);
                    if (data.error) setAuthError(data.error);
                    // Only redirect if we are not already on public pages? 
                    // Middleware handles public pages access, but here we are client side.
                    // If we are on dashboard, we should go to login.
                    // A simple check: if we are supposed to be logged in. 
                    // But actually, just clearing user state isn't enough if middleware let us through.
                    // Let's force a router push to login if we receive an explicit 'User not found' error
                    if (data.error && data.error.includes("User not found")) {
                        router.push('/login');
                    }
                }
            } else {
                console.warn("[AuthProvider] /api/auth/me returned non-OK status:", res.status);
                setUser(null);
                setAuthError(`HTTP Error: ${res.status}`);
                if (res.status === 401 || res.status === 403) {
                    router.push('/login');
                }
            }
        } catch (error: any) {
            setUser(null);
            setAuthError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    const login = () => {
        // Just re-fetch user after successful login
        fetchUser();
        router.push('/dashboard');
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            setUser(null);
            router.push('/');
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, authError }}>
            {children}
        </AuthContext.Provider>
    );
}
