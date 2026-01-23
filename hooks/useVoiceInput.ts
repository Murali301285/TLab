import { useState, useEffect, useRef, useCallback } from 'react';

interface UseVoiceInputProps {
    onSpeechEnd: (text: string) => void;
    silenceTimeout?: number; // ms to wait before auto-sending
}

export function useVoiceInput({ onSpeechEnd, silenceTimeout = 2000 }: UseVoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const onSpeechEndRef = useRef(onSpeechEnd);
    useEffect(() => {
        onSpeechEndRef.current = onSpeechEnd;
    }, [onSpeechEnd]);

    // Initialize Recognition
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true; // Keep listening to detect silence appropriately
            recognition.interimResults = true;
            recognition.lang = 'en-US'; // Default, can be improved to use settings

            recognition.onstart = () => {
                setIsListening(true);
                setError(null);
            };

            recognition.onend = () => {
                // If it stops but we didn't intend to, we might want to restart or just set state
                // But generally for a "Command" style, stopping is fine.
                // If we want continuous dictation until silence, we handle it below.
                setIsListening(false);
            };

            recognition.onerror = (event: any) => {
                if (event.error === 'aborted') {
                    // Ignore manual stop error
                    return;
                }
                console.error("Speech Error", event.error);
                if (event.error === 'not-allowed') {
                    setError("Microphone blocked. Check HTTPS/Browser settings.");
                }
                setIsListening(false);
            };

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                const currentText = finalTranscript || interimTranscript;
                setTranscript(currentText);

                // Reset Silence Timer on any input
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

                if (currentText.trim()) {
                    silenceTimerRef.current = setTimeout(() => {
                        recognition.stop();
                        if (onSpeechEndRef.current) {
                            onSpeechEndRef.current(currentText);
                        }
                    }, silenceTimeout);
                }
            };

            recognitionRef.current = recognition;
        } else {
            setError("Browser does not support Speech API.");
        }

        return () => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            if (recognitionRef.current) recognitionRef.current.stop();
        };
    }, []); // Empty dependency ensures recognition is initialized once and persists

    const startListening = useCallback(() => {
        if (!recognitionRef.current) {
            setError("Speech API not initialized.");
            return;
        }
        try {
            setTranscript('');
            recognitionRef.current.start();
        } catch (e: any) {
            if (e.name === 'InvalidStateError' || e.message?.includes('already started')) {
                // Ignore if already started
                return;
            }
            console.error("Failed to start", e);
        }
    }, []);

    const stopListening = useCallback(() => {
        setIsListening(false); // Immediate UI feedback
        if (recognitionRef.current) recognitionRef.current.stop();
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }, []);

    return {
        isListening,
        transcript,
        startListening,
        stopListening,
        error,
        hasBrowserSupport: !!recognitionRef.current
    };
}
