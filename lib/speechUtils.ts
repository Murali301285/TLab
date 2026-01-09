
/**
 * Simple HTML sentence wrapper
 * This function takes HTML string, splits text content into sentences, 
 * and wraps them in <span id="s-{index}"> tags for highlighting.
 */
export function processHtmlForSpeech(html: string): { processedHtml: string; sentences: string[] } {
    if (typeof window === 'undefined') return { processedHtml: html, sentences: [] };

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const sentences: string[] = [];
    let sentenceCount = 0;

    function processNode(node: Node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            if (text.trim().length === 0) return;

            // Split by sentence delimiters, keeping delimiters
            // Regex matches: non-delimiters + delimiter
            const parts = text.match(/[^.?!]+[.?!]+[\])'"]*|[^.?!]+$/g);

            if (parts && parts.length > 0) {
                const fragment = document.createDocumentFragment();

                parts.forEach(part => {
                    const cleanPart = part.trim();
                    if (cleanPart.length > 0) {
                        const span = document.createElement('span');
                        span.id = `s-${sentenceCount}`;
                        span.className = 'speech-sentence transition-colors duration-300 rounded px-0.5';
                        span.textContent = part; // Use original part to keep spacing? No, textContent is safe.
                        // Actually we need to preserve leading/trailing whitespace from the split
                        // But for simplicity in this V1, let's just wrap the trimmed content
                        // Re-adding space which might be lost

                        fragment.appendChild(span);
                        sentences.push(cleanPart);
                        sentenceCount++;
                    } else {
                        // Whitespace only
                        fragment.appendChild(document.createTextNode(part));
                    }
                });

                node.parentNode?.replaceChild(fragment, node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Recursively process children
            // Convert to array first because childNodes list changes as we replace nodes
            Array.from(node.childNodes).forEach(processNode);
        }
    }

    processNode(doc.body);

    return {
        processedHtml: doc.body.innerHTML,
        sentences
    };
}
