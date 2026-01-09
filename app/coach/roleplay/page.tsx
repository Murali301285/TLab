'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, MessageSquare, Briefcase, Zap, User } from 'lucide-react';
// @ts-ignore
import VoiceInterface from '@/components/VoiceInterface';
// @ts-ignore
import 'regenerator-runtime/runtime';

type Message = {
    role: 'user' | 'system' | 'assistant';
    content: string;
};

const SCENARIOS = [
    { id: 'negotiation', title: 'Salary Negotiation', icon: <Briefcase className="h-6 w-6" />, desc: 'Convince a tough boss to give you a raise.' },
    { id: 'conflict', title: 'Team Conflict', icon: <Zap className="h-6 w-6" />, desc: 'Resolve a heated dispute with a colleague.' },
    { id: 'interview', title: 'Job Interview', icon: <User className="h-6 w-6" />, desc: 'Answer tricky behavioral questions.' }
];

export default function RoleplayPage() {
    const [scenario, setScenario] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [error, setError] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    useEffect(scrollToBottom, [messages]);

    const handleScenarioSelect = (id: string) => {
        setScenario(id);
        setMessages([]);
        // Initial AI greeting is handled by the user speaking first, or we could trigger one.
        // Let's let the user start: "Hello, can we talk?"
    };

    const speakText = (text: string) => {
        if (!window.speechSynthesis) return;

        // Cancel any current speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Try to find a good voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google US English')) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => setIsAiSpeaking(true);
        utterance.onend = () => setIsAiSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    const handleUserSpeak = async (text: string) => {
        // 1. Add User Message
        const newMessages = [...messages, { role: 'user', content: text } as Message];
        setMessages(newMessages);

        try {
            // 2. Call API
            const res = await fetch('/api/ai/roleplay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages, scenario })
            });
            const data = await res.json();

            if (!data.reply) throw new Error('No reply from AI');

            // 3. Add AI Message
            const assistantMsg = { role: 'assistant', content: data.reply } as Message;
            setMessages(prev => [...prev, assistantMsg]);

            // 4. Speak it
            speakText(data.reply);

        } catch (err) {
            console.error(err);
            setError('Failed to get AI response. Please try again.');
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {SCENARIOS.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => handleScenarioSelect(s.id)}
                                className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all border border-slate-200 text-left group"
                            >
                                <div className="h-14 w-14 bg-slate-50 rounded-xl flex items-center justify-center mb-6 text-slate-700 group-hover:bg-cyan-50 group-hover:text-cyan-600 transition-colors">
                                    {s.icon}
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{s.title}</h3>
                                <p className="text-slate-500">{s.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col">
            {/* Header */}
            <div className="bg-slate-800/50 backdrop-blur border-b border-white/10 p-4 sticky top-0 z-10 flex items-center justify-between">
                <button onClick={() => setScenario(null)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft className="h-5 w-5" /> End Session
                </button>
                <div className="font-bold text-lg text-cyan-400 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></span>
                    {SCENARIOS.find(s => s.id === scenario)?.title}
                </div>
                <div className="w-20"></div> {/* Spacer */}
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-3xl mx-auto w-full pb-60">
                {messages.length === 0 && (
                    <div className="text-center text-slate-500 mt-20">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Tap the microphone to start the conversation.</p>
                        <p className="text-sm mt-2">"Hello, I'd like to discuss my performance..."</p>
                    </div>
                )}

                {messages.map((m, idx) => (
                    <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-6 py-4 text-lg ${m.role === 'user'
                                ? 'bg-cyan-600 text-white rounded-br-none'
                                : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                            }`}>
                            {m.content}
                        </div>
                    </div>
                ))}

                {error && <div className="text-center text-red-500 bg-red-900/20 p-2 rounded-lg">{error}</div>}

                <div ref={messagesEndRef} />
            </div>

            {/* Voice Controls (Fixed Bottom) */}
            <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-slate-900 via-slate-900 to-transparent pt-20 pb-8 z-20">
                <VoiceInterface onUserSpeak={handleUserSpeak} isAiSpeaking={isAiSpeaking} />
            </div>
        </div>
    );
}
