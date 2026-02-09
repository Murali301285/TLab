'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, Edit2, CheckCircle, XCircle, Save, X, ToggleLeft, ToggleRight, Search, Filter, ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';

export default function DepartmentMaster() {
    const { showToast } = useToast();
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [deptForm, setDeptForm] = useState({ id: '', name: '', remarks: '', isActive: true });
    const [isEditingDept, setIsEditingDept] = useState(false);
    const [showForm, setShowForm] = useState(false); // Toggle for Add form

    // Pagination & Sort State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('newest');
    const [itemsPerPage, setItemsPerPage] = useState<number | 'All'>(10);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/masters/departments');
            if (res.ok) setDepartments(await res.json());
        } catch (e) {
            showToast("Failed to load departments", "error");
        } finally {
            setLoading(false);
        }
    };

    const resetDeptForm = () => {
        setDeptForm({ id: '', name: '', remarks: '', isActive: true });
        setIsEditingDept(false);
        setShowForm(false);
    };

    const handleSaveDepartment = async () => {
        if (!deptForm.name) return;
        setLoading(true);

        const method = isEditingDept ? 'PATCH' : 'POST';
        const body = isEditingDept ? deptForm : { name: deptForm.name, remarks: deptForm.remarks };

        try {
            const res = await fetch('/api/masters/departments', {
                method,
                body: JSON.stringify(body)
            });
            if (res.ok) {
                showToast(isEditingDept ? "Department updated" : "Department created", "success");
                resetDeptForm();
                fetchDepartments();
            } else {
                showToast("Failed to save department", "error");
            }
        } catch (e) {
            showToast("Error saving department", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleEditDepartment = (dept: any) => {
        setDeptForm(dept);
        setIsEditingDept(true);
        setShowForm(true);
    };

    const handleToggleDeptActive = async (dept: any) => {
        try {
            const res = await fetch('/api/masters/departments', {
                method: 'PATCH',
                body: JSON.stringify({ id: dept.id, isActive: !dept.isActive })
            });
            if (res.ok) {
                showToast(`Department ${!dept.isActive ? 'activated' : 'deactivated'}`, "success");
                fetchDepartments();
            }
        } catch (e) {
            showToast("Failed to toggle status", "error");
        }
    };

    // --- Metrics ---
    const totalDepartments = departments.length;
    const activeDepartments = departments.filter(d => d.isActive).length;
    const inactiveDepartments = totalDepartments - activeDepartments;

    // --- Filter, Sort, Paginate ---
    const filteredDepts = departments.filter(dept =>
        dept.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedDepts = [...filteredDepts].sort((a, b) => {
        if (sortOption === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(); // Assuming createdAt exists or 0
        if (sortOption === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        if (sortOption === 'name-asc') return a.name.localeCompare(b.name);
        if (sortOption === 'name-desc') return b.name.localeCompare(a.name);
        return 0;
    });

    const totalItems = sortedDepts.length;
    const totalPages = itemsPerPage === 'All' ? 1 : Math.ceil(totalItems / itemsPerPage);
    const startIndex = currentPage === 1 ? 0 : (currentPage - 1) * (typeof itemsPerPage === 'number' ? itemsPerPage : totalItems);
    const endIndex = itemsPerPage === 'All' ? totalItems : Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedDepts = sortedDepts.slice(startIndex, endIndex);

    return (
        <div className="flex flex-col h-full space-y-6">

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Briefcase className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total Departments</p>
                        <h3 className="text-2xl font-bold text-slate-800">{totalDepartments}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                        <CheckCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Active</p>
                        <h3 className="text-2xl font-bold text-slate-800">{activeDepartments}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                        <XCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Inactive</p>
                        <h3 className="text-2xl font-bold text-slate-800">{inactiveDepartments}</h3>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-row flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search departments..."
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Sort:</span>
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="bg-white border border-slate-200 text-sm rounded-lg p-2 focus:ring-2 focus:ring-cyan-500 outline-none"
                        >
                            <option value="newest">Newest</option>
                            <option value="name-asc">Name (A-Z)</option>
                            <option value="name-desc">Name (Z-A)</option>
                        </select>
                    </div>

                    <button
                        onClick={() => {
                            resetDeptForm();
                            setShowForm(!showForm);
                        }}
                        className={cn("flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors", showForm ? "bg-slate-100 text-slate-600" : "bg-cyan-600 text-white hover:bg-cyan-700")}
                    >
                        {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {showForm ? 'Cancel' : 'Add Department'}
                    </button>
                </div>
            </div>

            {/* Input Form (as a panel) */}
            {showForm && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">{isEditingDept ? 'Edit Department' : 'Add New Department'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Department Name <span className="text-red-500">*</span></label>
                            <input
                                value={deptForm.name}
                                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                                placeholder="e.g., Engineering"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Remarks</label>
                            <input
                                value={deptForm.remarks || ''}
                                onChange={(e) => setDeptForm({ ...deptForm, remarks: e.target.value })}
                                placeholder="Optional description"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <button
                            onClick={handleSaveDepartment}
                            disabled={!deptForm.name || loading}
                            className="flex items-center gap-2 bg-cyan-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {isEditingDept ? 'Update Department' : 'Save Department'}
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="flex-1 overflow-auto min-h-0">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Department Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Remarks</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && departments.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading...</td></tr>
                            ) : paginatedDepts.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-500">No departments found.</td></tr>
                            ) : (
                                paginatedDepts.map((dept: any) => (
                                    <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{dept.name}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500">{dept.remarks || '-'}</td>
                                        <td className="px-6 py-4">
                                            {dept.isActive ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                                    <CheckCircle className="h-3 w-3" /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                                                    <XCircle className="h-3 w-3" /> Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEditDepartment(dept)}
                                                    className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleDeptActive(dept)}
                                                    className={cn("p-1.5 rounded-lg transition-colors", dept.isActive ? "text-slate-400 hover:text-red-600 hover:bg-red-50" : "text-slate-400 hover:text-green-600 hover:bg-green-50")}
                                                    title={dept.isActive ? "Deactivate" : "Activate"}
                                                >
                                                    {dept.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
                        <span className="text-sm text-slate-500">
                            Showing {startIndex + 1}-{endIndex} of {totalItems}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
