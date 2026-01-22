'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

type Message = {
    role: 'user' | 'assistant';
    content: string;
};

interface CourseChatWidgetProps {
    context: string;
    topicTitle?: string;
}

export default function CourseChatWidget({ context, topicTitle }: CourseChatWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMsg = inputValue.trim();
        setInputValue('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, { role: 'user', content: userMsg }],
                    context: context
                })
            });

            const data = await response.json();

            if (data.reply) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
            } else {
                throw new Error('No reply');
            }

        } catch (error) {
            console.error("Chat Error", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            <div
                className={cn(
                    "bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transition-all duration-300 origin-bottom-right mb-4 flex flex-col",
                    isOpen ? "w-[380px] h-[500px] opacity-100 scale-100" : "w-0 h-0 opacity-0 scale-95 pointer-events-none"
                )}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2 text-white">
                        <div className="p-1.5 bg-white/20 rounded-lg">
                            <Bot className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Course Assistant</h3>
                            <p className="text-xs text-blue-100 opacity-90 truncate max-w-[200px]">
                                {topicTitle ? `Topic: ${topicTitle}` : 'Ask about this topic'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {messages.length === 0 && (
                        <div className="text-center mt-12 px-6">
                            <div className="bg-white p-3 rounded-full inline-flex mb-4 shadow-sm">
                                <Sparkles className="h-6 w-6 text-cyan-500" />
                            </div>
                            <h4 className="font-bold text-slate-900 mb-2">How can I help?</h4>
                            <p className="text-sm text-slate-500">
                                I can answer questions specifically related to <span className="font-semibold text-slate-700">"{topicTitle || 'this topic'}"</span>.
                            </p>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={idx} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white",
                                msg.role === 'user' ? "bg-slate-700" : "bg-cyan-600"
                            )}>
                                {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                            </div>
                            <div className={cn(
                                "p-3 rounded-2xl max-w-[80%] text-sm shadow-sm",
                                msg.role === 'user'
                                    ? "bg-slate-800 text-white rounded-tr-none"
                                    : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                            )}>
                                {msg.role === 'assistant' ? (
                                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1">
                                        <ReactMarkdown>
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    msg.content
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center shrink-0 text-white animate-pulse">
                                <Bot className="h-4 w-4" />
                            </div>
                            <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200">
                                <div className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                    <div className="relative">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about this specific content..."
                            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:bg-white outline-none resize-none text-sm min-h-[50px] max-h-[100px]"
                            rows={1}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isLoading}
                            className="absolute right-2 bottom-2 p-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110",
                    isOpen ? "bg-slate-800 text-slate-300 rotate-90" : "bg-gradient-to-r from-cyan-600 to-blue-600 text-white animate-in zoom-in"
                )}
            >
                {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
            </button>
        </div>
    );
}
