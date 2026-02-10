'use client';
import { useState, useMemo } from 'react';
import { LayoutDashboard, Layers, BookOpen, Briefcase, Settings, ChevronRight, Award, BarChart2, Crown, Building2, Globe } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import DepartmentMaster from '@/components/admin/DepartmentMaster';
import CategoryMaster from '@/components/admin/CategoryMaster';
import SubCategoryMaster from '@/components/admin/SubCategoryMaster';
import CertificateMaster from '@/components/admin/CertificateMaster';
import TokenUsageStats from '@/components/admin/TokenUsageStats';
import PlanMaster from '@/components/admin/PlanMaster';
import CompanyMaster from '@/components/admin/CompanyMaster';
import CurrencyMaster from '@/components/admin/CurrencyMaster';
import { useAuth } from '@/components/AuthProvider';
import DashboardLoader from '@/components/DashboardLoader';

type Tab = 'department' | 'category' | 'subcategory' | 'certificate' | 'token-usage' | 'plans' | 'companies' | 'currency';

export default function ConfigurationPage() {
    const { user, isLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('department');

    const menuItems = useMemo(() => {
        if (!user) return [];

        const allItems = [
            { id: 'companies', label: 'Company Master', icon: Building2, roles: ['SUPER_ADMIN'] },
            { id: 'plans', label: 'Plan Master', icon: Crown, roles: ['SUPER_ADMIN'] },
            { id: 'currency', label: 'Currency Master', icon: Globe, roles: ['SUPER_ADMIN'] },
            { id: 'department', label: 'Department Master', icon: Briefcase, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] },
            { id: 'category', label: 'Category Master', icon: Layers, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] },
            { id: 'subcategory', label: 'Sub-Category Master', icon: BookOpen, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] },
            { id: 'certificate', label: 'Certificate Master', icon: Award, roles: ['SUPER_ADMIN'] },
            { id: 'token-usage', label: 'Token Usage', icon: BarChart2, roles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] },
        ];

        return allItems.filter(item => item.roles.includes(user.role || ''));
    }, [user]);

    if (isLoading) return <DashboardLoader />;

    if (menuItems.length === 0) return <div className="p-8 text-center text-slate-500">Access Denied</div>;

    // Ensure active tab is valid
    if (!menuItems.find(i => i.id === activeTab)) {
        if (menuItems.length > 0 && activeTab !== menuItems[0].id) {
            setActiveTab(menuItems[0].id as Tab);
        }
    }

    return (
        <div className="h-screen bg-slate-50 flex overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-10 flex flex-col pt-16 lg:pt-0 hidden lg:flex">
                <div className="p-6 border-b border-slate-100 mb-4">
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Settings className="h-6 w-6 text-cyan-600" />
                        Configuration
                    </h1>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as Tab)}
                            className={cn(
                                "w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                activeTab === item.id
                                    ? "bg-cyan-50 text-cyan-700"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className={cn("h-5 w-5", activeTab === item.id ? "text-cyan-600" : "text-slate-400")} />
                                {item.label}
                            </div>
                            {activeTab === item.id && <ChevronRight className="h-4 w-4 text-cyan-600" />}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <Link href="/dashboard" className="flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <LayoutDashboard className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-0 lg:ml-64 flex flex-col h-full overflow-hidden">
                <div className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8 flex flex-col min-h-0 overflow-hidden">
                    <div className="max-w-5xl mx-auto w-full flex flex-col h-full">
                        <div className="mb-6 shrink-0">
                            <h2 className="text-2xl font-bold text-slate-900">
                                {menuItems.find(i => i.id === activeTab)?.label}
                            </h2>
                            <p className="text-slate-500">Manage your system configurations.</p>
                        </div>

                        <div className="flex-1 min-h-0 relative">
                            {activeTab === 'companies' && menuItems.find(i => i.id === 'companies') && <CompanyMaster />}
                            {activeTab === 'plans' && menuItems.find(i => i.id === 'plans') && <PlanMaster />}
                            {activeTab === 'currency' && menuItems.find(i => i.id === 'currency') && <CurrencyMaster />}
                            {activeTab === 'department' && menuItems.find(i => i.id === 'department') && <DepartmentMaster />}
                            {activeTab === 'category' && menuItems.find(i => i.id === 'category') && <CategoryMaster />}
                            {activeTab === 'subcategory' && menuItems.find(i => i.id === 'subcategory') && <SubCategoryMaster />}
                            {activeTab === 'certificate' && menuItems.find(i => i.id === 'certificate') && <CertificateMaster />}
                            {activeTab === 'token-usage' && menuItems.find(i => i.id === 'token-usage') && <TokenUsageStats />}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
