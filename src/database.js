import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '..', 'tasks.db'));

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

/**
 * Password hashing utilities
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

/**
 * Generate secure random password
 */
export function generatePassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const randomBytes = crypto.randomBytes(length);
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  
  return password;
}

/**
 * Initialize database schema
 */
export function initializeDatabase() {
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      phone_number TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_active TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_phone TEXT,
      type TEXT NOT NULL CHECK(type IN ('task', 'idea')),
      content TEXT NOT NULL,
      priority TEXT CHECK(priority IN ('high', 'medium', 'low')),
      category TEXT,
      deadline TEXT,
      context TEXT,
      tags TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_phone) REFERENCES users(phone_number)
    )
  `);

  // Create categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      parent_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES categories(id)
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_items_user_phone ON items(user_phone);
    CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
    CREATE INDEX IF NOT EXISTS idx_items_priority ON items(priority);
    CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
    CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
    CREATE INDEX IF NOT EXISTS idx_items_deadline ON items(deadline);
    CREATE INDEX IF NOT EXISTS idx_items_tags ON items(tags);
    CREATE INDEX IF NOT EXISTS idx_items_user_status ON items(user_phone, status);
  `);

  // Insert default categories if they don't exist
  const defaultCategories = ['personal', 'interns', 'identity labs'];
  const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
  
  for (const category of defaultCategories) {
    insertCategory.run(category);
  }

  console.log('✓ Database initialized successfully');
}

/**
 * User management functions
 */

/**
 * Get user by phone number
 */
export function getUserByPhone(phone_number) {
  const stmt = db.prepare('SELECT * FROM users WHERE phone_number = ?');
  return stmt.get(phone_number);
}

/**
 * Authenticate user (for dashboard login)
 */
export function authenticateUser(phone_number, password) {
  const user = getUserByPhone(phone_number);
  
  if (!user) {
    return null;
  }
  
  if (user.status !== 'active') {
    console.log(`User ${phone_number} is inactive`);
    return null;
  }
  
  const isValid = verifyPassword(password, user.password_hash);
  
  if (isValid) {
    // Update last_active timestamp
    db.prepare('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE phone_number = ?')
      .run(phone_number);
    return {
      phone_number: user.phone_number,
      name: user.name,
      status: user.status
    };
  }
  
  return null;
}

/**
 * Auto-register new user (called on first WhatsApp message)
 * SIMPLE VERSION - No manual setup needed!
 */
export function autoRegisterUser(phone_number) {
  // Extract name from phone number
  const name = `User ${phone_number.replace('whatsapp:', '')}`;
  
  // Generate secure random password
  const password = generatePassword(12);
  const password_hash = hashPassword(password);
  
  const stmt = db.prepare(`
    INSERT INTO users (phone_number, name, password_hash)
    VALUES (?, ?, ?)
  `);
  
  try {
    stmt.run(phone_number, name, password_hash);
    console.log(`✓ Auto-registered new user: ${name} (${phone_number})`);
    
    // Return user info with plain password (only time it's visible)
    return {
      phone_number,
      name,
      password,  // Plain text - will be sent to user via WhatsApp
      isNewUser: true
    };
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      console.log(`User ${phone_number} already exists`);
      return null;
    }
    throw error;
  }
}

/**
 * Create user manually (for admin use)
 */
export function createUser(phone_number, name, password) {
  const password_hash = hashPassword(password);
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO users (phone_number, name, password_hash)
    VALUES (?, ?, ?)
  `);
  
  stmt.run(phone_number, name, password_hash);
  console.log(`✓ Created/updated user: ${name} (${phone_number})`);
  return true;
}

/**
 * Save a new item (task or idea)
 */
export function saveItem({ user_phone, type, content, priority, category, deadline, context, tags }) {
  // First, ensure the category exists
  if (category) {
    const categoryExists = db.prepare('SELECT id FROM categories WHERE name = ?').get(category);
    if (!categoryExists) {
      db.prepare('INSERT INTO categories (name) VALUES (?)').run(category);
      console.log(`✓ Created new category: ${category}`);
    }
  }

  // Convert tags array to comma-separated string
  const tagsString = tags && Array.isArray(tags) ? tags.join(',') : tags || '';

  const stmt = db.prepare(`
    INSERT INTO items (user_phone, type, content, priority, category, deadline, context, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(user_phone, type, content, priority, category, deadline, context, tagsString);
  
  console.log(`✓ Saved ${type}: ${content.substring(0, 50)}...`);
  if (tagsString) {
    console.log(`  Tags: ${tagsString}`);
  }
  return result.lastInsertRowid;
}

/**
 * Get all items with optional filters (scoped to user)
 */
export function getItems(user_phone, filters = {}) {
  let query = 'SELECT * FROM items WHERE user_phone = ?';
  const params = [user_phone];

  if (filters.type) {
    query += ' AND type = ?';
    params.push(filters.type);
  }

  if (filters.priority) {
    query += ' AND priority = ?';
    params.push(filters.priority);
  }

  if (filters.category) {
    query += ' AND category = ?';
    params.push(filters.category);
  }

  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters.search) {
    query += ' AND content LIKE ?';
    params.push(`%${filters.search}%`);
  }

  query += ' ORDER BY created_at DESC';

  const stmt = db.prepare(query);
  return stmt.all(...params);
}

