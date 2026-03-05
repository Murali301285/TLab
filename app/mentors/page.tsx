'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Mentor } from '@/data/mockData';
import {
    Search,
    Filter,
    Star,
    Calendar,
    MessageSquare,
    Video,
    ChevronLeft,
    ChevronRight,
    Briefcase,
    Award,
    X,
    Send,
    Loader2,
    CheckCircle,
    Phone,
    Mail,
    Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ProfileDropdown from '@/components/ProfileDropdown';
import { useAuth } from '@/components/AuthProvider';

const TIME_SLOTS = [
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
    '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM', '12:00 AM'
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

export default function MentorsPage() {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [mentorsList, setMentorsList] = useState<any[]>([]);
    const [isLoadingMentors, setIsLoadingMentors] = useState(true);

    // UI States
    const [activeTab, setActiveTab] = useState<'browse' | 'bookings'>('browse');
    const [chatOpen, setChatOpen] = useState(false);
    const [activeMentor, setActiveMentor] = useState<any>(null);
    const [showBookingModal, setShowBookingModal] = useState(false);

    // Booking Flow State
    const [bookingStep, setBookingStep] = useState(1); // 1: Date, 2: Time, 3: Details
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);

    // Booking Form Data
    const [formData, setFormData] = useState({
        email: user?.email || '',
        phone: '',
        topic: ''
    });
    const [isBookingLoading, setIsBookingLoading] = useState(false);
    const [bookingError, setBookingError] = useState<string | null>(null);

    // Chat State
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');

    // Bookings Filter State
    const [bookingSearch, setBookingSearch] = useState('');
    const [bookingStatus, setBookingStatus] = useState('All');
    const [bookingFromDate, setBookingFromDate] = useState('');
    const [bookingToDate, setBookingToDate] = useState('');

    // My Bookings State
    const [myBookings, setMyBookings] = useState<any[]>([]);
    const [isLoadingBookings, setIsLoadingBookings] = useState(false);

    // Dynamic Availability States
    const [availableDates, setAvailableDates] = useState<Date[]>([]);
    const [timeSlots, setTimeSlots] = useState<{ slot: string, isBooked: boolean }[]>([]);
    const [bookedSlotsForDate, setBookedSlotsForDate] = useState<string[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);

    // Calendar View States
    const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
    const [calendarBaseDate, setCalendarBaseDate] = useState(new Date());

    // Cancellation States
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);

    // Sync user email when loaded
    useEffect(() => {
        if (user?.email) {
            setFormData(prev => ({ ...prev, email: user.email }));
        }
        fetchMentorsList(); // Fetch public mentors list on load
    }, [user]);

    const fetchMentorsList = async () => {
        try {
            const res = await fetch('/api/mentors');
            const data = await res.json();
            if (Array.isArray(data)) {
                setMentorsList(data);
            }
        } catch (error) {
            console.error('Failed to load mentors:', error);
        } finally {
            setIsLoadingMentors(false);
        }
    };

    // Fetch Bookings
    useEffect(() => {
        if (activeTab === 'bookings' && user?.id) {
            fetchBookings();
        }
    }, [activeTab, user]);

    const fetchBookings = async () => {
        setIsLoadingBookings(true);
        try {
            const res = await fetch(`/api/mentors/bookings?userId=${user?.id || 'demo-user'}`); // Fallback for demo
            const data = await res.json();
            if (data.success) {
                setMyBookings(data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingBookings(false);
        }
    };

    const handleOpenCancelModal = (bookingId: string) => {
        setCancellingBookingId(bookingId);
        setCancelReason('');
        setIsCancelModalOpen(true);
    };

    const submitCancelBooking = async () => {
        if (!cancellingBookingId) return;
        setIsCancelling(true);
        try {
            const res = await fetch('/api/mentors/bookings/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId: cancellingBookingId, reason: cancelReason })
            });
            const data = await res.json();
            if (data.success) {
                setIsCancelModalOpen(false);
                setCancellingBookingId(null);
                setCancelReason('');
                fetchBookings(); // Refresh bookings to show CANCELLED status
            } else {
                alert(data.error || 'Failed to cancel booking');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred while cancelling.');
        } finally {
            setIsCancelling(false);
        }
    };

    // Chat Functions
    const handleOpenChat = (mentor: any) => {
        setActiveMentor(mentor);
        setChatOpen(true);
        // Load dummy history
        setChatMessages([
            { role: 'mentor', content: `Hello! I'm ${mentor.name}. How can I help you with your career goals today?` }
        ]);
    };

    const handleSendMessage = () => {
        if (!chatInput.trim()) return;

        const newMsg = { role: 'user', content: chatInput };
        setChatMessages(prev => [...prev, newMsg]);
        setChatInput('');

        // Simulate reply
        setTimeout(() => {
            setChatMessages(prev => [...prev, {
                role: 'mentor',
                content: "That's a great question! Let's discuss this further. Feel free to book a session if you need in-depth guidance."
            }]);
        }, 1500);
    };

    // Booking Functions
    const handleOpenBooking = (mentor: any) => {
        setActiveMentor(mentor);
        setShowBookingModal(true);
        setBookingStep(1);
        setSelectedDate(null);
        setSelectedTimeSlot(null);
        setBookingError(null);
    };

    const handleBookingSubmit = async () => {
        if (!selectedDate || !selectedTimeSlot || !activeMentor) return;

        setIsBookingLoading(true);
        setBookingError(null);

        try {
            const res = await fetch('/api/mentors/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mentorId: activeMentor.id,
                    userId: user?.id || 'demo-user', // Fallback
                    date: selectedDate,
                    timeSlot: selectedTimeSlot,
                    userEmail: formData.email,
                    userPhone: formData.phone,
                    topic: formData.topic
                })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setShowBookingModal(false);
                // Switch to bookings tab to show success
                fetchBookings(); // Refresh bookings
                setActiveTab('bookings');
            } else {
                setBookingError(data.error || 'Failed to complete booking. Please try again.');
            }
        } catch (e) {
            console.error(e);
            setBookingError('A network error occurred while booking. Please try again.');
        } finally {
            setIsBookingLoading(false);
        }
    };


    const filteredMentors = mentorsList.filter(mentor => {
        const matchesSearch = mentor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (mentor.designation || mentor.role || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    // Calendar Helper Functions
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const checkIsDateAvailable = (dateToCheck: Date, availabilities: any[]) => {
        if (!availabilities || availabilities.length === 0) return true; // Mock true if none set

        const dayOfWeek = dateToCheck.getDay();
        for (const avail of availabilities) {
            if (avail.type === 'WEEKDAY' && dayOfWeek >= 1 && dayOfWeek <= 5) return true;
            if (avail.type === 'WEEKEND' && (dayOfWeek === 0 || dayOfWeek === 6)) return true;
            if (avail.type === 'SPECIFIC_DATE' && avail.date) {
                if (new Date(avail.date).toDateString() === dateToCheck.toDateString()) return true;
            }
        }
        return false;
    };

    const handleNextDateRange = () => {
        const newDate = new Date(calendarBaseDate);
        if (calendarView === 'week') {
            newDate.setDate(newDate.getDate() + 7);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setCalendarBaseDate(newDate);
    };

    const handlePrevDateRange = () => {
        const newDate = new Date(calendarBaseDate);
        if (calendarView === 'week') {
            newDate.setDate(newDate.getDate() - 7);
        } else {
            newDate.setMonth(newDate.getMonth() - 1);
        }
        // Prevent going into the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (newDate < today && calendarView === 'week') {
            setCalendarBaseDate(today);
            return;
        }
        if (newDate.getFullYear() < today.getFullYear() || (newDate.getFullYear() === today.getFullYear() && newDate.getMonth() < today.getMonth())) {
            setCalendarBaseDate(today);
            return;
        }
        setCalendarBaseDate(newDate);
    };

    const generateCalendarDates = () => {
        const dates: { date: Date, isAvailable: boolean, isPast: boolean }[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (calendarView === 'week') {
            // Find Sunday of the current week (or keep it starting from today if preferred)
            // Sticking to standard Sunday start for week view
            const startOfWeek = new Date(calendarBaseDate);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

            for (let i = 0; i < 7; i++) {
                const d = new Date(startOfWeek);
                d.setDate(d.getDate() + i);
                dates.push({
                    date: d,
                    isAvailable: activeMentor ? checkIsDateAvailable(d, activeMentor.availabilities) : true,
                    isPast: d < today
                });
            }
        } else {
            // Month View
            const year = calendarBaseDate.getFullYear();
            const month = calendarBaseDate.getMonth();
            const daysInMonth = getDaysInMonth(year, month);
            const startingDay = getFirstDayOfMonth(year, month);

            // Padding days from previous month (optional but visually better, just make them null)
            for (let i = 0; i < startingDay; i++) {
                dates.push({ date: new Date(year, month, -i), isAvailable: false, isPast: true }); // Dummy bad dates for padding
            }

            for (let i = 1; i <= daysInMonth; i++) {
                const d = new Date(year, month, i);
                dates.push({
                    date: d,
                    isAvailable: activeMentor ? checkIsDateAvailable(d, activeMentor.availabilities) : true,
                    isPast: d < today
                });
            }
        }
        return dates;
    };

    const calendarGrid = generateCalendarDates();


    // Fetch booked slots when a Date is selected
    useEffect(() => {
        if (!activeMentor || !selectedDate) return;

        const fetchBookedSlots = async () => {
            setIsLoadingSlots(true);
            try {
                // Adjust to local timezone for query to match server expectations
                const tzOffset = selectedDate.getTimezoneOffset() * 60000;
                const localISOTime = (new Date(selectedDate.getTime() - tzOffset)).toISOString().slice(0, -1);

                const res = await fetch(`/api/mentors/${activeMentor.id}/bookings?date=${localISOTime}`);
                const data = await res.json();
                if (data.success) {
                    const booked = data.data.map((b: any) => b.timeSlot);
                    setBookedSlotsForDate(booked);
                }
            } catch (e) {
                console.error("Failed to fetch booked slots", e);
            } finally {
                setIsLoadingSlots(false);
            }
        };

        fetchBookedSlots();
    }, [selectedDate, activeMentor]);

    // Compute Time Slots for specific date
    useEffect(() => {
        if (!activeMentor || !selectedDate) {
            setTimeSlots([]);
            return;
        }

        if (!activeMentor.availabilities || activeMentor.availabilities.length === 0) {
            // Fallback for mock mentors
            const defaultSlots = ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM"];
            setTimeSlots(defaultSlots.map(slot => ({ slot, isBooked: bookedSlotsForDate.includes(slot) })));
            return;
        }

        const dayOfWeek = selectedDate.getDay();
        const combinedSlots = new Set<string>();

        for (const avail of activeMentor.availabilities) {
            let match = false;
            if (avail.type === 'WEEKDAY' && dayOfWeek >= 1 && dayOfWeek <= 5) match = true;
            if (avail.type === 'WEEKEND' && (dayOfWeek === 0 || dayOfWeek === 6)) match = true;
            if (avail.type === 'SPECIFIC_DATE' && avail.date) {
                const specificDate = new Date(avail.date);
                if (specificDate.toDateString() === selectedDate.toDateString()) match = true;
            }

            if (match && avail.timeSlots) {
                avail.timeSlots.forEach((s: string) => combinedSlots.add(s));
            }
        }

        const sortedSlots = Array.from(combinedSlots).sort((a, b) => TIME_SLOTS.indexOf(a) - TIME_SLOTS.indexOf(b));

        const computedTimeSlots = sortedSlots.map(slot => ({
            slot,
            isBooked: bookedSlotsForDate.includes(slot)
        }));

        setTimeSlots(computedTimeSlots);
    }, [selectedDate, activeMentor, bookedSlotsForDate]);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Navigation */}
            <nav className="sticky top-0 z-50 bg-slate-900 border-b border-white/10 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative flex items-center justify-center h-16">
                        <div className="absolute left-0 flex items-center gap-4">
                            <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                                <ChevronLeft className="h-5 w-5" />
                                <span className="font-medium">Back to Dashboard</span>
                            </Link>
                        </div>
                        <div className="text-white font-bold text-lg">Mentors Hub</div>
                        <div className="absolute right-0 flex items-center gap-4">
                            <ProfileDropdown />
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {/* Header */}
                <div className="mb-10 text-center">
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">Find Your Perfect Mentor</h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
                        Connect with industry experts, get career guidance, and accelerate your professional growth through one-on-one mentorship.
                    </p>

                    {/* Tabs */}
                    <div className="flex justify-center gap-2 bg-white p-1 rounded-full border border-slate-200 inline-flex shadow-sm">
                        <button
                            onClick={() => setActiveTab('browse')}
                            className={cn("px-6 py-2 rounded-full text-sm font-bold transition-all", activeTab === 'browse' ? "bg-purple-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}
                        >
                            Browse Mentors
                        </button>
                        <button
                            onClick={() => setActiveTab('bookings')}
                            className={cn("px-6 py-2 rounded-full text-sm font-bold transition-all", activeTab === 'bookings' ? "bg-purple-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50")}
                        >
                            My Bookings
                        </button>
                    </div>
                </div>

                {activeTab === 'browse' ? (
                    <>
                        {/* Filters */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-10">
                            <div className="relative w-full max-w-2xl mx-auto">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name or role..."
                                    className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-700 shadow-sm transition-shadow"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Mentors Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredMentors.map((mentor) => (
                                <div key={mentor.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow group">
                                    <div className="relative h-32 bg-gradient-to-r from-purple-600 to-indigo-600">
                                        <div className="absolute -bottom-12 left-6">
                                            <div className="relative h-[120px] w-[120px] rounded-full border-4 border-white shadow-xl bg-white overflow-hidden shrink-0 mt-[-60px] mx-auto z-10">
                                                <img src={mentor.photoUrl || mentor.image || '/murali.png'} alt="Mentor" className="h-full w-full object-cover rounded-full" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-14 p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                                                    {mentor.name}
                                                </h3>
                                                <p className="text-sm font-medium text-purple-600 mb-1">{mentor.designation || mentor.role}</p>
                                                <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                                                    <Briefcase className="h-3.5 w-3.5" /> {mentor.organization || mentor.company}
                                                </p>
                                                {mentor.email && (
                                                    <p className="text-xs text-slate-500 flex items-center gap-1 hover:text-purple-600 transition-colors">
                                                        <Mail className="h-3.5 w-3.5" />
                                                        <a href={`mailto:${mentor.email}`}>{mentor.email}</a>
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-slate-600 text-sm mb-6 line-clamp-3 leading-relaxed">
                                            {mentor.bio}
                                        </p>

                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {mentor.expertise?.map((exp: string, i: number) => (
                                                <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">
                                                    {exp}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="flex items-start gap-4 text-xs text-slate-500 mb-6 py-3 border-t border-b border-slate-100 min-h-[50px]">
                                            <div className="flex flex-col gap-2 flex-1">
                                                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                                    <Calendar className="h-4 w-4 text-slate-400" />
                                                    Schedule Available
                                                </div>
                                                <div className="flex flex-col gap-1 pl-5">
                                                    {(() => {
                                                        const allSlots = new Set<string>();
                                                        mentor.availabilities?.forEach((a: any) => {
                                                            a.timeSlots?.forEach((s: string) => allSlots.add(s));
                                                        });
                                                        const slotsArray = Array.from(allSlots);

                                                        if (slotsArray.length === 0) {
                                                            return <span className="text-slate-400 italic">No specific times set</span>;
                                                        }

                                                        const ranges = formatTimeSlotsAsRanges(slotsArray);
                                                        return ranges.slice(0, 3).map((range, i) => (
                                                            <div key={i} className="flex flex-wrap items-center gap-1.5">
                                                                <Clock className="w-3 h-3 text-purple-400" />
                                                                <span className="text-purple-700 bg-purple-50 px-1.5 rounded">{range}</span>
                                                            </div>
                                                        )).concat(ranges.length > 3 ? [<div key="more" className="text-[10px] text-slate-400 ml-5 pt-1">+{ranges.length - 3} more block(s)</div>] : [] as any);
                                                    })()}
                                                </div>
                                            </div>
                                            {mentor.isTopMentor && (
                                                <div className="flex items-center gap-1.5 shrink-0 bg-amber-50 text-amber-700 px-2 py-1 rounded-md mt-0.5">
                                                    <Award className="h-4 w-4" />
                                                    Top
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                disabled
                                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-400 font-bold text-sm bg-slate-50 flex items-center justify-center gap-2 cursor-not-allowed"
                                                title="Chat is temporarily disabled"
                                            >
                                                <MessageSquare className="h-4 w-4" /> Chat
                                            </button>
                                            <button
                                                onClick={() => handleOpenBooking(mentor)}
                                                className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <Video className="h-4 w-4" /> Book Session
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    // My Bookings Tab
                    <div className="max-w-4xl mx-auto space-y-6">

                        {/* Bookings Filters */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="relative md:col-span-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search mentor..."
                                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                        value={bookingSearch}
                                        onChange={(e) => setBookingSearch(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                                        value={bookingStatus}
                                        onChange={(e) => setBookingStatus(e.target.value)}
                                    >
                                        <option value="All">All Statuses</option>
                                        <option value="CONFIRMED">Confirmed</option>
                                        <option value="CANCELLED">Cancelled</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                </div>
                                <div>
                                    <input
                                        type="date"
                                        placeholder="From Date"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm text-slate-600"
                                        value={bookingFromDate}
                                        onChange={(e) => setBookingFromDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <input
                                        type="date"
                                        placeholder="To Date"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm text-slate-600"
                                        value={bookingToDate}
                                        onChange={(e) => setBookingToDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {isLoadingBookings ? (
                            <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>
                        ) : myBookings.length === 0 ? (
                            <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-slate-300">
                                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-slate-900">No Bookings Yet</h3>
                                <p className="text-slate-500 mb-6">You haven't booked any sessions yet.</p>
                                <button onClick={() => setActiveTab('browse')} className="text-purple-600 font-bold hover:underline">Browse Mentors</button>
                            </div>
                        ) : (
                            myBookings.filter((booking: any) => {
                                const mentor = mentorsList.find(m => m.id === booking.mentorId) || mentorsList[0] || { name: 'Unknown Mentor' };

                                // Text Search
                                const matchesSearch = mentor.name.toLowerCase().includes(bookingSearch.toLowerCase());

                                // Status Match
                                const matchesStatus = bookingStatus === 'All' || booking.status === bookingStatus;

                                // Date Range
                                const bDate = new Date(booking.date);
                                bDate.setHours(0, 0, 0, 0);

                                let matchesFrom = true;
                                if (bookingFromDate) {
                                    const fromDt = new Date(bookingFromDate);
                                    fromDt.setHours(0, 0, 0, 0);
                                    matchesFrom = bDate >= fromDt;
                                }

                                let matchesTo = true;
                                if (bookingToDate) {
                                    const toDt = new Date(bookingToDate);
                                    toDt.setHours(0, 0, 0, 0);
                                    matchesTo = bDate <= toDt;
                                }

                                return matchesSearch && matchesStatus && matchesFrom && matchesTo;
                            }).length === 0 ? (
                                <div className="text-center p-10 bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
                                    No bookings match your selected filters.
                                </div>
                            ) : (
                                myBookings.filter((booking: any) => {
                                    const mentor = mentorsList.find(m => m.id === booking.mentorId) || mentorsList[0] || { name: 'Unknown Mentor' };
                                    const matchesSearch = mentor.name.toLowerCase().includes(bookingSearch.toLowerCase());
                                    const matchesStatus = bookingStatus === 'All' || booking.status === bookingStatus;
                                    const bDate = new Date(booking.date);
                                    bDate.setHours(0, 0, 0, 0);

                                    let matchesFrom = true;
                                    if (bookingFromDate) {
                                        const fromDt = new Date(bookingFromDate);
                                        fromDt.setHours(0, 0, 0, 0);
                                        matchesFrom = bDate >= fromDt;
                                    }
                                    let matchesTo = true;
                                    if (bookingToDate) {
                                        const toDt = new Date(bookingToDate);
                                        toDt.setHours(0, 0, 0, 0);
                                        matchesTo = bDate <= toDt;
                                    }
                                    return matchesSearch && matchesStatus && matchesFrom && matchesTo;
                                }).map((booking: any) => {
                                    // Find mentor (mock lookup)
                                    const mentor = mentorsList.find(m => m.id === booking.mentorId) || mentorsList[0] || { name: 'Unknown Mentor', photoUrl: '/murali.png' };
                                    return (
                                        <div key={booking.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-center">
                                            <div className="relative h-20 w-20 rounded-full overflow-hidden shrink-0 bg-slate-100">
                                                <img src={mentor.photoUrl || mentor.image} alt="Mentor" className="h-full w-full object-cover" />
                                            </div>
                                            <div className="flex-1 text-center md:text-left">
                                                <h3 className="font-bold text-lg text-slate-900">{mentor.name}</h3>
                                                <div className="flex flex-wrap gap-4 mt-2 justify-center md:justify-start">
                                                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1 rounded-lg">
                                                        <Calendar className="h-4 w-4 text-purple-600" />
                                                        {new Date(booking.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1 rounded-lg">
                                                        <Clock className="h-4 w-4 text-purple-600" />
                                                        {booking.timeSlot}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="shrink-0 text-center flex flex-col items-end justify-center">
                                                <span className={cn(
                                                    "inline-block px-4 py-1.5 text-xs font-bold rounded-full uppercase tracking-wider mb-3",
                                                    booking.status === 'CANCELLED'
                                                        ? "bg-slate-100 text-slate-500"
                                                        : "bg-green-100 text-green-700"
                                                )}>
                                                    {booking.status}
                                                </span>

                                                <div className="flex flex-col gap-2 items-end">
                                                    {booking.status !== 'CANCELLED' && (
                                                        <>
                                                            {booking.meetingLink ? (
                                                                <a
                                                                    href={booking.meetingLink}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-sm text-purple-600 font-bold hover:underline mb-2"
                                                                >
                                                                    Join Video Session
                                                                </a>
                                                            ) : (
                                                                <button disabled className="text-sm text-slate-300 font-bold mb-2 cursor-not-allowed">No Link</button>
                                                            )}
                                                            <button
                                                                onClick={() => handleOpenCancelModal(booking.id)}
                                                                className="text-xs text-slate-400 hover:text-red-500 hover:underline transition-colors"
                                                            >
                                                                Cancel Session
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )
                        )}
                    </div>
                )}
            </div>

            {/* Chat Drawer */}
            {chatOpen && activeMentor && (
                <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-[60] flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <div className="flex items-center gap-3">
                            <img src={activeMentor.image} alt={activeMentor.name} className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm" />
                            <div>
                                <h3 className="font-bold text-sm text-slate-900">{activeMentor.name}</h3>
                                <p className="text-xs text-slate-500">Online</p>
                            </div>
                        </div>
                        <button onClick={() => setChatOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="h-5 w-5 text-slate-500" /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                        {chatMessages.map((msg, i) => (
                            <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                <div className={cn(
                                    "max-w-[80%] p-3 rounded-2xl text-sm shadow-sm",
                                    msg.role === 'user'
                                        ? "bg-purple-600 text-white rounded-tr-none"
                                        : "bg-white text-slate-700 border border-slate-200 rounded-tl-none"
                                )}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-white border-t border-slate-200">
                        <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-2">
                            <input
                                type="text"
                                placeholder="Type a message..."
                                className="flex-1 bg-transparent text-sm focus:outline-none"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button onClick={handleSendMessage} className="p-1.5 bg-purple-600 rounded-lg text-white hover:bg-purple-700 transition-colors">
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Booking Modal */}
            {isCancelModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-red-50">
                            <h3 className="font-bold text-lg text-red-700 flex items-center gap-2">
                                <Calendar className="h-5 w-5" /> Cancel Session
                            </h3>
                            <button onClick={() => setIsCancelModalOpen(false)}><X className="h-5 w-5 text-red-400 hover:text-red-700" /></button>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 text-sm mb-4">Please provide a reason for cancelling this session. This will be shared with the mentor.</p>
                            <textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="E.g., Unexpected conflict, will reschedule later."
                                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[100px] mb-6"
                            ></textarea>

                            <div className="flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setIsCancelModalOpen(false)}
                                    className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Go Back
                                </button>
                                <button
                                    onClick={submitCancelBooking}
                                    disabled={isCancelling}
                                    className="px-6 py-2 text-sm font-bold bg-red-600 text-white hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    Confirm Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Booking Modal */}
            {showBookingModal && activeMentor && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-lg text-slate-900">Book Session with {activeMentor.name}</h3>
                            <button onClick={() => setShowBookingModal(false)}><X className="h-5 w-5 text-slate-400 hover:text-slate-900" /></button>
                        </div>

                        <div className="p-6">
                            {/* Step Indicator */}
                            <div className="flex items-center justify-between mb-8 relative">
                                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-100 -z-10"></div>
                                {[1, 2, 3].map((step) => (
                                    <div key={step} className={cn(
                                        "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all z-10",
                                        step <= bookingStep ? "bg-purple-600 text-white ring-4 ring-white" : "bg-slate-200 text-slate-500 ring-4 ring-white"
                                    )}>
                                        {step}
                                    </div>
                                ))}
                            </div>

                            {bookingStep === 1 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-bold text-slate-900">Select a Date</h4>
                                        <div className="bg-slate-100 p-1 rounded-lg flex text-xs font-medium">
                                            <button
                                                onClick={() => { setCalendarView('week'); setCalendarBaseDate(new Date()); }}
                                                className={cn("px-3 py-1.5 rounded-md transition-all", calendarView === 'week' ? "bg-white shadow-sm text-purple-700" : "text-slate-500 hover:text-slate-700")}
                                            >
                                                Week
                                            </button>
                                            <button
                                                onClick={() => { setCalendarView('month'); setCalendarBaseDate(new Date()); }}
                                                className={cn("px-3 py-1.5 rounded-md transition-all", calendarView === 'month' ? "bg-white shadow-sm text-purple-700" : "text-slate-500 hover:text-slate-700")}
                                            >
                                                Month
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-white border text-sm border-slate-200 p-4 rounded-xl">
                                        <div className="flex items-center justify-between mb-4">
                                            <button onClick={handlePrevDateRange} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><ChevronLeft className="h-5 w-5 text-slate-600" /></button>
                                            <div className="font-bold text-slate-800">
                                                {calendarView === 'week'
                                                    ? `Week of ${calendarGrid[0]?.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                                                    : calendarBaseDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                                                }
                                            </div>
                                            <button onClick={handleNextDateRange} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><ChevronRight className="h-5 w-5 text-slate-600" /></button>
                                        </div>

                                        <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-bold text-slate-400">
                                            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                                        </div>

                                        <div className={cn("grid grid-cols-7 gap-1", calendarView === 'month' ? "gap-y-2" : "")}>
                                            {calendarGrid.map((dt, i) => {
                                                // Handle invisible padding days in month view
                                                if (calendarView === 'month' && dt.date.getMonth() !== calendarBaseDate.getMonth()) {
                                                    return <div key={`pad-${i}`} className="p-2"></div>;
                                                }

                                                const isSelected = selectedDate?.toDateString() === dt.date.toDateString();
                                                const canSelect = !dt.isPast && dt.isAvailable;

                                                return (
                                                    <button
                                                        key={i}
                                                        disabled={!canSelect}
                                                        onClick={() => { setSelectedDate(dt.date); setBookingStep(2); }}
                                                        className={cn(
                                                            "aspect-square p-1 rounded-lg flex flex-col items-center justify-center transition-all relative border border-transparent",
                                                            isSelected ? "bg-purple-600 text-white shadow-md relative z-10" : "",
                                                            !isSelected && canSelect ? "hover:border-purple-200 hover:bg-purple-50 text-slate-700" : "",
                                                            !canSelect ? "text-slate-300 cursor-not-allowed opacity-50" : ""
                                                        )}
                                                    >
                                                        <span className={cn("text-lg", isSelected ? "font-bold" : "")}>{dt.date.getDate()}</span>

                                                        {canSelect && !isSelected && (
                                                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-0.5 shadow-sm"></div>
                                                        )}
                                                        {!canSelect && !dt.isPast && (
                                                            <div className="w-1.5 h-1.5 bg-slate-200 rounded-full mt-0.5"></div>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                </div>
                            )}

                            {bookingStep === 2 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-4 text-sm text-slate-500 justify-center">
                                        <button onClick={() => setBookingStep(1)} className="hover:text-purple-600 underline">Change Date</button>
                                        <span>•</span>
                                        <span className="font-bold text-slate-900">{selectedDate?.toLocaleDateString()}</span>
                                    </div>
                                    <h4 className="font-bold text-slate-900 text-center">Select Time Slot</h4>
                                    {isLoadingSlots ? (
                                        <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-purple-600" /></div>
                                    ) : timeSlots.length === 0 ? (
                                        <div className="text-center text-slate-500 text-sm py-8 bg-slate-50 rounded-xl border border-slate-100">No time slots configured for this date.</div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-3">
                                            {timeSlots.map(({ slot, isBooked }) => (
                                                <button
                                                    key={slot}
                                                    disabled={isBooked}
                                                    onClick={() => { setSelectedTimeSlot(slot); setBookingStep(3); }}
                                                    className={cn(
                                                        "p-3 rounded-xl border text-sm font-bold transition-all relative overflow-hidden",
                                                        isBooked
                                                            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                                                            : selectedTimeSlot === slot
                                                                ? "bg-purple-600 text-white border-purple-600 shadow-md"
                                                                : "bg-white border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-purple-50"
                                                    )}
                                                >
                                                    <div>
                                                        {slot} - {
                                                            (() => {
                                                                const idx = TIME_SLOTS.indexOf(slot);
                                                                if (idx !== -1 && idx < TIME_SLOTS.length - 1) {
                                                                    return TIME_SLOTS[idx + 1];
                                                                }
                                                                // Fallback for last slot
                                                                const t = new Date(`2000-01-01 ${slot}`);
                                                                t.setHours(t.getHours() + 1);
                                                                return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                            })()
                                                        }
                                                    </div>
                                                    {isBooked && (
                                                        <div className="text-[10px] font-normal uppercase tracking-wider text-slate-400 mt-0.5">(Booked)</div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {bookingStep === 3 && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-center justify-between text-sm mb-6">
                                        <div>
                                            <div className="font-bold text-purple-900">{selectedDate?.toLocaleDateString()} at {selectedTimeSlot}</div>
                                            <div className="text-purple-600 text-xs">Session with {activeMentor.name}</div>
                                        </div>
                                        <button onClick={() => setBookingStep(2)} className="text-xs font-bold text-purple-700 hover:underline">Edit</button>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Your Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
                                                placeholder="bruce@wayne.com"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
                                                placeholder="+91 98765 43210"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Topic / Questions</label>
                                        <textarea
                                            value={formData.topic}
                                            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium resize-none h-24"
                                            placeholder="What would you like to discuss?"
                                        />
                                    </div>

                                    {bookingError && (
                                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg flex items-start gap-2">
                                            <X className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold">Booking Unavailable</p>
                                                <p>{bookingError}</p>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleBookingSubmit}
                                        disabled={isBookingLoading || !formData.email}
                                        className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none mt-4 flex items-center justify-center gap-2"
                                    >
                                        {isBookingLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                                        Confirm Booking
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
