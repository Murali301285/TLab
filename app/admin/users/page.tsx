'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import DashboardLoader from '@/components/DashboardLoader';
import { Users, Plus, Search, Loader2, UserPlus, FileUp, Edit2, Trash2, CheckCircle, XCircle, Save, X, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string | null;
    isActive: boolean;
    createdAt: string;
}

interface Department {
    id: string;
    name: string;
}

export default function UserManagementPage() {
    const { user, isLoading: authLoading } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showLoader, setShowLoader] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'USER',
        department: '',
        isActive: true
    });

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [deptFilter, setDeptFilter] = useState('ALL');

    useEffect(() => {
        if (!authLoading && user?.companyId) {
            fetchData();
        }
    }, [user, authLoading]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [usersRes, deptsRes] = await Promise.all([
                fetch('/api/admin/users'),
                fetch('/api/masters/departments')
            ]);

            if (usersRes.ok) setUsers(await usersRes.json());
            if (deptsRes.ok) setDepartments(await deptsRes.json());
        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenForm = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                email: user.email,
                password: '', // Password empty on edit
                role: user.role,
                department: user.department || '',
                isActive: user.isActive
            });
        } else {
            setEditingUser(null);
            setFormData({
                name: '',
                email: '',
                password: '',
                role: 'USER',
                department: '',
                isActive: true
            });
        }
        setIsFormOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const url = '/api/admin/users';
            const method = editingUser ? 'PATCH' : 'POST';
            const body = {
                ...formData,
                id: editingUser?.id
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to save user');

            toast.success(editingUser ? 'User updated successfully' : 'User created successfully');
            setIsFormOpen(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.role.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = deptFilter === 'ALL' || u.department === deptFilter;
        return matchesSearch && matchesDept;
    });

    if (authLoading || showLoader) {
        return <DashboardLoader onFinish={() => setShowLoader(false)} />;
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20 relative">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Users className="h-6 w-6 text-indigo-600" />
                            User Management
                        </h1>
                        {user?.companyId && <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-bold uppercase tracking-wider hidden md:inline-block">ID: {user.companyId}</span>}
                    </div>
                    <div className="flex gap-2">
                        <button className="hidden md:flex bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 items-center gap-2 transition-colors">
                            <FileUp className="h-4 w-4" /> Bulk Upload
                        </button>
                        <button
                            onClick={() => handleOpenForm()}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <UserPlus className="h-4 w-4" /> Add User
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="relative col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or role..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                        />
                    </div>
                    <div>
                        <select
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm appearance-none"
                        >
                            <option value="ALL">All Departments</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.name}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* User Grid */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">User</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Role</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Department</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-500" />Loading Users...</td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">No users found.</td></tr>
                                ) : (
                                    filteredUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-lg uppercase shadow-inner">
                                                        {u.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{u.name}</p>
                                                        <p className="text-xs text-slate-500">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2 py-1 rounded-md text-xs font-bold border",
                                                    u.role === 'COMPANY_ADMIN' ? "bg-purple-50 text-purple-700 border-purple-200" :
                                                        u.role === 'MANAGER' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                            "bg-slate-100 text-slate-700 border-slate-200"
                                                )}>
                                                    {u.role.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 font-medium">{u.department || '—'}</td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold",
                                                    u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                )}>
                                                    {u.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                                    {u.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleOpenForm(u)}
                                                    className="text-slate-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition-all"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Slide-over Form */}
            {isFormOpen && (
                <>
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsFormOpen(false)} />
                    <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                            <h2 className="text-xl font-bold text-slate-900">{editingUser ? 'Edit User' : 'New User'}</h2>
                            <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-6 px-1">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    required
                                    disabled={!!editingUser}
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-500"
                                    placeholder="john@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {editingUser ? 'New Password (Optional)' : 'Password'} <span className="text-red-500">{!editingUser && '*'}</span>
                                </label>
                                <input
                                    type="password"
                                    required={!editingUser}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder={editingUser ? "Leave blank to keep current" : "••••••••"}
                                    minLength={6}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    >
                                        <option value="USER">User</option>
                                        <option value="MANAGER">Manager</option>
                                        <option value="CONTENT_MANAGER">Content Manager</option>
                                        <option value="HR">HR Admin</option>
                                        <option value="COMPANY_ADMIN">Company Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                                    <select
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    >
                                        <option value="">Select...</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.name}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {editingUser && (
                                <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                                            formData.isActive ? 'bg-green-600' : 'bg-slate-200'
                                        )}
                                    >
                                        <span className={cn(
                                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                            formData.isActive ? 'translate-x-5' : 'translate-x-0'
                                        )} />
                                    </button>
                                    <span className="text-sm font-medium text-slate-900">
                                        {formData.isActive ? 'Active User' : 'Inactive User'}
                                    </span>
                                </div>
                            )}

                        </form>

                        <div className="pt-6 mt-auto border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {editingUser ? 'Update User' : 'Create User'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
