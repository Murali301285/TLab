'use client';

import { useState } from 'react';
import Link from 'next/link';
import { USERS, User, COURSES } from '@/data/mockData';
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
    BarChart2,
    Trophy,
    Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ProfileDropdown from '@/components/ProfileDropdown';

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>(USERS);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

    // Filter users
    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleAssignCourse = (user: User) => {
        setSelectedUser(user);
        setIsAssignModalOpen(true);
    };

    const handleViewProgress = (user: User) => {
        setSelectedUser(user);
        setIsProgressModalOpen(true);
    };

    const confirmAssignment = (courseId: string) => {
        if (!selectedUser) return;

        // Mock update
        const updatedUsers = users.map(u => {
            if (u.id === selectedUser.id) {
                if (u.assignedCourses.includes(courseId)) return u;
                return { ...u, assignedCourses: [...u.assignedCourses, courseId] };
            }
            return u;
        });

        setUsers(updatedUsers);
        setIsAssignModalOpen(false);
        setSelectedUser(null);
        alert(`Course assigned to ${selectedUser.name}`);
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
                        <p className="text-slate-500 mt-1">Manage access and assign learning paths.</p>
                    </div>
                    <button className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-cyan-700 transition-colors shadow-lg shadow-cyan-500/20">
                        <Plus className="h-5 w-5" />
                        Add New User
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
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
                            <option value="admin">Admins</option>
                            <option value="manager">Managers</option>
                            <option value="employee">Employees</option>
                        </select>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
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
                                                <div className="flex items-center gap-1.5">
                                                    <Shield className="h-3.5 w-3.5 text-cyan-600" />
                                                    <span className="text-sm font-medium text-slate-700 capitalize">{user.role}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                                                    <span className="text-xs text-slate-500">{user.department}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.status === 'active' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                                    <CheckCircle className="h-3 w-3" /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                    <XCircle className="h-3 w-3" /> Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {user.assignedCourses.length > 0 ? (
                                                    user.assignedCourses.map(cid => {
                                                        const course = COURSES.find(c => c.id === cid);
                                                        return (
                                                            <span key={cid} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100 truncate max-w-[150px]" title={course?.title}>
                                                                {course?.title || cid}
                                                            </span>
                                                        );
                                                    })
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">No courses assigned</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    onClick={() => handleViewProgress(user)}
                                                    className="text-slate-500 hover:text-slate-800 text-sm font-medium hover:underline flex items-center gap-1"
                                                >
                                                    <BarChart2 className="h-4 w-4" /> Progress
                                                </button>
                                                <button
                                                    onClick={() => handleAssignCourse(user)}
                                                    className="text-cyan-600 hover:text-cyan-800 text-sm font-medium hover:underline"
                                                >
                                                    Assign
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredUsers.length === 0 && (
                        <div className="p-12 text-center text-slate-500">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No users found matching your filters.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Assign Course Modal */}
            {isAssignModalOpen && selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900">Assign Course</h3>
                            <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-sm text-slate-600 mb-4">
                                Select a course to assign to <span className="font-bold text-slate-900">{selectedUser.name}</span>.
                            </p>

                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {COURSES.map(course => {
                                    const isAssigned = selectedUser.assignedCourses.includes(course.id);
                                    return (
                                        <button
                                            key={course.id}
                                            disabled={isAssigned}
                                            onClick={() => confirmAssignment(course.id)}
                                            className={cn(
                                                "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                                                isAssigned
                                                    ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                                                    : "bg-white border-slate-200 hover:border-cyan-500 hover:shadow-md"
                                            )}
                                        >
                                            <div className="h-10 w-10 rounded bg-slate-200 shrink-0 overflow-hidden">
                                                <img src={course.thumbnail} alt="" className="h-full w-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-900 truncate">{course.title}</p>
                                                <p className="text-xs text-slate-500">{course.category}</p>
                                            </div>
                                            {isAssigned && <CheckCircle className="h-4 w-4 text-green-500" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Modal */}
            {isProgressModalOpen && selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <BarChart2 className="h-5 w-5 text-cyan-600" />
                                    User Progress
                                </h3>
                                <p className="text-sm text-slate-500">Learning statistics for <span className="font-bold text-slate-900">{selectedUser.name}</span></p>
                            </div>
                            <button onClick={() => setIsProgressModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-8">
                            {/* Stats Row */}
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Courses Assigned</p>
                                    <p className="text-3xl font-bold text-slate-900">{selectedUser.assignedCourses.length}</p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                                    <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Completed</p>
                                    <p className="text-3xl font-bold text-slate-900">
                                        {selectedUser.assignedCourses.filter(cid => {
                                            const c = COURSES.find(x => x.id === cid);
                                            return c && c.progress === 100;
                                        }).length}
                                    </p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-center">
                                    <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Avg. Quiz Score</p>
                                    <p className="text-3xl font-bold text-slate-900">88%</p>
                                </div>
                            </div>

                            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-slate-400" /> Course Details
                            </h4>

                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                                {selectedUser.assignedCourses.length > 0 ? (
                                    selectedUser.assignedCourses.map(cid => {
                                        const course = COURSES.find(c => c.id === cid);
                                        if (!course) return null;
                                        return (
                                            <div key={cid} className="border border-slate-200 rounded-xl p-4 flex gap-4 items-center">
                                                <div className="h-12 w-12 bg-slate-100 rounded-lg shrink-0 overflow-hidden">
                                                    <img src={course.thumbnail} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between mb-1">
                                                        <p className="font-bold text-slate-900 text-sm">{course.title}</p>
                                                        <span className="text-xs font-bold text-slate-500">{course.progress}%</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                "h-full rounded-full",
                                                                course.progress === 100 ? "bg-green-500" : "bg-cyan-500"
                                                            )}
                                                            style={{ width: `${course.progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-8 text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        No courses assigned yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
