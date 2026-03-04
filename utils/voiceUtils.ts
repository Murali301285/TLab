export interface VoicePreferences {
    gender: 'male' | 'female';
    accent: 'US' | 'IN' | 'UK';
}

const LANGUAGE_LOCALE_MAP: Record<string, string> = {
    // Regional
    'Hindi': 'hi-IN',
    'Tamil': 'ta-IN',
    'Telugu': 'te-IN',
    'Kannada': 'kn-IN',
    'Malayalam': 'ml-IN',
    'Marathi': 'mr-IN',
    'Gujarati': 'gu-IN',
    'Bengali': 'bn-IN',

    // International
    'Spanish': 'es-ES',
    'French': 'fr-FR',
    'German': 'de-DE',
    'Japanese': 'ja-JP',
    'Korean': 'ko-KR',
    'Mandarin': 'zh-CN',
    'English': 'en-US'
};

export const getLocaleForLanguage = (languageName: string): string => {
    return LANGUAGE_LOCALE_MAP[languageName] || 'en-US';
};

export const SARVAM_SUPPORTED_LANGS = [
    'hi-IN', 'bn-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'od-IN', 'pa-IN', 'ta-IN', 'te-IN', 'gu-IN', 'en-IN'
];

let currentAudioNode: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;

const base64ToBlobUrl = (base64: string, type: string) => {
    const binStr = atob(base64);
    const len = binStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binStr.charCodeAt(i);
    }

    // Attempt to fix WAV header size to enable Chrome seeking
    if (len >= 44 &&
        bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 && // "RIFF"
        bytes[8] === 87 && bytes[9] === 65 && bytes[10] === 86 && bytes[11] === 69) // "WAVE"
    {
        const dataView = new DataView(bytes.buffer);
        // Fix overall file size
        dataView.setUint32(4, len - 8, true);

        // Find "data" chunk and fix its size
        let offset = 12;
        while (offset < len - 8) {
            const chunkId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
            if (chunkId === 'data') {
                dataView.setUint32(offset + 4, len - offset - 8, true);
                break;
            }
            const chunkSize = dataView.getUint32(offset + 4, true);
            offset += 8 + chunkSize;
        }
    }

    const blob = new Blob([bytes], { type });
    return URL.createObjectURL(blob);
};

export const seekAudio = (seconds: number) => {
    if (currentAudioNode) {
        // HTMLAudioElement natively clamps out-of-bounds currentTime assignments.
        // Reading .duration on base64 src often yields NaN or Infinity, breaking Math.min
        currentAudioNode.currentTime = Math.max(0, currentAudioNode.currentTime + seconds);
    } else if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
        // Browser SpeechSynthesis API does NOT support seeking natively.
        console.warn("Seeking is not supported for browser native SpeechSynthesis.");
        // We could implement simulated seeking if really needed, but it breaks the queue.
    }
};

export const cancelSpeech = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    if (currentAudioNode) {
        currentAudioNode.pause();
        currentAudioNode.currentTime = 0;
        currentAudioNode = null;
    }
    if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
        currentAudioUrl = null;
    }
};

