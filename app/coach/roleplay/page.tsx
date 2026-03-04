'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, MessageSquare, Briefcase, Zap, User, UserRound, Mic2, Users, Handshake, Award, Play, Pause, Settings, Mic, Send, LogOut, Rewind, FastForward } from 'lucide-react';
import CoachVoiceSettings from '@/components/CoachVoiceSettings';
import SpeechSpeedControl from '@/components/SpeechSpeedControl';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { speakText, VoicePreferences, seekAudio } from '@/utils/voiceUtils';
import MainHeader from '@/components/MainHeader';

type Message = {
    role: 'user' | 'system' | 'assistant';
    content: string;
};

const SCENARIOS = [
    {
        id: 'performance_review',
        title: 'Performance Review',
        desc: 'Discuss your achievements and goals with your manager.',
        icon: <Award className="h-8 w-8" />,
        color: 'from-orange-500 to-amber-400'
    },
    {
        id: 'networking',
        title: 'Networking',
        desc: 'Master small talk and introduce yourself at an event.',
        icon: <Handshake className="h-8 w-8" />,
        color: 'from-blue-500 to-cyan-400'
    },
    {
        id: 'client_pitch',
        title: 'Client Pitch',
        desc: 'Present a proposal to a potential client effectively.',
        icon: <Briefcase className="h-8 w-8" />,
        color: 'from-emerald-500 to-green-400'
    },
    {
        id: 'giving_feedback',
        title: 'Giving Feedback',
        desc: 'Deliver constructive criticism to a peer clearly.',
        icon: <MessageSquare className="h-8 w-8" />,
        color: 'from-pink-500 to-rose-400'
    },
    {
        id: 'public_speaking',
        title: 'Public Speaking',
        desc: 'Practice your opening speech or presentation skills.',
        icon: <Mic2 className="h-8 w-8" />,
        color: 'from-purple-500 to-indigo-400'
    },
    {
        id: 'conflict_resolution',
        title: 'Conflict Resolution',
        desc: 'Resolve a heated dispute with a colleague professionally.',
        icon: <Zap className="h-8 w-8" />,
        color: 'from-red-500 to-orange-400'
    }
];

