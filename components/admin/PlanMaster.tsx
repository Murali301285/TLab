'use client';

import { useState, useEffect } from 'react';
import { Edit2, Shield, Crown, Zap, Check, X, Box } from 'lucide-react';
import { toast } from 'sonner';

interface Currency {
    id: string;
    code: string;
    symbol: string;
}

interface Plan {
    id: string;
    lno: number;
    name: string;
    userLimit: number;
    tokenLimit: number;
    tokenLimitMonthly: number;
    tokenLimitYearly: number;
    storageLimitMB: number;
    singleFileLimitMB: number;
    courseLimit: number;
    libraryLimit: number;
    policyLimit: number;
    allowTempUser: boolean;
    isActive: boolean;
    costPerMonth: number;
    costPerYear: number;
    currencyId?: string;
    currency?: Currency;
    coachConfig?: {
        regionalLimit?: number;
        internationalLimit?: number;
        regionalModel?: string;
        internationalModel?: string;
    };
}

const REGIONAL_MODELS = [
    { id: 'llama3-70b-8192', name: 'Llama 3 70B (Groq) - Recommended' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7b (Groq)' },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9b (Groq)' }
];

const INTERNATIONAL_MODELS = [
    { id: 'llama3-70b-8192', name: 'Llama 3 70B (Groq)' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7b (Groq)' },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9b (Groq)' }
];

