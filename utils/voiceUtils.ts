export interface VoicePreferences {
    gender: 'male' | 'female';
    accent: 'US' | 'IN' | 'UK';
}

export const detectBestVoice = (prefs: VoicePreferences): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    // Filters
    const localeMap = {
        'US': 'en-US',
        'IN': 'en-IN',
        'UK': 'en-GB'
    };
    const targetLang = localeMap[prefs.accent];

    // Priority 1: Exact Match (Lang + Gender)
    // Note: 'gender' is hard to detect standardly, usually in name ("Google US English Female", "Microsoft David", etc)
    let best = voices.find(v =>
        v.lang === targetLang &&
        v.name.toLowerCase().includes(prefs.gender)
    );

    // Priority 2: Just Lang (Ignore gender if strictly not found, but try heuristic)
    if (!best) {
        // Common heuristics for gender in default names
        const femaleKeywords = ['female', 'girl', 'woman', 'veena', 'zira', 'samantha'];
        const maleKeywords = ['male', 'boy', 'man', 'david', 'mark', 'ravi'];

        const keywords = prefs.gender === 'female' ? femaleKeywords : maleKeywords;

        best = voices.find(v =>
            v.lang === targetLang &&
            keywords.some(k => v.name.toLowerCase().includes(k))
        );
    }

    // Priority 3: Just Lang
    if (!best) {
        best = voices.find(v => v.lang === targetLang || v.lang.startsWith(targetLang.split('-')[0]));
    }

    // Priority 4: Fallback to Google US English (Standard high quality)
    if (!best) {
        best = voices.find(v => v.name.includes('Google US English'));
    }

    return best || voices[0];
};

export const speakText = (text: string, prefs: VoicePreferences, onStart?: () => void, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = detectBestVoice(prefs);
    if (voice) utterance.voice = voice;

    // Adjust rate for Indian accent sometimes needs to be slower/faster? Default is 1.
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    if (onStart) utterance.onstart = onStart;
    if (onEnd) utterance.onend = onEnd;

    window.speechSynthesis.speak(utterance);
    return utterance; // Return in case we want to cancel later
};
