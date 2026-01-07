'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, Edit2, CheckCircle, XCircle, Save, X, ToggleLeft, ToggleRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

import { useToast } from '@/components/ToastProvider';

export default function ConfigurationPage() {
    const { showToast } = useToast();
    // ---- Data State ----
    const [categories, setCategories] = useState<any[]>([]);
    const [subCategories, setSubCategories] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // ---- Category Form State ----
    const [catForm, setCatForm] = useState({ id: '', name: '', remarks: '', isActive: true });
    const [isEditingCat, setIsEditingCat] = useState(false);

    // ---- SubCategory Form State ----
    const [subForm, setSubForm] = useState({ id: '', name: '', remarks: '', categoryId: '', isActive: true });
    const [isEditingSub, setIsEditingSub] = useState(false);

    // ---- Department Form State ----
    const [deptForm, setDeptForm] = useState({ id: '', name: '', remarks: '', isActive: true });
    const [isEditingDept, setIsEditingDept] = useState(false);

    // ---- Initial Load ----
    useEffect(() => {
        fetchMasters();
    }, []);

    const fetchMasters = async () => {
        setLoading(true);
        try {
            const [catRes, subRes, deptRes] = await Promise.all([
                fetch('/api/masters/categories'),
                fetch('/api/masters/subcategories'),
                fetch('/api/masters/departments')
            ]);
            setCategories(await catRes.json());
            setSubCategories(await subRes.json());
            if (deptRes.ok) setDepartments(await deptRes.json());
        } catch (e) {
            console.error("Failed to load masters", e);
            showToast("Failed to load masters", "error");
        } finally {
            setLoading(false);
        }
    };

    // ---- Handlers: Category ----

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
                fetchMasters();
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
                fetchMasters();
            }
        } catch (e) {
            showToast("Failed to toggle status", "error");
        }
    };

    // ---- Handlers: SubCategory ----

    const resetSubForm = () => {
        setSubForm({ id: '', name: '', remarks: '', categoryId: '', isActive: true });
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
                fetchMasters();
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
        setSubForm(sub);
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
                fetchMasters();
            }
        } catch (e) {
            showToast("Failed to toggle status", "error");
        }
    };

    // ---- Handlers: Department ----

    const resetDeptForm = () => {
        setDeptForm({ id: '', name: '', remarks: '', isActive: true });
        setIsEditingDept(false);
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
                fetchMasters();
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
    };

    const handleToggleDeptActive = async (dept: any) => {
        try {
            const res = await fetch('/api/masters/departments', {
                method: 'PATCH',
                body: JSON.stringify({ id: dept.id, isActive: !dept.isActive })
            });
            if (res.ok) {
                showToast(`Department ${!dept.isActive ? 'activated' : 'deactivated'}`, "success");
                fetchMasters();
            }
        } catch (e) {
            showToast("Failed to toggle status", "error");
        }
    };


    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Configuration</h1>
                    <p className="text-slate-500">Manage Categories, Sub-Categories, and Departments.</p>
                </div>
                <Link href="/dashboard" className="text-sm text-cyan-600 hover:underline">Back to Dashboard</Link>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">

                {/* -------------------- Department Master -------------------- */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px] order-last xl:order-first">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2 flex justify-between items-center">
                        Department Master
                        {loading && <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />}
                    </h2>

                    {/* Input Area */}
                    <div className="bg-slate-50 p-4 rounded-lg mb-4 border border-slate-100">
                        <div className="flex flex-col gap-3">
                            <input
                                value={deptForm.name}
                                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                                placeholder="Department Name *"
                                className="w-full px-3 py-2 border rounded-md text-sm"
                            />
                            <textarea
                                value={deptForm.remarks || ''}
                                onChange={(e) => setDeptForm({ ...deptForm, remarks: e.target.value })}
                                placeholder="Remarks (Optional)"
                                className="w-full px-3 py-2 border rounded-md text-sm min-h-[60px]"
                            />
                            <div className="flex gap-2 justify-end">
                                {isEditingDept && (
                                    <button onClick={resetDeptForm} className="text-slate-500 text-xs hover:underline">Cancel</button>
                                )}
                                <button
                                    onClick={handleSaveDepartment}
                                    disabled={!deptForm.name}
                                    className="flex items-center gap-1 bg-cyan-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-cyan-700 disabled:opacity-50"
                                >
                                    <Save className="h-3 w-3" /> {isEditingDept ? 'Update' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* List Area */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        {departments.length === 0 && <p className="text-center text-slate-400 text-sm mt-10">No departments found.</p>}
                        {departments.map((dept: any) => (
                            <div key={dept.id} className={cn("p-3 rounded-lg border flex justify-between items-start group", dept.isActive ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100 opacity-70")}>
                                <div>
                                    <p className={cn("font-bold text-sm", !dept.isActive && "text-slate-500 line-through")}>{dept.name}</p>
                                    {dept.remarks && <p className="text-xs text-slate-500 mt-1">{dept.remarks}</p>}
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEditDepartment(dept)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded">
                                        <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => handleToggleDeptActive(dept)} className={cn("p-1.5 rounded", dept.isActive ? "text-green-600 hover:bg-green-50" : "text-slate-400 hover:bg-slate-200")}>
                                        {dept.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* -------------------- Categories Master -------------------- */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
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

                {/* -------------------- Sub-Categories Master -------------------- */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2 flex justify-between items-center">
                        Sub-Category Master
                        {loading && <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />}
                    </h2>

                    {/* Input Area */}
                    <div className="bg-slate-50 p-4 rounded-lg mb-4 border border-slate-100">
                        <div className="flex flex-col gap-3">
                            <select
                                value={subForm.categoryId}
                                onChange={(e) => setSubForm({ ...subForm, categoryId: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md text-sm bg-white"
                                disabled={isEditingSub} // Prevent changing parent on edit for simplicity strictly, or allow if API supports.
                            >
                                <option value="">Select Parent Category *</option>
                                {categories.map(c => (
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
                                    disabled={!subForm.name || (!subForm.categoryId && !isEditingSub)}
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
                        {subCategories.map((sub) => (
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

            </div>
        </div>
    );
}
