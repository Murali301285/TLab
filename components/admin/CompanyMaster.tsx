'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, Building, Users, CreditCard, Key, Search, Eye, EyeOff, RefreshCcw, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';

interface Company {
    id: string;
    name: string;
    shortName: string;
    address?: string;
    contactPerson?: string;
    isActive: boolean;
    planId?: string;
    plan?: { name: string };
    apiConfig?: any;
    licenseExpiresAt?: string;
    // We fetch admin user separately or include? Let's include for list view if possible, or fetch on edit.
    adminUser?: { id: string; email: string; isActive: boolean };
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

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        shortName: '',
        address: '',
        contactPerson: '',
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

    const handleEdit = async (company: Company) => {
        setEditingCompany(company);

        // Fetch full details including admin user if not present
        // For now assume list returns needed info or we fetch individual
        // Let's implement fetch individual in API for robustness, but simple logic: 
        // If we have adminUser in list, use it.

        setFormData({
            name: company.name,
            shortName: company.shortName,
            address: company.address || '',
            contactPerson: company.contactPerson || '',
            isActive: company.isActive,
            planId: company.planId || '',
            licenseExpiresAt: company.licenseExpiresAt ? new Date(company.licenseExpiresAt).toISOString().split('T')[0] : '', // YYYY-MM-DD

            // Admin defaults (will be overwritten if exists)
            adminEmail: company.adminUser?.email || '',
            adminPassword: '', // Don't show existing hash
            adminName: '', // Could fetch name
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
            name: '', shortName: '', address: '', contactPerson: '', isActive: true, planId: '',
            licenseExpiresAt: '', adminEmail: '', adminPassword: '', adminName: '', adminIsActive: true, resetPassword: false, groqKey: ''
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end items-center">
                <button
                    onClick={() => { resetForm(); setEditingCompany(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition"
                >
                    <Plus className="h-4 w-4" /> Add Company
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {companies.map((company) => (
                    <div key={company.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <Building className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{company.name}</h3>
                                    <p className="text-xs text-slate-500">{company.shortName}</p>
                                </div>
                            </div>
                            <div className={`px-2 py-1 text-xs font-bold rounded ${company.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {company.isActive ? 'Active' : 'Inactive'}
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-slate-600 border-t border-slate-100 pt-3">
                            <div className="flex justify-between">
                                <span>Plan</span>
                                <span className="font-medium text-slate-900">{company.plan?.name || 'None'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Admin</span>
                                <span className="font-medium text-slate-900 truncate max-w-[150px]">{company.adminUser?.email || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Expires</span>
                                <span className={`font-medium ${company.licenseExpiresAt && new Date(company.licenseExpiresAt) < new Date() ? 'text-red-600' : 'text-slate-900'}`}>
                                    {company.licenseExpiresAt ? new Date(company.licenseExpiresAt).toLocaleDateString() : 'Lifetime'}
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                            <button onClick={() => handleEdit(company)} className="flex-1 py-2 text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition">Manage</button>
                        </div>
                    </div>
                ))}
            </div>

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
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                                            <input type="text" value={formData.contactPerson} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                                            <textarea rows={3} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                                        </div>
                                        <div className="flex items-center gap-2">
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
                                                    type="password"
                                                    value={formData.groqKey}
                                                    onChange={e => setFormData({ ...formData, groqKey: e.target.value })}
                                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm"
                                                    placeholder="gsk_..."
                                                />
                                                <Key className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">Used for AI features. Stored securely.</p>
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
