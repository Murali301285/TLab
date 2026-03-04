import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Edit2, Trash2, Plus, Search, Building2, Check, X, CheckCircle, XCircle, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

interface Department {
    id: string;
    name: string;
    remarks: string | null;
    isActive: boolean;
    companyId: string | null;
    company?: { name: string };
}

export default function DepartmentMaster() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Pagination & Sort State
    const [sortOption, setSortOption] = useState('newest'); // Note: API doesn't return createdAt, so we might need to sort by name or just accept "newest" as "unsorted" or add createdAt to interface if available. API response likely has it.
    const [itemsPerPage, setItemsPerPage] = useState<number | 'All'>(10);
    const [currentPage, setCurrentPage] = useState(1);

    const [formData, setFormData] = useState({
        name: '',
        remarks: '',
        isActive: true
    });

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/departments', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setDepartments(data);
            }
        } catch (error) {
            toast.error('Failed to fetch departments');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to page 1 on search
    };

    // --- Metrics ---
    const totalDepartments = departments?.length || 0;
    const activeDepartments = departments?.filter(d => d.isActive).length || 0;
    const inactiveDepartments = totalDepartments - activeDepartments;

    // --- Filter, Sort, Paginate ---
    const filteredDepartments = departments?.filter(dept =>
        dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.remarks?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const sortedDepartments = [...filteredDepartments].sort((a, b) => {
        if (sortOption === 'name-asc') return a.name.localeCompare(b.name);
        if (sortOption === 'name-desc') return b.name.localeCompare(a.name);
        // Default (newest/id) - assuming ID is somewhat sequential or just fallback
        return 0;
    });

    const totalItems = sortedDepartments.length;
    const totalPages = itemsPerPage === 'All' ? 1 : Math.ceil(totalItems / itemsPerPage);
    const startIndex = currentPage === 1 ? 0 : (currentPage - 1) * (typeof itemsPerPage === 'number' ? itemsPerPage : totalItems);
    const endIndex = itemsPerPage === 'All' ? totalItems : Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedDepartments = sortedDepartments.slice(startIndex, endIndex);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const url = editingDept ? `/api/admin/departments?id=${editingDept.id}` : '/api/admin/departments';
            const method = editingDept ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error('Failed to save department');

            toast.success(`Department ${editingDept ? 'updated' : 'created'} successfully`);
            setIsModalOpen(false);
            setEditingDept(null);
            setFormData({ name: '', remarks: '', isActive: true });
            fetchDepartments();
        } catch (error) {
            toast.error('Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const openEdit = (dept: Department) => {
        setEditingDept(dept);
        setFormData({
            name: dept.name,
            remarks: dept.remarks || '',
            isActive: dept.isActive
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this department?')) return;
        try {
            const res = await fetch(`/api/admin/departments?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Department deleted');
                fetchDepartments();
            } else {
                toast.error('Failed to delete');
            }
        } catch (error) {
            toast.error('Error deleting department');
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6">

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Building2 className="h-6 w-6" />
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
                            value={searchTerm}
                            onChange={handleSearch}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
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
                            <option value="newest">Default</option>
                            <option value="name-asc">Name (A-Z)</option>
                            <option value="name-desc">Name (Z-A)</option>
                        </select>
                    </div>

                    <button
                        onClick={() => {
                            setEditingDept(null);
                            setFormData({ name: '', remarks: '', isActive: true });
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition shadow-sm text-sm font-medium"
                    >
                        <Plus className="h-4 w-4" /> Add Department
                    </button>
                </div>
            </div>

            {/* Table Area */}
            {loading ? (
                <div className="text-center py-12 text-slate-500 text-sm">Loading departments...</div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                    <div className="flex-1 overflow-auto min-h-0">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                                <tr>
                                    <th className="px-6 py-3">Department Name</th>
                                    <th className="px-6 py-3">Remarks</th>
                                    <th className="px-6 py-3">Assigned To</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedDepartments.length > 0 ? (
                                    paginatedDepartments.map((dept) => (
                                        <tr key={dept.id} className="hover:bg-slate-50/50 transition">
                                            <td className="px-6 py-3 font-medium text-slate-900">{dept.name}</td>
                                            <td className="px-6 py-3 text-slate-500">{dept.remarks || '-'}</td>
                                            <td className="px-6 py-3 text-slate-500">
                                                {dept.company ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium border border-blue-100">
                                                        <Building2 className="h-3 w-3" />
                                                        {dept.company.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded inline-block">Global / Template</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3">
                                                {dept.isActive ? (
                                                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                                                        <Check className="h-3 w-3" /> Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-1 rounded-full text-xs font-medium">
                                                        <X className="h-3 w-3" /> Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => openEdit(dept)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-cyan-600 transition">
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(dept.id)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-red-600 transition">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            No departments found.
                                        </td>
                                    </tr>
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
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-lg text-slate-900">{editingDept ? 'Edit Department' : 'Add New Department'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Department Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-sm"
                                    placeholder="e.g. Human Resources"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                                <textarea
                                    rows={3}
                                    value={formData.remarks}
                                    onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-sm resize-none"
                                    placeholder="Optional description..."
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500 cursor-pointer"
                                />
                                <label htmlFor="isActive" className="text-sm text-slate-700 cursor-pointer user-select-none">
                                    Is Active?
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition text-sm font-medium" disabled={submitting}>Cancel</button>
                                <button type="submit" disabled={submitting} className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 shadow-sm transition text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                                    {submitting ? 'Saving...' : 'Save Department'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
