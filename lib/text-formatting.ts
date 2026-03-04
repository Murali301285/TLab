
/**
 * Formats raw text (e.g. from PDF extract) to improve readability.
 * 1. Bolds likely headings (Short lines, Title Case or ALL CAPS).
 * 2. Ensures proper paragraph spacing (Double newlines).
 * 3. Preserves existing Markdown.
 */
export function formatRawContent(text: string): string {
    if (!text) return "";

    // 1. Initial Cleanup & Normalization
    let processed = text
        .replace(/\r\n/g, '\n') // Normalize newlines
        // Fix OCR/PDF artifacts like "1. 1" or "1 . 1" -> "1.1"
        .replace(/(\d+)\s*\.\s+(\d+)/g, '$1.$2')
        // Fix various bullet points (•, ·, ▪, ●) to new list item with double newline
        .replace(/[\u2022\u00B7\u25AA\u25CF]/g, '\n\n- ')
        // Fix " o " used as bullet
        .replace(/\s+o\s+/g, '\n\n- ');

    // 2. Aggressive Line Breaking for Numbered Lists embedded in text
    // Example: "text end. 1.2 Title:" -> "text end.\n\n1.2 Title:"
    // Look for: (Sentence End or Start)(Spaces)(Number)(Dot)(Space)(Capital Letter)
    // We add a specific check for [0-9] as well to catch "1.1 Title"
    processed = processed.replace(/([.!?]|\n|^)\s+(\d+(\.\d+)*\.)\s+([A-Z0-9])/g, '$1\n\n$2 $4');

    const lines = processed.split('\n');
    const formattedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        // 3. Heading Detection & Bolding
        // Pattern A: Numbered Heading "1. Title" or "1.1 Title"
        // We match: Start -> Number -> Text -> Colon/Dot/None -> Rest

        // Check if line STARTS with a numbering pattern
        const numberMatch = line.match(/^(\d+(\.\d+)*\.?)\s+(.*)/);

        if (numberMatch) {
            const [_, number, __, rest] = numberMatch;
            // Split rest into Title and Content if possible
            // Heuristic: Title often ends with colon, or is short, or is followed by " - "

            // Case 1: "1. Title: Content"
            const colonSplit = rest.split(/:\s+/);
            if (colonSplit.length > 1 && colonSplit[0].length < 100) {
                line = `### **${number} ${colonSplit[0]}:** ${colonSplit.slice(1).join(': ')}`;
            }
            // Case 2: "1. Title" (Short line, explicit heading)
            else if (rest.length < 100 && !/[.!?]$/.test(rest)) {
                line = `### **${number} ${rest}**`;
            }
            // Case 3: "1. Long sentence..." (Maybe just bold the number?)
            else {
                // Try to find the first sentence
                const firstSentenceEnd = rest.indexOf('. ');
                if (firstSentenceEnd > -1 && firstSentenceEnd < 100) {
                    line = `**${number} ${rest.substring(0, firstSentenceEnd + 1)}** ${rest.substring(firstSentenceEnd + 1)}`;
                } else {
                    line = `**${number}** ${rest}`;
                }
            }
        }
        else {
            // Pattern B: Non-numbered Heading
            // Upper case or Title case short line
            if (line.length < 80 && !/[.!?]$/.test(line) && line.length > 3) {
                // Ignore list items
                if (!line.startsWith('-') && !line.startsWith('*')) {
                    // Check for Title Case or ALL CAPS
                    const isTitular = /^[A-Z]/.test(line);
                    if (isTitular) {
                        line = `### **${line}**`;
                    }
                }
            }
        }

        formattedLines.push(line);
    }

    return formattedLines.join('\n\n');
}
