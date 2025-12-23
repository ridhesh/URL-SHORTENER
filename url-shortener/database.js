const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',           // Change to your MySQL username
    password: 'sqldb',          // Change to your MySQL password
    database: 'url_shortener_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL database');
        connection.release();
    } catch (err) {
        console.error('❌ Error connecting to MySQL:', err.message);
        console.log('💡 Make sure:');
        console.log('   1. MySQL server is running');
        console.log('   2. Database "url_shortener_db" exists');
        console.log('   3. Username and password are correct');
    }
}

testConnection();

module.exports = pool;