export const cleanTextForSpeech = (text: string | undefined | null): string => {
    if (!text) return '';
    return text
        // Remove URLs
        .replace(/https?:\/\/[^\s]+/g, '')
        // Remove markdown formatting and specific symbols (asterisks, hashes, arrows, slashes, backslashes)
        .replace(/[*_~`#/\\]/g, ' ')
        // Remove brackets and their contents if they are just symbols, or just remove the brackets
        .replace(/[()[\]{}]/g, ' ')
        // General cleanup for weird arrow combinations
        .replace(/[-=]>/g, '')
        // Strip out emojis strictly using the Unicode Property Escapes (requires 'u' flag)
        .replace(/\p{Emoji_Presentation}/gu, '')
        .replace(/\p{Emoji}\uFE0F/gu, '')
        // Remove all numbers/digits
        .replace(/\d+/g, '')
        // Remove extra spaces caused by replacement
        .replace(/\s{2,}/g, ' ')
        .trim();
};

export const speakText = async (
    text: string,
    prefs: VoicePreferences,
    onStart?: () => void,
    onEnd?: () => void,
    textLanguage?: string,
    rate: number = 1.0,
    onLoading?: (isLoading: boolean) => void,
    onProgress?: (progress: number) => void
) => {
    cancelSpeech();

    const spokenText = cleanTextForSpeech(text);
    if (!spokenText.trim()) {
        if (onEnd) onEnd();
        return;
    }

    const locale = textLanguage ? getLocaleForLanguage(textLanguage) : '';

    // Route to Sarvam API if it is an Indian language and Indian accent is requested
    if (locale && SARVAM_SUPPORTED_LANGS.includes(locale) && prefs.accent === 'IN') {
        try {
            if (onLoading) onLoading(true);

            const req = await fetch('/api/ai/language/speech', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: spokenText,
                    languageCode: locale,
                    gender: prefs.gender
                })
            });

            if (!req.ok) throw new Error('TTS Backend failed');

            const data = await req.json();
            if (onLoading) onLoading(false);

            if (data.audio) {
                // Some API responses denote wav or mp3 differently, assuming wav for Sarvam 8000hz defaults
                const url = base64ToBlobUrl(data.audio, 'audio/wav');
                currentAudioUrl = url;

                const audio = new Audio(url);
                audio.playbackRate = rate;
                currentAudioNode = audio;

                audio.onended = () => {
                    currentAudioNode = null;
                    if (currentAudioUrl) {
                        URL.revokeObjectURL(currentAudioUrl);
                        currentAudioUrl = null;
                    }
                    if (onEnd) onEnd();
                };

                audio.onerror = () => {
                    currentAudioNode = null;
                    if (currentAudioUrl) {
                        URL.revokeObjectURL(currentAudioUrl);
                        currentAudioUrl = null;
                    }
                    if (onEnd) onEnd();
                };

                if (onProgress) {
                    audio.ontimeupdate = () => {
                        if (audio.duration && audio.duration !== Infinity) {
                            onProgress(audio.currentTime / audio.duration);
                        }
                    };
                }

                if (onStart) onStart();
                await audio.play();
                return; // successfully handled by Sarvam TTS
            }
        } catch (e) {
            if (onLoading) onLoading(false);
            console.error('Sarvam TTS Error, falling back to browser synthesis...', e);
        }
    }

    if (typeof window === 'undefined' || !window.speechSynthesis) {
        if (onEnd) onEnd();
        return;
    }




    const utterance = new SpeechSynthesisUtterance(spokenText);
    const voice = detectBestVoice(prefs, textLanguage);
    if (voice) {
        utterance.voice = voice;
    }

    utterance.rate = rate;
    utterance.pitch = 1.0;

    if (onStart) utterance.onstart = onStart;
    if (onEnd) utterance.onend = onEnd;

    if (onProgress) {
        utterance.onboundary = (event) => {
            if (spokenText.length > 0) {
                // Normalize progress based on char index
                onProgress(event.charIndex / spokenText.length);
            }
        };
    }

    window.speechSynthesis.speak(utterance);
    return utterance;
};

export const detectBestVoice = (prefs: VoicePreferences, textLanguage?: string): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    if (textLanguage) {
        const targetLocale = getLocaleForLanguage(textLanguage);

        let langBest = voices.find(v =>
            v.lang === targetLocale &&
            v.name.toLowerCase().includes(prefs.gender)
        );

        if (!langBest) {
            langBest = voices.find(v => v.lang === targetLocale);
        }

        if (!langBest) {
            langBest = voices.find(v => v.lang.startsWith(targetLocale.split('-')[0]));
        }

        if (langBest) return langBest;
    }

    const localeMap = {
        'US': 'en-US',
        'IN': 'en-IN',
        'UK': 'en-GB'
    };
    const targetAccent = localeMap[prefs.accent];

    const femaleKeywords = ['female', 'girl', 'woman', 'zira', 'samantha', 'kalpana', 'heera', 'prabha'];
    const maleKeywords = ['male', 'boy', 'man', 'david', 'mark', 'ravi', 'valluvar'];

    let best = voices.find(v =>
        v.lang === targetAccent &&
        v.name.toLowerCase().includes(prefs.gender)
    );

    if (!best) {
        const keywords = prefs.gender === 'female' ? femaleKeywords : maleKeywords;

        best = voices.find(v =>
            v.lang === targetAccent &&
            keywords.some(k => v.name.toLowerCase().includes(k))
        );
    }

    if (!best) {
        if (targetAccent === 'en-IN' && prefs.gender === 'female') {
            best = voices.find(v => v.lang === 'hi-IN' && !maleKeywords.some(k => v.name.toLowerCase().includes(k)));
        }

        if (!best) {
            best = voices.find(v => v.lang === targetAccent);
        }
    }

    if (!best) {
        best = voices.find(v => v.name.includes('Google US English'));
    }

    return best || voices[0];
};
