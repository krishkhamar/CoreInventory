const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendOTPEmail = async (to, otp) => {
    const mailOptions = {
        from: `"CoreInventory" <${process.env.SMTP_USER}>`,
        to,
        subject: 'Password Reset OTP - CoreInventory',
        html: `
            <div style="font-family: 'Segoe UI', sans-serif; max-width:500px; margin:auto; padding:30px; background:#0f172a; color:#e2e8f0; border-radius:12px;">
                <h2 style="color:#818cf8; margin-bottom:10px;">🔐 Password Reset</h2>
                <p>You requested a password reset for your CoreInventory account.</p>
                <div style="background:#1e293b; border-radius:8px; padding:20px; text-align:center; margin:20px 0;">
                    <span style="font-size:32px; font-weight:700; letter-spacing:8px; color:#a5b4fc;">${otp}</span>
                </div>
                <p style="color:#94a3b8; font-size:13px;">This OTP expires in <strong>10 minutes</strong>. If you didn't request this, ignore this email.</p>
                <hr style="border-color:#334155; margin:20px 0;" />
                <p style="color:#64748b; font-size:12px;">CoreInventory – Inventory Management System</p>
            </div>
        `
    };
    // For development/debugging: Always log to console
    console.log('\n-----------------------------------');
    console.log(`🔑 OTP for ${to}: ${otp}`);
    console.log('-----------------------------------\n');

    try {
        if (!process.env.SMTP_USER || process.env.SMTP_USER.includes('your_email')) {
            console.warn('[MAILER] SMTP User is placeholder. Email sending skipped, use the console code above.');
            return { messageId: 'dev-mode-console-only' };
        }
        return await transporter.sendMail(mailOptions);
    } catch (err) {
        console.error('[MAILER ERROR]', err.message);
        return { error: err.message, fallback: true };
    }
};

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = { sendOTPEmail, generateOTP };
