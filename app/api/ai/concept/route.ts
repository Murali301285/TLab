import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, topicTitle } = body;
    const conceptTopic = topic || topicTitle;

    const apiKey = process.env.GROQ_API_KEY;
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
        1. Mermaid Flowchart: Use 'graph LR'.
        2. STRICTLY use standard arrows: A --> B or A -->|Label| B.
        3. NEVER use arrows like -->|Label|> or --> > or other variants.
        4. Node labels must be simple text. Remove special characters. "Node Name"
        5. Return raw JSON only.
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

    return NextResponse.json({ content: data });

  } catch (error) {
    console.error('Concept API Error:', error);
    return NextResponse.json({ error: 'Failed to generate concept' }, { status: 500 });
  }
}
