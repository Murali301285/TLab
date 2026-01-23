# 🚀 AI Content Generation Feature - Complete Implementation Guide

## 📋 Overview
This document contains all the code and instructions to implement the AI Content Generation feature with voice input, beautiful formatting, and download capabilities in the Admin Upload page.

---

## 🎯 Features Implemented

1. **AI Cover Image Generation** with theme selection and regeneration
2. **AI Content Assistant** with chat interface and voice input
3. **Voice Recognition** with auto-send on silence detection
4. **Beautiful Markdown Formatting** with professional styling
5. **Download as Markdown** functionality
6. **Review Screen** with approve/edit workflow

---

## 📁 Files to Modify

### 1. **`app/actions/aiMock.ts`** (Create New File)

```typescript
'use server';

// Mock Server Actions for AI Features

export async function generateCoverImageAction(data: { title: string; theme: string }) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Return different colors based on theme for the placeholder
    const themeColors: Record<string, string> = {
        'Modern Blue': '0047AB',
        'Vibrant': 'FF5733',
        'Dark Mode': '1A1A2E',
        'Minimalist': 'F5F5F5',
        'Corporate': '2C3E50'
    };

    const color = themeColors[data.theme] || '0047AB';
    const textColor = data.theme === 'Minimalist' ? '000000' : 'FFFFFF';
    
    // Smart title formatting: Add line breaks for long titles
    // Split title into words and create lines that fit well
    const words = data.title.split(' ');
    let lines: string[] = [];
    let currentLine = '';
    
    words.forEach((word) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        // If line would be too long (>20 chars), break to new line
        if (testLine.length > 20 && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    });
    if (currentLine) lines.push(currentLine);
    
    // Join with line break encoding (%0A for URL)
    const formattedTitle = lines.join('%0A');
    const url = `https://placehold.co/800x450/${color}/${textColor}/png?text=${encodeURIComponent(formattedTitle)}`;

    // Return "generated" image URL
    return {
        success: true,
        url: url,
        revisedPrompt: `A high-quality 3D render of a course cover with title "${data.title}" in style ${data.theme}`
    };
}

export async function generateContentSummaryAction(content: any) {
    await new Promise(resolve => setTimeout(resolve, 2500));

    return {
        success: true,
        summary: `
## Executive Summary 🚀

This document covers the essential aspects of **${content.title || 'the topic'}**, designed to maximize learning efficiency.

### Key Takeaways
*   **Core Concepts**: Comprehensive breakdown of fundamental principles.
*   **Actionable Insights**: Direct strategies you can apply immediately.
*   **Compliance Framework**: Aligns with global standards and best practices.

### Detailed Analysis
The content is structured to provide a deep dive into the subject matter, using real-world examples and case studies.

> "Knowledge is power, but executed knowledge is impact."

**Next Steps**: Review the attached materials and complete the assessment module.
        `.trim()
    };
}

