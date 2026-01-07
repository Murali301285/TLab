'use client';

import { useState } from 'react';
import { X, Check, Search, UserPlus, ChevronRight, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { USERS, ROLES, Role } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { useAuth } from './AuthProvider';

interface AddUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (userData: any) => void;
    availableUsers: any[];
}

export default function AddUserModal({ isOpen, onClose, onAdd, availableUsers }: AddUserModalProps) {
    const { user: currentUser } = useAuth();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'employee',
        department: '',
        password: '',
        status: 'active',
        assignedTeamMembers: [] as string[] // IDs of users to report to this new user (if manager)
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Reset state when closing
    const handleClose = () => {
        setStep(1);
        setFormData({
            name: '',
            email: '',
            role: 'employee',
            department: '',
            password: '',
            status: 'active',
            assignedTeamMembers: []
        });
        onClose();
    };

    if (!isOpen) return null;

    const selectedRole = ROLES.find(r => r.id === formData.role);
    const isManagerRole = selectedRole?.canManageOthers;

    // Filter available users to add to team (excluding self and existing managers logic if needed, but primarily Active users)
    const availableTeamMembers = availableUsers.filter(u =>
        u.isActive && // Only active users
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        u.role !== 'admin' // Can't assign admin to a new manager
    );

    const toggleTeamMember = (userId: string) => {
        if (formData.assignedTeamMembers.includes(userId)) {
            setFormData(prev => ({
                ...prev,
                assignedTeamMembers: prev.assignedTeamMembers.filter(id => id !== userId)
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                assignedTeamMembers: [...prev.assignedTeamMembers, userId]
            }));
        }
    };

    const handleSubmit = () => {
        onAdd(formData);
        handleClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Add New User</h3>
                        <p className="text-sm text-slate-500">Step {step} of {isManagerRole ? 2 : 1}</p>
                    </div>
                    <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Progress Bar */}
                {isManagerRole && (
                    <div className="w-full bg-slate-100 h-1">
                        <div
                            className="bg-cyan-600 h-full transition-all duration-300"
                            style={{ width: step === 1 ? '50%' : '100%' }}
                        />
                    </div>
                )}

                <div className="p-6">
                    {step === 1 ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                                    placeholder="john@tlab.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none pr-10"
                                        placeholder="Default: password123"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
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
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                                <h4 className="font-bold text-blue-800 text-sm flex items-center gap-2">
                                    <UserPlus className="h-4 w-4" /> Build Team for {formData.name}
                                </h4>
                                <p className="text-xs text-blue-600 mt-1">
                                    Select users who will report directly to this new manager.
                                </p>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search users to add..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
                                />
                            </div>

                            <div className="h-48 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100">
                                {availableTeamMembers.map(user => {
                                    const isSelected = formData.assignedTeamMembers.includes(user.id);
                                    return (
                                        <button
                                            key={user.id}
                                            onClick={() => toggleTeamMember(user.id)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 transition-colors",
                                                isSelected && "bg-cyan-50 hover:bg-cyan-100"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">{user.name}</p>
                                                    <p className="text-xs text-slate-500">{user.role} • {user.department}</p>
                                                </div>
                                            </div>
                                            {isSelected && <Check className="h-4 w-4 text-cyan-600" />}
                                        </button>
                                    );
                                })}
                            </div>

                            <p className="text-xs text-right text-slate-400">
                                {formData.assignedTeamMembers.length} users selected
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between">
                    {step === 2 ? (
                        <button
                            onClick={() => setStep(1)}
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                        >
                            <ChevronLeft className="h-4 w-4" /> Back
                        </button>
                    ) : (
                        <div /> // Spacer
                    )}

                    {step === 1 && isManagerRole ? (
                        <button
                            onClick={() => {
                                if (formData.name && formData.email) setStep(2);
                            }}
                            disabled={!formData.name || !formData.email}
                            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next: Build Team <ChevronRight className="h-4 w-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={!formData.name || !formData.email}
                            className="flex items-center gap-2 bg-cyan-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
                        >
                            <Check className="h-4 w-4" /> Create User
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
