
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

    function processNode(node: Node, parent: Node | null) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            if (text.trim().length === 0) return;

            // Split by sentence delimiters
            const parts = text.match(/[^.?!]+[.?!]+[\])'"]*|[^.?!]+$/g);

            if (parts && parts.length > 0) {
                const fragment = document.createDocumentFragment();

                parts.forEach(part => {
                    const cleanPart = part.trim();
                    if (cleanPart.length > 0) {
                        const span = document.createElement('span');
                        span.id = `s-${sentences.length}`; // Use array length for robust indexing
                        span.className = 'speech-sentence transition-colors duration-300 rounded px-0.5';
                        // Re-add space logic if needed, but for now wrap part directly
                        span.textContent = part;

                        fragment.appendChild(span);
                        sentences.push(cleanPart);
                    } else {
                        fragment.appendChild(document.createTextNode(part));
                    }
                });

                if (parent) {
                    parent.replaceChild(fragment, node);
                }
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Recursively process children
            Array.from(node.childNodes).forEach(child => processNode(child, node));
        }
    }

    try {
        // Start processing children of body. 
        // We do NOT process body itself as a text node, so we iterate its children.
        Array.from(doc.body.childNodes).forEach(child => processNode(child, doc.body));
    } catch (e) {
        console.error("Speech processing error", e);
        return { processedHtml: html, sentences: [] }; // Fallback to original
    }


    return {
        processedHtml: doc.body.innerHTML,
        sentences
    };
}