export async function aiAssistantChatAction(messages: any[], contextType: string) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const userMessage = messages[messages.length - 1].content.toLowerCase();

    // Guardrails
    const outOfContextKeywords = ['recipe', 'cake', 'politics', 'movie', 'song', 'joke'];
    if (outOfContextKeywords.some(kw => userMessage.includes(kw))) {
        return {
            success: false,
            message: "⚠️ I am designed to assist with professional learning content and policy documentation. Please keep the context relevant to the workplace.",
            isWarning: true
        };
    }

    let response = "";
    
    // First message - Initial greeting
    if (messages.length === 1) {
        if (contextType === 'policy') {
            response = "I can help you draft a comprehensive policy document. What type of policy do you need? (e.g., NDA, Attendance, Code of Conduct, Data Privacy)";
        } else if (contextType === 'document') {
            response = "I can create detailed documentation for you. Please describe what you need - for example:\n• User Manual\n• Training Guide\n• Technical Documentation\n• Process Handbook";
        } else {
            response = "I can generate detailed learning content. What topic would you like to cover? (e.g., Productivity, Leadership, Sales Techniques)";
        }
        return { success: true, message: response };
    }

    // Detect if user is requesting actual content generation
    const isGenerationRequest = userMessage.includes('prepare') || 
                                userMessage.includes('create') || 
                                userMessage.includes('generate') ||
                                userMessage.includes('write') ||
                                userMessage.includes('manual') ||
                                userMessage.includes('policy') ||
                                userMessage.includes('document');

    if (isGenerationRequest && messages.length > 1) {
        // Extract key details from user message
        const pageMatch = userMessage.match(/(\d+)\s*(page|pg)/);
        const pages = pageMatch ? parseInt(pageMatch[1]) : 3;
        
        // Generate actual content based on context
        if (contextType === 'document' && userMessage.includes('user manual')) {
            response = `# User Manual for Product

## Table of Contents
1. Introduction
2. Getting Started
3. Key Features
4. Troubleshooting
5. Support & Contact

---

## 1. Introduction

Welcome to the comprehensive user manual for our product. This guide is designed to help you maximize the value and efficiency of your experience.

### Purpose
This manual provides step-by-step instructions, best practices, and troubleshooting guidance to ensure seamless operation.

### Who Should Use This Manual
- New users getting started
- Experienced users seeking advanced features
- Support teams assisting customers

---

## 2. Getting Started

### Initial Setup
1. **Unpack the product** carefully and verify all components
2. **Connect to power source** using the provided adapter
3. **Follow the on-screen setup wizard** to configure basic settings
4. **Create your user account** with a secure password

### System Requirements
- Operating System: Windows 10/11, macOS 12+, or Linux
- RAM: Minimum 4GB (8GB recommended)
- Storage: 500MB available space
- Internet connection for cloud features

---

## 3. Key Features

### Feature 1: Dashboard Overview
The main dashboard provides real-time insights and quick access to all major functions.

**How to Use:**
- Navigate to the home screen
- Click on any widget to expand details
- Customize layout by dragging and dropping panels

### Feature 2: Advanced Analytics
Track performance metrics and generate detailed reports.

**Benefits:**
- Data-driven decision making
- Automated report generation
- Export to PDF, Excel, or CSV

### Feature 3: Collaboration Tools
Work seamlessly with your team through integrated communication features.

**Capabilities:**
- Real-time chat and video calls
- Shared workspaces
- Task assignment and tracking

---

## 4. Troubleshooting

### Common Issues

**Issue: Application won't start**
- Solution: Check system requirements and restart your device
- Verify installation integrity
- Contact support if issue persists

**Issue: Slow performance**
- Solution: Clear cache and temporary files
- Close unnecessary background applications
- Update to the latest version

**Issue: Login problems**
- Solution: Reset password using "Forgot Password" link
- Verify internet connection
- Check if account is active

---

## 5. Support & Contact

### Getting Help
- **Email:** support@company.com
- **Phone:** 1-800-SUPPORT (24/7)
- **Live Chat:** Available on our website
- **Knowledge Base:** help.company.com

### Feedback
We value your input! Share suggestions at feedback@company.com

---

*Document Version: 1.0 | Last Updated: ${new Date().toLocaleDateString()}*`;

        } else if (contextType === 'policy') {
            response = `# Non-Disclosure Agreement (NDA) Policy

## Document Control
- **Policy Number:** POL-2025-001
- **Effective Date:** ${new Date().toLocaleDateString()}
- **Review Date:** Annual
- **Owner:** Legal & Compliance Department

---

## 1. Purpose

This Non-Disclosure Agreement (NDA) Policy establishes the framework for protecting confidential and proprietary information of the organization and its stakeholders.

### Objectives
- Safeguard sensitive business information
- Define responsibilities of all parties
- Establish legal recourse for breaches
- Maintain competitive advantage

---

## 2. Scope

This policy applies to:
- All employees (full-time, part-time, contractors)
- Third-party vendors and partners
- Consultants and advisors
- Board members and executives

---

## 3. Definitions

### Confidential Information
Any data or information that:
- Is not publicly available
- Provides competitive advantage
- Is marked as "Confidential" or "Proprietary"
- Includes but not limited to:
  - Trade secrets
  - Customer data
  - Financial information
  - Product roadmaps
  - Business strategies

### Disclosing Party
The entity sharing confidential information

### Receiving Party
The entity receiving confidential information

---

## 4. Obligations

### 4.1 Receiving Party Responsibilities
The Receiving Party must:
- **Maintain confidentiality** of all disclosed information
- **Use information solely** for authorized purposes
- **Limit access** to personnel with legitimate need-to-know
- **Implement security measures** to prevent unauthorized disclosure
- **Return or destroy** information upon request or termination

### 4.2 Permitted Disclosures
Information may be disclosed when:
- Required by law or court order (with prior notice to Disclosing Party)
- Already in public domain through no fault of Receiving Party
- Independently developed without use of confidential information
- Approved in writing by Disclosing Party

---

## 5. Term and Termination

- **Duration:** This agreement remains in effect for 5 years from the date of disclosure
- **Survival:** Confidentiality obligations survive termination
- **Termination:** Either party may terminate with 30 days written notice

---

## 6. Consequences of Breach

Violation of this policy may result in:
- Immediate termination of employment/contract
- Legal action for damages
- Injunctive relief
- Criminal prosecution where applicable

---

## 7. Compliance and Monitoring

- Annual training for all employees
- Regular audits of information handling practices
- Incident reporting mechanism
- Disciplinary procedures for violations

---

## 8. Acknowledgment

All parties must sign an acknowledgment form confirming:
- Receipt and understanding of this policy
- Commitment to comply with all terms
- Awareness of consequences for non-compliance

---

**Approved by:** Legal Department  
**Signature:** _________________  
**Date:** ${new Date().toLocaleDateString()}`;

        } else {
            // General detailed content
            response = `# ${userMessage.includes('productivity') ? 'Productivity Enhancement Guide' : 'Professional Development Guide'}

## Executive Summary

This comprehensive guide provides actionable strategies and proven techniques to enhance performance and achieve measurable results.

---

## Chapter 1: Foundations

### Understanding Core Principles
Success in any professional endeavor requires a solid foundation built on:

1. **Clear Goal Setting**
   - Define SMART objectives (Specific, Measurable, Achievable, Relevant, Time-bound)
   - Break down large goals into manageable milestones
   - Regular progress tracking and adjustment

2. **Time Management**
   - Prioritize tasks using the Eisenhower Matrix
   - Implement time-blocking techniques
   - Minimize distractions and context switching

3. **Continuous Learning**
   - Dedicate time for skill development
   - Seek feedback and mentorship
   - Stay updated with industry trends

---

## Chapter 2: Practical Strategies

### Daily Routines for Success

**Morning Routine:**
- Review daily priorities (15 minutes)
- Tackle most challenging task first
- Limit email checking to scheduled times

**Afternoon Optimization:**
- Take strategic breaks every 90 minutes
- Collaborate and communicate with team
- Review and adjust plans as needed

**Evening Reflection:**
- Document achievements and learnings
- Prepare tomorrow's priority list
- Disconnect from work for proper rest

---

## Chapter 3: Tools and Techniques

### Productivity Tools
- **Task Management:** Asana, Trello, Monday.com
- **Time Tracking:** RescueTime, Toggl
- **Focus:** Forest, Freedom, Cold Turkey

### Proven Techniques
- **Pomodoro Technique:** 25-minute focused work sessions
- **Getting Things Done (GTD):** Comprehensive task management system
- **Deep Work:** Dedicated distraction-free periods

---

## Chapter 4: Measuring Success

### Key Performance Indicators
- Tasks completed vs. planned
- Quality of deliverables
- Time to completion
- Stakeholder satisfaction

### Continuous Improvement
- Weekly reviews
- Monthly assessments
- Quarterly goal realignment
- Annual strategic planning

---

## Conclusion

Implementing these strategies consistently will lead to significant improvements in productivity and professional growth. Remember: progress, not perfection, is the goal.

---

*For additional resources and support, contact your manager or HR department.*`;
        }

        return {
            success: true,
            message: response,
            isComplete: true // Flag to indicate content generation is complete
        };
    }

    // Follow-up questions
    response = "I understand. To create the best content for you, could you provide more details about:\n\n• Target audience\n• Specific topics to cover\n• Desired length or depth\n• Any specific requirements or constraints\n\nOr simply tell me: 'Generate the content' and I'll create a comprehensive document based on what you've shared so far.";

    return {
        success: true,
        message: response
    };
}
```

---

### 2. **`app/admin/upload/page.tsx`** - Key Additions

Add these imports at the top:
```typescript
import { Mic, MicOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateCoverImageAction, generateContentSummaryAction, aiAssistantChatAction } from '@/app/actions/aiMock';
```

Add these state variables:
```typescript
// Voice Input States
const [isListening, setIsListening] = useState(false);
const [recognition, setRecognition] = useState<any>(null);
const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

