import { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { Edit2, Trash2, Plus, Search, Users, Check, X, CheckCircle, XCircle, ChevronLeft, ChevronRight, Image as ImageIcon, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import MentorAvailabilityCalendar from './MentorAvailabilityCalendar'; // Import the new calendar component
import ImageCropper from './ImageCropper';

interface MentorAvailability {
    type: 'WEEKDAY' | 'WEEKEND' | 'SPECIFIC_DATE' | 'BLOCKOUT';
    dayOfWeek: number | null;
    date?: string | Date | null;
    timeSlots: string[];
    isRecursive: boolean;
}

interface Mentor {
    id: string;
    name: string;
    designation: string;
    photoUrl: string;
    organization: string;
    email: string;
    bio: string;
    expertise: string[];
    isTopMentor: boolean;
    isActive: boolean;
    availabilities: MentorAvailability[];
}

const WEEDKAYS = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
];

const WEEKENDS = [
    { value: 6, label: 'Saturday' },
    { value: 0, label: 'Sunday' },
];

const TIME_SLOTS = [
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
    '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM'
];

function formatTimeSlotsAsRanges(slots: string[]): string[] {
    if (!slots || slots.length === 0) return [];

    const validSlots = slots.filter(s => TIME_SLOTS.includes(s))
        .sort((a, b) => TIME_SLOTS.indexOf(a) - TIME_SLOTS.indexOf(b));

    if (validSlots.length === 0) return slots;

    const ranges: string[] = [];
    let startIdx = TIME_SLOTS.indexOf(validSlots[0]);
    let endIdx = startIdx;

    for (let i = 1; i < validSlots.length; i++) {
        const currentIdx = TIME_SLOTS.indexOf(validSlots[i]);
        if (currentIdx === endIdx + 1) {
            endIdx = currentIdx;
        } else {
            ranges.push(`${TIME_SLOTS[startIdx]} - ${TIME_SLOTS[endIdx + 1] || 'Late'}`);
            startIdx = currentIdx;
            endIdx = currentIdx;
        }
    }
    ranges.push(`${TIME_SLOTS[startIdx]} - ${TIME_SLOTS[endIdx + 1] || 'Late'}`);

    return ranges;
}

export default function MentorMaster() {
    const [mentors, setMentors] = useState<Mentor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMentor, setEditingMentor] = useState<Mentor | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Pagination & Sort State
    const [sortOption, setSortOption] = useState('newest');
    const [itemsPerPage, setItemsPerPage] = useState<number | 'All'>(10);
    const [currentPage, setCurrentPage] = useState(1);

    // Form State
    const [formData, setFormData] = useState<Partial<Mentor & { availabilities: MentorAvailability[] }>>({
        name: '',
        designation: '',
        organization: '',
        email: '',
        bio: '',
        photoUrl: '',
        expertise: [],
        isTopMentor: false,
        isActive: true,
        availabilities: []
    });

    const [draftAvail, setDraftAvail] = useState<{
        type: 'WEEKDAY' | 'WEEKEND'; // Simplified type
        dayOfWeek: number | null;
        fromTime: string;
        toTime: string;
        isRecursive: boolean;
    }>({
        type: 'WEEKDAY',
        dayOfWeek: 1,
        fromTime: '',
        toTime: '',
        isRecursive: true
    });

    const [showCalendar, setShowCalendar] = useState(false);
    const [cropImageObj, setCropImageObj] = useState<string | null>(null);
    const [viewImageObj, setViewImageObj] = useState<string | null>(null);

    const [expInput, setExpInput] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchMentors();
    }, []);

    const fetchMentors = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/mentors', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setMentors(data);
            }
        } catch (error) {
            toast.error('Failed to fetch mentors');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    // --- Metrics ---
    const totalMentors = mentors?.length || 0;
    const activeMentors = mentors?.filter(m => m.isActive).length || 0;
    const inactiveMentors = totalMentors - activeMentors;

    // --- Filter, Sort, Paginate ---
    const filteredMentors = mentors?.filter(mentor =>
        mentor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mentor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mentor.organization.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const sortedMentors = [...filteredMentors].sort((a, b) => {
        if (sortOption === 'name-asc') return a.name.localeCompare(b.name);
        if (sortOption === 'name-desc') return b.name.localeCompare(a.name);
        return 0; // default newest
    });

    const totalItems = sortedMentors.length;
    const totalPages = itemsPerPage === 'All' ? 1 : Math.ceil(totalItems / (itemsPerPage as number));
    const startIndex = currentPage === 1 ? 0 : (currentPage - 1) * (typeof itemsPerPage === 'number' ? itemsPerPage : totalItems);
    const endIndex = itemsPerPage === 'All' ? totalItems : Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedMentors = sortedMentors.slice(startIndex, endIndex);

    // Photo Upload Helper
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 3 * 1024 * 1024) {
            toast.error('File size exceeds 3MB limit');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const url = URL.createObjectURL(file);
        setCropImageObj(url); // Trigger cropper instead of setting immediately
    };

    const handleCropComplete = (croppedUrl: string) => {
        setFormData(prev => ({ ...prev, photoUrl: croppedUrl }));
        setCropImageObj(null);
    };


    const addExpertise = () => {
        const val = expInput.trim();
        if (!val) return;
        if (formData.expertise?.some(e => e.toLowerCase() === val.toLowerCase())) {
            toast.error('Expertise already added');
            return;
        }
        setFormData(prev => ({ ...prev, expertise: [...(prev.expertise || []), val] }));
        setExpInput('');
    };

    const removeExpertise = (exp: string) => {
        setFormData(prev => ({
            ...prev,
            expertise: prev.expertise?.filter(e => e !== exp)
        }));
    };

    // Availability Helper
    const getDayLabel = (type: string, val: number | null, dateStr?: string) => {
        if (type === 'BLOCKOUT') return dateStr ? new Date(dateStr).toLocaleDateString() : 'Specific Date';
        if (val === null) return '';
        if (type === 'WEEKDAY') return WEEDKAYS.find(d => d.value === val)?.label || '';
        return WEEKENDS.find(d => d.value === val)?.label || '';
    };

    const disabledTimeSlots = useMemo(() => {
        if (draftAvail.dayOfWeek === null) return [];
        const slots = new Set<string>();
        (formData.availabilities || []).forEach(a => {
            if (a.dayOfWeek === draftAvail.dayOfWeek && a.type === draftAvail.type) {
                a.timeSlots.forEach(slot => slots.add(slot));
            }
        });
        return Array.from(slots);
    }, [formData.availabilities, draftAvail.dayOfWeek, draftAvail.type]);

    const handleAddDraftSlot = () => {
        if (!draftAvail.fromTime || !draftAvail.toTime) {
            toast.error('Please select both From and To times');
            return;
        }
        if (draftAvail.dayOfWeek === null) {
            toast.error('Please select a day');
            return;
        }

        const startIndex = TIME_SLOTS.indexOf(draftAvail.fromTime);
        const endIndex = TIME_SLOTS.indexOf(draftAvail.toTime);

        if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
            toast.error('Invalid time range');
            return;
        }

        const timeSlots = TIME_SLOTS.slice(startIndex, endIndex);

        const hasOverlap = timeSlots.some(slot => disabledTimeSlots.includes(slot));
        if (hasOverlap) {
            toast.error('Selected time range overlaps with existing configured slots for this day.');
            return;
        }

        setFormData(prev => ({
            ...prev,
            availabilities: [...(prev.availabilities || []), {
                type: draftAvail.type,
                dayOfWeek: draftAvail.dayOfWeek,
                timeSlots,
                isRecursive: draftAvail.isRecursive,
                // Store fromTime and toTime for easier editing later
                fromTime: draftAvail.fromTime,
                toTime: draftAvail.toTime
            } as MentorAvailability] // Type assertion to match MentorAvailability
        }));
        toast.success('Availability slot added');
    };

    const handleAddBlockout = (date: Date) => {
        setFormData(prev => ({
            ...prev,
            availabilities: [...(prev.availabilities || []), {
                type: 'BLOCKOUT',
                dayOfWeek: null,
                date: date.toISOString(),
                timeSlots: [],
                isRecursive: false
            } as MentorAvailability]
        }));
        toast.success('Marked as unavailable');
    };

    const handleRemoveBlockout = (date: Date) => {
        setFormData(prev => ({
            ...prev,
            availabilities: (prev.availabilities || []).filter(a => {
                if (a.type !== 'BLOCKOUT' || !a.date) return true;
                return new Date(a.date).toDateString() !== date.toDateString();
            })
        }));
        toast.success('Availability restored');
    };

    const removeAvailability = (index: number) => {
        setFormData(prev => {
            const arr = [...(prev.availabilities || [])];
            arr.splice(index, 1);
            return { ...prev, availabilities: arr };
        });
    };

    // Compute Total Hours roughly (assuming 1 hour per slot, roughly 4 weeks a month)
    const computeHours = () => {
        let weekly = 0;
        formData.availabilities?.forEach(a => {
            // Count slots per recurrence type
            if (a.isRecursive) {
                weekly += a.timeSlots.length;
            } else {
                // If not recursive, it's a one off, so we could count it as 1 slot this week
                weekly += a.timeSlots.length;
            }
        });
        return {
            weekly,
            monthly: weekly * 4
        };
    };

    const hours = computeHours();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.email || !formData.organization || !formData.designation) {
            toast.error('Please fill all required fields');
            return;
        }

        // Default placeholder if no image uploaded
        if (!formData.photoUrl || formData.photoUrl.startsWith('blob:')) {
            formData.photoUrl = '/murali.png'; // Mock fallback for real system
        }

        setSubmitting(true);

        try {
            const url = editingMentor ? `/api/admin/mentors/${editingMentor.id}` : '/api/admin/mentors';
            const method = editingMentor ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save mentor');

            toast.success(editingMentor ? 'Details updated successfully' : 'Details inserted successfully');
            setIsModalOpen(false);
            setEditingMentor(null);
            fetchMentors();
        } catch (error: any) {
            toast.error(error.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const openEdit = (mentor: Mentor) => {
        const availabilities = (mentor.availabilities as MentorAvailability[])?.map(a => {
            let fromTime = '';
            let toTime = '';
            if (a.timeSlots && a.timeSlots.length > 0) {
                const sorted = [...a.timeSlots].sort((x, y) => TIME_SLOTS.indexOf(x) - TIME_SLOTS.indexOf(y));
                fromTime = sorted[0];
                const lastSlotIndex = TIME_SLOTS.indexOf(sorted[sorted.length - 1]);
                toTime = TIME_SLOTS[lastSlotIndex + 1] || sorted[sorted.length - 1];
            }
            return { ...a, fromTime, toTime } as MentorAvailability & { fromTime: string, toTime: string };
        }) || [];

        setEditingMentor(mentor);
        setFormData({
            ...mentor,
            availabilities
        });
        setIsModalOpen(true);
    };

    const openNew = () => {
        setEditingMentor(null);
        setFormData({
            name: '',
            designation: '',
            organization: '',
            email: '',
            bio: '',
            photoUrl: '',
            expertise: [],
            isTopMentor: false,
            isActive: true,
            availabilities: []
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this mentor?')) return;
        try {
            const res = await fetch(`/api/admin/mentors/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Mentor deleted');
                fetchMentors();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to delete');
            }
        } catch (error) {
            toast.error('Error deleting mentor');
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                        <Users className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total Mentors</p>
                        <h3 className="text-2xl font-bold text-slate-800">{totalMentors}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                        <CheckCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Active</p>
                        <h3 className="text-2xl font-bold text-slate-800">{activeMentors}</h3>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-500">
                        <XCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Inactive</p>
                        <h3 className="text-2xl font-bold text-slate-800">{inactiveMentors}</h3>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-row flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search mentors..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Sort:</span>
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="bg-white border border-slate-200 text-sm rounded-lg p-2 focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                            <option value="newest">Default</option>
                            <option value="name-asc">Name (A-Z)</option>
                            <option value="name-desc">Name (Z-A)</option>
                        </select>
                    </div>

                    <button
                        onClick={openNew}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition shadow-sm text-sm font-medium whitespace-nowrap"
                    >
                        <Plus className="h-4 w-4" /> Add Mentor
                    </button>
                </div>
            </div>

            {/* Table Area */}
            {loading ? (
                <div className="text-center py-12 text-slate-500 text-sm">Loading mentors...</div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                            {paginatedMentors.length > 0 ? (
                                paginatedMentors.map((mentor) => (
                                    <div key={mentor.id} className={`bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden flex flex-col transition hover:shadow-md relative ${!mentor.isActive ? 'opacity-75 grayscale-[0.2]' : ''}`}>
                                        {/* Colored Header Banner */}
                                        <div className={`h-32 w-full absolute top-0 left-0 transition-colors ${mentor.isActive ? 'bg-gradient-to-r from-[#6b46c1] to-[#805ad5]' : 'bg-slate-400'}`} />

                                        {/* Status Toggle & Actions Overlay */}
                                        <div className="absolute top-4 right-4 z-20 flex flex-row items-center gap-2">
                                            {/* Inactive/Active Toggle styled like a sliding switch strictly matching screenshot */}
                                            <div className="flex items-center gap-1.5 bg-white rounded-full pl-3 pr-1 py-1 shadow-sm">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${mentor.isActive ? 'text-green-600' : 'text-slate-400'}`}>
                                                    {mentor.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const res = await fetch(`/api/admin/mentors/${mentor.id}`, {
                                                                method: 'PUT',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ isActive: !mentor.isActive })
                                                            });
                                                            if (res.ok) fetchMentors();
                                                        } catch (e) { console.error(e); }
                                                    }}
                                                    className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none ${mentor.isActive ? 'bg-green-500' : 'bg-slate-300'}`}
                                                    title={`Click to mark as ${mentor.isActive ? 'Inactive' : 'Active'}`}
                                                >
                                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${mentor.isActive ? 'translate-x-4' : 'translate-x-1'}`} />
                                                </button>
                                            </div>

                                            {/* Edit/delete overlay tools matching screenshot */}
                                            <div className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl px-2 py-1 border border-white/20 transition cursor-pointer">
                                                <button onClick={() => openEdit(mentor)} className="p-0.5 text-white/90 hover:text-white transition" title="Edit Mentor">
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </button>
                                                <div className="w-px h-3 bg-white/30" />
                                                <button onClick={() => handleDelete(mentor.id)} className="p-0.5 text-white/90 hover:text-red-200 transition" title="Delete Mentor">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="px-6 pt-20 pb-6 relative z-10 flex flex-col flex-1">
                                            {/* Profile Container */}
                                            <div className="h-20 w-20 rounded-full border-4 border-white bg-slate-100 overflow-hidden mb-4 shadow-sm shrink-0">
                                                {mentor.photoUrl ? (
                                                    <img src={mentor.photoUrl} alt={mentor.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Users className="h-10 w-10 m-4 text-slate-300" />
                                                )}
                                            </div>

                                            {/* Identity info */}
                                            <div className="mb-4">
                                                <h3 className="text-[19px] font-bold text-slate-900 leading-tight">{mentor.name}</h3>
                                                <p className="text-[14px] font-semibold text-[#805ad5]">{mentor.designation}</p>
                                            </div>

                                            {/* Organization & Email details */}
                                            <div className="space-y-1.5 mb-5 flex-1 pl-1 border-l-2 border-purple-100">
                                                <div className="flex items-start gap-2 text-slate-500">
                                                    <div className="mt-0.5 shrink-0">
                                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                    </div>
                                                    <p className="text-[13px] leading-tight font-medium" title={mentor.organization}>{mentor.organization}</p>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <div className="shrink-0">
                                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                    </div>
                                                    <p className="text-[13px] font-medium truncate" title={mentor.email}>{mentor.email}</p>
                                                </div>
                                            </div>

                                            {/* Bio Summary (Max 3 lines roughly) */}
                                            {mentor.bio && (
                                                <div className="mb-4">
                                                    <p className="text-[13px] text-slate-600 line-clamp-3 leading-relaxed">
                                                        {mentor.bio}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Expertise tags */}
                                            {mentor.expertise && mentor.expertise.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-6">
                                                    {mentor.expertise.slice(0, 3).map((exp, idx) => (
                                                        <span key={idx} className="bg-slate-50 border border-slate-100 text-slate-600 px-3 py-1 rounded-full text-[12px] font-semibold tracking-tight shadow-sm">
                                                            {exp}
                                                        </span>
                                                    ))}
                                                    {mentor.expertise.length > 3 && (
                                                        <span className="bg-slate-50 border border-slate-100 text-slate-400 px-2 py-1 rounded-full text-[12px] font-medium shadow-sm">
                                                            +{mentor.expertise.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Badges */}
                                            <div className="flex items-center justify-between py-4 border-t border-slate-100 border-dashed mt-auto mb-4 min-h-[50px]">
                                                <div className="flex flex-col gap-2 flex-1 w-full">
                                                    <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                                                        <Calendar className="w-4 h-4 text-slate-400" />
                                                        <span className="text-[13px] font-bold text-slate-700">Schedule Available</span>
                                                    </div>
                                                    <div className="flex flex-col gap-1 pl-5">
                                                        {(() => {
                                                            const allSlots = new Set<string>();
                                                            (mentor.availabilities as any[])?.forEach((a: any) => {
                                                                a.timeSlots?.forEach((s: string) => allSlots.add(s));
                                                            });
                                                            const slotsArray = Array.from(allSlots);

                                                            if (slotsArray.length === 0) {
                                                                return <span className="text-slate-400 italic text-xs">No specific times set</span>;
                                                            }

                                                            const ranges = formatTimeSlotsAsRanges(slotsArray);
                                                            return ranges.slice(0, 3).map((range, i) => (
                                                                <div key={i} className="flex flex-wrap items-center gap-1.5 text-xs">
                                                                    <svg className="w-3 h-3 text-purple-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                                                    <span className="text-purple-700 bg-purple-50 px-1.5 rounded font-medium">{range}</span>
                                                                </div>
                                                            )).concat(ranges.length > 3 ? [<div key="more" className="text-[10px] text-slate-400 ml-5 pt-1">+{ranges.length - 3} more block(s)</div>] : [] as any);
                                                        })()}
                                                    </div>
                                                </div>

                                                {mentor.isTopMentor && (
                                                    <div className="flex items-center gap-1.5 shrink-0 bg-amber-50 text-amber-700 px-2 py-1 rounded-md mt-0.5">
                                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                                                        <span className="text-[13px] font-medium">Top Mentor</span>
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-12 text-center text-slate-500 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-slate-100 shadow-sm min-h-[400px]">
                                    <Users className="h-12 w-12 text-slate-300 mb-4" />
                                    <p className="font-semibold text-slate-700 text-lg mb-1">No mentors found</p>
                                    <p className="text-sm">Click "Add Mentor" to create the first mentor profile.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Add/Edit Mentor */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-full flex flex-col my-auto relative animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-2xl">
                            <h2 className="text-lg font-bold text-slate-900">
                                {editingMentor ? 'Edit Mentor Profile' : 'Add New Mentor'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
                            <form id="mentor-form" onSubmit={handleSubmit} className="space-y-8">

                                {/* 1. Basic Info Section */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">1. Basic Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        {/* Photo Upload Area */}
                                        <div className="md:col-span-2 flex flex-col sm:flex-row gap-6 items-start">
                                            <div className="shrink-0">
                                                <div className="relative group w-24 h-24 rounded-full border-2 border-dashed border-slate-300 overflow-hidden bg-slate-50 flex items-center justify-center hover:border-purple-400 transition-colors">
                                                    {formData.photoUrl ? (
                                                        <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon className="h-8 w-8 text-slate-300" />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-medium" onClick={() => fileInputRef.current?.click()}>
                                                        Upload
                                                    </div>
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    ref={fileInputRef}
                                                    onChange={handlePhotoChange}
                                                />
                                            </div>
                                            <div className="flex-1 space-y-2 pt-1">
                                                <h4 className="font-medium text-slate-900">Profile Photo</h4>
                                                <p className="text-xs text-slate-500 italic">Validation: Max size 3MB. Images only (.jpg, .png)</p>
                                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-md hover:bg-purple-100 transition-colors">
                                                        Change Photo
                                                    </button>
                                                    {formData.photoUrl && formData.photoUrl !== '/murali.png' && (
                                                        <>
                                                            <button type="button" onClick={() => setViewImageObj(formData.photoUrl || null)} className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md hover:bg-slate-200 transition-colors">
                                                                View
                                                            </button>
                                                            <button type="button" onClick={() => setCropImageObj(formData.photoUrl || null)} className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md hover:bg-slate-200 transition-colors">
                                                                Crop
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Full Name <span className="text-red-500">*</span></label>
                                            <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none" placeholder="e.g. John Doe" />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Email Address <span className="text-red-500">*</span></label>
                                            <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none" placeholder="john.doe@example.com" />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Designation <span className="text-red-500">*</span></label>
                                            <input required type="text" value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none" placeholder="e.g. Senior Cloud Architect" />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Organization <span className="text-red-500">*</span></label>
                                            <input required type="text" value={formData.organization} onChange={e => setFormData({ ...formData, organization: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none" placeholder="e.g. Tech Corp" />
                                        </div>

                                        <div className="md:col-span-2 space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Professional Bio</label>
                                            <textarea rows={3} value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none" placeholder="Brief background about the mentor..." />
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Capabilities Section */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">2. Capabilities</h3>

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-medium text-slate-700">Areas of Expertise</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={expInput}
                                                    onChange={(e) => setExpInput(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExpertise(); } }}
                                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                                    placeholder="e.g. Cloud Architecture, Data Science (Press Enter to add)"
                                                />
                                                <button type="button" onClick={addExpertise} className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium rounded-lg text-sm transition-colors">
                                                    Add
                                                </button>
                                            </div>

                                            {/* Expertise Pills */}
                                            {formData.expertise && formData.expertise.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 border border-slate-100 rounded-lg">
                                                    {formData.expertise.map((exp, idx) => (
                                                        <div key={idx} className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-sm">
                                                            <span className="text-xs font-medium text-slate-700">{exp}</span>
                                                            <button type="button" onClick={() => removeExpertise(exp)} className="text-slate-400 hover:text-red-500 rounded-full bg-slate-50 hover:bg-red-50 p-0.5 transition-colors">
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-purple-50/50 border border-purple-100 rounded-xl">
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900">Mark as Top Mentor</h4>
                                                <p className="text-xs text-slate-500 mt-0.5">Top mentors appear with a special badge in the Browse Mentors section.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={formData.isTopMentor} onChange={(e) => setFormData({ ...formData, isTopMentor: e.target.checked })} />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Availability Schedule */}
                                <div>
                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">3. Availability Schedule</h3>
                                            <button type="button" onClick={() => setShowCalendar(true)} className="flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors border border-purple-100">
                                                <Calendar className="h-4 w-4" /> View Calendar
                                            </button>
                                        </div>
                                        <div className="text-xs font-semibold text-purple-700 bg-purple-100 px-3 py-1 rounded-full flex flex-col items-end">
                                            <span>~ {hours.weekly} hrs / week</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                                <div className="md:col-span-3 space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-600 uppercase">Day Type</label>
                                                    <select
                                                        value={draftAvail.type}
                                                        onChange={e => setDraftAvail(prev => ({ ...prev, type: e.target.value as 'WEEKDAY' | 'WEEKEND', dayOfWeek: e.target.value === 'WEEKDAY' ? 1 : e.target.value === 'WEEKEND' ? 6 : null }))}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-purple-500 focus:border-purple-500">
                                                        <option value="WEEKDAY">Weekday</option>
                                                        <option value="WEEKEND">Weekend</option>
                                                    </select>
                                                </div>
                                                <div className="md:col-span-3 space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-600 uppercase">Select Day</label>
                                                    <select
                                                        value={draftAvail.dayOfWeek || ''}
                                                        onChange={e => setDraftAvail(prev => ({ ...prev, dayOfWeek: parseInt(e.target.value) }))}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-purple-500 focus:border-purple-500">
                                                        {draftAvail.type === 'WEEKDAY' ? (
                                                            WEEDKAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)
                                                        ) : (
                                                            WEEKENDS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)
                                                        )}
                                                    </select>
                                                </div>
                                                <div className="md:col-span-5 space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-600 uppercase">Time Range</label>
                                                    <div className="flex items-center gap-2">
                                                        <select value={draftAvail.fromTime} onChange={e => setDraftAvail({ ...draftAvail, fromTime: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-purple-500 focus:border-purple-500">
                                                            <option value="">From</option>
                                                            {TIME_SLOTS.slice(0, -1).map(slot => (
                                                                <option key={slot} value={slot} disabled={disabledTimeSlots.includes(slot)}>
                                                                    {slot} {disabledTimeSlots.includes(slot) ? '(Booked)' : ''}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <span className="text-xs text-slate-500">to</span>
                                                        <select value={draftAvail.toTime} onChange={e => setDraftAvail({ ...draftAvail, toTime: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-purple-500 focus:border-purple-500">
                                                            <option value="">To</option>
                                                            {TIME_SLOTS.slice(1).map(slot => {
                                                                const prevSlot = TIME_SLOTS[TIME_SLOTS.indexOf(slot) - 1];
                                                                const isBooked = disabledTimeSlots.includes(prevSlot);
                                                                return (
                                                                    <option key={slot} value={slot} disabled={isBooked}>
                                                                        {slot} {isBooked ? '(Booked)' : ''}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="md:col-span-1">
                                                    <button type="button" onClick={handleAddDraftSlot} className="w-full h-[40px] bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium flex items-center justify-center">
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="mt-4 flex items-center px-4 py-2 bg-white rounded-lg border border-slate-200 w-fit">
                                                <input type="checkbox" checked={draftAvail.isRecursive} onChange={e => setDraftAvail({ ...draftAvail, isRecursive: e.target.checked })} className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 mr-2" />
                                                <span className="text-sm font-medium text-slate-700">Recursive Schedule</span>
                                                <span className="text-xs text-slate-400 ml-2 italic">(Applies to every week)</span>
                                            </div>
                                        </div>

                                        {/* Added Slots List */}
                                        {formData.availabilities && formData.availabilities.length > 0 && (
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold text-slate-500 uppercase">Configured Time Slots</h4>
                                                {formData.availabilities.map((avail, idx) => {
                                                    const isBlockout = avail.type === 'BLOCKOUT';
                                                    const isWeekend = avail.type === 'WEEKEND';
                                                    const badgeColor = isBlockout
                                                        ? 'bg-red-50 text-red-700 border-red-100'
                                                        : isWeekend
                                                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                                                            : 'bg-purple-50 text-purple-700 border-purple-100';

                                                    return (
                                                        <div key={idx} className={`flex items - center justify - between p - 3 bg - white border ${isBlockout ? 'border-red-100' : 'border-slate-200'} rounded - xl shadow - sm hover: border - purple - 200 transition - colors`}>
                                                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                                                <div className={`px - 3 py - 1.5 rounded - lg text - sm font - bold w - 40 text - center border ${badgeColor} `}>
                                                                    {getDayLabel(avail.type, avail.dayOfWeek, avail.date as any)}
                                                                    {isBlockout && <span className="block text-[10px] font-medium opacity-80 uppercase tracking-wide">Unavailable</span>}
                                                                </div>
                                                                <div className={`text - sm font - bold flex items - center gap - 2 ${isBlockout ? 'text-slate-500 line-through' : 'text-slate-800'} `}>
                                                                    {(avail as any).fromTime && (avail as any).toTime
                                                                        ? `${(avail as any).fromTime} - ${(avail as any).toTime} `
                                                                        : avail.timeSlots.length > 0 ? `${avail.timeSlots[0]} - ${TIME_SLOTS[TIME_SLOTS.indexOf(avail.timeSlots[avail.timeSlots.length - 1]) + 1] || avail.timeSlots[avail.timeSlots.length - 1]} ` : 'No times'
                                                                    }
                                                                    <span className={`px - 2 py - 0.5 text - xs rounded - full border ml - 2 ${isBlockout ? 'bg-red-50 text-red-600 border-red-100 no-underline' : 'bg-slate-100 text-slate-600 border-slate-200'} `}>
                                                                        {avail.timeSlots.length} hrs
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                                                    {avail.isRecursive && !isBlockout ? <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Recursive</span> : <span className="bg-slate-100 px-2 py-0.5 rounded-full">One-time</span>}
                                                                </div>
                                                            </div>
                                                            <button type="button" onClick={() => removeAvailability(idx)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Active Toggle */}
                                <div className="flex items-center gap-3 pt-2">
                                    <input
                                        type="checkbox"
                                        id="isActiveMentor"
                                        checked={formData.isActive}
                                        onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="w-[18px] h-[18px] text-green-600 border-slate-300 rounded focus:ring-green-500 cursor-pointer"
                                    />
                                    <label htmlFor="isActiveMentor" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                                        Mentor is Active (Visible on platform)
                                    </label>
                                </div>

                            </form>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 rounded-b-2xl">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 font-medium rounded-xl transition text-sm">
                                Cancel
                            </button>
                            <button form="mentor-form" type="submit" disabled={submitting} className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 shadow-sm transition text-sm disabled:opacity-50 flex items-center gap-2">
                                {submitting ? 'Saving...' : 'Save Mentor Data'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Viewer Modal */}
            {viewImageObj && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="relative max-w-3xl w-full bg-white rounded-2xl p-2 shadow-2xl">
                        <button onClick={() => setViewImageObj(null)} className="absolute -top-12 right-0 p-2 text-white hover:text-slate-200 transition bg-white/10 hover:bg-white/20 rounded-full">
                            <X className="h-6 w-6" />
                        </button>
                        <div className="overflow-hidden rounded-xl">
                            <img src={viewImageObj} alt="Preview" className="w-full h-auto max-h-[85vh] object-contain" />
                        </div>
                    </div>
                </div>
            )}

            {/* Calendar Modal */}
            {showCalendar && (
                <MentorAvailabilityCalendar
                    availabilities={(formData.availabilities as any) || []}
                    onClose={() => setShowCalendar(false)}
                    onAddBlockout={handleAddBlockout}
                    onRemoveBlockout={handleRemoveBlockout}
                />
            )}

            {cropImageObj && (
                <ImageCropper
                    imageSrc={cropImageObj}
                    onCropComplete={handleCropComplete}
                    onCancel={() => {
                        setCropImageObj(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                />
            )}
        </div>
    );
}