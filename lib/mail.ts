import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendEmail(to: string, subject: string, html: string, attachments?: any[]) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        console.log('SMTP credentials not provided. Skipping email send.');
        console.log(`To: ${to}, Subject: ${subject}`);
        console.log('--- Content ---');
        console.log(html);
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"3Vidya Support" <support@3vidya.com>',
            to,
            subject,
            html,
            attachments
        });
        console.log(`Email sent: ${info.messageId}`);
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}
