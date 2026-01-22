'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader2, Plus, Edit2, CheckCircle, XCircle, Save, X, ToggleLeft, ToggleRight, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';

export default function SubCategoryMaster() {
    const { showToast } = useToast();
    const [subCategories, setSubCategories] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [subForm, setSubForm] = useState({ id: '', name: '', remarks: '', categoryId: '', isActive: true });
    const [isEditingSub, setIsEditingSub] = useState(false);
    const [filterCategoryId, setFilterCategoryId] = useState(''); // New Filter State

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

    // Filter Logic
    const filteredSubCategories = useMemo(() => {
        // Fallback to category.id if categoryId is missing (relation vs scalar)
        if (!filterCategoryId) return subCategories;
        return subCategories.filter(sc => {
            const itemCatId = sc.categoryId || sc.category?.id;
            return String(itemCatId) === String(filterCategoryId);
        });
    }, [subCategories, filterCategoryId]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
            <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2 flex justify-between items-center">
                Sub-Category Master
                {loading && <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />}
            </h2>

            {/* Filter Area (New) */}
            <div className="mb-4 flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                <Filter className="h-4 w-4 text-slate-500" />
                <select
                    value={filterCategoryId}
                    onChange={(e) => setFilterCategoryId(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none font-medium text-slate-700"
                >
                    <option value="">Show All Categories</option>
                    {categories.filter(c => c.isActive).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* Input Area */}
            <div className="bg-slate-50 p-4 rounded-lg mb-4 border border-slate-100">
                <div className="flex flex-col gap-3">
                    <select
                        value={subForm.categoryId}
                        onChange={(e) => {
                            const newCatId = e.target.value;
                            setSubForm({ ...subForm, categoryId: newCatId });
                            // User Request: Selecting in form should also filter the list
                            setFilterCategoryId(newCatId);
                        }}
                        className="w-full px-3 py-2 border rounded-md text-sm bg-white"
                    >
                        <option value="">Select Parent Category *</option>
                        {categories.filter(c => c.isActive).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <input
                        value={subForm.name}
                        onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                        placeholder="Sub-Category Name *"
                        className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                    <textarea
                        value={subForm.remarks || ''}
                        onChange={(e) => setSubForm({ ...subForm, remarks: e.target.value })}
                        placeholder="Remarks (Optional)"
                        className="w-full px-3 py-2 border rounded-md text-sm min-h-[60px]"
                    />
                    <div className="flex gap-2 justify-end">
                        {isEditingSub && (
                            <button onClick={resetSubForm} className="px-3 py-1.5 text-xs text-slate-500 font-medium hover:text-slate-700">Cancel</button>
                        )}
                        <button
                            onClick={handleSaveSubCategory}
                            disabled={!subForm.name || !subForm.categoryId}
                            className="bg-cyan-600 text-white px-4 py-1.5 rounded-md hover:bg-cyan-700 disabled:opacity-50 text-sm flex items-center gap-2"
                        >
                            {isEditingSub ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            {isEditingSub ? 'Update' : 'Add'}
                        </button>
                    </div>
                </div>
            </div>

            {/* List Area */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                {filteredSubCategories.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm italic">
                        {filterCategoryId ? "No sub-categories found for this filter." : "No sub-categories added yet."}
                    </div>
                )}
                {filteredSubCategories.map((sub) => (
                    <div key={sub.id} className={cn("flex flex-col p-3 rounded-lg border transition-colors", sub.isActive ? "bg-white border-slate-200" : "bg-slate-50 border-slate-200 opacity-75")}>
                        <div className="flex items-start justify-between">
                            <div>
                                <span className={cn("font-medium block", isEditingSub && subForm.id === sub.id ? "text-cyan-600" : "text-slate-700")}>{sub.name}</span>
                                <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{sub.category?.name}</span>
                                {sub.remarks && <p className="text-xs text-slate-500 mt-1 italic">{sub.remarks}</p>}
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleToggleSubActive(sub)}
                                    title={sub.isActive ? "Mark Inactive" : "Mark Active"}
                                >
                                    {sub.isActive ? <ToggleRight className="h-6 w-6 text-green-500" /> : <ToggleLeft className="h-6 w-6 text-slate-400" />}
                                </button>
                                <button
                                    onClick={() => handleEditSubCategory(sub)}
                                    className="text-slate-400 hover:text-cyan-600 p-1"
                                    title="Edit"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
