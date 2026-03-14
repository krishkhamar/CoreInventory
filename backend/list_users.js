const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function listUsers() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await connection.execute('SELECT id, name, email FROM users');
        console.log('USERS_LIST:');
        console.table(rows);
    } catch (err) {
        console.error('Error listing users:', err.message);
    } finally {
        await connection.end();
    }
}

listUsers();
