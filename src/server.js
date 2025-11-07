import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getItems, getStats, getCategories } from './database.js';
import { handleIncomingMessage } from './webhook.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // For Twilio webhook form data
app.use(express.static(join(__dirname, '..', 'public')));

/**
 * Twilio Webhook Route
 */

// Webhook endpoint for incoming WhatsApp messages from Twilio
app.post('/webhook/whatsapp', handleIncomingMessage);

/**
 * API Routes
 */

// Get all items with optional filters
app.get('/api/items', (req, res) => {
  try {
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

    const items = getItems(filters);
    res.json({ success: true, items, count: items.length });
  } catch (error) {
    console.error('API Error (items):', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get statistics
app.get('/api/stats', (req, res) => {
  try {
    const stats = getStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all categories
app.get('/api/categories', (req, res) => {
  try {
    const categories = getCategories();
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get bot status (Twilio webhook-based - always ready if server is running)
app.get('/api/status', (req, res) => {
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

