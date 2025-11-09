import express from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getItems, getStats, getCategories, authenticateUser, authenticateByPassword } from './database.js';
import { handleIncomingMessage } from './webhook.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // For Twilio webhook form data

// Session middleware
const sessionSecret = process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production';
console.log(`🔐 Session secret configured: ${sessionSecret.substring(0, 10)}...`);

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: 'auto', // Auto-detect HTTPS (works better with proxies like Railway)
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Needed for proper cookie handling
  },
  name: 'wabot.sid' // Custom session name
}));

// Auth middleware - checks if user is logged in
const requireAuth = (req, res, next) => {
  console.log(`🔒 [AUTH MIDDLEWARE] Checking auth for: ${req.path}`);
  console.log(`   Session ID: ${req.sessionID}`);
  console.log(`   Authenticated: ${req.session?.authenticated}`);
  console.log(`   User: ${req.session?.phone_number}`);
  
  if (req.session && req.session.authenticated) {
    console.log(`✓ [AUTH MIDDLEWARE] User authorized: ${req.session.name}`);
    return next();
  }
  
  console.log(`❌ [AUTH MIDDLEWARE] Not authenticated, redirecting to login`);
  
  // For API calls, return JSON error
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ success: false, error: 'Unauthorized', needsAuth: true });
  }
  
  // For page requests, redirect to login
  res.redirect('/login');
};

// Serve login page (public)
app.get('/login', (req, res) => {
  // If already logged in, redirect to dashboard
  if (req.session && req.session.authenticated) {
    return res.redirect('/');
  }
  res.sendFile(join(__dirname, '..', 'public', 'login.html'));
});

// Serve static files only for authenticated users (except login.html)
app.use(express.static(join(__dirname, '..', 'public'), {
  index: false,
  setHeaders: (res, path) => {
    if (path.endsWith('login.html')) {
      return; // Login page is public
    }
  }
}));

// Dashboard - protected
app.get('/', requireAuth, (req, res) => {
  res.sendFile(join(__dirname, '..', 'public', 'index.html'));
});

/**
 * Authentication Routes
 */

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per window
  message: { success: false, error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Login endpoint
app.post('/auth/login', loginLimiter, async (req, res) => {
  const { phone_number, password } = req.body;
  
  if (!password) {
    return res.json({ success: false, error: 'Password is required' });
  }
  
  let user = null;
  
  // Try password-only authentication first (for convenience)
  if (!phone_number || phone_number.trim() === '') {
    console.log('📱 [LOGIN] Password-only login attempt');
    user = await authenticateByPassword(password);
  } else {
    // Authenticate with phone number + password
    console.log('📱 [LOGIN] Phone + password login attempt');
    user = await authenticateUser(phone_number, password);
  }
  
  if (user) {
    // Set session data
    req.session.authenticated = true;
    req.session.phone_number = user.phone_number;
    req.session.name = user.name;
    
    // Explicitly save session before responding
    req.session.save((err) => {
      if (err) {
        console.error('❌ [LOGIN] Session save error:', err);
        return res.json({ success: false, error: 'Session error. Please try again.' });
      }
      
      console.log(`✓ [LOGIN] User logged in: ${user.name}`);
      console.log(`✓ [LOGIN] Session ID: ${req.sessionID}`);
      console.log(`✓ [LOGIN] Session saved successfully`);
      res.json({ success: true, message: 'Login successful', user: { name: user.name, phone_number: user.phone_number } });
    });
  } else {
    console.log('❌ [LOGIN] Authentication failed');
    res.json({ success: false, error: 'Invalid credentials' });
  }
});

// Logout endpoint
app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.json({ success: false, error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Check auth status
app.get('/auth/status', (req, res) => {
  res.json({ 
    authenticated: req.session && req.session.authenticated,
    phone_number: req.session ? req.session.phone_number : null,
    name: req.session ? req.session.name : null
  });
});

// Debug endpoints - ONLY available in development mode with authentication
if (process.env.NODE_ENV === 'development') {
  app.get('/debug/users', requireAuth, async (req, res) => {
    try {
      const { getAllUsers } = await import('./database.js');
      const users = await getAllUsers();
      res.json({ 
        success: true, 
        userCount: users.length,
        users: users.map(u => ({ 
          phone: u.phone_number, 
          name: u.name, 
          status: u.status,
          created_at: u.created_at,
          last_active: u.last_active
        }))
      });
    } catch (error) {
      res.json({ success: false, error: error.message });
    }
  });
}

/**
 * Twilio Webhook Route (PUBLIC - no auth required)
 */

// Webhook endpoint for incoming WhatsApp messages from Twilio
app.post('/webhook/whatsapp', handleIncomingMessage);

/**
 * API Routes (PROTECTED - auth required)
 */

// Get all items with optional filters
app.get('/api/items', requireAuth, async (req, res) => {
  try {
    const user_phone = req.session.phone_number;
    
    const filters = {
      type: req.query.type,
      priority: req.query.priority,
      category: req.query.category,
      status: req.query.status,
      search: req.query.search,
      limit: 1000  // Limit to prevent loading too many items
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined || filters[key] === '') delete filters[key];
    });

    const items = await getItems(user_phone, filters);
    res.json({ success: true, items, count: items.length });
  } catch (error) {
    console.error('API Error (items):', error);
    res.status(500).json({ success: false, error: 'Failed to load items. Please try again.' });
  }
});

// Get statistics
app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const user_phone = req.session.phone_number;
    const stats = await getStats(user_phone);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('API Error (stats):', error);
    res.status(500).json({ success: false, error: 'Failed to load statistics. Please try again.' });
  }
});

// Get all categories
app.get('/api/categories', requireAuth, async (req, res) => {
  try {
    const categories = await getCategories();
    res.json({ success: true, categories });
  } catch (error) {
    console.error('API Error (categories):', error);
    res.status(500).json({ success: false, error: 'Failed to load categories. Please try again.' });
  }
});

// Get bot status (Twilio webhook-based - always ready if server is running)
app.get('/api/status', requireAuth, (req, res) => {
  try {
    const status = {
      isReady: true,
      provider: 'twilio',
      webhookActive: true,
      timestamp: new Date().toISOString()
    };
    res.json({ success: true, status });
  } catch (error) {
    console.error('API Error (status):', error);
    res.json({ success: false, status: { isReady: false }, error: error.message });
  }
});

// Health check with database status
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'unknown',
    uptime: process.uptime()
  };
  
  try {
    // Try to ping MongoDB
    const { db } = await import('./database.js');
    if (db) {
      await db.admin().ping();
      health.database = 'connected';
    } else {
      health.database = 'not_initialized';
      health.status = 'degraded';
    }
  } catch (error) {
    console.error('Health check - database error:', error.message);
    health.database = 'disconnected';
    health.status = 'unhealthy';
    return res.status(503).json(health);
  }
  
  res.json(health);
});

/**
 * Start server
 */
export function startServer(port = 3000) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`✓ Dashboard server running at http://localhost:${port}`);
      console.log(`✓ API available at http://localhost:${port}/api`);
      console.log(`✓ Twilio webhook endpoint: http://localhost:${port}/webhook/whatsapp`);
      resolve(server);
    });
  });
}

export default app;

