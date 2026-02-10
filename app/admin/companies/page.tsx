'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import PageLoader from '@/components/PageLoader';
import DashboardLoader from '@/components/DashboardLoader';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Search, MoreVertical, Edit, Power, Trash, Loader2 } from 'lucide-react';

export default function CompaniesPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [companies, setCompanies] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showLoader, setShowLoader] = useState(true);

    useEffect(() => {
        if (!authLoading) {
            if (!user || user.role !== 'SUPER_ADMIN') {
                // router.push('/dashboard'); 
                // Creating a mock for now since user might not be super admin yet
                // For dev, allow access or show warning
            }
            fetchCompanies();
        }
    }, [user, authLoading]);

    const fetchCompanies = async () => {
        setIsLoading(true);
        try {
            // Mock data for now until API is ready
            // const res = await fetch('/api/admin/companies');
            // const data = await res.json();
            const data = [
                { id: '1', name: 'Acme Corp', code: 'ACME', userCount: 15, isActive: true, createdAt: new Date().toISOString() },
                { id: '2', name: 'Beta Industries', code: 'BETA', userCount: 42, isActive: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
            ];
            setCompanies(data);
        } catch (error) {
            console.error("Failed to fetch companies", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading || showLoader) {
        return <DashboardLoader onFinish={() => setShowLoader(false)} />;
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Building2 className="h-6 w-6 text-indigo-600" />
                            Company Management
                        </h1>
                    </div>
                    <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Add Company
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search */}
                <div className="mb-6 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search companies..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>

                {/* List */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Company Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Code</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Users</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Joined</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-500" />
                                        Loading companies...
                                    </td>
                                </tr>
                            ) : companies.map(company => (
                                <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">{company.name}</td>
                                    <td className="px-6 py-4 font-mono text-sm text-slate-600">{company.code}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{company.userCount}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${company.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {company.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(company.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-slate-100">
                                            <Edit className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
