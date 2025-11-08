import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createUser } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '..', 'tasks.db'));

console.log('\n=== Multi-User Migration Script ===\n');

/**
 * Check if a column exists in a table
 */
function columnExists(tableName, columnName) {
  const result = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return result.some(col => col.name === columnName);
}

/**
 * Check if a table exists
 */
function tableExists(tableName) {
  const result = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name=?
  `).get(tableName);
  return result !== undefined;
}

/**
 * Main migration function
 */
function migrate() {
  console.log('Step 1: Checking current schema...\n');

  // Check if users table exists
  const usersTableExists = tableExists('users');
  console.log(`   Users table exists: ${usersTableExists ? 'YES' : 'NO'}`);

  // Check if user_phone column exists in items table
  const userPhoneExists = columnExists('items', 'user_phone');
  console.log(`   user_phone column in items: ${userPhoneExists ? 'YES' : 'NO'}\n`);

  if (usersTableExists && userPhoneExists) {
    console.log('=> Schema already migrated. Nothing to do.\n');
    return;
  }

  console.log('Step 2: Beginning migration...\n');

  // Count existing items before migration
  const itemCount = db.prepare('SELECT COUNT(*) as count FROM items').get().count;
  console.log(`   Found ${itemCount} existing items\n`);

  if (!userPhoneExists) {
    console.log('   => Adding user_phone column to items table...');
    
    // SQLite doesn't support adding foreign keys to existing tables
    // We need to recreate the table
    
    // 1. Create new table with correct schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS items_new (
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
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 2. Copy data from old table to new table (user_phone will be NULL initially)
    db.exec(`
      INSERT INTO items_new (id, type, content, priority, category, deadline, context, tags, status, created_at, updated_at)
      SELECT id, type, content, priority, category, deadline, context, tags, status, created_at, updated_at
      FROM items
    `);
    
    // 3. Drop old table
    db.exec('DROP TABLE items');
    
    // 4. Rename new table to items
    db.exec('ALTER TABLE items_new RENAME TO items');
    
    console.log('      => Added user_phone column\n');
  }

  // Create users table if it doesn't exist
  if (!usersTableExists) {
    console.log('   => Creating users table...');
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
    console.log('      => Created users table\n');
  }

  console.log('Step 3: Creating default user...\n');
  
  // Default user details
  const DEFAULT_PHONE = 'whatsapp:+916388990545';
  const DEFAULT_NAME = 'Primary User';
  const DEFAULT_PASSWORD = 'change-me-123'; // User should change this!
  
  try {
    createUser(DEFAULT_PHONE, DEFAULT_NAME, DEFAULT_PASSWORD);
    console.log(`   => Created user: ${DEFAULT_NAME}`);
    console.log(`   => Phone: ${DEFAULT_PHONE}`);
    console.log(`   => Temporary Password: ${DEFAULT_PASSWORD}`);
    console.log('   => IMPORTANT: Change this password immediately!\n');
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      console.log(`   => User already exists: ${DEFAULT_PHONE}\n`);
    } else {
      throw error;
    }
  }

  console.log('Step 4: Assigning existing items to default user...\n');
  
  // Update all items without a user_phone to the default user
  const updateResult = db.prepare(`
    UPDATE items 
    SET user_phone = ? 
    WHERE user_phone IS NULL
  `).run(DEFAULT_PHONE);
  
  console.log(`   => Assigned ${updateResult.changes} items to ${DEFAULT_PHONE}\n`);

  console.log('Step 5: Creating indexes...\n');
  
  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_items_user_phone ON items(user_phone);
    CREATE INDEX IF NOT EXISTS idx_items_user_status ON items(user_phone, status);
  `);
  
  console.log('   => Created performance indexes\n');

  console.log('Step 6: Recreating FTS triggers...\n');
  
  // Drop and recreate FTS triggers to account for new schema
  db.exec(`DROP TRIGGER IF EXISTS items_ai`);
  db.exec(`DROP TRIGGER IF EXISTS items_ad`);
  db.exec(`DROP TRIGGER IF EXISTS items_au`);
  
  db.exec(`
    CREATE TRIGGER items_ai AFTER INSERT ON items BEGIN
      INSERT INTO items_fts(rowid, content, tags) VALUES (new.id, new.content, new.tags);
    END;
  `);

  db.exec(`
    CREATE TRIGGER items_ad AFTER DELETE ON items BEGIN
      INSERT INTO items_fts(items_fts, rowid, content, tags) VALUES('delete', old.id, old.content, old.tags);
    END;
  `);

  db.exec(`
    CREATE TRIGGER items_au AFTER UPDATE ON items BEGIN
      INSERT INTO items_fts(items_fts, rowid, content, tags) VALUES('delete', old.id, old.content, old.tags);
      INSERT INTO items_fts(rowid, content, tags) VALUES (new.id, new.content, new.tags);
    END;
  `);
  
  console.log('   => Recreated FTS triggers\n');

  console.log('Step 7: Verifying migration...\n');
  
  const verifyCount = db.prepare('SELECT COUNT(*) as count FROM items WHERE user_phone = ?').get(DEFAULT_PHONE).count;
  const totalCount = db.prepare('SELECT COUNT(*) as count FROM items').get().count;
  
  console.log(`   Total items: ${totalCount}`);
  console.log(`   Items assigned to ${DEFAULT_PHONE}: ${verifyCount}`);
  console.log(`   Items without user: ${totalCount - verifyCount}\n`);
  
  if (totalCount === verifyCount) {
    console.log('=> Migration completed successfully!\n');
  } else {
    console.warn('=> Warning: Some items are not assigned to a user\n');
  }
}

// Run migration
try {
  migrate();
  console.log('============================================');
  console.log('=> Migration complete!\n');
  console.log('Next steps:');
  console.log('   1. Change the default password');
  console.log('   2. Restart your bot server');
  console.log('   3. Test with WhatsApp and dashboard\n');
} catch (error) {
  console.error('\nERROR: Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}
