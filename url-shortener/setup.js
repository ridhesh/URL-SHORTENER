const mysql = require('mysql2/promise');

async function setupDatabase() {
    try {
        // Create connection without database first
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',           // Change if needed
            password: 'sqldb'            // Change if needed
        });
        
        console.log('🔧 Setting up database...');
        
        // Create database
        await connection.execute('CREATE DATABASE IF NOT EXISTS url_shortener_db');
        await connection.execute('USE url_shortener_db');
        
        // Create tables
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS urls (
                id INT AUTO_INCREMENT PRIMARY KEY,
                long_url TEXT NOT NULL,
                short_code VARCHAR(10) UNIQUE NOT NULL,
                user_id INT,
                clicks INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_short_code (short_code)
            )
        `);
        
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS clicks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                url_id INT,
                clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                referrer TEXT,
                user_agent TEXT,
                ip_address VARCHAR(45),
                FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE,
                INDEX idx_url_id (url_id),
                INDEX idx_clicked_at (clicked_at)
            )
        `);
        
        await connection.end();
        
        console.log('✅ Database setup completed!');
        console.log('📊 Database: url_shortener_db');
        console.log('📋 Tables: users, urls, clicks');
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        console.log('💡 Make sure MySQL is running and credentials are correct.');
    }
}

setupDatabase();