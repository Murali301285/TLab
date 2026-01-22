'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, Edit2, CheckCircle, XCircle, Save, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';

export default function CategoryMaster() {
    const { showToast } = useToast();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [catForm, setCatForm] = useState({ id: '', name: '', remarks: '', isActive: true });
    const [isEditingCat, setIsEditingCat] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

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

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
            <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2 flex justify-between items-center">
                Category Master
                {loading && <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />}
            </h2>

            {/* Input Area */}
            <div className="bg-slate-50 p-4 rounded-lg mb-4 border border-slate-100">
                <div className="flex flex-col gap-3">
                    <input
                        value={catForm.name}
                        onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                        placeholder="Category Name *"
                        className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                    <textarea
                        value={catForm.remarks || ''}
                        onChange={(e) => setCatForm({ ...catForm, remarks: e.target.value })}
                        placeholder="Remarks (Optional)"
                        className="w-full px-3 py-2 border rounded-md text-sm min-h-[60px]"
                    />
                    <div className="flex gap-2 justify-end">
                        {isEditingCat && (
                            <button onClick={resetCatForm} className="px-3 py-1.5 text-xs text-slate-500 font-medium hover:text-slate-700">Cancel</button>
                        )}
                        <button
                            onClick={handleSaveCategory}
                            disabled={!catForm.name}
                            className="bg-cyan-600 text-white px-4 py-1.5 rounded-md hover:bg-cyan-700 disabled:opacity-50 text-sm flex items-center gap-2"
                        >
                            {isEditingCat ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                            {isEditingCat ? 'Update' : 'Add'}
                        </button>
                    </div>
                </div>
            </div>

            {/* List Area */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                {categories.map((cat) => (
                    <div key={cat.id} className={cn("flex flex-col p-3 rounded-lg border transition-colors", cat.isActive ? "bg-white border-slate-200" : "bg-slate-50 border-slate-200 opacity-75")}>
                        <div className="flex items-start justify-between">
                            <div>
                                <span className={cn("font-medium block", isEditingCat && catForm.id === cat.id ? "text-cyan-600" : "text-slate-700")}>{cat.name}</span>
                                {cat.remarks && <p className="text-xs text-slate-500 mt-1">{cat.remarks}</p>}
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleToggleCatActive(cat)}
                                    title={cat.isActive ? "Mark Inactive" : "Mark Active"}
                                >
                                    {cat.isActive ? <ToggleRight className="h-6 w-6 text-green-500" /> : <ToggleLeft className="h-6 w-6 text-slate-400" />}
                                </button>
                                <button
                                    onClick={() => handleEditCategory(cat)}
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
