'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Send, Sparkles, Languages, Loader2, Bot, User, Mic, Volume2, Play, Pause, Settings, LogOut, Globe, MapPin, ArrowRight, ToggleLeft, ToggleRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { speakText, VoicePreferences } from '@/utils/voiceUtils';
import CoachVoiceSettings from '@/components/CoachVoiceSettings';

// --- Constants ---
const MODES = [
    { id: 'IMPROVE', title: 'Improve / Practice', icon: Sparkles, desc: 'Practice conversation and get corrections.' },
    { id: 'TEACH', title: 'Teach Me', icon: Bot, desc: 'Learn a new language from scratch.' },
    { id: 'TRANSLATE', title: 'Translator', icon: Languages, desc: 'Translate between languages with explanations.' },
];

const REGIONAL_LANGS = ['Tamil', 'Hindi', 'Telugu', 'Kannada', 'Malayalam'];
const INTERNATIONAL_LANGS = ['Spanish', 'French', 'German', 'Japanese', 'Korean', 'Mandarin'];

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function LanguageCoachPage() {
    const router = useRouter();

    // Wizard State
    const [step, setStep] = useState(1); // 1: Mode, 2: Config, 3: Chat
    const [mode, setMode] = useState<string>('');
    const [config, setConfig] = useState<any>({
        category: 'Regional', // Default 
        outputLang: 'Both' // 'Target' or 'Both' (English + Target)
    });

    // Chat State
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const lastInputSource = useRef<'text' | 'voice'>('text');

    // Audio State
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [speakingLineIdx, setSpeakingLineIdx] = useState<number | null>(null);
    const [voicePrefs, setVoicePrefs] = useState<VoicePreferences>({ gender: 'female', accent: 'IN' });

    const { isListening, startListening, stopListening } = useVoiceInput({
        onSpeechEnd: (text) => {
            lastInputSource.current = 'voice';
            sendMessage(text);
        },
        silenceTimeout: 2000
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => { scrollToBottom(); }, [messages]);

    // To fix the userId issue, we'll try to get it from a simple API call or local storage
    // But for this patch, we'll make the API route more lenient or try to fetch 'me'.
    // Let's assume we can query /api/users/me (if it existed) or just rely on the server to handle session cookie.
    // Since we don't have a robust Auth context here, I will try to use a valid ID from the mockData or handle the error gracefully.
    // BETTER FIX: The API `app/api/coach/session/route.ts` should try to find a user if not provided or create a guest.
    // But since `User` relation is required, we need a Real ID.
    // I will add a fetch to get the first student user as a fallback in this component for DEMO purposes.

    const [currentUserId, setCurrentUserId] = useState<string>('');

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
                console.warn("No logged in user found via /api/auth/me");
            } catch (e) {
                console.error("Auth Fetch Error", e);
            }
        };
        fetchUser();
    }, []);


    // --- Actions ---

    const handleStartSession = async () => {
        if (!mode) return;
        setLoading(true);
        try {
            // Use fetched ID or fall back to 'guest' which backend handles
            const userIdToSend = currentUserId || 'guest_user';

            const res = await fetch('/api/coach/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userIdToSend,
                    mode,
                    config
                })
            });

            if (!res.ok) {
                const err = await res.json();
                console.error("Session Start Error", err);
                throw new Error(err.error || "Failed to start");
            }

            const data = await res.json();
            setSessionId(data.session.id);
            setStep(3);

            // Initial Greeting
            let warning = "";
            if (config.outputLang === 'Target') warning = ` (I will speak only in ${config.language || config.targetLang})`;

            setMessages([{
                role: 'assistant',
                content: `Hello! I'm your ${config.language || config.targetLang} coach. How can I help you today?${warning}`
            }]);

        } catch (e) {
            console.error(e);
            alert("Could not start session. Please ensure you are logged in or the database is seeded.");
        } finally {
            setLoading(false);
        }
    };

    const handleEndSession = async () => {
        if (!confirm("Are you sure you want to exit?")) return;

        setIsExiting(true);
        if (sessionId) {
            await fetch('/api/coach/session', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });
        }
        router.push('/coach');
    };

    const sendMessage = async (text: string) => {
        if (!text.trim() || loading || !sessionId) return;

        const userMsg = text.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const res = await fetch('/api/ai/language/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    message: userMsg,
                    history: messages.slice(-5) // Keep context Small
                })
            });

            const data = await res.json();
            if (data.reply) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);

                if (lastInputSource.current === 'voice') {
                    // Slight delay to allow state update? No, direct is fine.
                    // But we need the index.
                    // newMessages length is tricky because of closure.
                    // We can just speak the text without highlighting if index is tricky, or calc index.
                    // prev messages length + 1 (user) + 1 (assistant).
                    // Actually, let's just speak. Highlight is secondary.
                    // Or retrieve current length.
                    // We can't access updated state immediately.
                    // We'll pass -1 or handleSpeak without index?
                    // handleSpeak takes idx.
                    // Let's rely on setSpeakingLineIdx to just work if we pass an index that matches render?
                    // Safe bet: just speak.
                    speakText(data.reply, voicePrefs, () => { }, () => { });
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSpeak = (text: string, idx: number) => {
        window.speechSynthesis.cancel();
        if (speakingLineIdx === idx) {
            setSpeakingLineIdx(null);
            return;
        }

        speakText(
            text,
            voicePrefs,
            () => setSpeakingLineIdx(idx),
            () => setSpeakingLineIdx(null)
        );
    };

    // --- Render Components ---

    const Toggle = ({ left, right, value, onChange }: any) => (
        <div className="flex bg-slate-100 p-1 rounded-xl relative cursor-pointer w-full max-w-md mx-auto" onClick={() => onChange(value === left ? right : left)}>
            <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ${value === right ? 'left-[calc(50%+2px)]' : 'left-1'}`} />
            <button className={`flex-1 relative z-10 py-2 text-sm font-bold text-center transition-colors ${value === left ? 'text-slate-900' : 'text-slate-500'}`}>
                {left}
            </button>
            <button className={`flex-1 relative z-10 py-2 text-sm font-bold text-center transition-colors ${value === right ? 'text-slate-900' : 'text-slate-500'}`}>
                {right}
            </button>
        </div>
    );

    const renderModeSelection = () => (
        <div className="max-w-4xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Language Coach</h1>
            <p className="text-slate-500 mb-8">Choose how you want to learn today.</p>

            <div className="grid md:grid-cols-3 gap-6">
                {MODES.map(m => (
                    <button
                        key={m.id}
                        onClick={() => { setMode(m.id); setStep(2); }}
                        className="flex flex-col items-center p-8 bg-white border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50/50 rounded-2xl transition-all shadow-sm group text-center hover:-translate-y-1"
                    >
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <m.icon className="h-8 w-8" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 mb-2">{m.title}</h3>
                        <p className="text-sm text-slate-500">{m.desc}</p>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderConfig = () => (
        <div className="max-w-2xl mx-auto p-6 animate-in fade-in slide-in-from-right-4">
            <button onClick={() => setStep(1)} className="flex items-center text-slate-400 hover:text-slate-600 mb-6 font-medium">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </button>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Configure Session</h2>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 space-y-8">

                {/* Shared Category Toggle for All Modes */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3 text-center">Select Region</label>
                    <Toggle
                        left="Regional"
                        right="International"
                        value={config.category}
                        onChange={(v: any) => {
                            setConfig({ ...config, category: v, language: '', sourceLang: '', targetLang: '' });
                        }}
                    />
                </div>

                {/* Improve / Teach Config */}
                {(mode === 'IMPROVE' || mode === 'TEACH') && (
                    <div className="animate-in fade-in">
                        <label className="block text-sm font-bold text-slate-700 mb-3 text-center">Choose Language</label>
                        <div className="flex flex-wrap justify-center gap-3">
                            {(config.category === 'Regional' ? REGIONAL_LANGS : INTERNATIONAL_LANGS).map(lang => (
                                <button
                                    key={lang}
                                    onClick={() => setConfig({ ...config, language: lang })}
                                    className={`py-2 px-4 rounded-full text-sm font-bold border transition-all ${config.language === lang ? 'bg-slate-900 text-white border-slate-900 scale-105 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Translate Config */}
                {mode === 'TRANSLATE' && (
                    <div className="space-y-6 animate-in fade-in">
                        {/* Dynamic Dropdowns based on Category */}
                        <div className="grid md:grid-cols-[1fr,auto,1fr] gap-4 items-end">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">From</label>
                                <select
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={config.sourceLang || ''}
                                    onChange={e => setConfig({ ...config, sourceLang: e.target.value })}
                                >
                                    <option value="">Select...</option>
                                    <option value="English">English</option>
                                    {(config.category === 'Regional' ? REGIONAL_LANGS : INTERNATIONAL_LANGS).map(l => (
                                        <option key={l} value={l}>{l}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-center pb-3 text-slate-300">
                                <ArrowRight className="h-6 w-6" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">To</label>
                                <select
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={config.targetLang || ''}
                                    onChange={e => setConfig({ ...config, targetLang: e.target.value })}
                                >
                                    <option value="">Select...</option>
                                    <option value="English">English</option>
                                    {(config.category === 'Regional' ? REGIONAL_LANGS : INTERNATIONAL_LANGS).map(l => (
                                        <option key={l} value={l}>{l}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Output Language Selection */}
                {(config.language || (config.sourceLang && config.targetLang)) && (
                    <div className="pt-4 border-t border-slate-100 animate-in fade-in">
                        <label className="block text-sm font-bold text-slate-700 mb-3 text-center">AI Response Language</label>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setConfig({ ...config, outputLang: 'Target' })}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${config.outputLang === 'Target' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                {config.outputLang === 'Target' && <Check className="h-4 w-4" />}
                                Only {mode === 'TRANSLATE' ? config.targetLang : config.language}
                            </button>
                            <button
                                onClick={() => setConfig({ ...config, outputLang: 'Both' })}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${config.outputLang === 'Both' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                {config.outputLang === 'Both' && <Check className="h-4 w-4" />}
                                English + {mode === 'TRANSLATE' ? config.targetLang : config.language}
                            </button>
                        </div>
                    </div>
                )}

                <button
                    disabled={loading || (mode !== 'TRANSLATE' && !config.language) || (mode === 'TRANSLATE' && (!config.sourceLang || !config.targetLang))}
                    onClick={handleStartSession}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all mt-6"
                >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Start Session'}
                </button>
            </div>
        </div>
    );

    const renderChat = () => (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 animate-in fade-in">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                        {mode[0]}
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-900 text-sm">
                            {mode === 'TRANSLATE' ? `${config.sourceLang} ↔ ${config.targetLang}` : `${config.language} Coach`}
                        </h2>
                        <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${config.category === 'Regional' ? 'bg-orange-500' : 'bg-purple-500'}`} />
                            {config.category} Context
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={playbackSpeed}
                        onChange={e => setPlaybackSpeed(parseFloat(e.target.value))}
                        className="text-xs font-bold bg-slate-100 border-none rounded-lg py-2 px-3 focus:ring-0 cursor-pointer"
                    >
                        <option value="0.75">0.75x</option>
                        <option value="1">1.0x</option>
                        <option value="1.25">1.25x</option>
                    </select>

                    <div className="flex items-center gap-2">
                        <CoachVoiceSettings state={voicePrefs} setState={setVoicePrefs} />

                        <button onClick={handleEndSession} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg flex items-center gap-2 text-xs font-bold transition-colors">
                            <LogOut className="h-4 w-4" /> End
                        </button>
                    </div>
                </div>
            </header>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-600'}`}>
                            {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </div>
                        <div className={`max-w-[80%] space-y-1`}>
                            <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-slate-800 text-white rounded-tr-sm' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm'}`}>
                                {msg.content}
                            </div>
                            <button
                                onClick={() => handleSpeak(msg.content, idx)}
                                className={`text-xs flex items-center gap-1 hover:underline ${msg.role === 'user' ? 'text-slate-400 ml-auto' : 'text-blue-500'}`}
                            >
                                {speakingLineIdx === idx ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                {speakingLineIdx === idx ? 'Stop' : 'Play'}
                            </button>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-2 items-center text-slate-400 text-xs ml-12">
                        <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
                <div className="relative flex items-center gap-2 max-w-4xl mx-auto">

                    {/* Mic Button with Animation */}
                    <div className="relative">
                        {isListening && (
                            <>
                                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1 rounded-full whitespace-nowrap z-50">
                                    Listening...
                                </div>
                            </>
                        )}
                        <button
                            onClick={() => {
                                if (isListening) {
                                    stopListening();
                                } else {
                                    window.speechSynthesis.cancel();
                                    startListening();
                                }
                            }}
                            className={`relative p-3 rounded-full transition-all ${isListening ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            {isListening ? <div className="h-5 w-5 flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-sm" /></div> : <Mic className="h-5 w-5" />}
                        </button>
                    </div>

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
                        className="flex-1 py-3 px-5 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                    />

                    <button
                        disabled={!input.trim() || loading}
                        onClick={() => {
                            lastInputSource.current = 'text';
                            sendMessage(input);
                        }}
                        className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-200"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );

    // --- Speech Recognition Logic ---
    // --- Speech Recognition Logic ---
    // Replaced by useVoiceInput hook

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {step < 3 && (
                <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6">
                    <Link href="/coach" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold">
                        <ChevronLeft className="h-5 w-5" /> Coach Home
                    </Link>
                </header>
            )}

            {step === 1 && renderModeSelection()}
            {step === 2 && renderConfig()}
            {step === 3 && renderChat()}
        </div>
    );
}
