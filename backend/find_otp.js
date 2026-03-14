const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function getLatestOTP() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await connection.execute(
            'SELECT otp_code, email FROM otp_codes JOIN users ON users.id = otp_codes.user_id ORDER BY otp_codes.created_at DESC LIMIT 1'
        );
        if (rows.length > 0) {
            console.log(`LATEST_OTP: ${rows[0].otp_code} for ${rows[0].email}`);
        } else {
            console.log('No OTP found');
        }
    } catch (err) {
        console.error('Error fetching OTP:', err.message);
    } finally {
        await connection.end();
    }
}

getLatestOTP();
