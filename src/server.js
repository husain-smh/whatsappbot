import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getItems, getStats, getCategories, authenticateUser } from './database.js';
import { handleIncomingMessage } from './webhook.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // For Twilio webhook form data

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Auth middleware - checks if user is logged in
const requireAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return next();
  }
  
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

// Login endpoint
app.post('/auth/login', (req, res) => {
  const { phone_number, password } = req.body;
  
  if (!phone_number || !password) {
    return res.json({ success: false, error: 'Phone number and password are required' });
  }
  
  // Authenticate user from database
  const user = authenticateUser(phone_number, password);
  
  if (user) {
    req.session.authenticated = true;
    req.session.phone_number = user.phone_number;
    req.session.name = user.name;
    res.json({ success: true, message: 'Login successful', user: { name: user.name, phone_number: user.phone_number } });
  } else {
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

/**
 * Twilio Webhook Route (PUBLIC - no auth required)
 */

// Webhook endpoint for incoming WhatsApp messages from Twilio
app.post('/webhook/whatsapp', handleIncomingMessage);

/**
 * API Routes (PROTECTED - auth required)
 */

// Get all items with optional filters
app.get('/api/items', requireAuth, (req, res) => {
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

    const items = getItems(user_phone, filters);
    res.json({ success: true, items, count: items.length });
  } catch (error) {
    console.error('API Error (items):', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get statistics
app.get('/api/stats', requireAuth, (req, res) => {
  try {
    const user_phone = req.session.phone_number;
    const stats = getStats(user_phone);
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all categories
app.get('/api/categories', requireAuth, (req, res) => {
  try {
    const categories = getCategories();
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString() });
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

