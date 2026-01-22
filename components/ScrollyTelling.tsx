'use client';
import React, { useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { DynamicIcon } from './InfographicModules';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface ScrollyStep {
    title: string;
    text: string;
    imageKeyword: string;
    color: string;
}

interface ScrollyTellingProps {
    data: {
        title: string;
        steps: ScrollyStep[];
    };
}

const ScrollyStepTrigger = ({ step, index, onActive }: { step: ScrollyStep, index: number, onActive: (i: number) => void }) => {
    const ref = React.useRef(null);
    const isInView = useInView(ref, { margin: "-50% 0px -50% 0px" }); // Active when center of viewport

    useEffect(() => {
        if (isInView) {
            onActive(index);
        }
    }, [isInView, index, onActive]);

    return (
        <div ref={ref} className="min-h-screen flex items-center justify-start p-8">
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-slate-200 max-w-lg"
            >
                <div className={cn("w-12 h-12 rounded-full mb-4 flex items-center justify-center text-white text-xl font-bold", step.color)}>
                    {index + 1}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{step.title}</h3>
                <p className="text-lg text-slate-700 leading-relaxed">{step.text}</p>
            </motion.div>
        </div>
    );
};

const ScrollyTelling: React.FC<ScrollyTellingProps> = ({ data }) => {
    const [activeIndex, setActiveIndex] = useState(0);

    if (!data || !data.steps) return null;

    const activeStep = data.steps[activeIndex];

    return (
        <div className="relative w-full bg-slate-50 overflow-hidden rounded-xl border border-slate-200 h-[80vh]">

            {/* Sticky Visual Background / Right Panel */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Animated Background Color */}
                <motion.div
                    key={activeStep?.color}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className={cn("absolute inset-0", activeStep?.color)}
                />

                {/* Main Visual */}
                <div className="w-1/2 ml-auto h-full flex items-center justify-center p-12 relative">
                    <motion.div
                        key={activeIndex}
                        initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                        className="relative z-10"
                    >
                        <div className={cn("w-64 h-64 rounded-3xl shadow-2xl flex items-center justify-center text-whitetransition-colors duration-500", activeStep?.color)}>
                            <DynamicIcon name={activeStep?.imageKeyword || 'star'} className="w-32 h-32 text-white" />
                        </div>
                    </motion.div>

                    {/* Background Elements */}
                    <div className="absolute right-20 top-20 opacity-20 animate-pulse">
                        <div className={cn("w-96 h-96 rounded-full blur-3xl", activeStep?.color)}></div>
                    </div>
                </div>
            </div>

            {/* Scrollable Content (Overlaid on left) */}
            <div className="relative z-20 w-full h-full overflow-y-auto snap-y snap-mandatory scroll-smooth custom-scrollbar">

                {/* Intro Screen */}
                <div className="min-h-screen flex flex-col items-center justify-center text-center p-10 snap-start">
                    <h1 className="text-5xl font-black text-slate-900 mb-6 tracking-tight">{data.title}</h1>
                    <p className="text-xl text-slate-500 mb-12">A visual journey through this concept.</p>
                    <div className="animate-bounce">
                        <ChevronDown className="w-8 h-8 text-indigo-500" />
                    </div>
                </div>

                {/* Steps */}
                {data.steps.map((step, idx) => (
                    <div key={idx} className="snap-center">
                        <ScrollyStepTrigger step={step} index={idx} onActive={setActiveIndex} />
                    </div>
                ))}

                {/* Outro */}
                <div className="min-h-[50vh] flex items-center justify-center snap-center">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-slate-800">Journey Complete</h2>
                        <button className="mt-4 text-indigo-600 font-medium hover:underline">Restart Journey</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScrollyTelling;
