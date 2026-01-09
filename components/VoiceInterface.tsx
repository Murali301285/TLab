'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, StopCircle, Play } from 'lucide-react';
// @ts-ignore
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

interface VoiceInterfaceProps {
    onUserSpeak: (text: string) => void; // Callback when user finishes speaking
    isAiSpeaking: boolean;
}

export default function VoiceInterface({ onUserSpeak, isAiSpeaking }: VoiceInterfaceProps) {
    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
    } = useSpeechRecognition();

    const [manualInput, setManualInput] = useState('');

    // Auto-send logic: When user STOPS speaking for 2 seconds
    const silenceTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (listening) {
            if (silenceTimer.current) clearTimeout(silenceTimer.current);
            // reset timer on every transcript change
            silenceTimer.current = setTimeout(() => {
                if (transcript.trim().length > 0) {
                    handleStop();
                }
            }, 2000); // 2 seconds of silence = "Done Speaking"
        }
    }, [transcript, listening]);

    const handleStart = () => {
        resetTranscript();
        SpeechRecognition.startListening({ continuous: true });
    };

    const handleStop = () => {
        SpeechRecognition.stopListening();
        if (transcript.trim()) {
            onUserSpeak(transcript);
            resetTranscript();
        }
    };

    if (!browserSupportsSpeechRecognition) {
        return <div className="text-red-500">Browser does not support Speech API. Please use Chrome.</div>;
    }

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-lg mx-auto transform transition-all hover:scale-[1.01]">

            {/* Visualizer Area */}
            <div className={`w-40 h-40 rounded-full flex items-center justify-center mb-8 relative transition-all duration-500 ${listening ? 'bg-cyan-500/10' : isAiSpeaking ? 'bg-rose-500/10' : 'bg-slate-800'}`}>
                {/* Rings Animation */}
                {listening && (
                    <>
                        <div className="absolute w-full h-full rounded-full border-4 border-cyan-500/30 animate-ping opacity-75"></div>
                        <div className="absolute w-3/4 h-3/4 rounded-full border-4 border-cyan-400/50 animate-pulse"></div>
                    </>
                )}

                {isAiSpeaking && (
                    <>
                        <div className="absolute w-full h-full rounded-full bg-rose-500/20 animate-pulse"></div>
                        <div className="absolute w-5/6 h-5/6 rounded-full border-2 border-rose-400/50 animate-bounce"></div>
                    </>
                )}

                {/* Icon */}
                <div className="z-10">
                    {listening ? <Mic className="h-16 w-16 text-cyan-400" /> :
                        isAiSpeaking ? <Volume2 className="h-16 w-16 text-rose-400 animate-pulse" /> :
                            <MicOff className="h-12 w-12 text-slate-600" />}
                </div>
            </div>

            {/* Status Text */}
            <div className="h-8 mb-6 text-center">
                {listening ? (
                    <span className="text-cyan-400 font-medium animate-pulse">Listening... Explain your point.</span>
                ) : isAiSpeaking ? (
                    <span className="text-rose-400 font-medium">Character is replying...</span>
                ) : (
                    <span className="text-slate-400">Tap microphone to start</span>
                )}
            </div>

            {/* Live Transcript Preview */}
            <div className="w-full bg-black/30 rounded-lg p-4 mb-8 min-h-[80px] text-center border border-white/5">
                <p className="text-slate-300 italic text-lg">{transcript || "..."}</p>
            </div>

            {/* Controls */}
            <div className="flex gap-4">
                {!listening && (
                    <button
                        onClick={handleStart}
                        disabled={isAiSpeaking}
                        className={`px-8 py-4 rounded-full font-bold text-lg flex items-center gap-2 shadow-lg hover:shadow-cyan-500/20 transition-all
                        ${isAiSpeaking ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:scale-105'}`}
                    >
                        <Mic className="h-5 w-5" /> Start Speaking
                    </button>
                )}

                {listening && (
                    <button
                        onClick={handleStop}
                        className="px-8 py-4 bg-red-500/20 border border-red-500 text-red-400 rounded-full font-bold text-lg flex items-center gap-2 hover:bg-red-500/30 transition-all hover:scale-105"
                    >
                        <StopCircle className="h-5 w-5" /> Stop & Send
                    </button>
                )}
            </div>

        </div>
    );
}
