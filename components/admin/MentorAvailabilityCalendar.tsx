import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Clock, ShieldAlert } from 'lucide-react';
import {
    format, addMonths, subMonths, startOfMonth, endOfMonth,
    eachDayOfInterval, isSameMonth, isSameDay, getDay,
    startOfWeek, endOfWeek, parse
} from 'date-fns';

interface MentorAvailability {
    type: 'WEEKDAY' | 'WEEKEND' | 'SPECIFIC_DATE' | 'BLOCKOUT';
    dayOfWeek: number | null;
    date?: string | Date | null;
    timeSlots: string[];
    isRecursive: boolean;
}

interface CalendarProps {
    availabilities: MentorAvailability[];
    onAddBlockout: (date: Date) => void;
    onRemoveBlockout: (date: Date) => void;
    onClose: () => void;
}

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

export default function MentorAvailabilityCalendar({
    availabilities,
    onAddBlockout,
    onRemoveBlockout,
    onClose
}: CalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [currentMonth]);

    const getDayInfo = (date: Date) => {
        const isBlock = availabilities.some(a => a.type === 'BLOCKOUT' && a.date && isSameDay(new Date(a.date), date));
        if (isBlock) return { isBlockout: true, timeSlots: [] as string[] };

        const dayOfWeekIndex = getDay(date); // 0-6 (Sun-Sat)
        // Adjust for schema where Weekday Monday = 1... wait, my previous logic didn't remap Date object to weekday explicitly or did it?
        // In WEEKDAY/WEEKEND logic, dayOfWeek is 1 for Mon, 6 for Sat etc.
        // Actually, getDay() returns 0 for Sunday, 1 for Monday.

        let allSlots = new Set<string>();

        availabilities.forEach(a => {
            if (a.type === 'BLOCKOUT') return;

            if (a.type === 'SPECIFIC_DATE' && a.date && isSameDay(new Date(a.date), date)) {
                a.timeSlots.forEach(s => allSlots.add(s));
            } else if ((a.type === 'WEEKDAY' || a.type === 'WEEKEND') && a.dayOfWeek === dayOfWeekIndex) {
                if (a.isRecursive) {
                    a.timeSlots.forEach(s => allSlots.add(s));
                } else {
                    // Non-recursive one-time slots might be tricky to map without specific date, 
                    // but for visual purposes let's show them.
                    a.timeSlots.forEach(s => allSlots.add(s));
                }
            }
        });

        // Simple time sort helper building on Date parsing 
        const sortedSlots = Array.from(allSlots).sort((a, b) => {
            const timeA = parse(a, 'hh:mm aa', new Date());
            const timeB = parse(b, 'hh:mm aa', new Date());
            return timeA.getTime() - timeB.getTime();
        });

        return { isBlockout: false, timeSlots: sortedSlots };
    };

    const handleDateClick = (day: Date) => {
        setSelectedDate(day);
    };

    const selectedDayInfo = selectedDate ? getDayInfo(selectedDate) : null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 flex py-10 justify-center overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-min my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-700">
                            <CalendarIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Mentor Schedule Calendar</h2>
                            <p className="text-xs text-slate-500">View available slots and manage exceptions</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex flex-col md:flex-row h-full max-h-[70vh]">
                    {/* Calendar Grid */}
                    <div className="flex-1 p-6 border-r border-slate-100 overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-800">{format(currentMonth, 'MMMM yyyy')}</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={prevMonth} className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 transition-colors">
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button onClick={nextMonth} className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 transition-colors">
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {daysOfWeek.map(day => (
                                <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                            {calendarDays.map((day, idx) => {
                                const isCurrentMonth = isSameMonth(day, currentMonth);
                                const { isBlockout, timeSlots } = getDayInfo(day);
                                const isSelected = selectedDate && isSameDay(day, selectedDate);
                                const hasSlots = timeSlots.length > 0;

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleDateClick(day)}
                                        className={`
                                            aspect-square p-1 rounded-xl border flex flex-col items-center justify-center transition-all relative overflow-hidden
                                            ${!isCurrentMonth ? 'opacity-40 bg-slate-50 border-transparent' : 'bg-white'}
                                            ${isSelected ? 'ring-2 ring-purple-600 border-transparent shadow-sm scale-110 z-10' : 'border-slate-100 hover:border-slate-300'}
                                            ${isBlockout ? 'bg-red-50/50' : ''}
                                        `}
                                    >
                                        <span className={`text-sm font-bold ${isCurrentMonth ? (isBlockout ? 'text-red-700' : 'text-slate-700') : 'text-slate-400'}`}>
                                            {format(day, 'd')}
                                        </span>

                                        <div className="h-2 mt-1 w-full flex justify-center gap-0.5">
                                            {isBlockout ? (
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                            ) : hasSlots ? (
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                                            ) : null}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-4 mt-6 pt-6 border-t border-slate-100 text-xs font-medium text-slate-500">
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Has Slots</div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div> Marked Unavailable</div>
                        </div>
                    </div>

                    {/* Day Details Sidebar */}
                    <div className="w-full md:w-80 bg-slate-50 p-6 flex flex-col">
                        {selectedDate ? (
                            <>
                                <h4 className="text-lg font-bold text-slate-900 mb-1">{format(selectedDate, 'EEEE')}</h4>
                                <p className="text-sm font-medium text-purple-600 mb-6">{format(selectedDate, 'MMMM d, yyyy')}</p>

                                <div className="flex-1">
                                    {selectedDayInfo?.isBlockout ? (
                                        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex flex-col items-center text-center">
                                            <ShieldAlert className="h-8 w-8 text-red-500 mb-2" />
                                            <h5 className="font-bold text-red-900 mb-1">Marked as Unavailable</h5>
                                            <p className="text-xs text-red-600/80 mb-4">This day has been explicitly blocked out for emergencies or time off.</p>

                                            <button
                                                onClick={() => onRemoveBlockout(selectedDate)}
                                                className="px-4 py-2 bg-white text-sm font-bold text-red-600 rounded-lg border border-red-200 hover:bg-red-50 transition drop-shadow-sm w-full"
                                            >
                                                Undo (Mark Available)
                                            </button>
                                        </div>
                                    ) : selectedDayInfo?.timeSlots.length ? (
                                        <div>
                                            <div className="flex items-center gap-2 mb-3 text-sm font-bold text-slate-700">
                                                <Clock className="h-4 w-4 text-purple-600" />
                                                Available Time Slots ({selectedDayInfo.timeSlots.length})
                                            </div>
                                            <div className="flex flex-wrap gap-2 mb-6">
                                                {formatTimeSlotsAsRanges(selectedDayInfo.timeSlots).map((slot, i) => (
                                                    <span key={i} className="px-2.5 py-1 text-xs font-bold bg-white text-purple-700 border border-purple-100 rounded-md shadow-sm">
                                                        {slot}
                                                    </span>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => onAddBlockout(selectedDate)}
                                                className="px-4 py-2 bg-red-50 text-sm font-bold text-red-600 rounded-lg border border-red-100 hover:bg-red-100 transition w-full mt-4"
                                            >
                                                Mark as Not Available
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center py-10">
                                            <CalendarIcon className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                            <p className="text-sm font-bold text-slate-500">No slots available</p>
                                            <p className="text-xs text-slate-400 mt-1">There are no availability rules set for this day.</p>

                                            <button
                                                onClick={() => onAddBlockout(selectedDate)}
                                                className="px-4 py-2 bg-red-50 text-sm font-bold text-red-600 rounded-lg border border-red-100 hover:bg-red-100 transition w-full mt-6"
                                            >
                                                Mark as Not Available Anyway
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center mt-10">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border border-slate-100 shadow-sm mb-4">
                                    <CalendarIcon className="h-8 w-8 text-slate-300" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-500">Select a Date</h4>
                                <p className="text-xs text-slate-400 mt-1">Click on any date in the calendar to view its schedule and manage availability.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