const REGIONAL_LANGUAGES = ['Tamil', 'Hindi', 'Kannada', 'Telugu', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati'];
const INTERNATIONAL_LANGUAGES = ['Spanish', 'French', 'German', 'Simplified Chinese', 'Japanese', 'Arabic', 'Russian', 'Portuguese'];

export default function PlanMaster() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Plan>>({});

    useEffect(() => {
        fetchPlans();
        fetchCurrencies();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/plans', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setPlans(data);
            }
        } catch (error) {
            toast.error('Failed to fetch plans');
        } finally {
            setLoading(false);
        }
    };

    const fetchCurrencies = async () => {
        try {
            const res = await fetch('/api/admin/currencies');
            if (res.ok) {
                const data = await res.json();
                setCurrencies(data);
            }
        } catch (error) {
            console.error('Failed to fetch currencies');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlan) return;

        setSubmitting(true);
        try {
            // Sanitize payload
            const payload = {
                lno: formData.lno,
                // name: formData.name, // Name is unique/fixed usually? If editable, include. Schema says unique.
                userLimit: formData.userLimit || 0,
                tokenLimit: formData.tokenLimit || 0,
                tokenLimitMonthly: formData.tokenLimitMonthly || 0,
                tokenLimitYearly: formData.tokenLimitYearly || 0,
                storageLimitMB: formData.storageLimitMB || 0,
                singleFileLimitMB: formData.singleFileLimitMB || 0,
                courseLimit: formData.courseLimit || 0,
                libraryLimit: formData.libraryLimit || 0,
                policyLimit: formData.policyLimit || 0,
                allowTempUser: formData.allowTempUser,
                costPerMonth: formData.costPerMonth || 0,
                costPerYear: formData.costPerYear || 0,
                currencyId: formData.currencyId,
                coachConfig: formData.coachConfig,
                isActive: formData.isActive
            };

            const res = await fetch(`/api/admin/plans?id=${editingPlan.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to save plan');

            toast.success('Plan updated successfully');
            setIsModalOpen(false);
            setEditingPlan(null);
            fetchPlans();
        } catch (error) {
            toast.error('Update failed');
        } finally {
            setSubmitting(false);
        }
    };

    const openEdit = (plan: Plan) => {
        setEditingPlan(plan);
        setFormData({
            ...plan,
            currencyId: plan.currencyId || (currencies.length > 0 ? currencies[0].id : undefined),
            coachConfig: plan.coachConfig || { regionalLimit: 0, internationalLimit: 0, regionalModel: 'llama3-70b-8192', internationalModel: 'llama3-70b-8192' }
        });
        setIsModalOpen(true);
    };

    const getPlanColor = (name: string) => {
        switch (name) {
            case 'Basic': return 'bg-slate-50 border-slate-200 hover:border-slate-300';
            case 'Standard': return 'bg-blue-50 border-blue-200 hover:border-blue-300';
            case 'Premium': return 'bg-purple-50 border-purple-200 hover:border-purple-300';
            case 'Enterprise': return 'bg-amber-50 border-amber-200 hover:border-amber-300';
            default: return 'bg-white border-slate-200';
        }
    };

    const getPlanIcon = (name: string) => {
        switch (name) {
            case 'Basic': return <Box className="h-6 w-6 text-slate-500" />;
            case 'Standard': return <Shield className="h-6 w-6 text-blue-600" />;
            case 'Premium': return <Zap className="h-6 w-6 text-purple-600" />;
            case 'Enterprise': return <Crown className="h-6 w-6 text-amber-600" />;
            default: return <Box className="h-6 w-6" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header removed as it is in parent */}


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan) => (
                    <div key={plan.id} className={`rounded-xl border shadow-sm p-6 relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ${getPlanColor(plan.name)}`}>
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(plan)} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-white/80 backdrop-blur rounded-full shadow-sm hover:bg-white text-slate-700 transition">
                                <Edit2 className="h-3 w-3" /> Edit Plan
                            </button>
                        </div>

                        <div className="mb-6">
                            <div className="p-3 bg-white rounded-xl w-fit shadow-sm mb-4">
                                {getPlanIcon(plan.name)}
                            </div>
                            <h3 className="font-bold text-xl text-slate-900 mb-1">{plan.name}</h3>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-slate-900">
                                    {plan.currency?.symbol || '$'}{plan.costPerMonth}
                                </span>
                                <span className="text-sm font-medium text-slate-500">/mo</span>
                            </div>
                            <div className="text-xs text-slate-400 font-medium">
                                {plan.currency?.symbol || '$'}{plan.costPerYear} /year
                            </div>
                        </div>

                        <div className="space-y-3">
                            <LimitItem label="Users" value={plan.userLimit} />
                            <LimitItem label="Users" value={plan.userLimit} />

                            <div className="flex justify-between items-start text-sm py-1">
                                <span className="text-slate-500 pt-0.5">Tokens</span>
                                <div className="text-right">
                                    {(plan.tokenLimitMonthly > 0 || plan.tokenLimitYearly > 0) ? (
                                        <div className="flex flex-col items-end gap-0.5">
                                            {plan.tokenLimitMonthly > 0 && (
                                                <span className="font-semibold text-slate-900 bg-cyan-50 px-1.5 py-0.5 rounded text-xs">
                                                    {(plan.tokenLimitMonthly / 1000).toFixed(0)}k/mo
                                                </span>
                                            )}
                                            {plan.tokenLimitYearly > 0 && (
                                                <span className="font-semibold text-slate-900 bg-amber-50 px-1.5 py-0.5 rounded text-xs">
                                                    {(plan.tokenLimitYearly / 1000).toFixed(0)}k/year
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="font-semibold text-slate-900">{(plan.tokenLimit / 1000).toFixed(0)}k Total</span>
                                    )}
                                </div>
                            </div>

                            <LimitItem label="Storage" value={`${plan.storageLimitMB} MB`} />
                            <LimitItem label="Courses" value={plan.courseLimit} />
                            <LimitItem label="Policies" value={plan.policyLimit} />
                            <LimitItem label="Library" value={plan.libraryLimit} />
                            <LimitItem label="Single File" value={`${plan.singleFileLimitMB} MB`} />

                            <div className="flex items-center justify-between py-1 border-t border-black/5 pt-3 mt-2">
                                <span className="text-xs font-medium text-slate-500">Temp Users</span>
                                {plan.allowTempUser ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                    <X className="h-4 w-4 text-slate-400" />
                                )}
                            </div>

                            {/* AI Coach Summary */}
                            <div className="pt-2 mt-2 border-t border-black/5 text-xs">
                                <span className="font-bold text-slate-700 block mb-1">Language Coach Limits</span>
                                <div className="flex justify-between text-slate-500">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between items-center text-slate-500">
                                            <span>Regional: <span className="font-semibold text-slate-900">{plan.coachConfig?.regionalLimit || 0}</span></span>
                                            <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-500">{REGIONAL_MODELS.find(m => m.id === plan.coachConfig?.regionalModel)?.name.split(' ')[0] || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-500">
                                            <span>International: <span className="font-semibold text-slate-900">{plan.coachConfig?.internationalLimit || 0}</span></span>
                                            <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-500">{INTERNATIONAL_MODELS.find(m => m.id === plan.coachConfig?.internationalModel)?.name.split(' ')[0] || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && editingPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 m-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Edit {editingPlan.name} Plan</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">

                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-cyan-500 rounded-full"></span>
                                    Pricing Configuration
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Currency</label>
                                        <select
                                            value={formData.currencyId || ''}
                                            onChange={e => setFormData({ ...formData, currencyId: e.target.value })}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                                        >
                                            <option value="">Select Currency</option>
                                            {currencies.map(c => (
                                                <option key={c.id} value={c.id}>{c.code} ({c.symbol})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Cost / Month</label>
                                        <input type="number" value={formData.costPerMonth} onChange={e => setFormData({ ...formData, costPerMonth: parseFloat(e.target.value) })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Cost / Year</label>
                                        <input type="number" value={formData.costPerYear} onChange={e => setFormData({ ...formData, costPerYear: parseFloat(e.target.value) })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                                        User Limits
                                    </h4>
                                    <div className="space-y-3">
                                        <InputGroup label="User Limit" value={formData.userLimit} onChange={v => setFormData({ ...formData, userLimit: v })} />
                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <span className="text-sm font-medium text-slate-700">Allow Temp Users</span>
                                            <input type="checkbox" checked={formData.allowTempUser} onChange={e => setFormData({ ...formData, allowTempUser: e.target.checked })} className="h-5 w-5 text-cyan-600 rounded" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                                        Data Limits (Tokens)
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <InputGroup label="Tokens / Month" value={formData.tokenLimitMonthly} onChange={v => setFormData({ ...formData, tokenLimitMonthly: v })} />
                                            <InputGroup label="Tokens / Year" value={formData.tokenLimitYearly} onChange={v => setFormData({ ...formData, tokenLimitYearly: v })} />
                                        </div>
                                        <div className="border-t border-slate-100 my-2 pt-2"></div>
                                        <InputGroup label="Storage (MB)" value={formData.storageLimitMB} onChange={v => setFormData({ ...formData, storageLimitMB: v })} />
                                        <InputGroup label="Single File (MB)" value={formData.singleFileLimitMB} onChange={v => setFormData({ ...formData, singleFileLimitMB: v })} />
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
                                        Content Limits
                                    </h4>
                                    <div className="space-y-3">
                                        <InputGroup label="Course Limit" value={formData.courseLimit} onChange={v => setFormData({ ...formData, courseLimit: v })} />
                                        <InputGroup label="Library Limit" value={formData.libraryLimit} onChange={v => setFormData({ ...formData, libraryLimit: v })} />
                                        <InputGroup label="Policy Limit" value={formData.policyLimit} onChange={v => setFormData({ ...formData, policyLimit: v })} />
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-pink-500 rounded-full"></span>
                                        AI Coach Limits
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <InputGroup
                                                label="Regional Limit"
                                                value={formData.coachConfig?.regionalLimit}
                                                onChange={v => setFormData({
                                                    ...formData,
                                                    coachConfig: { ...formData.coachConfig, regionalLimit: v }
                                                })}
                                            />
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Regional Model</label>
                                                <select
                                                    value={formData.coachConfig?.regionalModel || ''}
                                                    onChange={e => setFormData({
                                                        ...formData,
                                                        coachConfig: { ...formData.coachConfig, regionalModel: e.target.value }
                                                    })}
                                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                                                >
                                                    <option value="">Select Model</option>
                                                    {REGIONAL_MODELS.map(m => (
                                                        <option key={m.id} value={m.id}>{m.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <InputGroup
                                                label="International Limit"
                                                value={formData.coachConfig?.internationalLimit}
                                                onChange={v => setFormData({
                                                    ...formData,
                                                    coachConfig: { ...formData.coachConfig, internationalLimit: v }
                                                })}
                                            />
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Intl. Model</label>
                                                <select
                                                    value={formData.coachConfig?.internationalModel || ''}
                                                    onChange={e => setFormData({
                                                        ...formData,
                                                        coachConfig: { ...formData.coachConfig, internationalModel: e.target.value }
                                                    })}
                                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                                                >
                                                    <option value="">Select Model</option>
                                                    {INTERNATIONAL_MODELS.map(m => (
                                                        <option key={m.id} value={m.id}>{m.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex flex-col justify-end">
                                        <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                            <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="h-5 w-5 text-cyan-600 rounded" />
                                            <label className="text-sm font-medium text-slate-700">Is Plan Active?</label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition" disabled={submitting}>Cancel</button>
                                <button type="submit" disabled={submitting} className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 shadow-sm transition font-medium disabled:opacity-50">
                                    {submitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function LimitItem({ label, value }: { label: string, value: string | number | undefined }) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">{label}</span>
            <span className="font-semibold text-slate-900">{value}</span>
        </div>
    );
}

function InputGroup({ label, value, onChange }: { label: string, value: any, onChange: (val: any) => void }) {
    return (
        <div className="flex justify-between items-center bg-white border border-slate-200 rounded-lg px-3 py-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
            <input
                type="number"
                value={value ?? ''}
                onChange={e => {
                    const val = parseInt(e.target.value);
                    onChange(isNaN(val) ? 0 : val);
                }}
                className="text-right text-sm font-bold text-slate-900 w-24 outline-none border-none focus:ring-0 p-0"
            />
        </div>
    );
}
