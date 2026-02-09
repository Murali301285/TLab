'use client';

import { useState } from 'react';
import { LayoutDashboard, Layers, BookOpen, Briefcase, Settings, ChevronRight, Award } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import DepartmentMaster from '@/components/admin/DepartmentMaster';
import CategoryMaster from '@/components/admin/CategoryMaster';
import SubCategoryMaster from '@/components/admin/SubCategoryMaster';
import CertificateMaster from '@/components/admin/CertificateMaster';

type Tab = 'department' | 'category' | 'subcategory' | 'certificate';

export default function ConfigurationPage() {
    const [activeTab, setActiveTab] = useState<Tab>('department');

    const menuItems = [
        { id: 'department', label: 'Department Master', icon: Briefcase },
        { id: 'category', label: 'Category Master', icon: Layers },
        { id: 'subcategory', label: 'Sub-Category Master', icon: BookOpen },
        { id: 'certificate', label: 'Certificate Master', icon: Award },
    ];

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

            {/* Mobile Header (Simplified for now, assuming standard mobile nav handled elsewhere or hidden sidebar implies desktop focus for this task, but keeping basic structure) */}

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
                            {activeTab === 'department' && <DepartmentMaster />}
                            {activeTab === 'category' && <CategoryMaster />}
                            {activeTab === 'subcategory' && <SubCategoryMaster />}
                            {activeTab === 'certificate' && <CertificateMaster />}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
