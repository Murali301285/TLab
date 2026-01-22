import React from 'react';
import { VoicePreferences } from '@/utils/voiceUtils';

interface Props {
    state: VoicePreferences;
    setState: (s: VoicePreferences) => void;
}

export default function CoachVoiceSettings({ state, setState }: Props) {
    // Composite key for the dropdown value
    const currentValue = `${state.accent}-${state.gender}`;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const [accent, gender] = e.target.value.split('-');
        setState({
            accent: accent as any,
            gender: gender as any
        });
    };

    return (
        <select
            value={currentValue}
            onChange={handleChange}
            className="bg-slate-100 text-slate-800 border-none rounded-lg py-1 px-3 text-xs font-bold focus:ring-0 outline-none cursor-pointer h-8"
            title="Select AI Voice"
        >
            <optgroup label="Indian English">
                <option value="IN-female">Indian Female</option>
                <option value="IN-male">Indian Male</option>
            </optgroup>
            <optgroup label="US English">
                <option value="US-female">American Female</option>
                <option value="US-male">American Male</option>
            </optgroup>
            <optgroup label="British English">
                <option value="UK-female">British Female</option>
                <option value="UK-male">British Male</option>
            </optgroup>
        </select>
    );
}
