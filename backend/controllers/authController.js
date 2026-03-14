const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { sendOTPEmail, generateOTP } = require('../utils/mailer');

// Sign Up
exports.signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email already registered.' });
        }
        const hash = await bcrypt.hash(password, 10);
        const [result] = await pool.query('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', [name, email, hash]);
        const token = jwt.sign({ id: result.insertId, email, name }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ message: 'Account created.', token, user: { id: result.insertId, name, email } });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        const user = rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: 'Login successful.', token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
};

// Forgot Password – Send OTP
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required.' });
        const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'No account found with this email.' });
        }
        const userId = rows[0].id;
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
        await pool.query('INSERT INTO otp_codes (user_id, otp_code, expires_at) VALUES (?, ?, ?)', [userId, otp, expiresAt]);
        await sendOTPEmail(email, otp);
        res.json({ message: 'OTP sent to your email.' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Failed to send OTP. Check email config.' });
    }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required.' });
        const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found.' });
        const userId = users[0].id;
        const [otpRows] = await pool.query(
            'SELECT * FROM otp_codes WHERE user_id = ? AND otp_code = ? AND used = FALSE AND expires_at > NOW() ORDER BY id DESC LIMIT 1',
            [userId, otp]
        );
        if (otpRows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired OTP.' });
        }
        await pool.query('UPDATE otp_codes SET used = TRUE WHERE id = ?', [otpRows[0].id]);
        const resetToken = jwt.sign({ id: userId, purpose: 'reset' }, process.env.JWT_SECRET, { expiresIn: '15m' });
        res.json({ message: 'OTP verified.', resetToken });
    } catch (err) {
        console.error('Verify OTP error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
};

// Reset Password
exports.resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        if (!resetToken || !newPassword) return res.status(400).json({ error: 'Token and new password are required.' });
        const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
        if (decoded.purpose !== 'reset') return res.status(400).json({ error: 'Invalid reset token.' });
        const hash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, decoded.id]);
        res.json({ message: 'Password reset successfully.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(400).json({ error: 'Invalid or expired reset token.' });
    }
};

// Get Profile
exports.getProfile = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
};

// Update Profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, email } = req.body;
        await pool.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, req.user.id]);
        res.json({ message: 'Profile updated.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
};

// Change Password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
        const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
        if (!valid) return res.status(400).json({ error: 'Current password is incorrect.' });
        const hash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
        res.json({ message: 'Password changed.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error.' });
    }
};
