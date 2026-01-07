'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Flashcard {
    front: string;
    back: string;
}

interface FlashcardDeckProps {
    cards: Flashcard[];
}

export default function FlashcardDeck({ cards }: FlashcardDeckProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % cards.length);
        }, 150);
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
        }, 150);
    };

    const handleShuffle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsFlipped(false);
        // Simple shuffle for visual effect, ideally state should be lifted or deck shuffled once
        setCurrentIndex(Math.floor(Math.random() * cards.length));
    };

    if (!cards || cards.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <p>No flashcards available.</p>
            </div>
        );
    }

    const currentCard = cards[currentIndex];

    return (
        <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm aspect-[3/2] relative perspective-1000 cursor-pointer group" onClick={handleFlip}>
                <motion.div
                    className="w-full h-full relative preserve-3d transition-all duration-500"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* Front */}
                    <div className="absolute inset-0 backface-hidden bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col items-center justify-center p-6 text-center">
                        <span className="text-xs font-bold text-cyan-600 uppercase tracking-widest mb-4">Term</span>
                        <h3 className="text-xl font-bold text-slate-800">{currentCard.front}</h3>
                        <p className="absolute bottom-4 text-xs text-slate-400">Click to flip</p>
                    </div>

                    {/* Back */}
                    <div className="absolute inset-0 backface-hidden bg-slate-900 rounded-2xl shadow-xl flex flex-col items-center justify-center p-6 text-center" style={{ transform: 'rotateY(180deg)' }}>
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4">Definition</span>
                        <p className="text-lg font-medium text-white leading-relaxed">{currentCard.back}</p>
                    </div>
                </motion.div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6 mt-8">
                <button
                    onClick={handlePrev}
                    className="p-2 rounded-full bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="text-sm font-medium text-slate-500 font-mono">
                    {currentIndex + 1} / {cards.length}
                </div>

                <button
                    onClick={handleNext}
                    className="p-2 rounded-full bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>

            <button
                onClick={handleShuffle}
                className="mt-4 flex items-center gap-2 text-xs text-slate-400 hover:text-cyan-600 transition-colors"
            >
                <Shuffle className="h-3 w-3" /> Shuffle Logic
            </button>
        </div>
    );
}
