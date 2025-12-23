const bcrypt = require('bcryptjs');
const pool = require('./database');

class Auth {
    // Register new user
    static async register(email, password) {
        try {
            // Basic validation
            if (!email || !password) {
                throw new Error('Email and password are required');
            }
            
            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }
            
            // Check if user exists
            const [existingUsers] = await pool.execute(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );
            
            if (existingUsers.length > 0) {
                throw new Error('Email already registered');
            }
            
            // Hash password
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            
            // Insert user
            const [result] = await pool.execute(
                'INSERT INTO users (email, password_hash) VALUES (?, ?)',
                [email, passwordHash]
            );
            
            return result.insertId;
        } catch (error) {
            throw error;
        }
    }
    
    // Login user
    static async login(email, password) {
        try {
            // Basic validation
            if (!email || !password) {
                throw new Error('Email and password are required');
            }
            
            // Get user
            const [users] = await pool.execute(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );
            
            if (users.length === 0) {
                throw new Error('Invalid email or password');
            }
            
            const user = users[0];
            
            // Check password
            const isValid = await bcrypt.compare(password, user.password_hash);
            
            if (!isValid) {
                throw new Error('Invalid email or password');
            }
            
            return {
                id: user.id,
                email: user.email
            };
        } catch (error) {
            throw error;
        }
    }
    
    // Get user by ID
    static async getUserById(userId) {
        try {
            const [users] = await pool.execute(
                'SELECT id, email, created_at FROM users WHERE id = ?',
                [userId]
            );
            
            return users[0] || null;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Auth;