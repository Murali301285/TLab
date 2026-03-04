'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import MainHeader from '@/components/MainHeader';
import DashboardLoader from '@/components/DashboardLoader';
import { Users, Plus, Search, Loader2, UserPlus, FileUp, Edit2, Trash2, CheckCircle, XCircle, Save, X, RotateCcw, Eye, EyeOff, BookOpen, UserCheck, UserX, User as UserIcon, ChevronLeft, ChevronRight, SlidersHorizontal, Filter, Mail, Briefcase, Bell, BookPlus, Ban, Unlock } from 'lucide-react';
import SubordinatesModal from '@/components/SubordinatesModal';
import UserAssignmentsModal from '@/components/UserAssignmentsModal';
import AssignContentModal from '@/components/AssignContentModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ... Interfaces ...
interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string | null;
    isActive: boolean;
    createdAt: string;
    isTempUser: boolean;
    validity: string | null;
    contactNumber: string | null;
    contactEmail: string | null;
    managers: { id: string; name: string }[];
    _count?: {
        enrollments: number;
        subordinates: number;
    }
    contentCounts?: {
        policy: number;
        library: number;
        content: number;
    }
    assignedCourses?: string[];
}

interface Department {
    id: string;
    name: string;
    // ...
}

export default function UserManagementPage() {
    return (
        <Suspense fallback={<DashboardLoader isLoading={true} message="Loading user management..." />}>
            <UserManagementContent />
        </Suspense>
    );
}

