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

    let color = themeColors[data.theme] || '0047AB';

    // Support direct Hex Codes (remove # if present)
    if (data.theme.startsWith('#')) {
        color = data.theme.replace('#', '');
    } else if (/^[0-9A-F]{6}$/i.test(data.theme)) {
        color = data.theme;
    }
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

    // Join with newline character (encodeURIComponent will handle it correctly as %0A)
    const formattedTitle = lines.join('\n');
    const url = `https://placehold.co/800x450/${color}/${textColor}/png?text=${encodeURIComponent(formattedTitle)}`;

    // Return "generated" image URL
    return {
        success: true,
        url: url,
        revisedPrompt: `A high-quality 3D render of a course cover with title "${data.title}" in style ${data.theme}`
    };
}

export async function generateDescriptionAction(title: string) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simple mock logic to generate a description based on keywords in the title
    const lowerTitle = title.toLowerCase();
    let description = "";

    if (lowerTitle.includes("sales") || lowerTitle.includes("selling")) {
        description = "Master the art of closing deals and building lasting customer relationships with this comprehensive sales guide. Learn proven strategies to boost your performance and exceed targets.";
    } else if (lowerTitle.includes("leadership") || lowerTitle.includes("manage")) {
        description = "Develop essential leadership skills to inspire your team and drive organizational success. This module covers effective communication, decision-making, and conflict resolution.";
    } else if (lowerTitle.includes("policy") || lowerTitle.includes("compliance") || lowerTitle.includes("nda")) {
        description = "Review the official guidelines and compliance requirements to ensure adherence to company standards. This document outlines key responsibilities and legal obligations.";
    } else if (lowerTitle.includes("security") || lowerTitle.includes("cyber")) {
        description = "Enhance your awareness of cybersecurity best practices and threat prevention. Learn how to protect sensitive data and maintain a secure digital environment.";
    } else if (lowerTitle.includes("onboard") || lowerTitle.includes("start")) {
        description = "A complete onboarding guide designed to help new team members integrate smoothly. Discover our culture, tools, and processes to hit the ground running.";
    } else if (lowerTitle.includes("product") || lowerTitle.includes("manual")) {
        description = "Detailed documentation covering features, setup, and troubleshooting for our latest product. Maximize your efficiency with step-by-step instructions and tips.";
    } else {
        const variations = [
            `An in-depth exploration of ${title}, providing key insights and practical applications. tailored to enhance professional development and operational efficiency.`,
            `Comprehensive guide on ${title} designed to boost skills and knowledge. Includes practical examples and case studies.`,
            `Master the fundamentals of ${title} with this targeted learning module. Perfect for both beginners and advanced practitioners.`
        ];
        description = variations[Math.floor(Math.random() * variations.length)];
    }

    return {
        success: true,
        description: description
    };
}

