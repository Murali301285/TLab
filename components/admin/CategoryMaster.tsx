'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, Edit2, CheckCircle, XCircle, Save, X, ToggleLeft, ToggleRight, Search, Filter, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';

export default function CategoryMaster() {
    const { showToast } = useToast();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [catForm, setCatForm] = useState({ id: '', name: '', remarks: '', isActive: true });
    const [isEditingCat, setIsEditingCat] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Pagination & Sort State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('newest');
    const [itemsPerPage, setItemsPerPage] = useState<number | 'All'>(10);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/masters/categories');
            if (res.ok) setCategories(await res.json());
        } catch (e) {
            showToast("Failed to load categories", "error");
        } finally {
            setLoading(false);
        }
    };

    const resetCatForm = () => {
        setCatForm({ id: '', name: '', remarks: '', isActive: true });
        setIsEditingCat(false);
        setShowForm(false);
    };

    const handleSaveCategory = async () => {
        if (!catForm.name) return;
        setLoading(true);

        const method = isEditingCat ? 'PATCH' : 'POST';
        const body = isEditingCat ? catForm : { name: catForm.name, remarks: catForm.remarks };

        try {
            const res = await fetch('/api/masters/categories', {
                method,
                body: JSON.stringify(body)
            });
            if (res.ok) {
                showToast(isEditingCat ? "Category updated" : "Category created", "success");
                resetCatForm();
                fetchCategories();
            } else {
                showToast("Failed to save category", "error");
            }
        } catch (e) {
            showToast("Error saving category", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleEditCategory = (cat: any) => {
        setCatForm(cat);
        setIsEditingCat(true);
        setShowForm(true);
    };

    const handleToggleCatActive = async (cat: any) => {
        try {
            const res = await fetch('/api/masters/categories', {
                method: 'PATCH',
                body: JSON.stringify({ id: cat.id, isActive: !cat.isActive })
            });

            if (res.ok) {
                showToast(`Category ${!cat.isActive ? 'activated' : 'deactivated'}`, "success");
                fetchCategories();
            }
        } catch (e) {
            showToast("Failed to toggle status", "error");
        }
    };

    // --- Metrics ---
    const totalCategories = categories.length;
    const activeCategories = categories.filter(c => c.isActive).length;
    const inactiveCategories = totalCategories - activeCategories;

    // --- Filter, Sort, Paginate ---
    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedCategories = [...filteredCategories].sort((a, b) => {
        if (sortOption === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        if (sortOption === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        if (sortOption === 'name-asc') return a.name.localeCompare(b.name);
        if (sortOption === 'name-desc') return b.name.localeCompare(a.name);
        return 0;
    });

    const totalItems = sortedCategories.length;
    const totalPages = itemsPerPage === 'All' ? 1 : Math.ceil(totalItems / itemsPerPage);
    const startIndex = currentPage === 1 ? 0 : (currentPage - 1) * (typeof itemsPerPage === 'number' ? itemsPerPage : totalItems);
    const endIndex = itemsPerPage === 'All' ? totalItems : Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedCategories = sortedCategories.slice(startIndex, endIndex);

    return (
        <div className="flex flex-col h-full space-y-6">

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Layers className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total Categories</p>
                        <h3 className="text-2xl font-bold text-slate-800">{totalCategories}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                        <CheckCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Active</p>
                        <h3 className="text-2xl font-bold text-slate-800">{activeCategories}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                        <XCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Inactive</p>
                        <h3 className="text-2xl font-bold text-slate-800">{inactiveCategories}</h3>
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
                            placeholder="Search categories..."
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
                            resetCatForm();
                            setShowForm(!showForm);
                        }}
                        className={cn("flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors", showForm ? "bg-slate-100 text-slate-600" : "bg-cyan-600 text-white hover:bg-cyan-700")}
                    >
                        {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {showForm ? 'Cancel' : 'Add Category'}
                    </button>
                </div>
            </div>

            {/* Input Form */}
            {showForm && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">{isEditingCat ? 'Edit Category' : 'Add New Category'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Category Name <span className="text-red-500">*</span></label>
                            <input
                                value={catForm.name}
                                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                                placeholder="e.g., Development"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Remarks</label>
                            <input
                                value={catForm.remarks || ''}
                                onChange={(e) => setCatForm({ ...catForm, remarks: e.target.value })}
                                placeholder="Optional description"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <button
                            onClick={handleSaveCategory}
                            disabled={!catForm.name || loading}
                            className="flex items-center gap-2 bg-cyan-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {isEditingCat ? 'Update Category' : 'Save Category'}
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
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Category Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Remarks</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && categories.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading...</td></tr>
                            ) : paginatedCategories.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-500">No categories found.</td></tr>
                            ) : (
                                paginatedCategories.map((cat: any) => (
                                    <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{cat.name}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500">{cat.remarks || '-'}</td>
                                        <td className="px-6 py-4">
                                            {cat.isActive ? (
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
                                                    onClick={() => handleEditCategory(cat)}
                                                    className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleCatActive(cat)}
                                                    className={cn("p-1.5 rounded-lg transition-colors", cat.isActive ? "text-slate-400 hover:text-red-600 hover:bg-red-50" : "text-slate-400 hover:text-green-600 hover:bg-green-50")}
                                                    title={cat.isActive ? "Deactivate" : "Activate"}
                                                >
                                                    {cat.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
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
