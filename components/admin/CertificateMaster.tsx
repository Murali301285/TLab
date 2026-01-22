'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Search, Plus, Pencil, Trash2, X, Loader2, Save,
    AlertCircle, CheckCircle, Image as ImageIcon, Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface Certificate {
    id: string;
    name: string;
    bannerImage: string | null;
    validityType: 'NA' | 'DAYS' | 'MONTHS' | 'YEARS';
    validityValue: number | null;
    remarks: string | null;
    isActive: boolean;
    createdAt: string;
}

export default function CertificateMaster() {
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCert, setEditingCert] = useState<Certificate | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form States
    const [name, setName] = useState('');
    const [validityType, setValidityType] = useState<Certificate['validityType']>('NA');
    const [validityValue, setValidityValue] = useState<string>('');
    const [remarks, setRemarks] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchCertificates = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/certificates');
            if (res.ok) {
                const data = await res.json();
                setCertificates(data);
            }
        } catch (error) {
            console.error('Error fetching certificates:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCertificates();
    }, []);

    const resetForm = () => {
        setName('');
        setValidityType('NA');
        setValidityValue('');
        setRemarks('');
        setIsActive(true);
        setBannerFile(null);
        setBannerPreview(null);
        setEditingCert(null);
        setIsModalOpen(false);
    };

    const handleEdit = (cert: Certificate) => {
        setEditingCert(cert);
        setName(cert.name);
        setValidityType(cert.validityType);
        setValidityValue(cert.validityValue?.toString() || '');
        setRemarks(cert.remarks || '');
        setIsActive(cert.isActive);
        setBannerPreview(cert.bannerImage);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete certificate "${name}"? This action relies on no existing assignments.`)) return;

        try {
            const res = await fetch(`/api/certificates/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchCertificates();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete certificate');
            }
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Error deleting certificate');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("File size must be less than 2MB");
                return;
            }
            if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
                alert("Only JPEG, PNG, and GIF allowed");
                return;
            }
            setBannerFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setBannerPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('validityType', validityType);
            if (validityType !== 'NA' && validityValue) {
                formData.append('validityValue', validityValue);
            }
            if (remarks) formData.append('remarks', remarks);
            formData.append('isActive', String(isActive));

            if (bannerFile) {
                formData.append('bannerImage', bannerFile);
            } else if (editingCert && editingCert.bannerImage && !bannerPreview) {
                // User removed image logic if implemented, for now keeping logic simple: 
                // if editing and no new file, backend keeps old unless we signal removal. 
                // We will send keepExistingImage flag.
                // Actually, if bannerPreview exists and bannerFile is null, it means we kept the old image (or it's just a string).
                // If bannerPreview is null, user cleared it.
            }

            // Logic for `keepExistingImage`:
            if (editingCert && !bannerFile && bannerPreview === editingCert.bannerImage) {
                formData.append('keepExistingImage', 'true');
            } else {
                formData.append('keepExistingImage', 'false');
            }

            const url = editingCert ? `/api/certificates/${editingCert.id}` : '/api/certificates';
            const method = editingCert ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                body: formData
            });

            if (res.ok) {
                fetchCertificates();
                resetForm();
            } else {
                const data = await res.json();
                alert(data.error || 'Operation failed');
            }
        } catch (error) {
            console.error('Submit error:', error);
            alert('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filtered = certificates.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search certificates..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    />
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Add Certificate
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-0">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40 text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        Loading...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                        No certificates found.
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 w-20">Banner</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Validity</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(cert => (
                                <tr key={cert.id} className="hover:bg-slate-50/50 group transition-colors">
                                    <td className="px-6 py-3">
                                        <div className="h-10 w-16 bg-slate-100 rounded overflow-hidden relative border border-slate-200">
                                            {cert.bannerImage ? (
                                                <Image
                                                    src={cert.bannerImage}
                                                    alt={cert.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-slate-300">
                                                    <ImageIcon className="h-4 w-4" />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 font-medium text-slate-900">{cert.name}</td>
                                    <td className="px-6 py-3 text-slate-600">
                                        {cert.validityType === 'NA' ? 'Lifetime' : `${cert.validityValue} ${cert.validityType}`}
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                                            cert.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                                        )}>
                                            {cert.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(cert)}
                                                className="p-1.5 hover:bg-cyan-50 text-slate-400 hover:text-cyan-600 rounded transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(cert.id, cert.name)}
                                                className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-lg text-slate-900">
                                {editingCert ? 'Edit Certificate' : 'Create Certificate'}
                            </h3>
                            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Certificate Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Course Completion Gold"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                                />
                            </div>

                            {/* Banner */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Banner Image (Max 2MB)
                                </label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png, image/jpeg, image/gif"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />

                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-cyan-400 hover:bg-cyan-50/50 transition-all text-center min-h-[160px] relative overflow-hidden group"
                                >
                                    {bannerPreview ? (
                                        <>
                                            <Image src={bannerPreview} alt="Preview" fill className="object-contain p-2" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-white font-medium flex items-center gap-2">
                                                    <Pencil className="h-4 w-4" /> Change Image
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                                <Upload className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-600">Click to upload banner</p>
                                            <p className="text-xs text-slate-400 mt-1">PNG, JPG, GIF up to 2MB</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Validity */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Validity Type
                                    </label>
                                    <select
                                        value={validityType}
                                        onChange={e => {
                                            const val = e.target.value as any;
                                            setValidityType(val);
                                            if (val === 'NA') setValidityValue('');
                                        }}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                                    >
                                        <option value="NA">NA (Lifetime)</option>
                                        <option value="DAYS">Days</option>
                                        <option value="MONTHS">Months</option>
                                        <option value="YEARS">Years</option>
                                    </select>
                                </div>
                                {validityType !== 'NA' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Duration <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            value={validityValue}
                                            onChange={e => setValidityValue(e.target.value)}
                                            placeholder="Enter number"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Remarks */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Remarks
                                </label>
                                <textarea
                                    value={remarks}
                                    onChange={e => setRemarks(e.target.value)}
                                    rows={3}
                                    placeholder="Optional notes..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 resize-none"
                                />
                            </div>

                            {/* Active Status */}
                            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={e => setIsActive(e.target.checked)}
                                    className="h-4 w-4 text-cyan-600 rounded focus:ring-cyan-500 border-slate-300"
                                />
                                <span className="text-sm font-medium text-slate-700">Is Active?</span>
                            </label>

                        </form>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 text-slate-600 font-medium text-sm hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium text-sm rounded-lg shadow-sm shadow-cyan-200 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                {editingCert ? 'Update Certificate' : 'Create Certificate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
