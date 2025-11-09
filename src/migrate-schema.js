/**
 * Schema migration script - adds tags column and FTS5 to existing database
 * Run this FIRST before migrate-tags.js
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '..', 'tasks.db'));

console.log('🔄 Starting schema migration...\n');

try {
  // Check if tags column exists
  const tableInfo = db.pragma('table_info(items)');
  const hasTagsColumn = tableInfo.some(col => col.name === 'tags');
  
  if (!hasTagsColumn) {
    console.log('📝 Adding tags column to items table...');
    db.exec('ALTER TABLE items ADD COLUMN tags TEXT');
    console.log('✓ Tags column added');
    
    console.log('📝 Creating index on tags...');
    db.exec('CREATE INDEX IF NOT EXISTS idx_items_tags ON items(tags)');
    console.log('✓ Index created');
  } else {
    console.log('✓ Tags column already exists');
  }
  
  // Check if FTS5 table exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='items_fts'").all();
  
  if (tables.length === 0) {
    console.log('\n📝 Creating FTS5 virtual table...');
    db.exec(`
      CREATE VIRTUAL TABLE items_fts USING fts5(
        content, 
        tags, 
        content='items', 
        content_rowid='id'
      )
    `);
    console.log('✓ FTS5 table created');
    
    console.log('\n📝 Creating triggers for FTS5 sync...');
    
    // Insert trigger
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
        INSERT INTO items_fts(rowid, content, tags) VALUES (new.id, new.content, new.tags);
      END
    `);
    console.log('✓ Insert trigger created');
    
    // Delete trigger
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
        INSERT INTO items_fts(items_fts, rowid, content, tags) VALUES('delete', old.id, old.content, old.tags);
      END
    `);
    console.log('✓ Delete trigger created');
    
    // Update trigger
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
        INSERT INTO items_fts(items_fts, rowid, content, tags) VALUES('delete', old.id, old.content, old.tags);
        INSERT INTO items_fts(rowid, content, tags) VALUES (new.id, new.content, new.tags);
      END
    `);
    console.log('✓ Update trigger created');
    
    // Populate FTS5 with existing data
    console.log('\n📝 Populating FTS5 table with existing items...');
    const existingItems = db.prepare('SELECT id, content, tags FROM items').all();
    const insertFTS = db.prepare('INSERT INTO items_fts(rowid, content, tags) VALUES (?, ?, ?)');
    
    for (const item of existingItems) {
      insertFTS.run(item.id, item.content, item.tags || '');
    }
    console.log(`✓ Populated FTS5 with ${existingItems.length} items`);
    
  } else {
    console.log('✓ FTS5 table already exists');
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Schema migration complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📌 Next step: Run `npm run migrate-tags` to generate tags\n');
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  db.close();
}


