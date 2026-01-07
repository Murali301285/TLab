'use client';

import { useState, useEffect } from 'react';
import { X, Check, Save, Eye, EyeOff } from 'lucide-react';
import { USERS, ROLES } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface EditUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (userId: string, data: any) => void;
    user: any;
    availableManagers: any[];
}

export default function EditUserModal({ isOpen, onClose, onUpdate, user, availableManagers }: EditUserModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: '',
        department: '',
        managerId: '' as string | null,
        status: '',
        password: ''
    });

    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                role: user.role || '',
                department: user.department || '',
                managerId: user.managerId || '', // Handle null
                status: user.status || 'active',
                password: '' // Reset password field
            });
        }
    }, [user]);

    if (!isOpen || !user) return null;

    const handleSubmit = () => {
        const payload: any = {
            id: user.id,
            name: formData.name,
            role: formData.role,
            department: formData.department,
            managerId: formData.managerId || null, // Ensure null if empty string
        };

        if (formData.password) {
            payload.password = formData.password;
        }

        onUpdate(user.id, payload);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Edit User</h3>
                        <p className="text-sm text-slate-500">Update details for {user.name}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Basic Info */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-xs text-slate-400">(Read-only)</span></label>
                        <input
                            type="email"
                            value={formData.email}
                            disabled
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                            <select
                                value={formData.department}
                                onChange={e => setFormData({ ...formData, department: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                            >
                                <option value="">Select Dept</option>
                                <option value="Sales">Sales</option>
                                <option value="Engineering">Engineering</option>
                                <option value="HR">HR</option>
                                <option value="Operations">Operations</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                            <select
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                            >
                                {ROLES.map(role => (
                                    <option key={role.id} value={role.id}>{role.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Manager Assignment */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Reports To (Manager)</label>
                        <select
                            value={formData.managerId || ''}
                            onChange={e => setFormData({ ...formData, managerId: e.target.value || null })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                        >
                            <option value="">-- No Manager (Top Level) --</option>
                            {availableManagers
                                .filter(m => m.id !== user.id) // Can't report to self
                                .map(m => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.department})</option>
                                ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">Select "No Manager" to unassign.</p>
                    </div>

                    {/* Password Reset */}
                    <div className="pt-4 border-t border-slate-100">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Reset Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none pr-10"
                                placeholder="Enter new password to reset"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Current password is hidden. Enter a new password only if you want to change it.
                        </p>
                    </div>

                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex items-center gap-2 bg-cyan-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-cyan-700 shadow-lg shadow-cyan-500/20"
                    >
                        <Save className="h-4 w-4" /> Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
