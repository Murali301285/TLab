# 🚀 Groq AI Models - Recommendations for Content Generation

## 📊 Best Groq Models for Document Generation

### 🥇 **Top Recommendation: Llama 3.1 70B Versatile**
```javascript
model: "llama-3.1-70b-versatile"
```

**Why it's best:**
- ✅ **Excellent for long-form content** (user manuals, policies, guides)
- ✅ **Superior formatting** - naturally uses markdown headers, bullets, bold
- ✅ **Context window**: 128K tokens (handles very long documents)
- ✅ **Fast inference** on Groq's infrastructure
- ✅ **Balanced**: Great quality + speed
- ✅ **Structured output** - follows instructions well

**Best for:**
- User manuals (5-10 pages)
- Policy documents (NDA, compliance)
- Training materials
- Technical documentation

---

### 🥈 **Alternative: Llama 3.1 8B Instant**
```javascript
model: "llama-3.1-8b-instant"
```

**Why consider it:**
- ✅ **Blazing fast** - near-instant responses
- ✅ **Good for shorter content** (1-3 pages)
- ✅ **Cost-effective** for high-volume usage
- ✅ **Still produces quality markdown**

**Best for:**
- Quick summaries
- Short policies
- FAQ documents
- Email templates

---

### 🥉 **For Creative Content: Mixtral 8x7B**
```javascript
model: "mixtral-8x7b-32768"
```

**Why it's good:**
- ✅ **Creative writing** - engaging tone
- ✅ **Multilingual** support
- ✅ **Good formatting**
- ✅ **32K context window**

**Best for:**
- Marketing materials
- Training narratives
- Engaging guides
- Multi-language content

---

## 🔧 Implementation Example

### Using Groq SDK

```typescript
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function generateDocument(prompt: string, type: string) {
  const systemPrompts = {
    policy: `You are a legal compliance expert. Generate comprehensive, professional policy documents with:
- Clear headers (use # ## ### markdown)
- Numbered sections
- Bold important terms
- Bullet points for lists
- Professional tone
- Proper spacing between sections`,
    
    manual: `You are a technical writer. Create detailed user manuals with:
- Clear chapter structure
- Step-by-step instructions (numbered lists)
- Feature descriptions (bullet points)
- Troubleshooting sections
- Professional formatting with headers
- Generous spacing for readability`,
    
    guide: `You are a training specialist. Develop engaging guides with:
- Clear learning objectives
- Practical examples
- Action items (bold)
- Summary sections
- Visual hierarchy with headers
- Proper spacing between topics`
  };

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: systemPrompts[type] || systemPrompts.guide
      },
      {
        role: "user",
        content: prompt
      }
    ],
    model: "llama-3.1-70b-versatile", // Best for documents
    temperature: 0.7, // Balanced creativity
    max_tokens: 8000, // Allow long documents
    top_p: 1,
    stream: false
  });

  return completion.choices[0]?.message?.content || "";
}
```

---

## 📝 Prompt Engineering Tips

### ✅ **Good Prompt Structure**

```
Generate a comprehensive [TYPE] document about [TOPIC].

Requirements:
- Length: [X] pages
- Include: [specific sections]
- Format: Professional markdown with headers, bullets, bold text
- Tone: [Professional/Friendly/Technical]
- Add generous spacing between sections for readability

Structure:
1. Title (# Header)
2. Executive Summary
3. [Main sections with ## headers]
4. Conclusion
5. Additional Resources

Use:
- **Bold** for important terms
- Bullet points for lists
- Numbered lists for steps
- > Blockquotes for key insights
- --- for section dividers
```

### ❌ **Avoid Vague Prompts**

```
Write a document about productivity.
```

---

## 🎯 Model Comparison

| Model | Speed | Quality | Length | Best Use |
|-------|-------|---------|--------|----------|
| **Llama 3.1 70B** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 128K | Long documents |
| **Llama 3.1 8B** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 128K | Quick content |
| **Mixtral 8x7B** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 32K | Creative writing |
| **Gemma 7B** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 8K | Simple tasks |

---

## 🔥 Advanced: Streaming for Real-Time Display

```typescript
async function generateDocumentStream(prompt: string) {
  const stream = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a professional document writer..."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    model: "llama-3.1-70b-versatile",
    temperature: 0.7,
    max_tokens: 8000,
    stream: true // Enable streaming
  });

  let fullContent = "";
  
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    fullContent += content;
    
    // Update UI in real-time
    updateChatDisplay(fullContent);
  }
  
  return fullContent;
}
```

---

## 💡 Formatting Tips for Better Output

### 1. **Request Explicit Spacing**
```
Add 2 blank lines between major sections.
Add 1 blank line between paragraphs.
```

### 2. **Specify Markdown Elements**
```
Use:
- # for main title
- ## for chapters
- ### for sections
- **bold** for key terms
- - or * for bullet points
- 1. 2. 3. for numbered lists
```

### 3. **Set Length Expectations**
```
Generate approximately 5 pages (2000-2500 words).
Each section should be 200-300 words.
```

---

## 🎨 Enhanced Spacing Improvements Applied

### What Changed:
- ✅ **H2 sections**: Now have `mt-16` (4rem top margin) + `pt-8` padding
- ✅ **H3 sections**: Increased to `mt-12` (3rem top margin)
- ✅ **Paragraphs**: Changed to `leading-loose` + `mb-6` (1.5rem bottom)
- ✅ **Lists**: Increased spacing with `space-y-3` and `my-8`
- ✅ **HR dividers**: Now `my-12` (3rem vertical spacing)
- ✅ **List items**: Added `mb-2` for breathing room

### Result:
- 📖 Much more readable
- 🎯 Clear visual hierarchy
- 💨 Generous white space
- ✨ Professional appearance

---

## 🚀 Quick Start Code

Replace the mock in `app/actions/aiMock.ts`:

```typescript
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function generateContentWithGroq(
  prompt: string, 
  contextType: string
) {
  const systemPrompt = `You are a professional content creator. 
Generate well-formatted markdown documents with:
- Clear headers (# ## ###)
- Bold important terms
- Bullet points for lists
- Generous spacing (2 blank lines between sections)
- Professional tone`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ],
    model: "llama-3.1-70b-versatile",
    temperature: 0.7,
    max_tokens: 8000
  });

  return completion.choices[0]?.message?.content || "";
}
```

---

## 📊 Pricing (Groq - as of 2024)

- **Llama 3.1 70B**: ~$0.59 per million tokens
- **Llama 3.1 8B**: ~$0.05 per million tokens
- **Mixtral 8x7B**: ~$0.24 per million tokens

**Note**: Groq is significantly faster than other providers!

---

## ✅ Final Recommendation

**For your use case (User Manuals, Policies, Training Content):**

🏆 **Use: Llama 3.1 70B Versatile**

**Why:**
1. Best quality for long-form content
2. Excellent markdown formatting
3. Follows instructions precisely
4. Fast on Groq infrastructure
5. Large context window (128K)
6. Great for professional documents

**Settings:**
- Temperature: 0.7 (balanced)
- Max tokens: 6000-8000
- Top_p: 1
- Stream: true (for real-time display)

---

**Ready to integrate!** 🚀
