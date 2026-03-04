import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
// Ensure the key is exactly 32 bytes. In production, Set ENCRYPTION_KEY in .env
const ENCRYPTION_KEY = (process.env.ENCRYPTION_KEY || 'default-dev-secret-key-32-bytes!').padEnd(32, '.').slice(0, 32);
const IV_LENGTH = 16;

export function encrypt(text: string): string {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (e) {
        console.error('Encryption failed', e);
        return text;
    }
}

export function decrypt(text: string): string {
    if (!text || !text.includes(':')) return text; // Pending or standard text
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift()!, 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        // Fallback: If decryption fails (e.g. key changed), return original text or empty
        console.warn('Decryption failed, returning original');
        return text;
    }
}
