import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { getGroqKeyForUser } from '@/lib/ai-config';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, topicTitle } = body;
    const conceptTopic = topic || topicTitle;

    const { apiKey } = await getGroqKeyForUser(req);
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = `You are an expert visual educator who explains concepts using "Whiteboard Style" diagrams.
        Your goal is to explain the given TOPIC by breaking it down into visual structures, exactly like a teacher using a whiteboard.
        
        Return a valid JSON object with the following structure:
        {
          "summary": "One sentence summary of the concept.",
          "mermaid": "Valid Mermaid.js syntax. Use 'graph LR' (Left to Right) for processes. Use clear, short labels.",
          "steps": [
            { "title": "Step/Practice Name", "description": "Short explanation including any Tools/Implements used.", "icon": "emoji" }
          ],
          "comparison": {
            "title": "Comparison (if applicable, e.g., Types/Seasons)",
            "headers": ["Category A", "Category B"],
            "rows": [
              ["Item A1", "Item B1"],
              ["Item A2", "Item B2"]
            ]
          }
        }
        
        Rules:
        1. Mermaid Flowchart: ALWAYS start with 'graph LR'.
        2. STRICTLY use alphanumeric IDs for nodes (e.g., A, B, C1). NEVER use spaces in node IDs.
        3. ALWAYS wrap node text labels in brackets: A[Data Source] --> B[Processing]
        4. For edge labels, use EXACTLY: A -->|Label Text| B. NEVER add an arrowhead AFTER the label. DO NOT use -->|Label|>
        5. NEVER use unescaped quotes or special characters inside the text brackets.
        `;

    const userPrompt = `Explain this concept visually: "${conceptTopic}"`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 2048,
      response_format: { type: "json_object" }
    });

    const textResponse = completion.choices[0]?.message?.content || "{}";
    const data = JSON.parse(textResponse);

    // Force-sanitize Mermaid syntax if the model stubbornly hallucinates invalid arrows
    if (data && typeof data.mermaid === 'string') {
      // Replaces "-->|Some Text|>" with "-->|Some Text|" avoiding extra spaces
      data.mermaid = data.mermaid.replace(/-->\|([^|]+)\|>/g, '-->|$1|');
      // Also catch "---|Some Text|>" just in case
      data.mermaid = data.mermaid.replace(/---\|([^|]+)\|>/g, '---|$1|');
    }

    return NextResponse.json({ content: data });

  } catch (error) {
    console.error('Concept API Error:', error);
    return NextResponse.json({ error: 'Failed to generate concept' }, { status: 500 });
  }
}