export default function RoleplayPage() {
    const router = useRouter();
    const [scenario, setScenario] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [error, setError] = useState('');

    // State for Compact UI
    const [input, setInput] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [speakingLineIdx, setSpeakingLineIdx] = useState<number | null>(null);
    const [speakingProgress, setSpeakingProgress] = useState<number>(0);
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const lastInputSource = useRef<'text' | 'voice'>('text');

    // Voice Settings
    const [voicePrefs, setVoicePrefs] = useState<VoicePreferences>({ gender: 'male', accent: 'IN' });

    // Handle dynamic voice switching mid-playback
    useEffect(() => {
        if (speakingLineIdx !== null && messages[speakingLineIdx]) {
            // Replay the current message with the new voice setting
            handleSpeak(messages[speakingLineIdx].content, speakingLineIdx);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [voicePrefs.gender]); // Only trigger when gender changes

    // Load Speed Preference
    useEffect(() => {
        const savedSpeed = localStorage.getItem('tlab_voice_speed');
        if (savedSpeed) setPlaybackSpeed(parseFloat(savedSpeed));
    }, []);

    const handleSpeedChange = (speed: number) => {
        setPlaybackSpeed(speed);
        localStorage.setItem('tlab_voice_speed', speed.toString());
    };

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

    // Cleanup Audio on Unmount
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
            setIsAiSpeaking(false);
            setSpeakingLineIdx(null);
        };
    }, []);

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
        window.speechSynthesis.cancel();
        if (!confirm("Are you sure you want to exit? Chat history will be deleted.")) return;

        window.speechSynthesis.cancel(); // Double check

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

        // Ensure state is cleared
        setIsAiSpeaking(false);
        setSpeakingLineIdx(null);
    };

    const handleSpeak = (text: string, idx?: number) => {
        // Stop if already speaking this line
        if (idx !== undefined && speakingLineIdx === idx) {
            setSpeakingLineIdx(null);
            setSpeakingProgress(0);
            window.speechSynthesis.cancel();
            setIsAiSpeaking(false);
            return;
        }

        speakText(
            text,
            voicePrefs,
            () => { // OnStart
                setIsAiSpeaking(true);
                if (idx !== undefined) {
                    setSpeakingLineIdx(idx);
                    setSpeakingProgress(0);
                }
            },
            () => { // OnEnd
                setIsAiSpeaking(false);
                if (idx !== undefined) {
                    setSpeakingLineIdx(null);
                    setSpeakingProgress(0);
                }
            },
            undefined, // textLanguage
            playbackSpeed, // rate
            undefined, // onLoading
            (progress) => { // onProgress
                if (idx !== undefined) {
                    setSpeakingProgress(progress);
                }
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

    // ... (skipping down to the render method)

    if (!scenario) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <MainHeader />
                <div className="flex-1 p-6 flex flex-col items-center justify-center">
                    <div className="max-w-4xl w-full">
                        <button
                            onClick={() => {
                                window.speechSynthesis.cancel();
                                router.push('/coach');
                            }}
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-8 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5" /> Back to Coach
                        </button>

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
                    {/* Voice Gender Toggle */}
                    <div className="flex bg-slate-100/80 p-1 rounded-full border border-slate-200 shadow-inner">
                        <button
                            onClick={() => setVoicePrefs(prev => ({ ...prev, gender: 'male' }))}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${voicePrefs.gender === 'male'
                                ? 'bg-white text-cyan-700 shadow-sm ring-1 ring-black/5'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                }`}
                        >
                            <User className="h-4 w-4" /> Male
                        </button>
                        <button
                            onClick={() => setVoicePrefs(prev => ({ ...prev, gender: 'female' }))}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${voicePrefs.gender === 'female'
                                ? 'bg-white text-cyan-700 shadow-sm ring-1 ring-black/5'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                }`}
                        >
                            <UserRound className="h-4 w-4" /> Female
                        </button>
                    </div>

                    <SpeechSpeedControl
                        speed={playbackSpeed}
                        onChange={handleSpeedChange}
                        className="mr-2"
                        compact
                    />
                    <div className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></span>
                        {SCENARIOS.find(s => s.id === scenario)?.title}
                    </div>
                </div>

                {/* Empty 3rd col removed as gap handles layout */}
            </header>

            {/* Chat Area - Matches Language Coach Styling */}
            < div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50" >
                {
                    messages.length === 0 && (
                        <div className="text-center text-slate-400 mt-20">
                            <MessageSquare className="h-10 w-10 mx-auto mb-4 opacity-50" />
                            <p className="text-sm">Tap mic to start speaking.</p>
                            <p className="text-xs mt-1">"Hello, I'd like to practice..."</p>
                        </div>
                    )
                }

                {
                    messages.map((m, idx) => (
                        <div key={idx} className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-cyan-100 text-cyan-600'}`}>
                                {m.role === 'user' ? <User className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                            </div>

                            <div className="max-w-[80%] space-y-1">
                                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${m.role === 'user'
                                    ? 'bg-slate-800 text-white rounded-tr-sm'
                                    : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm'}`}>
                                    {speakingLineIdx === idx ? (
                                        <span>
                                            {m.content.split(' ').map((word, wIdx, arr) => {
                                                const activeWordIndex = Math.min(
                                                    Math.floor(speakingProgress * arr.length),
                                                    arr.length - 1
                                                );
                                                return (
                                                    <span key={wIdx} className={`transition-colors duration-75 ${wIdx === activeWordIndex ? 'bg-yellow-200 text-slate-900 rounded-[2px] px-0.5' : ''}`}>
                                                        {word}{wIdx < arr.length - 1 ? ' ' : ''}
                                                    </span>
                                                );
                                            })}
                                        </span>
                                    ) : (
                                        m.content
                                    )}
                                </div>

                                {/* Play controls - Clean Integration */}
                                <div className={`flex items-center gap-3 mt-1 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <button
                                        onClick={() => handleSpeak(m.content, idx)}
                                        className={`text-xs flex items-center gap-1 hover:underline transition-colors ${m.role === 'user' ? 'text-slate-400' : 'text-cyan-600'
                                            }`}
                                    >
                                        {speakingLineIdx === idx ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                        {speakingLineIdx === idx ? 'Stop' : 'Play'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                }

                {error && <div className="text-center text-red-500 text-sm py-2">{error}</div>}

                {
                    loading && (
                        <div className="flex gap-2 items-center text-slate-400 text-xs ml-12">
                            <div className="h-2 w-2 bg-slate-300 rounded-full animate-bounce" />
                            <div className="h-2 w-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.1s]" />
                            <div className="h-2 w-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                        </div>
                    )
                }

                <div ref={messagesEndRef} />
            </div >

            {/* Input Area - Compact Single Row */}
            < div className="p-4 bg-white border-t border-slate-100 shrink-0" >
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
