import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
    try {
        const { type, context, topicTitle } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        // Fallback content if no API key or error
        const fallbackContent = generateFallback(type, topicTitle);

        if (!apiKey) {
            console.log("No API key found, using fallback for", type);
            return NextResponse.json({ content: fallbackContent });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let prompt = "";

        switch (type) {
            case 'summary':
                prompt = `
          You are an expert tutor. Create a concise, easy-to-understand summary of the following content about "${topicTitle}".
          Focus on the key takeaways. Use bullet points where appropriate.
          
          Content:
          ${context.substring(0, 10000)}
        `;
                break;

            case 'quiz':
                prompt = `
          Create a short multiple-choice quiz (3 questions) based on the following content about "${topicTitle}".
          Return ONLY valid JSON in this format:
          [
            {
              "question": "Question text?",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correctAnswer": 0 // Index of correct option
            }
          ]

          Content:
          ${context.substring(0, 10000)}
        `;
                break;

            case 'mindmap':
                prompt = `
          Create a Mermaid.js mindmap syntax for the following content about "${topicTitle}".
          Start with "mindmap" and indent correctly. Do not include markdown code blocks.
          
          Example format:
          mindmap
            root((Main Topic))
              Subtopic 1
                Detail A
                Detail B
              Subtopic 2
          
          Content:
          ${context.substring(0, 10000)}
        `;
                break;

            case 'qa':
                prompt = `
          You are a helpful AI assistant. Answer the user's question based strictly on the provided context.
          
          Context:
          ${context.substring(0, 10000)}
          
          User Question: ${topicTitle} // Reusing topicTitle field for the question
        `;
                break;
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up JSON for quiz
        if (type === 'quiz') {
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        }
        // Clean up Mermaid for mindmap
        if (type === 'mindmap') {
            text = text.replace(/```mermaid/g, '').replace(/```/g, '').trim();
        }

        return NextResponse.json({ content: text });

    } catch (error) {
        console.error('AI Generation error:', error);
        return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
    }
}

function generateFallback(type: string, title: string) {
    switch (type) {
        case 'summary':
            return `(AI Unavailable) This is a placeholder summary for ${title}. Please configure the Gemini API key to generate real summaries.`;
        case 'quiz':
            return JSON.stringify([
                {
                    question: `What is the main focus of ${title}? (Demo)`,
                    options: ["Learning", "Sleeping", "Eating", "Driving"],
                    correctAnswer: 0
                }
            ]);
        case 'mindmap':
            return `
        mindmap
          root((${title}))
            Concept A
            Concept B
            Concept C
      `;
        default:
            return "Content unavailable.";
    }
}