export async function generateContentSummaryAction(content: any) {
    await new Promise(resolve => setTimeout(resolve, 2500));

    return {
        success: true,
        summary: `
## Executive Summary

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
        } else if (contextType === 'course') {
            response = "I can create detailed course content for you. Please describe the topic - for example:\n• React Fundamentals\n• Leadership Skills\n• Safety Procedures\n• Sales Techniques";
        } else if (contextType === 'library') {
            response = "I can generate detailed articles or research summaries. What topic would you like to cover? (e.g., Productivity Hacks, Industry Trends, Concept Explainers)";
        } else {
            response = "I can generate detailed learning content. What topic would you like to cover?";
        }
        return { success: true, message: response };
    }

    // Detect if user is requesting actual content generation
    const isGenerationRequest = userMessage.includes('prepare') ||
        userMessage.includes('create') ||
        userMessage.includes('generate') ||
        userMessage.includes('write') ||
        userMessage.includes('generate') ||
        userMessage.includes('write') ||
        userMessage.includes('course') ||
        userMessage.includes('policy') ||
        userMessage.includes('library') ||
        userMessage.length > 20 || // If user input is long enough, assume they provided details
        messages.length > 1; // Any follow-up is treated as an attempt to generate

    if (isGenerationRequest) {
        // 1. Check if we have existing content to modify
        const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.content.startsWith('#'));
        let currentContent = lastAssistantMsg ? lastAssistantMsg.content : null;

        // Check if this is a request to start entirely new content
        const isNewRequest = userMessage.includes('create new') || userMessage.includes('start over') || userMessage.includes('ignore previous');

        if (currentContent && !isNewRequest) {
            // --- Modification Logic ---
            let modified = false;

            // A. Remove Section
            if (userMessage.includes('remove') || userMessage.includes('delete')) {
                // Support "section 5 -> Title" or "section 5" or "Title"
                const removeMatch = userMessage.match(/(?:remove|delete)\s+(?:section\s+)?(.+)/i);

                if (removeMatch) {
                    let term = removeMatch[1].trim();
                    // Clean up "->" if present (e.g. "5 -> Compliance") -> take "5" or "Compliance"
                    // If it has "->", usually the user means "Section X which is Title Y". 
                    // Let's try to match the *Header* that contains "5" AND "Compliance" or just "Compliance"

                    const arrowMatch = term.split('->');
                    let targetSection = term;
                    if (arrowMatch.length > 1) {
                        // "5" and "Compliance"
                        const sectionNum = arrowMatch[0].trim().replace(/section|part/gi, '').trim();
                        const sectionTitle = arrowMatch[1].trim();
                        // Try to find a header with EITHER
                        targetSection = sectionTitle || sectionNum;
                    }

                    // Flexible Regex: Match ## <anything>TERM<anything>
                    // Escape special chars in term just in case, but simple alphanumeric is mostly expected
                    const safeTerm = targetSection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                    // Regex to find:
                    // ^##+ (any chars) match (any chars) (newline)
                    // ... content ...
                    // (?=^##|$) -> Lookahead for next header or end of string
                    const sectionRegex = new RegExp(`^##+ .*${safeTerm}[\\s\\S]*?(?=^##|$)`, 'im');

                    if (currentContent.match(sectionRegex)) {
                        currentContent = currentContent.replace(sectionRegex, '');
                        modified = true;
                    }
                }
            }

            // B. Change Title/Heading
            if (userMessage.includes('heading') || userMessage.includes('title') || userMessage.includes('rename') || userMessage.includes('topic') || userMessage.includes('change')) {
                const titleMatch = userMessage.match(/(?:to|as)\s+(.+)$/i);
                if (titleMatch) {
                    let newTitle = titleMatch[1].trim();
                    // Remove common trailing punctuation
                    newTitle = newTitle.replace(/[.,;!?]+$/, '');
                    if (newTitle) {
                        currentContent = currentContent.replace(/^# .*/m, `# ${newTitle}`);
                        modified = true;
                    }
                }
            }

            // C. Add Details / Expand
            if (userMessage.includes('add details') || userMessage.includes('more details') || userMessage.includes('expand')) {
                const sectionMatch = userMessage.match(/(?:on|to)\s+(.+)/i);
                const term = sectionMatch ? sectionMatch[1].trim() : null;

                const detailText = `\n\n### Additional Details\nHere are further details as requested. This section delves deeper into the specifics, providing comprehensive analysis and operational guidelines to ensure clarity and effective implementation.\n\n- **Nuance 1**: Critical factor to consider.\n- **Nuance 2**: Secondary impact analysis.\n`;

                if (term) {
                    const sectionRegex = new RegExp(`(##+ .*${term}.*)`, 'i');
                    if (currentContent.match(sectionRegex)) {
                        currentContent = currentContent.replace(sectionRegex, `$1${detailText}`);
                        modified = true;
                    }
                } else {
                    currentContent = currentContent.replace(/(## (Introduction|1\. Purpose)[\s\S]*?)(?=##|$)/i, `$1${detailText}`);
                    modified = true;
                }
            }

            // IMPORTANT: Even if 'modified' is false (command validation failed), 
            // result the CURRENT content to prevent "resetting" to the original template.
            // This fixes the bug where "Update 2" reverts "Update 1" if "Update 2" isn't understood.
            return {
                success: true,
                message: currentContent,
                isComplete: true
            };
        }

        // --- New Generation Logic (Fallback) ---
        // Only reached if NO previous content exists OR user explicitly asked for 'new'

        // Extract key details from user message
        const pageMatch = userMessage.match(/(\d+)\s*(page|pg)/);
        const pages = pageMatch ? parseInt(pageMatch[1]) : 3;

        // Use the FIRST user message as the core topic to avoid using refinement instructions (e.g. "add details") as the title
        const firstUserMsg = messages.find(m => m.role === 'user');
        const topicSource = firstUserMsg ? firstUserMsg.content : messages[messages.length - 1].content;

        // Clean the topic source for the title
        const cleanTitle = topicSource.replace(/generate|create|write|course|policy|library|prepare/gi, '').trim();

        // Generate actual content based on context
        if (contextType === 'course') {
            response = `# ${cleanTitle || 'Course Content'}
            
## Course Overview
This course is designed to provide a comprehensive understanding of **${cleanTitle || 'the subject'}**, broken down into logical modules.

## Module 1: Introduction
- **Objective**: Understand the core concepts and importance.
- **Key Visuals**: Diagrams explaining the ecosystem.

### 1.1 What is it?
A foundational overview explaining the definition, history, and relevance in today's context.

### 1.2 Why it matters?
Explaining the impact and benefits of mastering this topic.

---

## Module 2: Core Principles
- **Theory**: Deep dive into the theoretical framework.
- **Application**: Real-world examples.

### 2.1 Principle A
Detailed explanation of the first core principle.

### 2.2 Principle B
Detailed explanation of the second core principle.

---

## Module 3: Advanced Concepts
- **Complexity**: Handling edge cases and advanced scenarios.
- **Strategy**: Best practices for implementation.

### 3.1 Strategies for Success
Actionable steps to achieve mastery.

---

## Assessment
1. What is the primary goal of this course?
2. Explain Principle A in your own words.
3. List three benefits discussed in Module 1.`;

        } else if (contextType === 'policy') {
            response = `# ${cleanTitle || 'Policy Document'}
            
## Document Control
- **Policy Number:** POL-${new Date().getFullYear()}-001
- **Effective Date:** ${new Date().toLocaleDateString()}
- **Review Date:** Annual
- **Owner:** Legal & Compliance Department

---

## 1. Purpose
The purpose of this policy is to establish clear guidelines and standards regarding **${cleanTitle}**, ensuring compliance and operational excellence.

## 2. Scope
This policy applies to all employees, contractors, and third-party partners acting on behalf of the company.

## 3. Policy Statements
### 3.1 General Principles
All individuals must adhere to the highest standards of integrity and profesionalism.

### 3.2 Specific Requirements
- Requirement A: Must be followed at all times.
- Requirement B: Exceptions require written approval.

## 4. Roles and Responsibilities
- **Management**: Ensure policy is communicated and enforced.
- **Employees**: Read, understand, and comply with the policy.

## 5. Compliance and Consequences
Failure to comply with this policy may result in disciplinary action up to and including termination of employment.

---

**Approved by:** Executive Management
**Date:** ${new Date().toLocaleDateString()}`;

        } else {
            // Context 'library' or default
            response = `# ${cleanTitle || 'Knowledge Article'}

## Abstract
A concise summary of the topic, providing a quick overview for the reader.

## Introduction
**${cleanTitle}** is a critical concept in the modern landscape. This article explores its nuances, implications, and practical applications.

## Key Concepts

### Concept 1: The Foundation
Understanding the basics is crucial. This involves...

### Concept 2: The Evolution
How this concept has evolved over time and what it means for the future.

## In-Depth Analysis
An analysis of current trends, data, and expert opinions regarding the subject.

> "Insightful quote regarding the topic to add depth."

## Conclusion
Summarizing the key takeaways and offering a final thought on the importance of the subject.

## References
- Industry Standard Guidelines
- Academic Research Papers
- Expert Interviews`;
        }

        return {
            success: true,
            message: response,
            isComplete: true // Flag to indicate content generation is complete
        };
    }

    // This should ideally not be reached if messages.length > 1 given our loose check above, 
    // but just in case, we default to the general prompt.
    response = "I understand. To create the best content for you, could you provide more details about:\n\n• Target audience\n• Specific topics to cover\n• Desired length or depth\n• Any specific requirements or constraints\n\nOr simply tell me: 'Generate the content' and I'll create a comprehensive document based on what you've shared so far.";

    return {
        success: true,
        message: response
    };
}
