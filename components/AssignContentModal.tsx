import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XCircle, Clock, FileCheck, Search, Filter, BookOpen, Library, Check, ChevronDown, Award, Eye, X } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import Select from 'react-select';

interface AssignContentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAssign: (data: any) => Promise<void>;
    user: any;
    courses: any[];
}

export default function AssignContentModal({ isOpen, onClose, onAssign, user, courses }: AssignContentModalProps) {
    const [formData, setFormData] = useState({
        courseId: '',
        validityValue: 365,
        validityUnit: 'DAYS',
        certificateId: '',
        hasCertificate: false,
        quizConfig: '5'
    });

    const [certificates, setCertificates] = useState<any[]>([]);
    const [isLoadingCertificates, setIsLoadingCertificates] = useState(false);
    const [previewCert, setPreviewCert] = useState<any | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<string>('All');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const dropdownTriggerRef = useRef<HTMLDivElement>(null);
    const dropdownMenuRef = useRef<HTMLDivElement>(null);

    // Initial check for defaults if needed
    useEffect(() => {
        if (isOpen) {
            setFormData({
                courseId: '',
                validityValue: 365,
                validityUnit: 'DAYS',
                hasCertificate: false,
                certificateId: '',
                quizConfig: '5'
            });
            setSearchTerm('');
            setIsDropdownOpen(false);
            fetchCertificates();
        }
    }, [isOpen]);

    const fetchCertificates = async () => {
        setIsLoadingCertificates(true);
        try {
            const res = await fetch('/api/certificates?isActive=true');
            if (res.ok) {
                setCertificates(await res.json());
            }
        } catch (error) {
            console.error('Error fetching certificates');
        } finally {
            setIsLoadingCertificates(false);
        }
    };

    // Handle Dropdown Position
    const toggleDropdown = () => {
        if (!isDropdownOpen && dropdownTriggerRef.current) {
            const rect = dropdownTriggerRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 8, // 8px Offset
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
        setIsDropdownOpen(!isDropdownOpen);
    };

    // Close dropdown on resize/scroll to avoid floating issues
    useEffect(() => {
        const handleScroll = (event: Event) => {
            if (isDropdownOpen && dropdownMenuRef.current && !dropdownMenuRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', () => setIsDropdownOpen(false));
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', () => setIsDropdownOpen(false));
        };
    }, [isDropdownOpen]);

    // Close dropdown when clicking outside (Adapted for Portal)
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownTriggerRef.current &&
                !dropdownTriggerRef.current.contains(event.target as Node) &&
                dropdownMenuRef.current &&
                !dropdownMenuRef.current.contains(event.target as Node)
            ) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Get Unique Categories
    const categories = ['All', ...Array.from(new Set(courses.map(c => c.category || 'Other')))].sort();

    const filteredCourses = courses.filter(course => {
        // 1. Text Search
        const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase());

        // 2. Category Filter
        const matchesFilter = activeFilter === 'All' || course.category === activeFilter;

        return matchesSearch && matchesFilter;
    });

    const selectedCourse = courses.find(c => c.id === formData.courseId);

    const handleAssign = () => {
        onAssign(formData);
    };

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl min-h-[600px] animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Assign Content</h3>
                        <p className="text-sm text-slate-500">Allocate to <span className="font-semibold text-slate-800">{user.name}</span></p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <XCircle className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">

                    {/* Enhanced Course Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Select Course or Library Item</label>

                        {/* Custom Trigger */}
                        <div
                            ref={dropdownTriggerRef}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg cursor-pointer bg-white flex items-center justify-between hover:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500 transition-all"
                            onClick={toggleDropdown}
                        >
                            {selectedCourse ? (
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className={cn(
                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0",
                                        selectedCourse.type === 'LIBRARY' ? "bg-purple-100 text-purple-700" : "bg-cyan-100 text-cyan-700"
                                    )}>
                                        {selectedCourse.type === 'LIBRARY' ? 'Library' : 'Course'}
                                    </span>
                                    <span className="truncate font-medium text-slate-900">{selectedCourse.title}</span>
                                </div>
                            ) : (
                                <span className="text-slate-400">Search and select content...</span>
                            )}
                            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                        </div>

                        {/* Portal Dropdown Menu */}
                        {isDropdownOpen && createPortal(
                            <div
                                ref={dropdownMenuRef}
                                style={{
                                    top: dropdownPosition.top,
                                    left: dropdownPosition.left,
                                    width: dropdownPosition.width
                                }}
                                className="fixed bg-white border border-slate-200 rounded-xl shadow-2xl z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                            >
                                {/* Search & Filters */}
                                <div className="p-3 bg-slate-50 border-b border-slate-100 space-y-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input
                                            type="text"
                                            autoFocus
                                            placeholder="Type to search..."
                                            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-500"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
                                        {categories.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setActiveFilter(cat)}
                                                className={cn(
                                                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap",
                                                    activeFilter === cat
                                                        ? "bg-slate-800 text-white border-slate-800"
                                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                                )}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* List */}
                                <div className="max-h-60 overflow-y-auto p-1">
                                    {filteredCourses.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 text-sm">
                                            No matches found.
                                        </div>
                                    ) : (
                                        filteredCourses.map(course => {
                                            const isAssigned = user.assignedCourses?.includes(course.id);
                                            const isSelected = formData.courseId === course.id;

                                            return (
                                                <button
                                                    key={course.id}
                                                    disabled={isAssigned}
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, courseId: course.id }));
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={cn(
                                                        "w-full text-left px-3 py-2.5 rounded-lg flex items-start justify-between group transition-colors",
                                                        isSelected ? "bg-cyan-50" : "hover:bg-slate-50",
                                                        isAssigned && "opacity-50 cursor-not-allowed bg-slate-50"
                                                    )}
                                                >
                                                    <div className="flex-1 min-w-0 pr-3">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={cn(
                                                                "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                                                course.type === 'LIBRARY' ? "bg-purple-100 text-purple-600" : "bg-cyan-100 text-cyan-600"
                                                            )}>
                                                                {course.type === 'LIBRARY' ? 'Library' : 'Course'}
                                                            </span>
                                                            {course.subCategory && (
                                                                <span className="text-[10px] text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">
                                                                    {course.subCategory.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className={cn("text-sm font-medium truncate", isSelected ? "text-cyan-900" : "text-slate-700")}>
                                                            {course.title}
                                                        </p>
                                                    </div>
                                                    {isAssigned && <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap self-center">Assigned</span>}
                                                    {isSelected && <Check className="h-4 w-4 text-cyan-600 shrink-0 self-center" />}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                            , document.body)}
                    </div>

                    {/* Validity Period */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <Clock className="h-4 w-4" /> Validity Period
                        </label>
                        <div className="flex gap-4">
                            <input
                                type="number"
                                min="1"
                                className="w-24 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                value={formData.validityValue}
                                onChange={(e) => setFormData(prev => ({ ...prev, validityValue: parseInt(e.target.value) || 0 }))}
                            />
                            <select
                                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none bg-white"
                                value={formData.validityUnit}
                                onChange={(e) => setFormData(prev => ({ ...prev, validityUnit: e.target.value }))}
                            >
                                <option value="DAYS">Days</option>
                                <option value="WEEKS">Weeks</option>
                                <option value="MONTHS">Months</option>
                                <option value="YEARS">Years</option>
                            </select>
                        </div>
                    </div>

                    {/* Certificate Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 transition-colors hover:border-slate-200">
                        <div className="flex items-center gap-3">
                            <FileCheck className={cn("h-6 w-6", formData.hasCertificate ? "text-cyan-600" : "text-slate-400")} />
                            <div>
                                <p className="text-sm font-medium text-slate-900">Issue Certificate</p>
                                <p className="text-xs text-slate-500">Enable certificate upon completion</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={formData.hasCertificate}
                                onChange={(e) => setFormData(prev => ({ ...prev, hasCertificate: e.target.checked }))}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                        </label>
                    </div>

                    {/* Certificate Selection Logic - Moved Here */}
                    {formData.hasCertificate && (
                        <div className="pt-2 animate-in slide-in-from-top-2 duration-200">
                            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                <Award className="h-4 w-4 text-purple-600" /> Select Certificate Template
                            </label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Select
                                        options={certificates.map(c => ({ value: c.id, label: c.name }))}
                                        isLoading={isLoadingCertificates}
                                        value={certificates.find(c => c.id === formData.certificateId) ? { value: formData.certificateId, label: certificates.find(c => c.id === formData.certificateId)?.name } : null}
                                        onChange={(val: any) => setFormData(prev => ({ ...prev, certificateId: val?.value || '' }))}
                                        placeholder="Search & Select Certificate..."
                                        className="text-sm"
                                        classNames={{
                                            control: () => "!border-slate-300 !rounded-lg hover:!border-cyan-500 !shadow-none",
                                            option: ({ isFocused, isSelected }: { isFocused: boolean; isSelected: boolean }) => cn(
                                                "!cursor-pointer",
                                                isSelected ? "!bg-cyan-600" : isFocused ? "!bg-cyan-50 !text-cyan-900" : ""
                                            )
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        const cert = certificates.find(c => c.id === formData.certificateId);
                                        if (cert) setPreviewCert(cert);
                                    }}
                                    disabled={!formData.certificateId}
                                    className="px-3 py-2 border border-slate-300 rounded-lg text-slate-600 hover:text-cyan-600 hover:border-cyan-400 hover:bg-cyan-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Preview Certificate"
                                >
                                    <Eye className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Quiz Configuration */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Quiz Questions Count</label>
                        <div className="flex gap-4">
                            {(['5', '10', 'BOTH'] as const).map((config) => (
                                <label key={config} className="flex-1 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="quizConfig"
                                        value={config}
                                        checked={formData.quizConfig === config}
                                        onChange={(e) => setFormData(prev => ({ ...prev, quizConfig: e.target.value }))}
                                        className="sr-only peer"
                                    />
                                    <div className="text-center py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 peer-checked:bg-cyan-50 peer-checked:text-cyan-700 peer-checked:border-cyan-200 hover:bg-slate-50 transition-all">
                                        {config === 'BOTH' ? 'User Choice' : `${config} Questions`}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Certificate Toggle */}



                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAssign}
                        disabled={!formData.courseId}
                        className="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/30"
                    >
                        Assign Course
                    </button>
                </div>
            </div>

            {/* Preview Modal */}
            {previewCert && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setPreviewCert(null)}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden relative" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-900">{previewCert.name}</h3>
                            <button onClick={() => setPreviewCert(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-4 bg-slate-900 flex justify-center items-center min-h-[400px]">
                            {previewCert.bannerImage ? (
                                <div className="relative w-full aspect-[3/2] max-h-[60vh]">
                                    <Image
                                        src={previewCert.bannerImage}
                                        alt={previewCert.name}
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                            ) : (
                                <p className="text-white/50">No preview image available</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
