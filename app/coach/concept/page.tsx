'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Search, Loader2, Info, ArrowRight, Table, MessageSquare, Send, User, Bot, Play, Pause, Mic, LogOut } from 'lucide-react';
// @ts-ignore
import MindMap from '@/components/MindMap';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { speakText, VoicePreferences } from '@/utils/voiceUtils';
import CoachVoiceSettings from '@/components/CoachVoiceSettings';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export default function ConceptPage() {
    const router = useRouter();
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null); // { summary, mermaid, steps, comparison }

    // Chat State
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatLoading, setChatLoading] = useState(false);

    // New Functionality State
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [speakingLineIdx, setSpeakingLineIdx] = useState<number | null>(null);
    const [micTarget, setMicTarget] = useState<'search' | 'chat'>('chat');
    const [voicePrefs, setVoicePrefs] = useState<VoicePreferences>({ gender: 'female', accent: 'IN' });
    const lastInputSource = useRef<'text' | 'voice'>('text');

    // Handle Speech Result based on target
    const handleSpeechEnd = (text: string) => {
        if (!text.trim()) return;

        if (micTarget === 'search') {
            setTopic(text);
            // We can't directly call handleSearch as it depends on state that might not be updated yet if we just set it
            // Actually, we can just call the API logic or triggers.
            // For safety, let's just set topic and let user click? 
            // User requested "auto send". 
            // But handleSearch reads 'topic' state.
            // Solution: passing text directly to handleSearch would be better, but handleSearch reads state.
            // I will modify handleSearch to accept optional override.

            // TRIGGERING SEARCH MANUALLY AFTER STATE UPDATE IS TRICKY IN REACT BATCHING
            // I will use a ref or just call the logic. 
            // Let's modify handleSearch to take an arg.
            handleSearch(undefined, text);
        } else {
            // Chat
            lastInputSource.current = 'voice';
            handleChatSend(undefined, text);
        }
    };

    const { isListening, startListening, stopListening } = useVoiceInput({
        onSpeechEnd: handleSpeechEnd,
        silenceTimeout: 2000
    });

    const chatEndRef = useRef<HTMLDivElement>(null);

    // 1. Fetch User (Auth)
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    if (data.user?.id) setCurrentUserId(data.user.id);
                }
            } catch (e) { }
        };
        fetchUser();
    }, []);

    // 2. Scroll Logic
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // 3. Speech Recognition Logic -> Replaced by Hook


    const handleSearch = async (e?: React.FormEvent, overrideTopic?: string) => {
        if (e) e.preventDefault();
        const query = overrideTopic || topic;
        if (!query.trim()) return;

        // Update state to match if override used
        if (overrideTopic) setTopic(overrideTopic);

        // ... Logic uses 'query' now instead of 'topic' state for the fetch
        setLoading(true);
        setData(null);
        setChatMessages([]);

        // Use user ID or fallback
        const userId = currentUserId || 'guest_user';

        try {
            // A. Search/Generate Concept
            const res = await fetch('/api/ai/concept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: query })
            });
            const response = await res.json();

            if (response.content) {
                setData(response.content);

                // B. Start Session Automagically
                try {
                    const sessionRes = await fetch('/api/coach/session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId,
                            mode: 'CONCEPT',
                            config: { topic: query }
                        })
                    });
                    if (sessionRes.ok) {
                        const sessData = await sessionRes.json();
                        setSessionId(sessData.session.id);
                    }
                } catch (err) { console.error("Session Start Failed", err); }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleEndSession = async () => {
        if (sessionId) {
            if (!confirm("Are you sure you want to exit? Chat history will be deleted.")) return;

            await fetch('/api/coach/session', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });
        }
        // Redirect or Reset
        router.push('/coach');
    };

    // Updated speakText
    const speakTextHandler = (text: string, idx: number) => {
        if (speakingLineIdx === idx) {
            setSpeakingLineIdx(null);
            window.speechSynthesis.cancel();
            return;
        }

        speakText(
            text,
            voicePrefs,
            () => setSpeakingLineIdx(idx),
            () => setSpeakingLineIdx(null)
        );
    };

    const handleChatSend = async (e?: React.FormEvent, overrideMsg?: string) => {
        if (e) e.preventDefault();
        const msg = overrideMsg || chatInput;

        if (!msg.trim() || chatLoading) return;

        if (overrideMsg) setChatInput(''); // Clear if auto-sent

        const userMsg = msg.trim();
        setChatInput('');
        const newMsgs = [...chatMessages, { role: 'user', content: userMsg } as ChatMessage];
        setChatMessages(newMsgs);
        setChatLoading(true);
        if (!overrideMsg) lastInputSource.current = 'text'; // Start text logic unless voice triggered it

        try {
            const res = await fetch('/api/ai/concept/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    topic: topic,
                    context: data,
                    history: chatMessages,
                    sessionId // Pass session ID for persistence
                })
            });

            const response = await res.json();
            const replyMsg = { role: 'assistant', content: response.reply } as ChatMessage;

            setChatMessages(prev => [...prev, replyMsg]);

            if (lastInputSource.current === 'voice') {
                speakTextHandler(response.reply, newMsgs.length + 1); // approximate index
            }

        } catch (error) {
            console.error(error);
        } finally {
            setChatLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header / Nav */}
            <div className="bg-slate-900 text-white p-4 sticky top-0 z-50 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={handleEndSession} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                        <ChevronLeft className="h-5 w-5" /> Back
                    </button>
                    <h1 className="font-bold text-lg hidden md:block">Visual Concept Coach</h1>
                </div>

                {sessionId && (
                    <button onClick={handleEndSession} className="flex items-center gap-2 text-rose-400 hover:text-rose-300 transition-colors text-sm font-bold">
                        <LogOut className="h-4 w-4" /> End Session
                    </button>
                )}
            </div>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">

                {/* Search Hero (Only show if no data) */}
                {!data && (
                    <div className="max-w-2xl mx-auto mt-20 text-center animate-in fade-in slide-in-from-bottom-8">
                        <div className="mb-10">
                            <div className="w-20 h-20 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Search className="h-10 w-10" />
                            </div>
                            <h2 className="text-4xl font-bold text-slate-900 mb-4">What do you want to visualize?</h2>
                            <p className="text-slate-500 text-lg">Enter a complex topic (e.g. "Photosynthesis"), and I'll break it down into diagrams, steps, and tables.</p>
                        </div>

                        <div className="relative shadow-2xl rounded-full bg-white transition-transform hover:scale-[1.02] flex items-center p-2">
                            {/* Mic for Search */}
                            <div className="relative">
                                {isListening && micTarget === 'search' && (
                                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                                )}
                                <button
                                    onClick={() => { setMicTarget('search'); startListening(); }}
                                    className={`p-4 rounded-full transition-all flex-shrink-0 relative z-10 ${isListening && micTarget === 'search' ? 'bg-red-500 text-white' : 'text-slate-400 hover:bg-slate-100'}`}
                                >
                                    <Mic className="h-6 w-6" />
                                </button>
                            </div>

                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                placeholder="e.g., Quantum Computing, French Revolution..."
                                className="w-full py-4 px-4 outline-none text-xl font-medium text-slate-700 placeholder:text-slate-400"
                            />

                            <button
                                onClick={() => handleSearch()}
                                disabled={loading || !topic}
                                className="aspect-square bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center h-14 w-14 flex-shrink-0"
                            >
                                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ArrowRight className="h-6 w-6" />}
                            </button>
                        </div>

                        {loading && (
                            <div className="mt-8 flex items-center justify-center gap-3 text-purple-600 font-medium animate-pulse">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Generating visualizations... This may take a moment.</span>
                            </div>
                        )}

                        {isListening && micTarget === 'search' && (
                            <div className="mt-4 text-slate-500 animate-pulse font-medium">Listening... speak your topic</div>
                        )}
                    </div>
                )}

                {data && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">

                        {/* 1. Summary Header */}
                        <div className="bg-white border-l-4 border-purple-500 p-6 rounded-r-xl shadow-sm">
                            <h2 className="text-3xl font-bold text-slate-900 capitalize mb-2">{topic}</h2>
                            <p className="text-slate-700 text-lg leading-relaxed">{data.summary}</p>
                        </div>

                        {/* 2. Process Flowchart */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                                <Search className="h-5 w-5 text-purple-500" />
                                <h3 className="font-semibold text-slate-900">Process Visualization</h3>
                            </div>
                            <div className="p-0">
                                <MindMap chart={data.mermaid || ''} />
                            </div>
                        </div>

                        {/* 3. Steps Breakdown */}
                        {data.steps && data.steps.length > 0 && (
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                    <Info className="h-6 w-6 text-purple-500" /> Key Components & Steps
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {data.steps.map((step: any, idx: number) => (
                                        <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-10 font-[900] text-6xl text-slate-300 group-hover:text-purple-200 transition-colors select-none">
                                                {idx + 1}
                                            </div>
                                            <div className="text-4xl mb-4">{step.icon}</div>
                                            <h4 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h4>
                                            <p className="text-slate-600 leading-relaxed bg-white/80 relative z-10">{step.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. Comparison Table */}
                        {data.comparison && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                                    <Table className="h-5 w-5 text-purple-500" />
                                    <h3 className="font-semibold text-slate-900">{data.comparison.title || 'Comparison'}</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50/50">
                                                {data.comparison.headers?.map((h: string, i: number) => (
                                                    <th key={i} className="px-6 py-4 font-bold text-slate-700 border-b border-slate-200 w-1/2">
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {data.comparison.rows?.map((row: string[], idx: number) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                    {row.map((cell, cellIdx) => (
                                                        <td key={cellIdx} className="px-6 py-4 text-slate-600">
                                                            {cell}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 5. Concept Chat Interface (Refactored) */}
                        <div className="mt-12 bg-white rounded-2xl shadow-xl border border-purple-100 overflow-hidden flex flex-col h-[600px]">
                            <div className="bg-purple-600 text-white px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="h-6 w-6" />
                                    <div>
                                        <h3 className="font-bold text-lg">Chat about {topic}</h3>
                                        <p className="text-purple-100 text-xs">Ask questions specifically related to this topic</p>
                                    </div>
                                </div>

                                {/* Speed Control */}
                                <select
                                    value={playbackSpeed}
                                    onChange={e => setPlaybackSpeed(parseFloat(e.target.value))}
                                    className="bg-purple-700 text-white border-none rounded-lg py-1 px-3 text-xs font-bold focus:ring-0 outline-none cursor-pointer"
                                >
                                    <option value="0.75">0.75x</option>
                                    <option value="1">1.0x</option>
                                    <option value="1.25">1.25x</option>
                                </select>

                                <div className="ml-2">
                                    <CoachVoiceSettings state={voicePrefs} setState={setVoicePrefs} />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 space-y-6">
                                {chatMessages.length === 0 && (
                                    <div className="text-center text-slate-400 mt-20">
                                        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                        <p>Have doubts? Ask anything about {topic}!</p>
                                    </div>
                                )}
                                {chatMessages.map((msg, idx) => (
                                    <div key={idx} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-purple-100 text-purple-600' : 'bg-white text-purple-600 border border-purple-100'
                                            }`}>
                                            {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                        </div>
                                        <div className={`max-w-[80%] space-y-1`}>
                                            <div className={`rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                                ? 'bg-purple-600 text-white rounded-tr-sm'
                                                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-sm'
                                                }`}>
                                                {msg.content}
                                            </div>

                                            {/* Play Button */}
                                            <button
                                                onClick={() => speakTextHandler(msg.content, idx)}
                                                className={`text-xs flex items-center gap-1 hover:underline ${msg.role === 'user' ? 'text-slate-400 ml-auto' : 'text-purple-500'
                                                    }`}
                                            >
                                                {speakingLineIdx === idx ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                                {speakingLineIdx === idx ? 'Stop' : 'Play'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {chatLoading && (
                                    <div className="flex gap-2 items-center text-slate-400 text-xs ml-12">
                                        <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Compact Single-Row UI */}
                            <div className="p-4 bg-white border-t border-slate-100">
                                <div className="relative flex items-center gap-2">
                                    {/* Mic */}
                                    {/* Mic */}
                                    <div className="relative">
                                        {isListening && micTarget === 'chat' && (
                                            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                                        )}
                                        <button
                                            onClick={() => {
                                                setMicTarget('chat');
                                                if (isListening && micTarget === 'chat') {
                                                    stopListening();
                                                } else {
                                                    window.speechSynthesis.cancel();
                                                    startListening();
                                                }
                                            }}
                                            className={`p-3 rounded-full transition-all relative z-10 ${isListening && micTarget === 'chat' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                        >
                                            <Mic className="h-5 w-5" />
                                        </button>
                                    </div>

                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                lastInputSource.current = 'text';
                                                handleChatSend();
                                            }
                                        }}
                                        placeholder={`Ask a question about ${topic}...`}
                                        className="flex-1 py-3 px-5 bg-slate-50 rounded-full border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all"
                                    />

                                    <button
                                        onClick={() => handleChatSend()}
                                        disabled={!chatInput.trim() || chatLoading}
                                        className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 transition-colors shadow-sm"
                                    >
                                        <Send className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </main>
        </div>
    );
}
