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
