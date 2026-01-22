'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, MessageSquare, Briefcase, Zap, User, Mic2, Users, Handshake, Award, Play, Pause, Settings, Mic, Send, LogOut } from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { speakText, VoicePreferences } from '@/utils/voiceUtils';
import CoachVoiceSettings from '@/components/CoachVoiceSettings';

type Message = {
    role: 'user' | 'system' | 'assistant';
    content: string;
};

const SCENARIOS = [
    { id: 'perf_review', title: 'Performance Review', icon: <Award className="h-6 w-6" />, desc: 'Discuss your achievements and goals with your manager.', color: 'from-amber-400 to-orange-600' },
    { id: 'networking', title: 'Networking', icon: <Handshake className="h-6 w-6" />, desc: 'Master small talk and introduce yourself at an event.', color: 'from-blue-400 to-cyan-600' },
    { id: 'client_pitch', title: 'Client Pitch', icon: <BriefcaseIcon className="h-6 w-6" />, desc: 'Present a proposal to a potential client effectively.', color: 'from-emerald-400 to-green-600' },
    { id: 'feedback', title: 'Giving Feedback', icon: <MessageSquare className="h-6 w-6" />, desc: 'Deliver constructive criticism to a peer clearly.', color: 'from-pink-400 to-rose-600' },
    { id: 'public_speaking', title: 'Public Speaking', icon: <Mic2 className="h-6 w-6" />, desc: 'Practice your opening speech or presentation skills.', color: 'from-purple-400 to-violet-600' },
    { id: 'conflict', title: 'Conflict Resolution', icon: <Zap className="h-6 w-6" />, desc: 'Resolve a heated dispute with a colleague professionally.', color: 'from-red-400 to-red-600' },
];

function BriefcaseIcon(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
    )
}

