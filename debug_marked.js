console.log("Start debugging marked...");

const { marked } = require('marked');

try {
    const result = marked.parse('**Hello world**');
    console.log('Result type:', typeof result);
    console.log('Result:', result);
    console.log('Is Promise?', result instanceof Promise);
} catch (e) {
    console.error('Error:', e);
}
