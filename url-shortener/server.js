const express = require('express');
const cookieParser = require('cookie-parser');
const Auth = require('./auth');
const AIInsights = require('./insights');
const pool = require('./database');

const app = express();
const PORT = 3000;

// ====== BASIC SETUP ======
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

app.set('view engine', 'ejs');
app.set('views', './views');

app.use((req, res, next) => {
    req.userId = req.cookies.userId || null;
    next();
});

const requireAuth = (req, res, next) => {
    if (!req.userId) return res.redirect('/login');
    next();
};

function generateShortCode() {
    return Math.random().toString(36).substring(2, 8);
}

// ====== WEB ROUTES ======

// Home
app.get('/', (req, res) => {
    res.render('index', { userId: req.userId });
});

// Login
app.get('/login', (req, res) => {
    if (req.userId) return res.redirect('/dashboard');
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    try {
        const user = await Auth.login(req.body.email, req.body.password);
        res.cookie('userId', user.id, { maxAge: 86400000 });
        res.redirect('/dashboard');
    } catch (error) {
        res.render('login', { error: error.message });
    }
});

// Signup
app.get('/signup', (req, res) => {
    if (req.userId) return res.redirect('/dashboard');
    res.render('signup', { error: null });
});

app.post('/signup', async (req, res) => {
    try {
        await Auth.register(req.body.email, req.body.password);
        const user = await Auth.login(req.body.email, req.body.password);
        res.cookie('userId', user.id, { maxAge: 86400000 });
        res.redirect('/dashboard');
    } catch (error) {
        res.render('signup', { error: error.message });
    }
});

// Logout
app.get('/logout', (req, res) => {
    res.clearCookie('userId');
    res.redirect('/');
});

// Dashboard
app.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const [urls] = await pool.execute(
            'SELECT * FROM urls WHERE user_id = ? ORDER BY created_at DESC',
            [req.userId]
        );
        const user = await Auth.getUserById(req.userId);
        res.render('dashboard', { 
            user: user,
            urls: urls,
            baseUrl: `${req.protocol}://${req.get('host')}`
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.redirect('/login');
    }
});

// Shorten
app.get('/shorten', requireAuth, (req, res) => {
    res.render('shorten', { error: null, success: null, shortUrl: null });
});

app.post('/shorten', requireAuth, async (req, res) => {
    try {
        let url = req.body.long_url?.trim();
        if (!url) throw new Error('URL is required');
        
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        
        new URL(url);
        
        let shortCode;
        for (let i = 0; i < 5; i++) {
            shortCode = generateShortCode();
            const [existing] = await pool.execute(
                'SELECT id FROM urls WHERE short_code = ?',
                [shortCode]
            );
            if (existing.length === 0) break;
        }
        
        await pool.execute(
            'INSERT INTO urls (long_url, short_code, user_id) VALUES (?, ?, ?)',
            [url, shortCode, req.userId]
        );
        
        const shortUrl = `${req.protocol}://${req.get('host')}/${shortCode}`;
        res.render('shorten', {
            error: null,
            success: `Shortened! Your link: ${shortUrl}`,
            shortUrl: shortUrl
        });
        
    } catch (error) {
        res.render('shorten', { 
            error: error.message, 
            success: null, 
            shortUrl: null 
        });
    }
});

// Analytics - FIXED ROUTE
app.get('/analytics/:id', requireAuth, async (req, res) => {
    try {
        const urlId = req.params.id;
        
        // Get URL info
        const [urls] = await pool.execute(
            'SELECT * FROM urls WHERE id = ? AND user_id = ?',
            [urlId, req.userId]
        );
        
        if (urls.length === 0) {
            return res.redirect('/dashboard');
        }
        
        const url = urls[0];
        
        // Get AI insights
        const insights = await AIInsights.generateInsights(urlId, req.userId);
        
        res.render('analytics', {
            url: url,
            insights: insights,
            baseUrl: `${req.protocol}://${req.get('host')}`
        });
        
    } catch (error) {
        console.error('Analytics error:', error);
        res.redirect('/dashboard');
    }
});

// Delete
app.post('/delete/:id', requireAuth, async (req, res) => {
    try {
        await pool.execute(
            'DELETE FROM urls WHERE id = ? AND user_id = ?',
            [req.params.id, req.userId]
        );
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Delete error:', error);
        res.redirect('/dashboard');
    }
});

// ====== API ROUTES ======

// API Documentation
app.get('/api', (req, res) => {
    res.json({
        message: 'URL Shortener API',
        endpoints: {
            'GET /api/health': 'Check server status',
            'POST /api/signup': 'Create account',
            'POST /api/login': 'Login',
            'POST /api/shorten': 'Create short URL'
        }
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Sign up API
app.post('/api/signup', async (req, res) => {
    try {
        await Auth.register(req.body.email, req.body.password);
        const user = await Auth.login(req.body.email, req.body.password);
        res.cookie('userId', user.id, { maxAge: 86400000 });
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Login API
app.post('/api/login', async (req, res) => {
    try {
        const user = await Auth.login(req.body.email, req.body.password);
        res.cookie('userId', user.id, { maxAge: 86400000 });
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(401).json({ success: false, error: error.message });
    }
});

// Shorten API
app.post('/api/shorten', async (req, res) => {
    try {
        if (!req.cookies.userId) {
            return res.status(401).json({ success: false, error: 'Login required' });
        }
        
        let url = req.body.long_url?.trim();
        if (!url) throw new Error('URL is required');
        
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        
        new URL(url);
        
        let shortCode = generateShortCode();
        await pool.execute(
            'INSERT INTO urls (long_url, short_code, user_id) VALUES (?, ?, ?)',
            [url, shortCode, req.cookies.userId]
        );
        
        const shortUrl = `${req.protocol}://${req.get('host')}/${shortCode}`;
        res.json({ 
            success: true, 
            data: { short_url: shortUrl, short_code: shortCode } 
        });
        
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// ====== REDIRECT SHORT URLS ======

app.get('/:code', async (req, res) => {
    const code = req.params.code;
    
    // Don't process our own routes
    const reserved = ['login', 'signup', 'dashboard', 'shorten', 'analytics', 'logout', 'api'];
    if (reserved.includes(code)) {
        return res.status(404).render('404');
    }
    
    try {
        const [urls] = await pool.execute(
            'SELECT * FROM urls WHERE short_code = ?',
            [code]
        );
        
        if (urls.length === 0) {
            return res.status(404).render('404');
        }
        
        const url = urls[0];
        
        // Update click count
        await pool.execute(
            'UPDATE urls SET clicks = clicks + 1 WHERE id = ?',
            [url.id]
        );
        
        // Record click
        await pool.execute(
            'INSERT INTO clicks (url_id, referrer) VALUES (?, ?)',
            [url.id, req.headers.referer || 'direct']
        );
        
        res.redirect(url.long_url);
        
    } catch (error) {
        console.error('Redirect error:', error);
        res.status(500).render('error', { error: 'Server error' });
    }
});

// ====== ERROR HANDLING ======

// 404 page
app.use((req, res) => {
    res.status(404).render('404');
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err.message);
    res.status(500).render('error', { error: 'Something went wrong' });
});

// ====== START SERVER ======
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`🌐 Homepage: http://localhost:3000`);
    console.log(`📊 Dashboard: http://localhost:3000/dashboard`);
    console.log(`🤖 AI Analytics: /analytics/:id`);
});