export default function RoleplayPage() {
    const router = useRouter();
    const [scenario, setScenario] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [error, setError] = useState('');

    // State for Compact UI
    const [input, setInput] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [speakingLineIdx, setSpeakingLineIdx] = useState<number | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const lastInputSource = useRef<'text' | 'voice'>('text');

    // Voice Settings
    const [voicePrefs, setVoicePrefs] = useState<VoicePreferences>({ gender: 'female', accent: 'IN' });

    // New Smart Voice Hook
    const { isListening, startListening, stopListening, hasBrowserSupport } = useVoiceInput({
        onSpeechEnd: (text) => {
            lastInputSource.current = 'voice';
            sendMessage(text);
        },
        silenceTimeout: 2000
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    if (data.user?.id) {
                        setCurrentUserId(data.user.id);
                        return;
                    }
                }
            } catch (e) { }
        };
        fetchUser();
    }, []);

    // Scroll to bottom
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    // Speech Recognition Logic -> Replaced by useVoiceInput hook defined above


    const handleScenarioSelect = async (id: string) => {
        setScenario(id);
        setMessages([]);

        // Start Session
        try {
            const userId = currentUserId || 'guest_user';
            const res = await fetch('/api/coach/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    mode: 'ROLEPLAY',
                    config: { scenario: id }
                })
            });
            if (res.ok) {
                const data = await res.json();
                setSessionId(data.session.id);
            }
        } catch (e) {
            console.error("Failed to start roleplay session", e);
        }
    };

    const handleEndSession = async () => {
        if (!confirm("Are you sure you want to exit? Chat history will be deleted.")) return;

        if (sessionId) {
            await fetch('/api/coach/session', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });
        }

        setScenario(null);
        setMessages([]);
        setSessionId(null);
        setInput('');
    };

    const handleSpeak = (text: string, idx?: number) => {
        // Stop if already speaking this line
        if (idx !== undefined && speakingLineIdx === idx) {
            setSpeakingLineIdx(null);
            window.speechSynthesis.cancel();
            setIsAiSpeaking(false);
            return;
        }

        speakText(
            text,
            voicePrefs,
            () => { // OnStart
                setIsAiSpeaking(true);
                if (idx !== undefined) setSpeakingLineIdx(idx);
            },
            () => { // OnEnd
                setIsAiSpeaking(false);
                if (idx !== undefined) setSpeakingLineIdx(null);
            }
        );
    };

    const sendMessage = async (text: string) => {
        if (!text.trim() || loading) return;

        const userMsg = text.trim();
        setInput('');

        // 1. Add User Message
        const newMessages = [...messages, { role: 'user', content: userMsg } as Message];
        setMessages(newMessages);
        setLoading(true);

        try {
            // 2. Call API
            const res = await fetch('/api/ai/roleplay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages,
                    scenario,
                    sessionId
                })
            });
            const data = await res.json();

            if (!data.reply) throw new Error('No reply from AI');

            // 3. Add AI Message
            const assistantMsg = { role: 'assistant', content: data.reply } as Message;
            setMessages(prev => [...prev, assistantMsg]);

            // 4. Speak it ONLY if input was voice
            if (lastInputSource.current === 'voice') {
                handleSpeak(data.reply, newMessages.length);
            }

        } catch (err) {
            console.error(err);
            setError('Failed to get AI response. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!scenario) {
        return (
            <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center">
                <div className="max-w-4xl w-full">
                    <Link href="/coach" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-8 transition-colors">
                        <ChevronLeft className="h-5 w-5" /> Back to Coach
                    </Link>

                    <h1 className="text-4xl font-bold text-slate-900 mb-4 text-center">Choose Your Challenge</h1>
                    <p className="text-slate-500 text-center mb-12 text-lg">Select a scenario to start your voice roleplay session.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                        {SCENARIOS.map((s, idx) => (
                            <button
                                key={s.id}
                                onClick={() => handleScenarioSelect(s.id)}
                                className="group relative bg-white p-1 rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                                <div className="relative bg-white p-7 rounded-xl h-full flex flex-col items-start text-left z-10 transition-colors group-hover:bg-opacity-95">
                                    <div className={`h-14 w-14 rounded-xl flex items-center justify-center mb-6 text-white bg-gradient-to-br ${s.color} shadow-md group-hover:scale-110 transition-transform duration-300`}>
                                        {s.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">{s.title}</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed group-hover:text-slate-600">{s.desc}</p>
                                    <div className={`absolute -bottom-10 -right-10 h-32 w-32 bg-gradient-to-br ${s.color} opacity-5 rounded-full group-hover:scale-150 transition-transform duration-500`} />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            {/* Header - Fixed to match Language Coach */}
            <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shadow-sm sticky top-0 z-10 h-16 shrink-0">
                <button onClick={handleEndSession} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-medium">
                    <ChevronLeft className="h-5 w-5" /> End
                </button>

                <div className="flex items-center gap-4">
                    {/* Speed Control */}
                    <select
                        value={playbackSpeed}
                        onChange={e => setPlaybackSpeed(parseFloat(e.target.value))}
                        className="bg-slate-100 text-slate-800 border-none rounded-lg py-1 px-3 text-xs font-bold focus:ring-0 outline-none cursor-pointer"
                    >
                        <option value="0.75">0.75x</option>
                        <option value="1">1.0x</option>
                        <option value="1.25">1.25x</option>
                    </select>

                    <div className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></span>
                        {SCENARIOS.find(s => s.id === scenario)?.title}
                    </div>

                    <CoachVoiceSettings state={voicePrefs} setState={setVoicePrefs} />
                </div>

                {/* Empty 3rd col to balance center */}
                <div className="w-16"></div>
            </header>

            {/* Chat Area - Matches Language Coach Styling */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
                {messages.length === 0 && (
                    <div className="text-center text-slate-400 mt-20">
                        <MessageSquare className="h-10 w-10 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">Tap mic to start speaking.</p>
                        <p className="text-xs mt-1">"Hello, I'd like to practice..."</p>
                    </div>
                )}

                {messages.map((m, idx) => (
                    <div key={idx} className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-cyan-100 text-cyan-600'}`}>
                            {m.role === 'user' ? <User className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                        </div>

                        <div className={`max-w-[80%] space-y-1`}>
                            <div className={`p-4 rounded-2xl text-sm leading-relaxed ${m.role === 'user'
                                ? 'bg-slate-800 text-white rounded-tr-sm'
                                : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm'}`}>
                                {m.content}
                            </div>

                            {/* Play Button - Clean Integration */}
                            <button
                                onClick={() => handleSpeak(m.content, idx)}
                                className={`text-xs flex items-center gap-1 hover:underline ${m.role === 'user' ? 'text-slate-400 ml-auto' : 'text-cyan-600'
                                    }`}
                            >
                                {speakingLineIdx === idx ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                {speakingLineIdx === idx ? 'Stop' : 'Play'}
                            </button>
                        </div>
                    </div>
                ))}

                {error && <div className="text-center text-red-500 text-sm py-2">{error}</div>}

                {loading && (
                    <div className="flex gap-2 items-center text-slate-400 text-xs ml-12">
                        <div className="h-2 w-2 bg-slate-300 rounded-full animate-bounce" />
                        <div className="h-2 w-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.1s]" />
                        <div className="h-2 w-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Compact Single Row */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                <div className="relative flex items-center gap-2 max-w-4xl mx-auto">
                    {/* Mic Button */}
                    <div className="relative">
                        {isListening && (
                            <>
                                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1 rounded-full whitespace-nowrap">
                                    Listening... (Stop speaking to send)
                                </div>
                            </>
                        )}
                        <button
                            onClick={() => {
                                if (isListening) {
                                    stopListening();
                                } else {
                                    window.speechSynthesis.cancel(); // Stop AI speaking
                                    startListening();
                                }
                            }}
                            className={`relative p-3 rounded-full transition-all ${isListening ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            {isListening ? <div className="h-5 w-5 flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-sm" /></div> : <Mic className="h-5 w-5" />}
                        </button>
                    </div>

                    {/* Text Input */}
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                lastInputSource.current = 'text';
                                sendMessage(input);
                            }
                        }}
                        placeholder={isListening ? "Listening..." : "Type to practice..."}
                        className="flex-1 py-3 px-5 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all font-medium text-slate-700"
                    />

                    {/* Send Button */}
                    <button
                        disabled={!input.trim() || loading}
                        onClick={() => {
                            lastInputSource.current = 'text';
                            sendMessage(input);
                        }}
                        className="p-3 bg-cyan-600 text-white rounded-full hover:bg-cyan-700 disabled:opacity-50 transition-colors shadow-lg shadow-cyan-200"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
