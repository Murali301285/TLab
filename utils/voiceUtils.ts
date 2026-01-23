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

export const detectBestVoice = (prefs: VoicePreferences, textLanguage?: string): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    // 1. Language-Specific Matching (Primary Goal)
    // If a specific text language is requested (e.g., Hindi), we MUST prioritize a voice that speaks that language.
    // Otherwise, an English voice reading Hindi sounds like gibberish.
    if (textLanguage) {
        const targetLocale = getLocaleForLanguage(textLanguage);

        // Try strict match (Lang + Gender)
        // Note: For regional languages, gender might be less available, so we fallback aggressively.
        let langBest = voices.find(v =>
            v.lang === targetLocale &&
            v.name.toLowerCase().includes(prefs.gender)
        );

        // Try loose match (Lang only)
        if (!langBest) {
            langBest = voices.find(v => v.lang === targetLocale);
        }

        // Try same language family (hi-IN matched against hi)
        if (!langBest) {
            langBest = voices.find(v => v.lang.startsWith(targetLocale.split('-')[0]));
        }

        if (langBest) return langBest;
        // If we absolutely can't find a Hindi voice, we fall through to the Accent logic, 
        // which might at least give us an Indian accent english voice (better than US).
    }

    // 2. Accent/Region Matching (Fallback / Default)
    const localeMap = {
        'US': 'en-US',
        'IN': 'en-IN',
        'UK': 'en-GB'
    };
    const targetAccent = localeMap[prefs.accent];

    // Gender heuristics
    const femaleKeywords = ['female', 'girl', 'woman', 'zira', 'samantha', 'kalpana', 'heera', 'prabha'];
    const maleKeywords = ['male', 'boy', 'man', 'david', 'mark', 'ravi', 'valluvar'];

    // Priority 1: Exact Match (Accent + Gender)
    let best = voices.find(v =>
        v.lang === targetAccent &&
        v.name.toLowerCase().includes(prefs.gender)
    );

    // Priority 2: Just Accent + Gender Keyword Match
    if (!best) {
        const keywords = prefs.gender === 'female' ? femaleKeywords : maleKeywords;

        best = voices.find(v =>
            v.lang === targetAccent &&
            keywords.some(k => v.name.toLowerCase().includes(k))
        );
    }

    // Priority 3: Just Lang (en-IN)
    if (!best) {
        // If we want Indian English but didn't find a female voice (likely only Ravi exists),
        // Try looking for 'hi-IN' (Hindi) voices. They often speak English with a strong Indian accent.
        // And 'Google Hindi' is usually Female.
        if (targetAccent === 'en-IN' && prefs.gender === 'female') {
            best = voices.find(v => v.lang === 'hi-IN' && !maleKeywords.some(k => v.name.toLowerCase().includes(k)));
        }

        // If still not found, just take any voice in the target accent
        if (!best) {
            best = voices.find(v => v.lang === targetAccent);
        }
    }

    // Priority 4: Fallback to Google US English (Standard high quality)
    if (!best) {
        best = voices.find(v => v.name.includes('Google US English'));
    }

    return best || voices[0];
};

// Helper to clean text for speech
const cleanTextForSpeech = (text: string): string => {
    return text
        // Remove Markdown bold/italic markers (*, _)
        .replace(/[*_~`]/g, '')
        // Remove headers signs (#)
        .replace(/#/g, '')
        // Remove arrows like -> or =>
        .replace(/[-=]>/g, '')
        // Remove standard dashes that might be read as "dash" or "minus" depending on context,
        // but often we want a pause. Replacing with comma or space is safer.
        // Actually, let's just keep single dashes but remove long ones or specific symbols.
        //.replace(/-/g, ' ') 
        // Remove brackets [] () if they contain non-speakable ref? No, usually content inside is good.
        // Remove strictly non-alphanumeric symbols that aren't punctuation
        // Keep: letters, numbers, spaces, ., ,, ?, !, ', ", -, :, ;
        // We can just strip the specific markdown chars requested.
        .replace(/\*\*/g, '') // double stars
        .replace(/__/g, '')   // double underscores
        .trim();
};

export const speakText = (text: string, prefs: VoicePreferences, onStart?: () => void, onEnd?: () => void, textLanguage?: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    // Clean the text before speaking
    const spokenText = cleanTextForSpeech(text);

    const utterance = new SpeechSynthesisUtterance(spokenText);
    const voice = detectBestVoice(prefs, textLanguage);
    if (voice) {
        utterance.voice = voice;
        // console.log("Speaking with voice:", voice.name, "Lang:", voice.lang); // Debug
    }

    // Adjust rate for Indian accent sometimes needs to be slower/faster? Default is 1.
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    if (onStart) utterance.onstart = onStart;
    if (onEnd) utterance.onend = onEnd;

    window.speechSynthesis.speak(utterance);
    return utterance; // Return in case we want to cancel later
};
