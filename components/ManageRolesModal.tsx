'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Shield } from 'lucide-react';
import { ROLES, Role } from '@/data/mockData';

interface ManageRolesModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentRoles: Role[];
    onUpdateRoles: (roles: Role[]) => void;
}

export default function ManageRolesModal({ isOpen, onClose, currentRoles, onUpdateRoles }: ManageRolesModalProps) {
    const [newRoleName, setNewRoleName] = useState('');
    const [canManageOthers, setCanManageOthers] = useState(false);

    if (!isOpen) return null;

    const handleAddRole = () => {
        if (!newRoleName.trim()) return;

        const newRole: Role = {
            id: newRoleName.toLowerCase().replace(/\s+/g, '_'),
            name: newRoleName,
            description: 'Custom role created by admin',
            canManageOthers,
            permissions: canManageOthers ? ['view_team'] : []
        };

        onUpdateRoles([...currentRoles, newRole]);
        setNewRoleName('');
        setCanManageOthers(false);
    };

    const handleDeleteRole = (roleId: string) => {
        if (['admin', 'manager', 'employee'].includes(roleId)) {
            alert("Cannot delete system roles");
            return;
        }
        onUpdateRoles(currentRoles.filter(r => r.id !== roleId));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-purple-600" /> Manage Roles
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="space-y-4 mb-6">
                        {currentRoles.map(role => (
                            <div key={role.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div>
                                    <p className="font-bold text-slate-800">{role.name}</p>
                                    <p className="text-xs text-slate-500">
                                        {role.canManageOthers ? 'Can manage team' : 'Individual Contributor'}
                                    </p>
                                </div>
                                {!['admin', 'manager', 'employee', 'hr'].includes(role.id) && (
                                    <button
                                        onClick={() => handleDeleteRole(role.id)}
                                        className="text-red-400 hover:text-red-600"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <h4 className="text-sm font-bold text-slate-900 mb-3">Add Custom Role</h4>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                placeholder="Role Name (e.g. Intern)"
                                value={newRoleName}
                                onChange={e => setNewRoleName(e.target.value)}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="checkbox"
                                id="canManage"
                                checked={canManageOthers}
                                onChange={e => setCanManageOthers(e.target.checked)}
                                className="rounded text-purple-600 focus:ring-purple-500"
                            />
                            <label htmlFor="canManage" className="text-sm text-slate-600">This role leads a team</label>
                        </div>
                        <button
                            onClick={handleAddRole}
                            disabled={!newRoleName}
                            className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
                        >
                            <Plus className="h-4 w-4" /> Add Role
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
