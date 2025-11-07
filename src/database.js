import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '..', 'tasks.db'));

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

/**
 * Initialize database schema
 */
export function initializeDatabase() {
  // Create items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('task', 'idea')),
      content TEXT NOT NULL,
      priority TEXT CHECK(priority IN ('high', 'medium', 'low')),
      category TEXT,
      deadline TEXT,
      context TEXT,
      tags TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
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
    CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
    CREATE INDEX IF NOT EXISTS idx_items_priority ON items(priority);
    CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
    CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
    CREATE INDEX IF NOT EXISTS idx_items_deadline ON items(deadline);
    CREATE INDEX IF NOT EXISTS idx_items_tags ON items(tags);
  `);

  // Create FTS5 virtual table for full-text search
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
      content, 
      tags, 
      content='items', 
      content_rowid='id'
    );
  `);

  // Create triggers to keep FTS table in sync
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
      INSERT INTO items_fts(rowid, content, tags) VALUES (new.id, new.content, new.tags);
    END;
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
      INSERT INTO items_fts(items_fts, rowid, content, tags) VALUES('delete', old.id, old.content, old.tags);
    END;
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
      INSERT INTO items_fts(items_fts, rowid, content, tags) VALUES('delete', old.id, old.content, old.tags);
      INSERT INTO items_fts(rowid, content, tags) VALUES (new.id, new.content, new.tags);
    END;
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
 * Save a new item (task or idea)
 */
export function saveItem({ type, content, priority, category, deadline, context, tags }) {
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
    INSERT INTO items (type, content, priority, category, deadline, context, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(type, content, priority, category, deadline, context, tagsString);
  
  console.log(`✓ Saved ${type}: ${content.substring(0, 50)}...`);
  if (tagsString) {
    console.log(`  Tags: ${tagsString}`);
  }
  return result.lastInsertRowid;
}

/**
 * Get all items with optional filters
 */
export function getItems(filters = {}) {
  let query = 'SELECT * FROM items WHERE 1=1';
  const params = [];

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

  // Add date range filtering
  if (filters.deadlineFrom) {
    query += ' AND deadline >= ?';
    params.push(filters.deadlineFrom);
  }

  if (filters.deadlineTo) {
    query += ' AND deadline <= ?';
    params.push(filters.deadlineTo);
  }

  // Add sorting
  const sortBy = filters.sortBy || 'created_at';
  const sortOrder = filters.sortOrder || 'DESC';
  query += ` ORDER BY ${sortBy} ${sortOrder}`;

  // Add limit and offset for pagination
  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
    
    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }
  }

  const stmt = db.prepare(query);
  return stmt.all(...params);
}

/**
 * Get a single item by ID
 */
export function getItemById(id) {
  const stmt = db.prepare('SELECT * FROM items WHERE id = ?');
  return stmt.get(id);
}

/**
 * Update item status
 */
export function updateItemStatus(id, status) {
  const stmt = db.prepare(`
    UPDATE items 
    SET status = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `);
  return stmt.run(status, id);
}

/**
 * Delete an item
 */
export function deleteItem(id) {
  const stmt = db.prepare('DELETE FROM items WHERE id = ?');
  return stmt.run(id);
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
 * Get statistics for dashboard
 */
export function getStats() {
  const totalTasks = db.prepare("SELECT COUNT(*) as count FROM items WHERE type = 'task'").get().count;
  const totalIdeas = db.prepare("SELECT COUNT(*) as count FROM items WHERE type = 'idea'").get().count;
  
  const byPriority = db.prepare(`
    SELECT priority, COUNT(*) as count 
    FROM items 
    WHERE status = 'pending' AND priority IS NOT NULL
    GROUP BY priority
  `).all();

  const byCategory = db.prepare(`
    SELECT category, COUNT(*) as count 
    FROM items 
    WHERE status = 'pending' AND category IS NOT NULL
    GROUP BY category
    ORDER BY count DESC
    LIMIT 10
  `).all();

  const byStatus = db.prepare(`
    SELECT status, COUNT(*) as count 
    FROM items 
    GROUP BY status
  `).all();

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
 * Search items by tags
 */
export function searchByTags(tagKeywords) {
  if (!tagKeywords || tagKeywords.length === 0) {
    return [];
  }

  let query = 'SELECT * FROM items WHERE 1=1';
  const params = [];

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
 * Full-text search using FTS5
 */
export function searchFullText(searchQuery) {
  if (!searchQuery || searchQuery.trim() === '') {
    return [];
  }

  // FTS5 query - searches both content and tags
  const stmt = db.prepare(`
    SELECT items.* 
    FROM items 
    JOIN items_fts ON items.id = items_fts.rowid 
    WHERE items_fts MATCH ? 
    ORDER BY rank 
    LIMIT 50
  `);

  try {
    return stmt.all(searchQuery);
  } catch (error) {
    console.error('FTS search error:', error.message);
    // Fallback to simple LIKE search
    return searchByContent(searchQuery);
  }
}

/**
 * Fallback search using LIKE (if FTS fails)
 */
function searchByContent(searchQuery) {
  const stmt = db.prepare(`
    SELECT * FROM items 
    WHERE content LIKE ? OR tags LIKE ?
    ORDER BY created_at DESC 
    LIMIT 50
  `);
  return stmt.all(`%${searchQuery}%`, `%${searchQuery}%`);
}

/**
 * Update tags for an existing item
 */
export function updateItemTags(id, tags) {
  const tagsString = Array.isArray(tags) ? tags.join(',') : tags;
  const stmt = db.prepare(`
    UPDATE items 
    SET tags = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `);
  return stmt.run(tagsString, id);
}

/**
 * Get items without tags (for migration)
 */
export function getItemsWithoutTags() {
  const stmt = db.prepare(`
    SELECT * FROM items 
    WHERE tags IS NULL OR tags = ''
    ORDER BY created_at DESC
  `);
  return stmt.all();
}

/**
 * Close database connection (for graceful shutdown)
 */
export function closeDatabase() {
  db.close();
  console.log('✓ Database connection closed');
}

export default db;

