'use client';

import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import {
    Users,
    Search,
    Filter,
    Plus,
    MoreVertical,
    Mail,
    Shield,
    Briefcase,
    CheckCircle,
    XCircle,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    BarChart2,
    Trophy,
    Clock,
    FileCheck,
    Edit2,
    Trash2,
    UserCheck,
    UserX,
    BookPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ProfileDropdown from '@/components/ProfileDropdown';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/ToastProvider';
import AddUserModal from '@/components/AddUserModal';
import EditUserModal from '@/components/EditUserModal';
import ManageRolesModal from '@/components/ManageRolesModal';
import AssignContentModal from '@/components/AssignContentModal';
import { ROLES } from '@/data/mockData';
import AdminUserQuizHistory from '@/components/quiz/AdminUserQuizHistory';
import { removeCourseAllocation, toggleCourseBlock } from '@/app/actions/enrollments';
import { Lock, Unlock } from 'lucide-react';

import PageLoader from '@/components/PageLoader';

export default function UserManagementPage() {
    const { user: currentUser, isLoading: authLoading } = useAuth();
    const { showToast } = useToast();

    // Data State
    const [users, setUsers] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [roles, setRoles] = useState(ROLES);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');

    // UI state
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [isEditUserOpen, setIsEditUserOpen] = useState(false);
    const [isManageRolesOpen, setIsManageRolesOpen] = useState(false);
    const [expandedManagers, setExpandedManagers] = useState<string[]>([]);

    // Main Page Pagination & Sort
    const [mainSearchTerm, setMainSearchTerm] = useState(''); // Renaming/using distinct from modal
    const [mainSortOption, setMainSortOption] = useState('newest');
    const [mainItemsPerPage, setMainItemsPerPage] = useState<number | 'All'>(10);
    const [mainCurrentPage, setMainCurrentPage] = useState(1);

    // Selected User for other actions (Assign, Progress)
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [activeModalTab, setActiveModalTab] = useState<'courses' | 'quizzes'>('courses');

    // Search/Filter States for Progress Modal
    const [progressSearchTerm, setProgressSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('date-desc');
    const [itemsPerPage, setItemsPerPage] = useState<number | 'All'>(10);
    const [currentPage, setCurrentPage] = useState(1);

    // Assignment Form State
    const [assignForm, setAssignForm] = useState({
        courseId: '',
        validityValue: 365,
        validityUnit: 'DAYS',
        hasCertificate: true,
        certName: 'Completion Certificate'
    });

    if (authLoading || loading) return <PageLoader message="Loading User Management..." />;

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) setUsers(await res.json());
        } catch (e) {
            console.error("Failed to load users", e);
        }
    };

    const fetchCourses = async () => {
        try {
            const res = await fetch('/api/courses');
            if (res.ok) setCourses(await res.json());
        } catch (e) {
            console.error("Failed to load courses", e);
        }
    };

    // Initial Load
    useEffect(() => {
        if (currentUser) {
            Promise.all([fetchUsers(), fetchCourses()])
                .finally(() => setLoading(false));
        }
    }, [currentUser]);

    // Initial filter logic
    const filteredUsers = users.filter(user => {
        // PERMISSION CHECK for Manager/Admin views
        let visible = false;
        if (currentUser?.role === 'admin') visible = true;
        else if (currentUser?.role === 'manager') {
            visible = user.id === currentUser.id || user.managerId === currentUser.id;
        } else {
            visible = user.id === currentUser?.id;
        }

        if (!visible) return false;

        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;

        return matchesSearch && matchesRole;
    });

    // --- Metrics Calculation ---
    const totalUsers = users.length;
    const totalBlocked = users.filter(u => !u.isActive).length;
    const totalCoursesAssigned = users.reduce((acc, u) => acc + (u.assignedCourses?.length || 0), 0);
    const activeUsers = totalUsers - totalBlocked;

    // --- Process for Display (Sort & Paginate) ---
    const isHierarchyMode = !searchTerm && roleFilter === 'all';

    // 1. Filter for View (Roots only if hierarchy, else all filtered)
    let displayUsers = isHierarchyMode
        ? filteredUsers.filter(u => !u.managerId)
        : filteredUsers;

    // 2. Sort
    displayUsers.sort((a, b) => {
        if (mainSortOption === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        if (mainSortOption === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        if (mainSortOption === 'name-asc') return a.name.localeCompare(b.name);
        if (mainSortOption === 'name-desc') return b.name.localeCompare(a.name);
        if (mainSortOption === 'role') return a.role.localeCompare(b.role);
        return 0;
    });

    // 3. Paginate
    const totalItems = displayUsers.length;
    const totalPages = mainItemsPerPage === 'All' ? 1 : Math.ceil(totalItems / mainItemsPerPage);

    const startIndex = mainCurrentPage === 1 ? 0 : (mainCurrentPage - 1) * (typeof mainItemsPerPage === 'number' ? mainItemsPerPage : totalItems);
    const endIndex = mainItemsPerPage === 'All' ? totalItems : Math.min(startIndex + mainItemsPerPage, totalItems);

    const paginatedUsers = displayUsers.slice(startIndex, endIndex);

    // Toggle Tree View
    const toggleExpand = (userId: string) => {
        setExpandedManagers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleAddUser = async (userData: any) => {
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            if (res.ok) {
                showToast("User created successfully", "success");
                setIsAddUserOpen(false);
                fetchUsers();
            } else {
                const err = await res.json();
                showToast(err.error || "Failed to create user", "error");
            }
        } catch (e) {
            showToast("Error creating user", "error");
        }
    };

    const handleToggleActive = async (user: any) => {
        // Check for subordinates if we are DEACTIVATING
        if (user.isActive) {
            const subordinatesCount = users.filter(u => u.managerId === user.id).length;
            if (subordinatesCount > 0) {
                const confirmed = window.confirm(
                    `⚠️ WARNING: This user is a Manager for ${subordinatesCount} other user(s).\n\n` +
                    `Deactivating them will move these ${subordinatesCount} users to the "Unallocated" pool (no manager).\n\n` +
                    `Do you want to proceed?`
                );
                if (!confirmed) return;
            }
        }

        try {
            const res = await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: user.id,
                    isActive: !user.isActive
                })
            });

            if (res.ok) {
                showToast(`User ${!user.isActive ? 'activated' : 'deactivated'}`, "success");
                fetchUsers();
            } else {
                showToast("Failed to update status", "error");
            }
        } catch (e) {
            showToast("Error updating status", "error");
        }
    };

    const handleDeleteUser = async (userId: string) => {
        try {
            const res = await fetch(`/api/users?id=${userId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                showToast("User deleted successfully", "success");
                fetchUsers();
            } else {
                showToast("Failed to delete user", "error");
            }
        } catch (e) {
            showToast("Error deleting user", "error");
        }
    };

    const handleUpdateUser = async (userId: string, data: any) => {
        try {
            const res = await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: userId, ...data })
            });

            if (res.ok) {
                showToast("User updated successfully", "success");
                fetchUsers();
            } else {
                showToast("Failed to update user", "error");
            }
        } catch (e) {
            showToast("Error updating user", "error");
        }
    };

    const openEditModal = (user: any) => {
        setSelectedUser(user);
        setIsEditUserOpen(true);
    };

    const handleUpdateRoles = (newRoles: any[]) => {
        setRoles(newRoles);
        showToast('Roles updated successfully', 'success');
    };

    const handleAssignCourse = (user: any) => {
        setSelectedUser(user);
        setAssignForm({
            courseId: '',
            validityValue: 365,
            validityUnit: 'DAYS',
            hasCertificate: true,
            certName: 'Course Completion Certificate'
        });
        setIsAssignModalOpen(true);
    };

    const confirmAssignment = async (submissionData: any) => {
        if (!selectedUser || !submissionData.courseId) return;

        try {
            const res = await fetch('/api/courses/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: selectedUser.id,
                    ...submissionData
                })
            });

            if (!res.ok) {
                const err = await res.json();
                showToast(err.error || 'Assignment failed', 'error');
                return;
            }

            // Opmtimistic Update - add as object
            setUsers(prev => prev.map(u => {
                if (u.id === selectedUser.id) {
                    return {
                        ...u,
                        assignedCourses: [
                            ...(u.assignedCourses || []),
                            { courseId: submissionData.courseId, status: 'ACTIVE' }
                        ]
                    };
                }
                return u;
            }));

            setIsAssignModalOpen(false);
            setSelectedUser(null);
            showToast(`Course assigned successfully`, 'success');

        } catch (e) {
            showToast('Failed to assign course', 'error');
        }
    };

    const handleRemoveCourse = async (courseId: string, courseTitle: string) => {
        if (!confirm(`Are you sure you want to remove "${courseTitle}" from this user?\n\nWARNING: This will PERMANENTLY DELETE all quiz history and progress for this course. This cannot be undone.`)) {
            return;
        }

        const res = await removeCourseAllocation(selectedUser.id, courseId);
        if (res.success) {
            showToast("Course removed successfully", "success");
            // Optimistic update
            const updatedUser = {
                ...selectedUser,
                assignedCourses: selectedUser.assignedCourses.filter((c: any) => c.courseId !== courseId)
            };
            setSelectedUser(updatedUser);
            setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        } else {
            showToast("Failed to remove course", "error");
        }
    };

    const handleToggleBlock = async (courseId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
        const action = newStatus === 'BLOCKED' ? 'Block' : 'Unblock';

        if (!confirm(`Are you sure you want to ${action} this course?`)) return;

        const res = await toggleCourseBlock(selectedUser.id, courseId, newStatus);
        if (res.success) {
            showToast(`Course ${newStatus.toLowerCase()} successfully`, "success");
            // Optimistic update
            const updatedUser = {
                ...selectedUser,
                assignedCourses: selectedUser.assignedCourses.map((c: any) =>
                    c.courseId === courseId ? { ...c, status: newStatus } : c
                )
            };
            setSelectedUser(updatedUser);
            setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        } else {
            showToast(`Failed to ${action.toLowerCase()} course`, "error");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Navigation */}
            <nav className="sticky top-0 z-50 bg-slate-900 border-b border-white/10 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative flex items-center justify-center h-16">
                        <div className="absolute left-0 flex items-center gap-4">
                            <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                                <ChevronLeft className="h-5 w-5" />
                                <span className="font-medium">Back to Dashboard</span>
                            </Link>
                        </div>
                        <div className="text-white font-bold text-lg">User Management</div>
                        <div className="absolute right-0 flex items-center gap-4">
                            <ProfileDropdown />
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                {/* Header Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Users & Employees</h1>
                        <p className="text-slate-500 mt-1">Manage access, assignments and track progress.</p>
                    </div>
                    <div className="flex gap-3">
                        {currentUser?.role === 'admin' && (
                            <button
                                onClick={() => setIsManageRolesOpen(true)}
                                className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                            >
                                <Shield className="h-5 w-5" /> Manage Roles
                            </button>
                        )}
                        <button
                            onClick={() => setIsAddUserOpen(true)}
                            className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-cyan-700 transition-colors shadow-lg shadow-cyan-500/20"
                        >
                            <Plus className="h-5 w-5" /> Add New User
                        </button>
                    </div>
                </div>

                {/* Filters */}

                {/* Metrics Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Total Users</p>
                            <h3 className="text-2xl font-bold text-slate-800">{totalUsers}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                            <UserCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Active Users</p>
                            <h3 className="text-2xl font-bold text-slate-800">{activeUsers}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                            <UserX className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Blocked Users</p>
                            <h3 className="text-2xl font-bold text-slate-800">{totalBlocked}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Courses Assigned</p>
                            <h3 className="text-2xl font-bold text-slate-800">{totalCoursesAssigned}</h3>
                        </div>
                    </div>
                </div>

                {/* Filters & Pagination Controls */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-row flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="text"
                                name="user_search"
                                autoComplete="off"
                                placeholder="Search users..."
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-700"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-slate-400" />
                            <select
                                className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-700 bg-white"
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                            >
                                <option value="all">All Roles</option>
                                {roles.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}s</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500">Sort:</span>
                            <select
                                value={mainSortOption}
                                onChange={(e) => setMainSortOption(e.target.value)}
                                className="bg-white border border-slate-200 text-sm rounded-lg p-2 focus:ring-2 focus:ring-cyan-500 outline-none"
                            >
                                <option value="newest">Newest Joined</option>
                                <option value="oldest">Oldest Joined</option>
                                <option value="name-asc">Name (A-Z)</option>
                                <option value="name-desc">Name (Z-A)</option>
                                <option value="role">Role</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500">Show:</span>
                            <select
                                value={mainItemsPerPage}
                                onChange={(e) => {
                                    setMainItemsPerPage(e.target.value === 'All' ? 'All' : parseInt(e.target.value));
                                    setMainCurrentPage(1);
                                }}
                                className="bg-white border border-slate-200 text-sm rounded-lg p-2 focus:ring-2 focus:ring-cyan-500 outline-none"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value="All">All</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role & Dept</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Courses</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-500">Loading users...</td>
                                    </tr>
                                ) : paginatedUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-slate-500">No users found matching your filters.</td>
                                    </tr>
                                ) : paginatedUsers.map((user) => {
                                    // Hierarchy mode logic is now handled in displayUsers formatting, 
                                    // but we assume flattened list for pagination purposes unless we want to keep tree structure.
                                    // Since we paginated the ROOTS (in hierarchy mode), we just render the user.

                                    const isRoot = !user.managerId;
                                    // Previously we skipped if isHierarchyMode && !isRoot. 
                                    // But displayUsers ALREADY filtered that. So we are safe.

                                    // Identify Direct Reports (from FULL list) for hierarchy
                                    const directReports = users.filter(u => u.managerId === user.id);
                                    const isManager = directReports.length > 0;
                                    const isExpanded = expandedManagers.includes(user.id);

                                    return (
                                        <Fragment key={user.id}>
                                            <tr className={cn("hover:bg-slate-50 transition-colors", isExpanded && "bg-slate-50/80")}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {isManager && isHierarchyMode ? (
                                                            <button
                                                                onClick={() => toggleExpand(user.id)}
                                                                className="text-slate-400 hover:text-cyan-600 transition-colors"
                                                            >
                                                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                            </button>
                                                        ) : (
                                                            <div className="w-4" /> // Spacer
                                                        )}
                                                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-slate-500 font-bold", isManager ? "bg-purple-100 text-purple-600" : "bg-slate-100")}>
                                                            {user.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-slate-900">{user.name}</p>
                                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                                <Mail className="h-3 w-3" /> {user.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={cn(
                                                            "px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 w-fit",
                                                            user.role === 'admin' && "bg-purple-50 text-purple-700 border-purple-200",
                                                            user.role === 'manager' && "bg-blue-50 text-blue-700 border-blue-200",
                                                            user.role === 'hr' && "bg-orange-50 text-orange-700 border-orange-200",
                                                            "bg-slate-50 text-slate-700 border-slate-200"
                                                        )}>
                                                            {user.role}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                                                            <span className="text-xs text-slate-500">{user.department}</span>
                                                        </div>
                                                        {/* Reporting Line Clarity */}
                                                        {user.managerId && (
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="text-[10px] text-slate-400">Reports to:</span>
                                                                <span className="text-[10px] font-medium text-slate-600">
                                                                    {users.find(u => u.id === user.managerId)?.name || 'Unknown'}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {!user.managerId && user.role !== 'admin' && (
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="text-[10px] text-slate-400 italic">Unallocated (No Manager)</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {user.isActive ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                                            <CheckCircle className="h-3 w-3" /> Active
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                                                            <XCircle className="h-3 w-3" /> Inactive
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {user.assignedCourses && user.assignedCourses.length > 0 ? (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedUser(user);
                                                                    setIsProgressModalOpen(true);
                                                                }}
                                                                className="flex items-center gap-1.5 text-cyan-600 font-medium hover:underline text-xs"
                                                            >
                                                                <BookOpen className="h-3.5 w-3.5" />
                                                                {user.assignedCourses.length} Course{user.assignedCourses.length !== 1 ? 's' : ''} Assigned - View Details
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">No courses</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2 items-center">
                                                        <button
                                                            onClick={() => openEditModal(user)}
                                                            className="group relative p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-cyan-600 transition-colors"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap z-10">
                                                                Edit User
                                                            </span>
                                                        </button>

                                                        <button
                                                            onClick={() => handleToggleActive(user)}
                                                            className={cn(
                                                                "group relative p-2 rounded-full hover:bg-slate-100 transition-colors",
                                                                user.isActive ? "text-green-600 hover:text-red-600" : "text-red-500 hover:text-green-600"
                                                            )}
                                                        >
                                                            {user.isActive ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                                                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap z-10">
                                                                {user.isActive ? "Block User" : "Activate User"}
                                                            </span>
                                                        </button>

                                                        <button
                                                            onClick={() => handleAssignCourse(user)}
                                                            className="group relative p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-cyan-600 transition-colors"
                                                        >
                                                            <BookPlus className="h-4 w-4" />
                                                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap z-10">
                                                                Assign Course
                                                            </span>
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm(`Are you sure you want to delete ${user.name}? This cannot be undone.`)) {
                                                                    handleDeleteUser(user.id);
                                                                }
                                                            }}
                                                            className="group relative p-2 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap z-10">
                                                                Delete User
                                                            </span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* EXPANDED ROW FOR DIRECT REPORTS - Recursive look for children */}
                                            {isExpanded && isHierarchyMode && directReports.map(child => (
                                                <tr key={child.id} className="bg-slate-50/50">
                                                    <td className="px-6 py-4 pl-12">
                                                        <div className="flex items-center gap-3 relative before:content-[''] before:absolute before:-left-6 before:top-1/2 before:-translate-y-1/2 before:w-4 before:h-px before:bg-slate-300 before:block">
                                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                                                                {child.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-slate-900 text-sm">{child.name}</p>
                                                                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                                                    <Mail className="h-3 w-3" /> {child.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1.5 w-fit bg-slate-50 text-slate-600 border-slate-200">
                                                                {child.role}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {child.isActive ? (
                                                            <span className="text-green-600 text-xs font-medium">Active</span>
                                                        ) : (
                                                            <span className="text-red-600 text-xs font-medium">Inactive</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-slate-400">
                                                        {child.assignedCourses && child.assignedCourses.length > 0 ? (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedUser(child);
                                                                    setIsProgressModalOpen(true);
                                                                }}
                                                                className="flex items-center gap-1.5 text-cyan-600 font-medium hover:underline"
                                                            >
                                                                <BookOpen className="h-3.5 w-3.5" />
                                                                {child.assignedCourses.length} Course{child.assignedCourses.length !== 1 ? 's' : ''} Assigned
                                                            </button>
                                                        ) : (
                                                            <span className="text-slate-400 italic">No courses</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2 items-center">
                                                            <button
                                                                onClick={() => openEditModal(child)}
                                                                className="group relative p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-cyan-600 transition-colors"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap z-10">
                                                                    Edit
                                                                </span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleAssignCourse(child)}
                                                                className="group relative p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-cyan-600 transition-colors"
                                                            >
                                                                <BookPlus className="h-3.5 w-3.5" />
                                                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap z-10">
                                                                    Assign Course
                                                                </span>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (window.confirm(`Delete ${child.name}?`)) handleDeleteUser(child.id);
                                                                }}
                                                                className="group relative p-1.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap z-10">
                                                                    Delete
                                                                </span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Main Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-slate-500">
                            Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{endIndex}</span> of <span className="font-medium">{totalItems}</span> users
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setMainCurrentPage(p => Math.max(1, p - 1))}
                                disabled={mainCurrentPage === 1}
                                className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-sm font-medium text-slate-700">
                                Page {mainCurrentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setMainCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={mainCurrentPage === totalPages}
                                className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <AddUserModal
                isOpen={isAddUserOpen}
                onClose={() => setIsAddUserOpen(false)}
                onAdd={handleAddUser}
                availableUsers={users}
            />

            <ManageRolesModal
                isOpen={isManageRolesOpen}
                onClose={() => setIsManageRolesOpen(false)}
                currentRoles={roles}
                onUpdateRoles={handleUpdateRoles}
            />

            <EditUserModal
                isOpen={isEditUserOpen}
                onClose={() => {
                    setIsEditUserOpen(false);
                    setSelectedUser(null);
                }}
                onUpdate={handleUpdateUser}
                user={selectedUser}
                availableManagers={users.filter(u => u.role === 'manager' || u.role === 'admin')}
            />

            {/* Assign Content Modal - IMPORTED & ENHANCED */}
            <AssignContentModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                onAssign={confirmAssignment} // Pass function reference
                user={selectedUser}
                courses={courses}
            />

            {/* View Assigned Courses Modal */}
            {
                selectedUser && isProgressModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">User Progress & History</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">
                                            {selectedUser.name.charAt(0)}
                                        </div>
                                        <p className="text-sm text-slate-500">For <span className="font-semibold text-slate-800">{selectedUser.name}</span></p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsProgressModalOpen(false);
                                        setSelectedUser(null);
                                        setActiveModalTab('courses');
                                    }}
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <XCircle className="h-8 w-8" />
                                </button>
                            </div>

                            {/* Modal Tabs */}
                            <div className="px-6 pt-4 border-b border-slate-100 flex gap-6">
                                <button
                                    onClick={() => setActiveModalTab('courses')}
                                    className={cn(
                                        "pb-3 text-sm font-bold border-b-2 transition-colors",
                                        activeModalTab === 'courses' ? "border-cyan-500 text-cyan-600" : "border-transparent text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    Assigned Courses ({selectedUser.assignedCourses?.length || 0})
                                </button>
                                <button
                                    onClick={() => setActiveModalTab('quizzes')}
                                    className={cn(
                                        "pb-3 text-sm font-bold border-b-2 transition-colors",
                                        activeModalTab === 'quizzes' ? "border-purple-500 text-purple-600" : "border-transparent text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    Quiz History
                                </button>
                            </div>

                            {/* Filters & Controls (Only for Courses Tab) */}
                            {activeModalTab === 'courses' && (
                                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
                                    <div className="relative flex-1 min-w-[200px]">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search courses..."
                                            value={progressSearchTerm}
                                            onChange={(e) => setProgressSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={sortOption}
                                            onChange={(e) => setSortOption(e.target.value)}
                                            className="bg-white border border-slate-200 text-sm rounded-lg p-2 focus:ring-2 focus:ring-cyan-500 outline-none"
                                        >
                                            <option value="date-desc">Newest Assigned</option>
                                            <option value="date-asc">Oldest Assigned</option>
                                            <option value="title">Title (A-Z)</option>
                                            <option value="progress">Progress (High-Low)</option>
                                        </select>
                                        <select
                                            value={itemsPerPage}
                                            onChange={(e) => {
                                                setItemsPerPage(e.target.value === 'All' ? 'All' : parseInt(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                            className="bg-white border border-slate-200 text-sm rounded-lg p-2 focus:ring-2 focus:ring-cyan-500 outline-none"
                                        >
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={50}>50</option>
                                            <option value="All">All</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="p-8 overflow-y-auto bg-slate-50/30">
                                {activeModalTab === 'courses' ? (
                                    !selectedUser.assignedCourses || selectedUser.assignedCourses.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <BookOpen className="h-10 w-10 text-slate-300" />
                                            </div>
                                            <h3 className="text-lg font-medium text-slate-900">No Courses Assigned</h3>
                                            <p className="text-slate-500">This user has not been assigned any learning content yet.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-4">
                                            {(() => {
                                                // Process Courses (Filter, Sort, Paginate)
                                                let processedCourses = selectedUser.assignedCourses.map((assignment: any) => {
                                                    const cid = typeof assignment === 'string' ? assignment : assignment.courseId;
                                                    const status = typeof assignment === 'string' ? 'ACTIVE' : assignment.status;
                                                    const assignedAt = assignment.assignedAt ? new Date(assignment.assignedAt) : new Date(2024, 0, 1); // Mock if missing
                                                    const lastActive = assignment.lastActiveAt ? new Date(assignment.lastActiveAt) : new Date(); // Mock
                                                    const course = courses.find(c => c.id === cid);

                                                    // Calc Progress for sorting
                                                    const allTopics = course?.chapters?.flatMap((ch: any) => ch.topics) || [];
                                                    const completedCount = allTopics.filter((t: any) => selectedUser.completedTopics?.includes(t.id)).length;
                                                    const progress = allTopics.length > 0 ? (completedCount / allTopics.length) * 100 : 0;

                                                    return { ...assignment, cid, status, course, assignedAt, lastActive, progress };
                                                }).filter((item: any) => item.course && item.course.title.toLowerCase().includes(progressSearchTerm.toLowerCase()));

                                                // Sort
                                                processedCourses.sort((a: any, b: any) => {
                                                    if (sortOption === 'title') return a.course.title.localeCompare(b.course.title);
                                                    if (sortOption === 'date-asc') return a.assignedAt.getTime() - b.assignedAt.getTime();
                                                    if (sortOption === 'date-desc') return b.assignedAt.getTime() - a.assignedAt.getTime();
                                                    if (sortOption === 'progress') return b.progress - a.progress;
                                                    return 0;
                                                });

                                                // Paginate
                                                const totalItems = processedCourses.length;
                                                const startIndex = currentPage === 1 ? 0 : (currentPage - 1) * (itemsPerPage === 'All' ? totalItems : itemsPerPage);
                                                const endIndex = itemsPerPage === 'All' ? totalItems : Math.min(startIndex + itemsPerPage, totalItems);
                                                const paginated = processedCourses.slice(startIndex, endIndex);
                                                const totalPages = itemsPerPage === 'All' ? 1 : Math.ceil(totalItems / itemsPerPage);

                                                return (
                                                    <>
                                                        {paginated.map((item: any, index: number) => {
                                                            const { cid, status, course, isBlocked, assignedAt, lastActive } = item;
                                                            const isBlockedStatus = status === 'BLOCKED'; // Fix var name conflict

                                                            return (
                                                                <div key={cid} className={cn("group relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-1", isBlocked && "opacity-75 bg-slate-50")}>
                                                                    {/* Numbering Badge */}
                                                                    <div className="absolute top-0 right-0 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg border-b border-l border-slate-200 z-10">
                                                                        #{startIndex + index + 1}
                                                                    </div>

                                                                    {/* Cover Image */}
                                                                    <div className="aspect-video bg-slate-100 relative overflow-hidden">
                                                                        {course.thumbnail ? (
                                                                            <img
                                                                                src={course.thumbnail}
                                                                                alt={course.title}
                                                                                className={cn("w-full h-full object-cover transition-transform duration-500 group-hover:scale-105", isBlocked && "grayscale")}
                                                                            />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                                                                                <BookOpen className="h-10 w-10 text-slate-300" />
                                                                            </div>
                                                                        )}
                                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

                                                                        {/* Status Badge */}
                                                                        {isBlocked && (
                                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                                                                <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                                                                    <Lock className="h-3 w-3" /> BLOCKED
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Content */}
                                                                    <div className="p-4">
                                                                        <div className="flex items-start justify-between mb-2">
                                                                            <span className="text-[10px] uppercase font-bold text-cyan-600 tracking-wider bg-cyan-50 px-2 py-0.5 rounded-full">
                                                                                {course.category}
                                                                            </span>
                                                                            {course.chapters && (
                                                                                <span className="text-[10px] text-slate-400 font-medium">
                                                                                    {course.chapters.length} Modules
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {/* Dates */}
                                                                        <div className="flex flex-col gap-0.5 mb-2">
                                                                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                                                <span className="font-semibold text-slate-500">Assigned:</span>
                                                                                {item.assignedAt ? item.assignedAt.toLocaleDateString() : 'N/A'}
                                                                            </div>
                                                                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                                                <span className="font-semibold text-slate-500">Last Access:</span>
                                                                                {item.lastActive ? item.lastActive.toLocaleDateString() : 'N/A'}
                                                                            </div>
                                                                        </div>
                                                                        <h4 className="text-xl font-bold text-slate-900 leading-snug mb-1 line-clamp-2" title={course.title}>
                                                                            {course.title}
                                                                        </h4>
                                                                        <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                                                                            {course.description}
                                                                        </p>

                                                                        <div className="pt-3 border-t border-slate-50">
                                                                            {(() => {
                                                                                // Calculate Progress
                                                                                const allTopics = course.chapters?.flatMap((ch: any) => ch.topics) || [];
                                                                                const totalTopics = allTopics.length;
                                                                                const completedCount = allTopics.filter((t: any) => selectedUser.completedTopics?.includes(t.id)).length;
                                                                                const progress = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

                                                                                return (
                                                                                    <div className="space-y-1.5 status-bar">
                                                                                        <div className="flex justify-between text-xs font-medium">
                                                                                            <span className={progress === 100 ? "text-green-600" : "text-slate-600"}>
                                                                                                {progress === 100 ? "Completed" : "In Progress"}
                                                                                            </span>
                                                                                            <span className="text-slate-500">{progress}%</span>
                                                                                        </div>
                                                                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                                            <div
                                                                                                className={cn("h-full rounded-full transition-all duration-500", progress === 100 ? "bg-green-500" : "bg-cyan-500")}
                                                                                                style={{ width: `${progress}%` }}
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })()}

                                                                            <div className="mt-4 flex items-center justify-between gap-2">
                                                                                <Link href={`/learn/${course.id}`} className="text-xs text-cyan-600 hover:underline font-medium">
                                                                                    View Content
                                                                                </Link>

                                                                                <div className="flex items-center gap-1">
                                                                                    <button
                                                                                        onClick={() => handleToggleBlock(cid, status)}
                                                                                        className={cn("p-1.5 rounded-lg transition-colors", isBlocked ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
                                                                                        title={isBlocked ? "Unblock Course" : "Block Course"}
                                                                                    >
                                                                                        {isBlocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleRemoveCourse(cid, course.title)}
                                                                                        className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                                                                                        title="Remove Course & Quiz History"
                                                                                    >
                                                                                        <Trash2 className="h-4 w-4" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}

                                                        {/* Pagination Controls */}
                                                        {processedCourses.length > 0 && (
                                                            <div className="col-span-1 sm:col-span-2 flex items-center justify-between pt-4 border-t border-slate-200">
                                                                <span className="text-xs text-slate-500">
                                                                    Showing {startIndex + 1}-{endIndex} of {totalItems}
                                                                </span>
                                                                <div className="flex gap-1">
                                                                    <button
                                                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                                        disabled={currentPage === 1}
                                                                        className="p-1 px-2 border rounded hover:bg-slate-100 disabled:opacity-50 text-xs"
                                                                    >
                                                                        Prev
                                                                    </button>
                                                                    <span className="px-2 text-xs font-bold leading-6">Page {currentPage}</span>
                                                                    <button
                                                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                                        disabled={currentPage === totalPages}
                                                                        className="p-1 px-2 border rounded hover:bg-slate-100 disabled:opacity-50 text-xs"
                                                                    >
                                                                        Next
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )
                                ) : (
                                    <AdminUserQuizHistory userId={selectedUser.id} />
                                )}
                            </div>


                        </div>
                    </div>
                )
            }

        </div >
    );
}
