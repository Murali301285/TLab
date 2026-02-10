'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Currency {
    id: string;
    code: string;
    symbol: string;
    name: string;
    description: string;
    isActive: boolean;
}

export default function CurrencyMaster() {
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);

    const [formData, setFormData] = useState({
        code: '',
        symbol: '',
        name: '',
        description: '',
        isActive: true
    });

    useEffect(() => {
        fetchCurrencies();
    }, []);

    const fetchCurrencies = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/currencies');
            if (res.ok) {
                const data = await res.json();
                setCurrencies(data);
            }
        } catch (error) {
            toast.error('Failed to fetch currencies');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingCurrency ? `/api/admin/currencies?id=${editingCurrency.id}` : '/api/admin/currencies';
            const method = editingCurrency ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error('Failed to save currency');

            toast.success(editingCurrency ? 'Currency updated' : 'Currency created');
            setIsModalOpen(false);
            setEditingCurrency(null);
            resetForm();
            fetchCurrencies();
        } catch (error) {
            toast.error('Operation failed');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure? This cannot be undone.')) return;
        try {
            const res = await fetch(`/api/admin/currencies?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            toast.success('Currency deleted');
            fetchCurrencies();
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    const openEdit = (currency: Currency) => {
        setEditingCurrency(currency);
        setFormData({
            code: currency.code,
            symbol: currency.symbol,
            name: currency.name,
            description: currency.description || '',
            isActive: currency.isActive
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            code: '',
            symbol: '',
            name: '',
            description: '',
            isActive: true
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end items-center">
                <button
                    onClick={() => { resetForm(); setEditingCurrency(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition"
                >
                    <Plus className="h-4 w-4" /> Add Currency
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Code</th>
                            <th className="px-6 py-4">Symbol</th>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {currencies.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No currencies found.</td>
                            </tr>
                        ) : (
                            currencies.map((currency) => (
                                <tr key={currency.id} className="hover:bg-slate-50 transition">
                                    <td className="px-6 py-4 text-slate-900 font-semibold">{currency.name}</td>
                                    <td className="px-6 py-4 text-slate-600 font-mono bg-slate-100/50 rounded px-2 py-0.5 w-fit">{currency.code}</td>
                                    <td className="px-6 py-4 text-slate-900 text-lg">{currency.symbol}</td>
                                    <td className="px-6 py-4 text-slate-500">{currency.description || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${currency.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {currency.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => openEdit(currency)} className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded transition"><Edit2 className="h-4 w-4" /></button>
                                            <button onClick={() => handleDelete(currency.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900">{editingCurrency ? 'Edit Currency' : 'New Currency'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Currency Name</label>
                                <input required type="text" placeholder="e.g. Indian Rupee" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                                    <input required type="text" placeholder="INR" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 outline-none uppercase" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Symbol</label>
                                    <input required type="text" placeholder="₹" value={formData.symbol} onChange={e => setFormData({ ...formData, symbol: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 outline-none" />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="h-4 w-4 text-cyan-600 rounded focus:ring-cyan-500" />
                                <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer">Active Currency</label>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 shadow-sm transition">Save Currency</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
