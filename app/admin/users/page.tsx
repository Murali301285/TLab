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
import { ROLES } from '@/data/mockData';

export default function UserManagementPage() {
    const { user: currentUser } = useAuth();
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

    // Selected User for other actions (Assign, Progress)
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

    // Assignment Form State
    const [assignForm, setAssignForm] = useState({
        courseId: '',
        validityValue: 365,
        validityUnit: 'DAYS',
        hasCertificate: true,
        certName: 'Completion Certificate'
    });

    // Initial Load
    useEffect(() => {
        fetchUsers();
        fetchCourses();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) setUsers(await res.json());
        } catch (e) {
            console.error("Failed to load users", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const res = await fetch('/api/courses');
            if (res.ok) setCourses(await res.json());
        } catch (e) {
            console.error("Failed to load courses");
        }
    };

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

    const confirmAssignment = async () => {
        if (!selectedUser || !assignForm.courseId) return;

        try {
            const res = await fetch('/api/courses/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: selectedUser.id,
                    ...assignForm
                })
            });

            if (!res.ok) {
                const err = await res.json();
                showToast(err.error || 'Assignment failed', 'error');
                return;
            }

            // Optimistic Update
            setUsers(prev => prev.map(u => {
                if (u.id === selectedUser.id) {
                    return { ...u, assignedCourses: [...(u.assignedCourses || []), assignForm.courseId] };
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
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            name="user_search"
                            autoComplete="off"
                            placeholder="Search by name or email..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
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
                                ) : filteredUsers.map((user) => {
                                    // Hierarchy Visualization Logic
                                    const isHierarchyMode = !searchTerm && roleFilter === 'all';
                                    const isRoot = !user.managerId;

                                    // If strictly in hierarchy mode, only show roots at top level
                                    if (isHierarchyMode && !isRoot) return null;

                                    // Identify Direct Reports (for hierarchy)
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

            {/* Assign Course Modal - ENHANCED */}
            {isAssignModalOpen && selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Assign Content</h3>
                                <p className="text-sm text-slate-500">Allocate to <span className="font-semibold text-slate-800">{selectedUser.name}</span></p>
                            </div>
                            <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">

                            {/* Course Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Select Course</label>
                                <select
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                                    value={assignForm.courseId}
                                    onChange={(e) => setAssignForm({ ...assignForm, courseId: e.target.value })}
                                >
                                    <option value="">-- Choose Course --</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id} disabled={selectedUser.assignedCourses?.includes(c.id)}>
                                            {c.title} {selectedUser.assignedCourses?.includes(c.id) ? '(Already Assigned)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Validity */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                    <Clock className="h-4 w-4" /> Validity Period
                                </label>
                                <div className="flex gap-4">
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-24 px-4 py-2 border border-slate-300 rounded-lg"
                                        value={assignForm.validityValue}
                                        onChange={(e) => setAssignForm({ ...assignForm, validityValue: parseInt(e.target.value) })}
                                    />
                                    <select
                                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg"
                                        value={assignForm.validityUnit}
                                        onChange={(e) => setAssignForm({ ...assignForm, validityUnit: e.target.value })}
                                    >
                                        <option value="DAYS">Days</option>
                                        <option value="YEARS">Years</option>
                                    </select>
                                </div>
                            </div>

                            {/* Certificate Toggle */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <FileCheck className={cn("h-6 w-6", assignForm.hasCertificate ? "text-cyan-600" : "text-slate-400")} />
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">Issue Certificate</p>
                                        <p className="text-xs text-slate-500">Enable certificate upon completion</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={assignForm.hasCertificate}
                                        onChange={(e) => setAssignForm({ ...assignForm, hasCertificate: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                                </label>
                            </div>

                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsAssignModalOpen(false)}
                                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAssignment}
                                disabled={!assignForm.courseId}
                                className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium disabled:opacity-50 shadow-lg shadow-cyan-500/20"
                            >
                                Assign Course
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Assigned Courses Modal */}
            {selectedUser && isProgressModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Assigned Courses</h3>
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
                                }}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <XCircle className="h-8 w-8" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto">
                            {!selectedUser.assignedCourses || selectedUser.assignedCourses.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <BookOpen className="h-10 w-10 text-slate-300" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-900">No Courses Assigned</h3>
                                    <p className="text-slate-500">This user has not been assigned any learning content yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {selectedUser.assignedCourses.map((cid: string) => {
                                        const course = courses.find(c => c.id === cid);
                                        if (!course) return null;
                                        return (
                                            <div key={cid} className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                                                {/* Cover Image */}
                                                <div className="aspect-video bg-slate-100 relative overflow-hidden">
                                                    {course.thumbnail ? (
                                                        <img
                                                            src={course.thumbnail}
                                                            alt={course.title}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                                                            <BookOpen className="h-10 w-10 text-slate-300" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
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
                                                                <div className="space-y-1.5">
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
                                                                    {totalTopics > 0 && (
                                                                        <p className="text-[10px] text-slate-400 text-right">
                                                                            {completedCount}/{totalTopics} modules
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}

                                                        <div className="mt-3 flex justify-end">
                                                            <Link href={`/learn/${course.id}`} className="text-xs text-cyan-600 hover:underline font-medium">
                                                                View Course Content
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>


                    </div>
                </div>
            )}

        </div>
    );
}
