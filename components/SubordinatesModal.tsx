import { useState, useEffect } from 'react';
import { Loader2, X, User, BarChart, BookOpen, Clock, AlertTriangle, Shield, ShieldOff, CheckCircle, BookPlus } from 'lucide-react';
import { toast } from 'sonner';

interface SubordinateStats {
    id: string;
    name: string;
    email: string;
    lastLogin: string | null;
    isActive: boolean;
    allocatedContent: number;
    completedContent: number;
    avgStudyHours: number;
    quizAvgScore: number;
}

interface SubordinatesModalProps {
    managerId: string;
    managerName: string;
    onClose: () => void;
    onAssign: (user: any) => void;
}

export default function SubordinatesModal({ managerId, managerName, onClose, onAssign }: SubordinatesModalProps) {
    const [loading, setLoading] = useState(true);
    const [subordinates, setSubordinates] = useState<SubordinateStats[]>([]);

    useEffect(() => {
        const fetchSubordinates = async () => {
            try {
                const res = await fetch(`/api/admin/users/${managerId}/subordinates`);
                if (!res.ok) throw new Error("Failed to load team data");
                const data = await res.json();
                setSubordinates(data);
            } catch (error) {
                toast.error("Could not load team details");
                onClose();
            } finally {
                setLoading(false);
            }
        };

        if (managerId) fetchSubordinates();
    }, [managerId]);

    const handleBlockUser = async (userId: string, currentStatus: boolean) => {
        // Optimistic update
        setSubordinates(prev => prev.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u));

        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: userId, isActive: !currentStatus })
            });

            if (!res.ok) throw new Error("Failed to update status");
            toast.success(`User ${!currentStatus ? 'Activated' : 'Blocked'}`);
        } catch (e) {
            toast.error("Failed to update user status");
            // Revert
            setSubordinates(prev => prev.map(u => u.id === userId ? { ...u, isActive: currentStatus } : u));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <User className="h-5 w-5 text-indigo-600" />
                            Team view: <span className="text-indigo-600">{managerName}</span>
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Managing {subordinates.length} team members</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                            <p>Loading team details...</p>
                        </div>
                    ) : subordinates.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <User className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                            <p className="font-medium">No team members assigned yet.</p>
                            <p className="text-xs mt-1">Edit users to assign them to this manager.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="py-3 px-2">Employee</th>
                                        <th className="py-3 px-2 text-center">Status</th>
                                        <th className="py-3 px-2 text-center">Content</th>
                                        <th className="py-3 px-2 text-center">Progress</th>
                                        <th className="py-3 px-2 text-center">Study Time</th>
                                        <th className="py-3 px-2 text-center">Quiz Avg</th>
                                        <th className="py-3 px-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {subordinates.map((sub, idx) => (
                                        <tr key={sub.id} className="group hover:bg-slate-50/80 transition-colors">
                                            <td className="py-4 px-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs border border-indigo-100">
                                                        {sub.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{sub.name}</p>
                                                        <p className="text-xs text-slate-500">{sub.email}</p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                                            Last Login: {sub.lastLogin ? new Date(sub.lastLogin).toLocaleDateString() : 'Never'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-2 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sub.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                                    {sub.isActive ? 'Active' : 'Blocked'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-2 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-bold text-slate-700">{sub.allocatedContent}</span>
                                                    <span className="text-[10px] text-slate-400">Allocated</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-2 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-bold text-blue-600">{sub.completedContent}</span>
                                                    <span className="text-[10px] text-slate-400">Completed</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-2 text-center">
                                                <div className="flex items-center justify-center gap-1 text-slate-600 font-medium text-sm">
                                                    <Clock className="h-3 w-3 text-slate-400" />
                                                    {sub.avgStudyHours}h
                                                </div>
                                            </td>
                                            <td className="py-4 px-2 text-center">
                                                {sub.quizAvgScore > 0 ? (
                                                    <span className={`text-sm font-bold ${sub.quizAvgScore >= 80 ? 'text-emerald-600' : sub.quizAvgScore >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                        {sub.quizAvgScore}%
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-2 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all"
                                                        title="Assign Content"
                                                        onClick={() => onAssign(sub)}
                                                    >
                                                        <BookPlus className="h-4 w-4" />
                                                    </button>

                                                    <button
                                                        onClick={() => handleBlockUser(sub.id, sub.isActive)}
                                                        className={`p-1.5 rounded-lg transition-all ${sub.isActive ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                                        title={sub.isActive ? "Block User" : "Activate User"}
                                                    >
                                                        {sub.isActive ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl text-center">
                    <button onClick={onClose} className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
                        Close View
                    </button>
                </div>
            </div>
        </div>
    );
}
