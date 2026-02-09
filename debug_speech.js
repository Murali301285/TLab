
const { processHtmlForSpeech } = require('./lib/speechUtils');

console.log("Start testing speechUtils...");

const testCases = [
    "",
    "<p>Hello world.</p>",
    "<p>Sentence 1. Sentence 2.</p>",
    "<div>Complex HTML <span>nested</span> content here.</div>"
];

testCases.forEach((html, i) => {
    console.log(`\nTest Case ${i}:`, html);
    try {
        const res = processHtmlForSpeech(html);
        console.log('Processed:', res.processedHtml);
        console.log('Sentences:', res.sentences);
    } catch (e) {
        console.error('Error:', e);
    }
});
