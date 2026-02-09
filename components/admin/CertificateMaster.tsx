'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Search, Plus, Pencil, Trash2, X, Loader2, Save,
    AlertCircle, CheckCircle, Image as ImageIcon, Upload,
    ChevronLeft, ChevronRight, Filter, Award, XCircle, Grid, Palette, Shuffle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useAuth } from '@/components/AuthProvider';

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
    const { user } = useAuth();
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCert, setEditingCert] = useState<Certificate | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pagination & Sort State
    const [sortOption, setSortOption] = useState('newest');
    const [itemsPerPage, setItemsPerPage] = useState<number | 'All'>(10);
    const [currentPage, setCurrentPage] = useState(1);

    // Form States
    const [name, setName] = useState('');
    const [validityType, setValidityType] = useState<Certificate['validityType']>('NA');
    const [validityValue, setValidityValue] = useState<string>('');
    const [remarks, setRemarks] = useState('');
    const [isActive, setIsActive] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Designer State
    const [mode, setMode] = useState<'upload' | 'design'>('upload');
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);

    // Design Config
    const [designBgColor, setDesignBgColor] = useState('#1e293b');
    const [designTextColor, setDesignTextColor] = useState('#ffffff');
    const [designTitle, setDesignTitle] = useState('CERTIFICATE OF COMPLETION');
    const [designFooter, setDesignFooter] = useState('Awarded By 3Vidya');
    const [borderWidth, setBorderWidth] = useState(4);
    const [borderPadding, setBorderPadding] = useState(20);
    const canvasRef = useRef<HTMLCanvasElement>(null);

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

    // Draw Canvas Preview whenever design changes
    useEffect(() => {
        if (mode === 'design' && isModalOpen && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Clear
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Background (Solid)
            ctx.fillStyle = designBgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Border (inside)
            ctx.strokeStyle = designTextColor;
            ctx.lineWidth = borderWidth;
            ctx.strokeRect(borderPadding, borderPadding, canvas.width - (borderPadding * 2), canvas.height - (borderPadding * 2));

            // Text Setup
            ctx.textAlign = 'center';
            ctx.fillStyle = designTextColor;

            // Title
            ctx.font = 'bold 36px serif';
            ctx.fillText(designTitle.toUpperCase(), canvas.width / 2, 80);

            // Subtitle
            ctx.font = 'italic 18px sans-serif';
            ctx.fillText('This is to certify that', canvas.width / 2, 130);

            // Name Placeholder (Dynamic)
            ctx.font = 'bold 48px serif';
            const userName = user?.name || 'Candidate Name';
            ctx.fillText(userName, canvas.width / 2, 200);

            // Underline Name
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2 - 150, 210);
            ctx.lineTo(canvas.width / 2 + 150, 210);
            ctx.stroke();

            // Completion Text
            ctx.font = '16px sans-serif';
            ctx.fillText('has successfully completed the course', canvas.width / 2, 250);

            // Course Placeholder
            ctx.font = 'bold 24px serif';
            ctx.fillText('Course Title Here', canvas.width / 2, 290);

            // Date Placeholder
            const date = new Date();
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            const dateStr = `${day}/${month}/${year}`;
            ctx.font = '14px sans-serif';
            ctx.fillText(`Completed on: ${dateStr}`, canvas.width / 2, 330);

            // Footer
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText(designFooter, canvas.width / 2, 380);
        }
    }, [mode, isModalOpen, designBgColor, designTextColor, designTitle, designFooter, borderWidth, borderPadding, user]);

    // Curated Palette for Randomization
    const handleRandomizeDesign = () => {
        const palettes = [
            { bg: '#1e293b', text: '#fbbf24' }, // Slate & Amber
            { bg: '#172554', text: '#ffffff' }, // Blue & White
            { bg: '#064e3b', text: '#e2e8f0' }, // Emerald & Slate
            { bg: '#450a0a', text: '#fcd34d' }, // Red & Amber
            { bg: '#4c1d95', text: '#22d3ee' }, // Violet & Cyan
            { bg: '#111827', text: '#94a3b8' }, // Gray & Slate
            { bg: '#0f172a', text: '#38bdf8' }, // Slate & Sky
        ];
        const random = palettes[Math.floor(Math.random() * palettes.length)];
        setDesignBgColor(random.bg);
        setDesignTextColor(random.text);
    };


    const resetForm = () => {
        setName('');
        setValidityType('NA');
        setValidityValue('');
        setRemarks('');
        setIsActive(true);
        setBannerFile(null);
        setBannerPreview(null);
        setEditingCert(null);
        setMode('upload');
        setDesignBgColor('#1e293b');
        setDesignTextColor('#ffffff');
        setDesignTitle('CERTIFICATE OF COMPLETION');
        setDesignFooter('Awarded By 3Vidya');
        setBorderWidth(4);
        setBorderPadding(20);
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
        setMode('upload'); // Default to upload mode on edit, unless we detect generated metadata (future enhancement)
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

    const handleGenerateImage = async (): Promise<File | null> => {
        if (!canvasRef.current) return null;

        return new Promise((resolve) => {
            canvasRef.current!.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], "certificate-design.png", { type: "image/png" });
                    resolve(file);
                } else {
                    resolve(null);
                }
            }, 'image/png');
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // DUPLICATE NAME CHECK
            const isDuplicate = certificates.some(c =>
                c.name.trim().toLowerCase() === name.trim().toLowerCase() &&
                c.id !== editingCert?.id
            );

            if (isDuplicate) {
                alert('A certificate with this name already exists. Please choose a unique name.');
                setIsSubmitting(false);
                return;
            }

            const formData = new FormData();
            formData.append('name', name);
            formData.append('validityType', validityType);
            if (validityType !== 'NA' && validityValue) {
                formData.append('validityValue', validityValue);
            }
            if (remarks) formData.append('remarks', remarks);
            formData.append('isActive', String(isActive));

            let fileToUpload = bannerFile;

            // If in Design Mode, generate the image from canvas
            if (mode === 'design') {
                const generatedFile = await handleGenerateImage();
                if (generatedFile) {
                    fileToUpload = generatedFile;
                }
            }

            if (fileToUpload) {
                formData.append('bannerImage', fileToUpload);
            }

            // Logic for `keepExistingImage`:
            // If editing, no new file (uploaded or generated), and existing preview matches existing image URL
            if (editingCert && !fileToUpload && bannerPreview === editingCert.bannerImage) {
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

    // --- Metrics ---
    const totalCertificates = certificates.length;
    const activeCertificates = certificates.filter(c => c.isActive).length;
    const inactiveCertificates = totalCertificates - activeCertificates;

    // --- Filter, Sort, Paginate ---
    const filteredCertificates = certificates.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sortedCertificates = [...filteredCertificates].sort((a, b) => {
        if (sortOption === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        if (sortOption === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        if (sortOption === 'name-asc') return a.name.localeCompare(b.name);
        if (sortOption === 'name-desc') return b.name.localeCompare(a.name);
        return 0;
    });

    const totalItems = sortedCertificates.length;
    const totalPages = itemsPerPage === 'All' ? 1 : Math.ceil(totalItems / itemsPerPage);
    const startIndex = currentPage === 1 ? 0 : (currentPage - 1) * (typeof itemsPerPage === 'number' ? itemsPerPage : totalItems);
    const endIndex = itemsPerPage === 'All' ? totalItems : Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedCertificates = sortedCertificates.slice(startIndex, endIndex);

    return (
        <div className="flex flex-col h-full space-y-6">

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Award className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total Certificates</p>
                        <h3 className="text-2xl font-bold text-slate-800">{totalCertificates}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                        <CheckCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Active</p>
                        <h3 className="text-2xl font-bold text-slate-800">{activeCertificates}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                        <XCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Inactive</p>
                        <h3 className="text-2xl font-bold text-slate-800">{inactiveCertificates}</h3>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-row flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search certificates..."
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Sort:</span>
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="bg-white border border-slate-200 text-sm rounded-lg p-2 focus:ring-2 focus:ring-cyan-500 outline-none"
                        >
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                            <option value="name-asc">Name (A-Z)</option>
                            <option value="name-desc">Name (Z-A)</option>
                        </select>
                    </div>

                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Add Certificate
                    </button>
                </div>
            </div>


            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="flex-1 overflow-auto min-h-0">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-20">Banner</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Certificate Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Validity</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading && certificates.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading...</td></tr>
                            ) : paginatedCertificates.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">No certificates found.</td></tr>
                            ) : (
                                paginatedCertificates.map(cert => (
                                    <tr key={cert.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
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
                                        <td className="px-6 py-4 font-medium text-slate-900">{cert.name}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {cert.validityType === 'NA' ? 'Lifetime' : `${cert.validityValue} ${cert.validityType}`}
                                        </td>
                                        <td className="px-6 py-4">
                                            {cert.isActive ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                                    <CheckCircle className="h-3 w-3" /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                                                    <XCircle className="h-3 w-3" /> Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(cert)}
                                                    className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cert.id, cert.name)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
                        <span className="text-sm text-slate-500">
                            Showing {startIndex + 1}-{endIndex} of {totalItems}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
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

                            {/* Banner Mode Toggle */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Certificate Template
                                </label>
                                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setMode('upload')}
                                        className={cn(
                                            "flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-2",
                                            mode === 'upload' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        <Upload className="h-3.5 w-3.5" /> Upload File
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMode('design')}
                                        className={cn(
                                            "flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-2",
                                            mode === 'design' ? "bg-white text-cyan-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        <Palette className="h-3.5 w-3.5" /> Design Template
                                    </button>
                                </div>

                                {mode === 'upload' ? (
                                    <>
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
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-sm font-medium text-slate-700">Customize Design</h4>
                                            <button
                                                type="button"
                                                onClick={handleRandomizeDesign}
                                                className="text-xs flex items-center gap-1 text-cyan-600 hover:text-cyan-700 font-medium"
                                                title="Randomize Colors"
                                            >
                                                <Shuffle className="h-3 w-3" /> Regenerate
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Background Color</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={designBgColor}
                                                        onChange={(e) => setDesignBgColor(e.target.value)}
                                                        className="h-8 w-8 rounded overflow-hidden cursor-pointer border border-slate-200 p-0"
                                                    />
                                                    <span className="text-xs font-mono text-slate-400">{designBgColor}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Text Color</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={designTextColor}
                                                        onChange={(e) => setDesignTextColor(e.target.value)}
                                                        className="h-8 w-8 rounded overflow-hidden cursor-pointer border border-slate-200 p-0"
                                                    />
                                                    <span className="text-xs font-mono text-slate-400">{designTextColor}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3">
                                            <div>
                                                <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Title Text</label>
                                                <input
                                                    type="text"
                                                    value={designTitle}
                                                    onChange={(e) => setDesignTitle(e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Footer Text</label>
                                                <input
                                                    type="text"
                                                    value={designFooter}
                                                    onChange={(e) => setDesignFooter(e.target.value)}
                                                    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Border Width ({borderWidth}px)</label>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="20"
                                                    value={borderWidth}
                                                    onChange={(e) => setBorderWidth(Number(e.target.value))}
                                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Border Padding ({borderPadding}px)</label>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={borderPadding}
                                                    onChange={(e) => setBorderPadding(Number(e.target.value))}
                                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                                                />
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50 relative">
                                            <div className="absolute top-2 right-2 z-10 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none">
                                                Preview
                                            </div>
                                            <canvas
                                                ref={canvasRef}
                                                width={600}
                                                height={400}
                                                className="w-full h-auto aspect-[3/2] object-contain"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 italic text-center">
                                            Visual preview only. Actual certificate will include dynamic course details.
                                        </p>
                                    </div>
                                )}
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