function UserManagementContent() {
    const { user, isLoading: authLoading } = useAuth();
    const searchParams = useSearchParams();
    const viewMode = searchParams.get('view'); // 'team' or null
    const isTeamView = viewMode === 'team';

    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showLoader, setShowLoader] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [viewingTeamUser, setViewingTeamUser] = useState<User | null>(null);
    const [viewingAssignmentsUser, setViewingAssignmentsUser] = useState<User | null>(null);

    // Assignment Modal State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assigningUser, setAssigningUser] = useState<User | null>(null);
    const [availableCourses, setAvailableCourses] = useState<any[]>([]);

    // ... (Handlers)

    // ... (Form State)

    // ... (Filters)

    // ...

    useEffect(() => {
        if (!authLoading && user?.companyId) {
            fetchData();
        }
    }, [user, authLoading, isTeamView]); // Refetch on team view change

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const query = isTeamView ? '?view=team' : '';
            const [usersRes, deptsRes] = await Promise.all([
                fetch(`/api/admin/users${query}`, { cache: 'no-store' }),
                fetch('/api/masters/departments', { cache: 'no-store' })
            ]);

            if (usersRes.ok) setUsers(await usersRes.json());
            if (deptsRes.ok) setDepartments(await deptsRes.json());
        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenAssignModal = async (u: User) => {
        setAssigningUser(u);
        setIsAssignModalOpen(true);
        // Fetch courses if not loaded
        if (availableCourses.length === 0) {
            try {
                const res = await fetch('/api/courses');
                if (res.ok) setAvailableCourses(await res.json());
            } catch (error) {
                console.error("Failed to fetch courses", error);
            }
        }
    };

    const handleAssignContent = async (formData: any) => {
        const toastId = toast.loading('Assigning content...');
        try {
            const res = await fetch('/api/courses/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: assigningUser?.id,
                    ...formData
                })
            });

            const contentType = res.headers.get("content-type");
            let data;
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await res.json();
            } else {
                data = { error: await res.text() };
            }

            if (!res.ok) {
                // detailed error from server
                const errorMessage = data.details
                    ? `Failed to assign: ${data.details}`
                    : (data.error || 'Failed to assign content');
                throw new Error(errorMessage);
            }

            toast.success('Content assigned successfully', { id: toastId });
            setIsAssignModalOpen(false);
            fetchData(); // Refresh users to update counts
        } catch (error: any) {
            console.error("Assign Error:", error);
            toast.error(error.message || "An unexpected error occurred", { id: toastId });
        }
    };

    const [isSaving, setIsSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'USER',
        department: '',
        isActive: true,
        isTempUser: false,
        validity: '',
        contactNumber: '',
        contactEmail: '',
        managerIds: [] as string[]
    });

    // Helper for email domain
    const companyDomain = user?.company?.shortName ? `@${user.company.shortName.toLowerCase()}.com` : '@company.com';
    const [emailUsername, setEmailUsername] = useState('');

    // Update email when username changes in create mode
    useEffect(() => {
        if (!editingUser && isFormOpen) {
            setFormData(prev => ({ ...prev, email: `${emailUsername}${companyDomain}` }));
        }
    }, [emailUsername, companyDomain, editingUser, isFormOpen]);


    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [sortOrder, setSortOrder] = useState('newest');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [managerSearch, setManagerSearch] = useState('');

    useEffect(() => {
        if (!authLoading && user?.companyId) {
            fetchData();
        }
    }, [user, authLoading]);

    // fetchData is defined above

    const handleOpenForm = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                email: user.email,
                password: '', // Password empty on edit
                role: user.role,
                department: user.department || '',
                isActive: user.isActive,
                isTempUser: user.isTempUser || false,
                validity: user.validity ? new Date(user.validity).toISOString().split('T')[0] : '', // Format YYYY-MM-DD
                contactNumber: user.contactNumber || '',
                contactEmail: user.contactEmail || '',
                managerIds: user.managers ? user.managers.map(m => m.id) : []
            });
            setEmailUsername(''); // Not used in edit
        } else {
            setEditingUser(null);
            setEmailUsername('');
            setFormData({
                name: '',
                email: '',
                password: '',
                role: 'USER',
                department: '',
                isActive: true,
                isTempUser: false,
                validity: '',
                contactNumber: '',
                contactEmail: '',
                managerIds: []
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

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            const res = await fetch(`/api/admin/users?id=${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Failed to delete user');

            toast.success('User deleted successfully');
            fetchData();
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to delete user');
        }
    };

    const handleToggleStatus = async (user: User) => {
        const newStatus = !user.isActive;
        const action = newStatus ? 'activate' : 'block';

        if (!confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: user.id, isActive: newStatus }),
            });

            if (!res.ok) throw new Error(`Failed to ${action} user`);

            toast.success(`User ${newStatus ? 'activated' : 'blocked'} successfully`);
            fetchData();
        } catch (error: any) {
            console.error(error);
            toast.error(`Failed to ${action} user`);
        }
    };

    // Derived Stats
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive).length;
    const blockedUsers = users.filter(u => !u.isActive).length;
    const coursesAssigned = users.reduce((acc, u) => acc + (u._count?.enrollments || 0), 0);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: keyof User | 'contentCounts'; direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: keyof User | 'contentCounts') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
        return matchesSearch && matchesRole;
    }).sort((a, b) => {
        // Priority to manual sort
        if (sortConfig) {
            const { key, direction } = sortConfig;
            let aValue: any = a[key as keyof User];
            let bValue: any = b[key as keyof User];

            if (key === 'contentCounts') {
                aValue = (a.contentCounts?.content || 0) + (a.contentCounts?.policy || 0) + (a.contentCounts?.library || 0);
                bValue = (b.contentCounts?.content || 0) + (b.contentCounts?.policy || 0) + (b.contentCounts?.library || 0);
            }

            if (aValue < bValue) return direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return direction === 'asc' ? 1 : -1;
            return 0;
        }

        // Default Sort
        if (sortOrder === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const effectiveItemsPerPage = itemsPerPage === -1 ? filteredUsers.length : itemsPerPage;
    const startIndex = (currentPage - 1) * effectiveItemsPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + effectiveItemsPerPage);
    const totalPages = Math.ceil(filteredUsers.length / effectiveItemsPerPage);

    // Reset to page 1 when search/filter/itemsPerPage changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, roleFilter, itemsPerPage]);

    if (authLoading || showLoader) {
        return <DashboardLoader onFinish={() => setShowLoader(false)} />;
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20 relative font-sans">
            {/* Top Navigation */}
            <MainHeader />

            {/* Stats Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            {isTeamView ? 'Team Members' : 'Users & Employees'}
                        </h1>
                        <p className="text-slate-500 mt-1">
                            {isTeamView
                                ? 'Manage your assigned team members'
                                : 'Manage system users, roles, and access permissions'
                            }
                        </p>
                    </div>
                    <div className="flex gap-3">
                        {!isTeamView && (
                            <>
                                <button className="hidden md:flex bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 items-center gap-2 transition-colors">
                                    <UserCheck className="h-4 w-4" /> Manage Roles
                                </button>
                                <button
                                    onClick={() => handleOpenForm()}
                                    className="bg-[#008ba3] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#007b91] flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    <Plus className="h-4 w-4" /> Add New User
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Users</p>
                            <h3 className="text-2xl font-bold text-slate-900">{totalUsers}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                            <UserCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Active Users</p>
                            <h3 className="text-2xl font-bold text-slate-900">{activeUsers}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                            <UserX className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Blocked Users</p>
                            <h3 className="text-2xl font-bold text-slate-900">{blockedUsers}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Courses Assigned</p>
                            <h3 className="text-2xl font-bold text-slate-900">{coursesAssigned}</h3>
                        </div>
                    </div>
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#008ba3] outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="pl-8 pr-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 font-medium focus:ring-2 focus:ring-[#008ba3] outline-none bg-white appearance-none"
                                >
                                    <option value="ALL">All Roles</option>
                                    <option value="USER">User</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="COMPANY_ADMIN">Admin</option>
                                </select>
                            </div>

                            <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>

                            <div className="flex items-center gap-2 text-sm text-slate-500 whitespace-nowrap">
                                <span>Sort:</span>
                                <select
                                    value={sortOrder}
                                    onChange={(e) => {
                                        setSortOrder(e.target.value);
                                        setSortConfig(null); // Reset manual column sort
                                    }}
                                    className="border-none bg-transparent font-bold text-slate-700 focus:ring-0 outline-none cursor-pointer"
                                >
                                    <option value="newest">Newest Joined</option>
                                    <option value="oldest">Oldest Joined</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 whitespace-nowrap ml-4">
                                <span>Show:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                    className="border border-slate-200 rounded bg-white px-2 py-1 text-xs font-bold text-slate-700 focus:ring-0 outline-none cursor-pointer"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={-1}>All</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-12">Sl No</th>
                                    <th onClick={() => handleSort('name')} className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group">
                                        User
                                        {sortConfig?.key === 'name' && (
                                            <span className="ml-1 text-indigo-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </th>
                                    <th onClick={() => handleSort('role')} className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors">
                                        Role & Dept
                                        {sortConfig?.key === 'role' && (
                                            <span className="ml-1 text-indigo-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </th>
                                    <th onClick={() => handleSort('isActive')} className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors">
                                        Status
                                        {sortConfig?.key === 'isActive' && (
                                            <span className="ml-1 text-indigo-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reporting To</th>
                                    <th onClick={() => handleSort('contentCounts')} className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors">
                                        Assigned Content
                                        {sortConfig?.key === 'contentCounts' && (
                                            <span className="ml-1 text-indigo-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr><td colSpan={7} className="p-12 text-center text-slate-500"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-[#008ba3]" />Loading Users...</td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan={7} className="p-12 text-center text-slate-500">No users found.</td></tr>
                                ) : (
                                    paginatedUsers.map((u, index) => (
                                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 text-xs font-bold text-slate-600">
                                                {startIndex + index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm uppercase">
                                                        {u.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{u.name}</p>
                                                        <div className="flex items-center gap-1 text-xs text-slate-500">
                                                            <Mail className="h-3 w-3" />
                                                            {u.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 lowercase">
                                                        {u.role.replace('_', ' ').toLowerCase()}
                                                    </span>
                                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                                        <Briefcase className="h-3 w-3" />
                                                        {u.department || 'General'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border",
                                                    u.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
                                                )}>
                                                    {u.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                                    {u.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {u.managers && u.managers.length > 0 ? (
                                                    <div className="flex -space-x-2 overflow-hidden">
                                                        {u.managers.slice(0, 3).map((m) => (
                                                            <div key={m.id} className="h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0" title={m.name}>
                                                                <span className="leading-none mt-0.5">{m.name.charAt(0)}</span>
                                                            </div>
                                                        ))}
                                                        {u.managers.length > 3 && (
                                                            <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                                +{u.managers.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => setViewingAssignmentsUser(u)}
                                                    className="group flex flex-col items-start gap-1 p-1 hover:bg-slate-100 rounded-md transition-colors w-full text-left"
                                                >
                                                    {u.contentCounts ? (
                                                        <div className="flex flex-col gap-0.5 w-full">
                                                            <div className="flex items-center justify-between gap-4 text-xs w-full">
                                                                <span className="font-medium text-slate-500">Content:</span>
                                                                <span className="font-bold text-slate-700">{u.contentCounts.content}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-4 text-xs w-full">
                                                                <span className="font-medium text-amber-600">Policy:</span>
                                                                <span className="font-bold text-amber-700">{u.contentCounts.policy}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between gap-4 text-xs w-full">
                                                                <span className="font-medium text-emerald-600">Library:</span>
                                                                <span className="font-bold text-emerald-700">{u.contentCounts.library}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">No content</span>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {/* View Team Action */}
                                                    {/* View Team Action - Only if they have subordinates */}
                                                    {(u._count?.subordinates ?? 0) > 0 && (
                                                        <button
                                                            onClick={() => setViewingTeamUser(u)}
                                                            className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all relative"
                                                            title="View Team"
                                                        >
                                                            <Users className="h-4 w-4" />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handleOpenForm(u)}
                                                        className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-[#008ba3] hover:bg-slate-100 rounded-lg transition-all"
                                                        title="Edit User"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenAssignModal(u)}
                                                        className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all"
                                                        title="Assign Content"
                                                    >
                                                        <BookPlus className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleStatus(u)}
                                                        className={cn(
                                                            "h-8 w-8 flex items-center justify-center rounded-lg transition-all",
                                                            u.isActive
                                                                ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                                                : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                                        )}
                                                        title={u.isActive ? "Block User" : "Unblock User"}
                                                    >
                                                        {u.isActive ? <Ban className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(u.id)}
                                                        className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {filteredUsers.length > 0 && (
                        <div className="p-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                            <span className="text-sm text-slate-500">
                                Showing {startIndex + 1} to {Math.min(startIndex + effectiveItemsPerPage, filteredUsers.length)} of {filteredUsers.length} entries
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="h-4 w-4 text-slate-600" />
                                </button>
                                <span className="text-sm font-bold text-slate-700">
                                    Page {currentPage} of {totalPages || 1}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="h-4 w-4 text-slate-600" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Subordinates Modal */}
            {viewingTeamUser && (
                <SubordinatesModal
                    managerId={viewingTeamUser.id}
                    managerName={viewingTeamUser.name}
                    onClose={() => setViewingTeamUser(null)}
                    onAssign={handleOpenAssignModal}
                />
            )}

            {/* Assignments Modal */}
            {viewingAssignmentsUser && (
                <UserAssignmentsModal
                    userId={viewingAssignmentsUser.id}
                    userName={viewingAssignmentsUser.name}
                    onClose={() => setViewingAssignmentsUser(null)}
                    onUpdate={fetchData}
                />
            )}

            {/* Assign Content Modal */}
            {assigningUser && (
                <AssignContentModal
                    isOpen={isAssignModalOpen}
                    onClose={() => setIsAssignModalOpen(false)}
                    onAssign={handleAssignContent}
                    user={assigningUser}
                    courses={availableCourses}
                />
            )}

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

                        <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-6 px-1" autoComplete="off">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="Full Name"
                                    autoComplete="off"
                                    name="user_fullname_new"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                                {editingUser ? (
                                    <input
                                        type="email"
                                        required
                                        disabled
                                        value={formData.email}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed"
                                    />
                                ) : (
                                    <div className="flex">
                                        <input
                                            type="text"
                                            required
                                            value={emailUsername}
                                            onChange={(e) => setEmailUsername(e.target.value)}
                                            className="flex-1 px-4 py-2 border border-r-0 border-slate-200 rounded-l-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="username"
                                        />
                                        <div className="px-4 py-2 bg-slate-100 border border-l-0 border-slate-200 rounded-r-lg text-slate-500 font-medium select-none flex items-center">
                                            {companyDomain}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
                                    <input
                                        type="tel"
                                        value={formData.contactNumber}
                                        onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="+1 234 567 890"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                                    <input
                                        type="email"
                                        value={formData.contactEmail}
                                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="personal@email.com"
                                    />
                                </div>
                            </div>


                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {editingUser ? 'New Password (Optional)' : 'Password'} <span className="text-red-500">{!editingUser && '*'}</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required={!editingUser}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all pr-10"
                                        placeholder={editingUser ? "Leave blank to keep current" : "••••••••"}
                                        minLength={6}
                                        autoComplete="new-password"
                                        name="user_password_new"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
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

                            {/* Reporting To (Multi-Select) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Reporting To</label>
                                <div className="mb-2">
                                    <input
                                        type="text"
                                        placeholder="Search managers..."
                                        value={managerSearch}
                                        onChange={(e) => setManagerSearch(e.target.value)}
                                        className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="border border-slate-200 rounded-lg p-2 max-h-48 overflow-y-auto">
                                    {(() => {
                                        const availableManagers = users.filter(u =>
                                            u.id !== editingUser?.id &&
                                            u.role !== 'USER' &&
                                            u.role !== 'SUPER_ADMIN' && // Exclude Super Admin from managers
                                            !u.isTempUser &&
                                            (u.name.toLowerCase().includes(managerSearch.toLowerCase()) || u.email.toLowerCase().includes(managerSearch.toLowerCase()))
                                        );

                                        if (availableManagers.length === 0) return <p className="text-sm text-slate-400 p-2">No users found</p>;

                                        return availableManagers.map(u => (
                                            <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.managerIds.includes(u.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFormData(prev => ({ ...prev, managerIds: [...prev.managerIds, u.id] }));
                                                        } else {
                                                            setFormData(prev => ({ ...prev, managerIds: prev.managerIds.filter(id => id !== u.id) }));
                                                        }
                                                    }}
                                                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-slate-900">{u.name}</p>
                                                    <p className="text-xs text-slate-500">{u.role}</p>
                                                </div>
                                            </label>
                                        ));
                                    })()}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Select managers this user reports to.</p>
                            </div>


                            {/* Temp User Toggle */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-900">Temporary User</span>
                                        <span className="text-xs text-slate-500">Enable if this is a contract or temporary employee</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isTempUser: !formData.isTempUser })}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                                            formData.isTempUser ? 'bg-indigo-600' : 'bg-slate-200'
                                        )}
                                    >
                                        <span className={cn(
                                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                            formData.isTempUser ? 'translate-x-5' : 'translate-x-0'
                                        )} />
                                    </button>
                                </div>

                                {formData.isTempUser && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Validity Date <span className="text-red-500">*</span></label>
                                        <input
                                            type="date"
                                            required={formData.isTempUser}
                                            value={formData.validity}
                                            onChange={(e) => setFormData({ ...formData, validity: e.target.value })}
                                            min={new Date().toISOString().split('T')[0]} // Validate against past dates
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                )}
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