// AI Feature States
const [coverMode, setCoverMode] = useState<'upload' | 'ai'>('upload');
const [contentMode, setContentMode] = useState<'upload' | 'ai'>('upload');
const [aiCoverTheme, setAiCoverTheme] = useState('Modern Blue');
const [isGeneratingCover, setIsGeneratingCover] = useState(false);
const [generatedCoverUrl, setGeneratedCoverUrl] = useState<string | null>(null);
const [aiContextType, setAiContextType] = useState<'policy' | 'document' | 'details' | null>(null);
const [chatMessages, setChatMessages] = useState<any[]>([]);
const [chatInput, setChatInput] = useState('');
const [isChatLoading, setIsChatLoading] = useState(false);
const [aiGeneratedContent, setAiGeneratedContent] = useState<string | null>(null);
const [ingestType, setIngestType] = useState<'extract' | 'summarize'>('extract');
```

Add voice recognition setup (after other useEffects):
```typescript
// Voice Recognition Setup
useEffect(() => {
    if (typeof window !== 'undefined') {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognitionInstance = new SpeechRecognition();
            recognitionInstance.continuous = true;
            recognitionInstance.interimResults = true;
            recognitionInstance.lang = 'en-US';

            recognitionInstance.onresult = (event: any) => {
                const transcript = Array.from(event.results)
                    .map((result: any) => result[0])
                    .map((result: any) => result.transcript)
                    .join('');

                setChatInput(transcript);

                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current);
                }

                silenceTimerRef.current = setTimeout(() => {
                    if (transcript.trim()) {
                        recognitionInstance.stop();
                        setIsListening(false);
                        setTimeout(() => {
                            const sendBtn = document.getElementById('voice-send-btn');
                            if (sendBtn) sendBtn.click();
                        }, 100);
                    }
                }, 2000);
            };

            recognitionInstance.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };

            recognitionInstance.onend = () => {
                setIsListening(false);
            };

            setRecognition(recognitionInstance);
        }
    }

    return () => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
    };
}, []);

