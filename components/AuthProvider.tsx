
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string;
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
                setUser(data.user);
                if (data.error) setAuthError(data.error); // Set error if present
                else setAuthError(null);
            } else {
                console.warn("[AuthProvider] /api/auth/me returned non-OK status:", res.status);
                setUser(null);
                setAuthError(`HTTP Error: ${res.status}`);
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
