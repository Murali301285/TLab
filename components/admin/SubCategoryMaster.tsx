'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader2, Plus, Edit2, CheckCircle, XCircle, Save, X, ToggleLeft, ToggleRight, Filter, Search, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';

export default function SubCategoryMaster() {
    const { showToast } = useToast();
    const [subCategories, setSubCategories] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [subForm, setSubForm] = useState({ id: '', name: '', remarks: '', categoryId: '', isActive: true });
    const [isEditingSub, setIsEditingSub] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [filterCategoryId, setFilterCategoryId] = useState('');

    // Pagination & Sort State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('newest');
    const [itemsPerPage, setItemsPerPage] = useState<number | 'All'>(10);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchData();
    }, []);

    // Smart default: When filter changes, update form category if not editing
    useEffect(() => {
        if (!isEditingSub && filterCategoryId) {
            setSubForm(prev => ({ ...prev, categoryId: filterCategoryId }));
        } else if (!isEditingSub && !filterCategoryId) {
            setSubForm(prev => ({ ...prev, categoryId: '' }));
        }
    }, [filterCategoryId, isEditingSub]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [catRes, subRes] = await Promise.all([
                fetch('/api/masters/categories'),
                fetch('/api/masters/subcategories')
            ]);

            if (catRes.ok) setCategories(await catRes.json());
            if (subRes.ok) setSubCategories(await subRes.json());
        } catch (e) {
            showToast("Failed to load data", "error");
        } finally {
            setLoading(false);
        }
    };

    const resetSubForm = () => {
        setSubForm({
            id: '',
            name: '',
            remarks: '',
            categoryId: filterCategoryId || '', // Keep filter category as default
            isActive: true
        });
        setIsEditingSub(false);
        setShowForm(false);
    };

    const handleSaveSubCategory = async () => {
        if (!subForm.name || (!subForm.categoryId && !isEditingSub)) return;
        setLoading(true);

        const method = isEditingSub ? 'PATCH' : 'POST';
        const body = isEditingSub ? subForm : { name: subForm.name, categoryId: subForm.categoryId, remarks: subForm.remarks };

        try {
            const res = await fetch('/api/masters/subcategories', {
                method,
                body: JSON.stringify(body)
            });
            if (res.ok) {
                showToast(isEditingSub ? "Sub-Category updated" : "Sub-Category created", "success");
                resetSubForm();
                fetchData(); // Refresh list
            } else {
                showToast("Failed to save sub-category", "error");
            }
        } catch (e) {
            showToast("Error saving sub-category", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleEditSubCategory = (sub: any) => {
        setSubForm({
            id: sub.id,
            name: sub.name,
            remarks: sub.remarks || '',
            categoryId: sub.categoryId,
            isActive: sub.isActive
        });
        setIsEditingSub(true);
        setShowForm(true);
    };

    const handleToggleSubActive = async (sub: any) => {
        try {
            const res = await fetch('/api/masters/subcategories', {
                method: 'PATCH',
                body: JSON.stringify({ id: sub.id, isActive: !sub.isActive })
            });
            if (res.ok) {
                showToast(`Sub-Category ${!sub.isActive ? 'activated' : 'deactivated'}`, "success");
                fetchData();
            }
        } catch (e) {
            showToast("Failed to toggle status", "error");
        }
    };

    // --- Metrics ---
    const totalSubCategories = subCategories.length;
    const activeSubCategories = subCategories.filter(s => s.isActive).length;
    const inactiveSubCategories = totalSubCategories - activeSubCategories;


    // Filter Logic
    const filteredSubCategories = useMemo(() => {
        // 1. Filter by Category
        let result = subCategories;
        if (filterCategoryId) {
            result = result.filter(sc => {
                const itemCatId = sc.categoryId || sc.category?.id;
                return String(itemCatId) === String(filterCategoryId);
            });
        }

        // 2. Filter by Search Term
        if (searchTerm) {
            result = result.filter(sc =>
                sc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (sc.category?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return result;
    }, [subCategories, filterCategoryId, searchTerm]);

    const sortedSubCategories = useMemo(() => {
        return [...filteredSubCategories].sort((a, b) => {
            if (sortOption === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            if (sortOption === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
            if (sortOption === 'name-asc') return a.name.localeCompare(b.name);
            if (sortOption === 'name-desc') return b.name.localeCompare(a.name);
            return 0;
        });
    }, [filteredSubCategories, sortOption]);

    const totalItems = sortedSubCategories.length;
    const totalPages = itemsPerPage === 'All' ? 1 : Math.ceil(totalItems / itemsPerPage);
    const startIndex = currentPage === 1 ? 0 : (currentPage - 1) * (typeof itemsPerPage === 'number' ? itemsPerPage : totalItems);
    const endIndex = itemsPerPage === 'All' ? totalItems : Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedSubCategories = sortedSubCategories.slice(startIndex, endIndex);

    return (
        <div className="flex flex-col h-full space-y-6">

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <BookOpen className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total Sub-Categories</p>
                        <h3 className="text-2xl font-bold text-slate-800">{totalSubCategories}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                        <CheckCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Active</p>
                        <h3 className="text-2xl font-bold text-slate-800">{activeSubCategories}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                        <XCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Inactive</p>
                        <h3 className="text-2xl font-bold text-slate-800">{inactiveSubCategories}</h3>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-row flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-[300px]">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search sub-categories..."
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <select
                            value={filterCategoryId}
                            onChange={(e) => setFilterCategoryId(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 w-48"
                        >
                            <option value="">All Categories</option>
                            {categories.filter(c => c.isActive).map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
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
                            resetSubForm();
                            setShowForm(!showForm);
                        }}
                        className={cn("flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors", showForm ? "bg-slate-100 text-slate-600" : "bg-cyan-600 text-white hover:bg-cyan-700")}
                    >
                        {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {showForm ? 'Cancel' : 'Add Sub-Category'}
                    </button>
                </div>
            </div>

            {/* Input Form */}
            {showForm && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">{isEditingSub ? 'Edit Sub-Category' : 'Add New Sub-Category'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Parent Category <span className="text-red-500">*</span></label>
                            <select
                                value={subForm.categoryId}
                                onChange={(e) => {
                                    const newCatId = e.target.value;
                                    setSubForm({ ...subForm, categoryId: newCatId });
                                    setFilterCategoryId(newCatId);
                                }}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                                <option value="">Select Category</option>
                                {categories.filter(c => c.isActive).map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Sub-Category Name <span className="text-red-500">*</span></label>
                            <input
                                value={subForm.name}
                                onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                                placeholder="e.g., Frontend"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-slate-700">Remarks</label>
                            <input
                                value={subForm.remarks || ''}
                                onChange={(e) => setSubForm({ ...subForm, remarks: e.target.value })}
                                placeholder="Optional description"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <button
                            onClick={handleSaveSubCategory}
                            disabled={!subForm.name || !subForm.categoryId || loading}
                            className="flex items-center gap-2 bg-cyan-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {isEditingSub ? 'Update Sub-Category' : 'Save Sub-Category'}
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
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Sub-Category Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Category</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Remarks</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && subCategories.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading...</td></tr>
                            ) : paginatedSubCategories.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">No sub-categories found.</td></tr>
                            ) : (
                                paginatedSubCategories.map((sub: any) => (
                                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{sub.name}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-medium">
                                                {sub.category?.name || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">{sub.remarks || '-'}</td>
                                        <td className="px-6 py-4">
                                            {sub.isActive ? (
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
                                                    onClick={() => handleEditSubCategory(sub)}
                                                    className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleSubActive(sub)}
                                                    className={cn("p-1.5 rounded-lg transition-colors", sub.isActive ? "text-slate-400 hover:text-red-600 hover:bg-red-50" : "text-slate-400 hover:text-green-600 hover:bg-green-50")}
                                                    title={sub.isActive ? "Deactivate" : "Activate"}
                                                >
                                                    {sub.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
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