const toggleVoiceInput = () => {
    if (!recognition) {
        alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
        return;
    }

    if (isListening) {
        recognition.stop();
        setIsListening(false);
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
    } else {
        setChatInput('');
        recognition.start();
        setIsListening(true);
    }
};
```

---

## 🎨 Complete Styling for Review Screen

The complete prose styling with enhanced spacing:

```typescript
<style jsx global>{`
    .prose h1 {
        @apply text-4xl font-black text-slate-900 mb-8 pb-6 mt-8 border-b-4 border-purple-500;
    }
    .prose h2 {
        @apply text-3xl font-bold text-slate-800 mt-16 mb-6 pt-8 flex items-center gap-3;
    }
    .prose h2::before {
        content: "▸";
        @apply text-purple-600 text-4xl;
    }
    .prose h3 {
        @apply text-2xl font-bold text-slate-700 mt-12 mb-5 bg-gradient-to-r from-purple-50 to-transparent px-4 py-3 rounded-lg border-l-4 border-purple-500;
    }
    .prose h4 {
        @apply text-xl font-semibold text-slate-600 mt-8 mb-4;
    }
    .prose p {
        @apply text-base leading-loose text-slate-600 mb-6;
    }
    .prose strong {
        @apply text-slate-900 font-bold bg-yellow-50 px-1.5 py-0.5 rounded;
    }
    .prose ul {
        @apply space-y-3 my-8 ml-2;
    }
    .prose li {
        @apply text-slate-700 leading-loose pl-3 mb-2;
    }
    .prose li::marker {
        @apply text-purple-600 text-xl font-bold;
    }
    .prose ol {
        @apply space-y-4 my-8;
    }
    .prose ol li {
        @apply bg-slate-50 p-4 rounded-lg border-l-4 border-indigo-400 mb-3;
    }
    .prose blockquote {
        @apply border-l-4 border-purple-500 bg-purple-50 italic pl-6 py-5 my-8 rounded-r-lg;
    }
    .prose hr {
        @apply my-12 border-t-2 border-slate-200;
    }
    .prose code {
        @apply bg-slate-100 text-purple-700 px-2 py-1 rounded font-mono text-sm;
    }
    .prose > * + * {
        @apply mt-6;
    }
    .prose > h2 + * {
        @apply mt-6;
    }
    .prose > h3 + * {
        @apply mt-5;
    }
`}</style>
```

---

## 📦 Dependencies

Install required packages:
```bash
npm install react-markdown remark-gfm
```

---

## 🚀 Groq Integration (Replace Mock)

For production, replace the mock actions with real Groq API calls:

```bash
npm install groq-sdk
```

Then update `app/actions/aiMock.ts`:
```typescript
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function aiAssistantChatAction(messages: any[], contextType: string) {
  const completion = await groq.chat.completions.create({
    messages: messages,
    model: "llama-3.1-70b-versatile",
    temperature: 0.7,
    max_tokens: 8000
  });

  return {
    success: true,
    message: completion.choices[0]?.message?.content || "",
    isComplete: true
  };
}
```

---

## ✅ Testing Checklist

- [ ] AI Cover generation with theme selection
- [ ] Voice input with auto-send on silence
- [ ] Chat interface with markdown rendering
- [ ] Beautiful formatting in review screen
- [ ] Download as Markdown functionality
- [ ] Approve & Publish workflow

---

## 📝 Notes

- Voice recognition works best in Chrome/Edge
- The mock generates placeholder content - replace with real AI for production
- All styling is responsive and mobile-friendly
- Download creates .md files (use external tools for PDF conversion)

---

**Ready to transfer to another Antigravity instance!** 🚀
