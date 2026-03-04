'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Check, X, Building, Users, CreditCard, Key, Search, Eye, EyeOff, RefreshCcw, Lock, Unlock, Phone, HardDrive, FileText, BookOpen, Shield, Database, Filter, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

interface Company {
    id: string;
    name: string;
    shortName: string;
    address?: string;
    contactPerson?: string;
    contactPhone?: string;
    isActive: boolean;
    planId?: string;
    plan?: { name: string; singleFileLimitMB: number; storageLimitMB: number };
    apiConfig?: any;
    licenseExpiresAt?: string;
    createdAt: string;
    adminUser?: { id: string; email: string; isActive: boolean };
    stats?: {
        users: number;
        courses: number;
        library: number;
        policy: number;
        tokens: number;
        storageUsed: number;
    };
}

interface Plan {
    id: string;
    name: string;
}

export default function CompanyMaster() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'admin' | 'plan' | 'api'>('general');

    // Search, Sort, Pagination State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name'>('newest');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(9); // 3x3 grid

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        shortName: '',
        address: '',
        contactPerson: '',
        contactPhone: '',
        isActive: true,
        planId: '',
        licenseExpiresAt: '',

        // Admin Tab
        adminEmail: '',
        adminPassword: '',
        adminName: '',
        adminIsActive: true,
        resetPassword: false, // Flag to reset password

        // API Tab
        groqKey: ''
    });

    const [showPassword, setShowPassword] = useState(false);

    const [showGroqKey, setShowGroqKey] = useState(false);

    useEffect(() => {
        fetchCompanies();
        fetchPlans();
    }, []);

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/companies');
            if (res.ok) {
                const data = await res.json();
                setCompanies(data);
            }
        } catch (error) {
            toast.error('Failed to fetch companies');
        } finally {
            setLoading(false);
        }
    };

    const fetchPlans = async () => {
        try {
            const res = await fetch('/api/admin/plans');
            if (res.ok) setPlans(await res.json());
        } catch (e) { }
    };

    // --- Computed Data for UI ---

    const filteredCompanies = useMemo(() => {
        let result = [...companies];

        // Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(c =>
                c.name.toLowerCase().includes(lowerTerm) ||
                c.shortName.toLowerCase().includes(lowerTerm) ||
                c.contactPerson?.toLowerCase().includes(lowerTerm) ||
                c.adminUser?.email.toLowerCase().includes(lowerTerm)
            );
        }

        // Sort
        result.sort((a, b) => {
            if (sortOrder === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (sortOrder === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            if (sortOrder === 'name') return a.name.localeCompare(b.name);
            return 0;
        });

        return result;
    }, [companies, searchTerm, sortOrder]);

    const paginatedCompanies = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredCompanies.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredCompanies, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);

    const stats = useMemo(() => {
        const total = companies.length;
        const active = companies.filter(c => c.isActive).length;
        const inactive = total - active;

        // Plan Distribution
        const planCounts: Record<string, number> = {};
        companies.forEach(c => {
            const pName = c.plan?.name || 'No Plan';
            planCounts[pName] = (planCounts[pName] || 0) + 1;
        });

        return { total, active, inactive, planCounts };
    }, [companies]);

    // --- Handlers ---

    const handleEdit = async (company: Company) => {
        setEditingCompany(company);

        setFormData({
            name: company.name,
            shortName: company.shortName,
            address: company.address || '',
            contactPerson: company.contactPerson || '',
            contactPhone: company.contactPhone || '',
            isActive: company.isActive,
            planId: company.planId || '',
            licenseExpiresAt: company.licenseExpiresAt ? new Date(company.licenseExpiresAt).toISOString().split('T')[0] : '', // YYYY-MM-DD

            // Admin defaults
            adminEmail: company.adminUser?.email || '',
            adminPassword: '',
            adminName: '',
            adminIsActive: company.adminUser?.isActive ?? true,
            resetPassword: false,

            // API
            groqKey: company.apiConfig?.groqKey || ''
        });
        setIsModalOpen(true);
        setActiveTab('general');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingCompany ? `/api/admin/companies?id=${editingCompany.id}` : '/api/admin/companies';
            const method = editingCompany ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed');
            }

            toast.success(editingCompany ? 'Company updated' : 'Company created');
            setIsModalOpen(false);
            setEditingCompany(null);
            resetForm();
            fetchCompanies();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '', shortName: '', address: '', contactPerson: '', contactPhone: '', isActive: true, planId: '',
            licenseExpiresAt: '', adminEmail: '', adminPassword: '', adminName: '', adminIsActive: true, resetPassword: false, groqKey: ''
        });
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="space-y-6">

            {/* 1. Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Building className="h-6 w-6" /></div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total Companies</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats.total}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg"><Check className="h-6 w-6" /></div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Active</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats.active}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg"><X className="h-6 w-6" /></div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Inactive</p>
                        <h3 className="text-2xl font-bold text-slate-800">{stats.inactive}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                    <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wide">Plan Breakdown</p>
                    <div className="flex gap-2 flex-wrap">
                        {Object.entries(stats.planCounts).map(([plan, count]) => (
                            <span key={plan} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-medium border border-slate-200">
                                {plan}: {count}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* 2. Controls: Search, Sort, Add */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search companies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border-none focus:ring-0 text-slate-700 placeholder:text-slate-400"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto px-2">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <ArrowUpDown className="h-4 w-4" />
                        <span className="hidden md:inline">Sort:</span>
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as any)}
                            className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
                        >
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                            <option value="name">Name (A-Z)</option>
                        </select>
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>

                    <button
                        onClick={() => { resetForm(); setEditingCompany(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 transition w-full md:w-auto justify-center"
                    >
                        <Plus className="h-4 w-4" /> Add Company
                    </button>
                </div>
            </div>

            {/* 3. Grid of Companies */}
            {loading ? (
                <div className="text-center py-20 text-slate-500">Loading companies...</div>
            ) : filteredCompanies.length === 0 ? (
                <div className="text-center py-20 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <Building className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>No companies found matching your criteria.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedCompanies.map((company) => (
                        <div key={company.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <Building className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 line-clamp-1">{company.name}</h3>
                                        <p className="text-xs text-slate-500">{company.shortName}</p>
                                    </div>
                                </div>
                                <div className={`px-2 py-1 text-xs font-bold rounded ${company.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {company.isActive ? 'Active' : 'Inactive'}
                                </div>
                            </div>

                            <div className="flex-1 space-y-3 text-xs text-slate-600">
                                {/* Key Details */}
                                <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100">
                                    <div><span className="text-slate-400 block">Plan</span> <span className="font-medium text-slate-900">{company.plan?.name || '-'}</span></div>
                                    <div><span className="text-slate-400 block">Admin</span> <span className="font-medium text-slate-900 truncate block" title={company.adminUser?.email}>{company.adminUser?.email || '-'}</span></div>
                                    <div><span className="text-slate-400 block">Purchased</span> <span className="font-medium text-slate-900">{formatDate(company.createdAt)}</span></div>
                                    <div><span className="text-slate-400 block">Validity</span> <span className={`font-medium ${company.licenseExpiresAt && new Date(company.licenseExpiresAt) < new Date() ? 'text-red-600' : 'text-slate-900'}`}>{company.licenseExpiresAt ? formatDate(company.licenseExpiresAt) : 'Lifetime'}</span></div>
                                </div>

                                {/* Usage Stats */}
                                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                                    <div className="flex justify-between"><span>Tokens:</span> <span className="font-medium">{company.stats?.tokens?.toLocaleString() || 0}</span></div>
                                    <div className="flex justify-between"><span>Users:</span> <span className="font-medium">{company.stats?.users || 0}</span></div>
                                    <div className="flex justify-between"><span>Courses:</span> <span className="font-medium">{company.stats?.courses || 0}</span></div>
                                    <div className="flex justify-between"><span>Library:</span> <span className="font-medium">{company.stats?.library || 0}</span></div>
                                    <div className="flex justify-between"><span>Policy:</span> <span className="font-medium">{company.stats?.policy || 0}</span></div>
                                    <div className="flex justify-between"><span>Storage:</span> <span className="font-medium">{company.plan?.storageLimitMB || 0} MB</span></div>
                                    <div className="flex justify-between"><span>Max File:</span> <span className="font-medium">{company.plan?.singleFileLimitMB || 0} MB</span></div>
                                    {/* <div className="flex justify-between"><span>Avg File:</span> <span className="font-medium">-</span></div> */}
                                </div>

                                {/* Address & Contact */}
                                <div className="pt-3 border-t border-slate-100 space-y-1">
                                    {company.contactPerson && (
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Users className="h-3 w-3" /> <span>{company.contactPerson}</span>
                                            {company.contactPhone && <span className="text-slate-400">({company.contactPhone})</span>}
                                        </div>
                                    )}
                                    {company.address && (
                                        <div className="flex items-start gap-2 text-slate-500">
                                            <Building className="h-3 w-3 mt-0.5 shrink-0" /> <span className="line-clamp-2">{company.address}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100">
                                <button onClick={() => handleEdit(company)} className="w-full py-2 text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition font-medium">Manage Company</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 4. Pagination */}
            {filteredCompanies.length > itemsPerPage && (
                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-500">
                        Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredCompanies.length)}</span> of <span className="font-bold">{filteredCompanies.length}</span> results
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-medium text-slate-700">Page {currentPage} of {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">{editingCompany ? `Manage details` : 'New Company'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><X className="h-5 w-5 text-slate-400 hover:text-slate-600" /></button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-100 px-6">
                            {[
                                { id: 'general', label: 'General', icon: Building },
                                { id: 'admin', label: 'Admin User', icon: Users },
                                { id: 'plan', label: 'Plan & Billing', icon: CreditCard },
                                { id: 'api', label: 'API Keys', icon: Key },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    <tab.icon className="h-4 w-4" /> {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <form id="company-form" onSubmit={handleSubmit} className="space-y-6">
                                {activeTab === 'general' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                                            <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Short Name (Unique ID) *</label>
                                            <input required type="text" value={formData.shortName} onChange={e => setFormData({ ...formData, shortName: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                                            <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                                            <input type="text" value={formData.contactPerson} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                                            <div className="relative">
                                                <input type="text" value={formData.contactPhone} onChange={e => setFormData({ ...formData, contactPhone: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 pl-9" placeholder="+91..." />
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-6">
                                            <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="h-4 w-4 text-cyan-600 rounded" />
                                            <label className="text-sm font-medium text-slate-700">Company Active</label>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'admin' && (
                                    <div className="space-y-4">
                                        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700 mb-4">
                                            Manage the main administrator for this company. They will have full access to company settings (excluding Plan/API).
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Admin Email *</label>
                                            <input required type="email" value={formData.adminEmail} onChange={e => setFormData({ ...formData, adminEmail: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Password {editingCompany && !formData.resetPassword && '(Hidden)'}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={formData.adminPassword}
                                                    onChange={e => setFormData({ ...formData, adminPassword: e.target.value })}
                                                    disabled={!!editingCompany && !formData.resetPassword && !formData.adminPassword}
                                                    placeholder={editingCompany ? "Click reset to change" : "Enter password"}
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 disabled:bg-slate-100"
                                                />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {editingCompany && (
                                            <div className="flex items-center gap-4 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, resetPassword: !prev.resetPassword, adminPassword: '' }))}
                                                    className="flex items-center gap-2 text-sm text-cyan-600 font-medium hover:text-cyan-700"
                                                >
                                                    <RefreshCcw className="h-4 w-4" /> {formData.resetPassword ? 'Cancel Reset' : 'Reset Password'}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, adminIsActive: !prev.adminIsActive }))}
                                                    className={`flex items-center gap-2 text-sm font-medium ${formData.adminIsActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                                                >
                                                    {formData.adminIsActive ? <><Lock className="h-4 w-4" /> Block Admin</> : <><Unlock className="h-4 w-4" /> Unblock Admin</>}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'plan' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Subscription Plan</label>
                                            <select
                                                value={formData.planId}
                                                onChange={e => setFormData({ ...formData, planId: e.target.value })}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                                            >
                                                <option value="">Select Plan...</option>
                                                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">License Expiry Date</label>
                                            <input
                                                type="date"
                                                value={formData.licenseExpiresAt}
                                                onChange={e => setFormData({ ...formData, licenseExpiresAt: e.target.value })}
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">Leave empty for lifetime access.</p>
                                        </div>
                                    </div>
                                )}



                                {activeTab === 'api' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Groq API Key</label>
                                            <div className="relative">
                                                <input
                                                    type={showGroqKey ? "text" : "password"}
                                                    value={formData.groqKey}
                                                    onChange={e => setFormData({ ...formData, groqKey: e.target.value })}
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm pr-10"
                                                    placeholder="gsk_..."
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowGroqKey(!showGroqKey)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                >
                                                    {showGroqKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                <Lock className="h-3 w-3" /> Stored securely with AES-256 encryption.
                                            </p>
                                        </div>
                                        {/* Validate Button could go here */}
                                    </div>
                                )}
                            </form>
                        </div>

                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                            <button type="submit" form="company-form" className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 shadow-sm shadow-cyan-200">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
