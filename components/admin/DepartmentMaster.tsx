'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, Edit2, CheckCircle, XCircle, Save, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ToastProvider';

export default function DepartmentMaster() {
    const { showToast } = useToast();
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [deptForm, setDeptForm] = useState({ id: '', name: '', remarks: '', isActive: true });
    const [isEditingDept, setIsEditingDept] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

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

    const filteredDepartments = departments.filter(dept =>
        dept.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
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
    );
}