/**
 * Get a single item by ID (with user verification)
 */
export function getItemById(id, user_phone) {
  const stmt = db.prepare('SELECT * FROM items WHERE id = ? AND user_phone = ?');
  return stmt.get(id, user_phone);
}

/**
 * Update item status (with user verification)
 */
export function updateItemStatus(id, status, user_phone) {
  const stmt = db.prepare(`
    UPDATE items 
    SET status = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ? AND user_phone = ?
  `);
  return stmt.run(status, id, user_phone);
}

/**
 * Delete an item (with user verification)
 */
export function deleteItem(id, user_phone) {
  const stmt = db.prepare('DELETE FROM items WHERE id = ? AND user_phone = ?');
  return stmt.run(id, user_phone);
}

/**
 * Get all categories
 */
export function getCategories() {
  const stmt = db.prepare('SELECT * FROM categories ORDER BY name');
  return stmt.all();
}

/**
 * Create a new category
 */
export function createCategory(name, parentId = null) {
  const stmt = db.prepare('INSERT INTO categories (name, parent_id) VALUES (?, ?)');
  try {
    const result = stmt.run(name, parentId);
    console.log(`✓ Created category: ${name}`);
    return result.lastInsertRowid;
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      console.log(`Category "${name}" already exists`);
      return null;
    }
    throw error;
  }
}

/**
 * Get statistics for dashboard (scoped to user)
 */
export function getStats(user_phone) {
  const totalTasks = db.prepare("SELECT COUNT(*) as count FROM items WHERE user_phone = ? AND type = 'task'").get(user_phone).count;
  const totalIdeas = db.prepare("SELECT COUNT(*) as count FROM items WHERE user_phone = ? AND type = 'idea'").get(user_phone).count;
  
  const byPriority = db.prepare(`
    SELECT priority, COUNT(*) as count 
    FROM items 
    WHERE user_phone = ? AND status = 'pending' AND priority IS NOT NULL
    GROUP BY priority
  `).all(user_phone);

  const byCategory = db.prepare(`
    SELECT category, COUNT(*) as count 
    FROM items 
    WHERE user_phone = ? AND status = 'pending' AND category IS NOT NULL
    GROUP BY category
    ORDER BY count DESC
    LIMIT 10
  `).all(user_phone);

  const byStatus = db.prepare(`
    SELECT status, COUNT(*) as count 
    FROM items 
    WHERE user_phone = ?
    GROUP BY status
  `).all(user_phone);

  return {
    totalTasks,
    totalIdeas,
    total: totalTasks + totalIdeas,
    byPriority: byPriority.reduce((acc, item) => {
      acc[item.priority] = item.count;
      return acc;
    }, {}),
    byCategory: byCategory.reduce((acc, item) => {
      acc[item.category] = item.count;
      return acc;
    }, {}),
    byStatus: byStatus.reduce((acc, item) => {
      acc[item.status] = item.count;
      return acc;
    }, {})
  };
}

/**
 * Search items by tags (scoped to user)
 */
export function searchByTags(tagKeywords, user_phone) {
  if (!tagKeywords || tagKeywords.length === 0) {
    return [];
  }

  let query = 'SELECT * FROM items WHERE user_phone = ?';
  const params = [user_phone];

  // Build OR conditions for each tag keyword
  const tagConditions = tagKeywords.map(() => 'tags LIKE ?').join(' OR ');
  query += ` AND (${tagConditions})`;
  
  // Add wildcards to each keyword
  tagKeywords.forEach(keyword => {
    params.push(`%${keyword}%`);
  });

  query += ' ORDER BY created_at DESC LIMIT 50';

  const stmt = db.prepare(query);
  return stmt.all(...params);
}

/**
 * Full-text search using FTS5 (scoped to user)
 */
export function searchFullText(searchQuery, user_phone) {
  if (!searchQuery || searchQuery.trim() === '') {
    return [];
  }

  // FTS5 query - searches both content and tags
  const stmt = db.prepare(`
    SELECT items.* 
    FROM items 
    JOIN items_fts ON items.id = items_fts.rowid 
    WHERE items.user_phone = ? AND items_fts MATCH ? 
    ORDER BY rank 
    LIMIT 50
  `);

  try {
    return stmt.all(user_phone, searchQuery);
  } catch (error) {
    console.error('FTS search error:', error.message);
    // Fallback to simple LIKE search
    return searchByContent(searchQuery, user_phone);
  }
}

/**
 * Fallback search using LIKE (if FTS fails)
 */
function searchByContent(searchQuery, user_phone) {
  const stmt = db.prepare(`
    SELECT * FROM items 
    WHERE user_phone = ? AND (content LIKE ? OR tags LIKE ?)
    ORDER BY created_at DESC 
    LIMIT 50
  `);
  return stmt.all(user_phone, `%${searchQuery}%`, `%${searchQuery}%`);
}

/**
 * Close database connection (for graceful shutdown)
 */
export function closeDatabase() {
  db.close();
  console.log('✓ Database connection closed');
}

export default db;

