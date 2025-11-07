import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connect to database
const db = new Database(join(__dirname, '..', 'tasks.db'));

/**
 * Create readline interface for user confirmation
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Ask user for confirmation
 */
function askConfirmation(question) {
  return new Promise((resolve) => {
    const rl = createReadlineInterface();
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Get current database statistics
 */
function getCurrentStats() {
  const totalItems = db.prepare('SELECT COUNT(*) as count FROM items').get().count;
  const totalTasks = db.prepare("SELECT COUNT(*) as count FROM items WHERE type = 'task'").get().count;
  const totalIdeas = db.prepare("SELECT COUNT(*) as count FROM items WHERE type = 'idea'").get().count;
  
  const byStatus = db.prepare(`
    SELECT status, COUNT(*) as count 
    FROM items 
    GROUP BY status
  `).all();
  
  const byPriority = db.prepare(`
    SELECT priority, COUNT(*) as count 
    FROM items 
    WHERE priority IS NOT NULL
    GROUP BY priority
  `).all();
  
  return {
    totalItems,
    totalTasks,
    totalIdeas,
    byStatus,
    byPriority
  };
}

/**
 * Display current database contents
 */
function displayCurrentState() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 CURRENT DATABASE STATE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const stats = getCurrentStats();
  
  if (stats.totalItems === 0) {
    console.log('✅ Database is already empty!\n');
    return stats;
  }
  
  console.log(`Total Items: ${stats.totalItems}`);
  console.log(`  - Tasks: ${stats.totalTasks}`);
  console.log(`  - Ideas: ${stats.totalIdeas}\n`);
  
  if (stats.byStatus.length > 0) {
    console.log('By Status:');
    stats.byStatus.forEach(({ status, count }) => {
      console.log(`  - ${status}: ${count}`);
    });
    console.log('');
  }
  
  if (stats.byPriority.length > 0) {
    console.log('By Priority:');
    stats.byPriority.forEach(({ priority, count }) => {
      console.log(`  - ${priority}: ${count}`);
    });
    console.log('');
  }
  
  // Show sample items
  const sampleItems = db.prepare(`
    SELECT id, type, content, created_at, priority, category
    FROM items
    ORDER BY created_at DESC
    LIMIT 5
  `).all();
  
  if (sampleItems.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Sample Items (showing last 5):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    sampleItems.forEach((item, index) => {
      const contentPreview = item.content.length > 80 
        ? item.content.substring(0, 80) + '...' 
        : item.content;
      
      console.log(`[${index + 1}] ID: ${item.id} | Type: ${item.type} | Date: ${item.created_at}`);
      console.log(`    Content: ${contentPreview}`);
      if (item.category) console.log(`    Category: ${item.category}`);
      if (item.priority) console.log(`    Priority: ${item.priority}`);
      console.log('');
    });
  }
  
  return stats;
}

/**
 * Delete all items from database
 */
function deleteAllItems() {
  console.log('🗑️  Starting complete database reset...\n');
  
  const deleteTransaction = db.transaction(() => {
    // Delete all items (triggers will auto-clean FTS table)
    const deleteResult = db.prepare('DELETE FROM items').run();
    
    // Reset the autoincrement counter (using parameterized query for safety)
    db.prepare('DELETE FROM sqlite_sequence WHERE name = ?').run('items');
    
    return deleteResult.changes;
  });
  
  const deletedCount = deleteTransaction();
  
  console.log(`✅ Deleted ${deletedCount} items from database\n`);
  
  return deletedCount;
}

/**
 * Verify database is empty
 */
function verifyReset() {
  console.log('🔍 Verifying database reset...\n');
  
  const remaining = db.prepare('SELECT COUNT(*) as count FROM items').get().count;
  const ftsRemaining = db.prepare('SELECT COUNT(*) as count FROM items_fts').get().count;
  
  if (remaining === 0 && ftsRemaining === 0) {
    console.log('✅ Verification passed: Database is completely empty');
    console.log('   - Items table: 0 records');
    console.log('   - FTS table: 0 records\n');
    return true;
  } else {
    console.log(`⚠️  Warning: Database not fully empty`);
    console.log(`   - Items table: ${remaining} records`);
    console.log(`   - FTS table: ${ftsRemaining} records\n`);
    return false;
  }
}

/**
 * Main reset function
 */
async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚨 DATABASE RESET SCRIPT - NUCLEAR OPTION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⚠️  WARNING: This will DELETE ALL items from your database!');
  console.log('⚠️  This includes ALL tasks, ideas, and their tags!');
  console.log('⚠️  This operation CANNOT be undone!\n');
  console.log('💡 STRONGLY RECOMMENDED: Backup tasks.db before proceeding!\n');
  console.log('   To backup:');
  console.log('   - Windows: copy tasks.db tasks-backup.db');
  console.log('   - Mac/Linux: cp tasks.db tasks-backup.db\n');
  
  try {
    // Step 1: Show current state
    const stats = displayCurrentState();
    
    // Exit if database is already empty
    if (stats.totalItems === 0) {
      console.log('✨ Nothing to delete! Database is already empty.\n');
      db.close();
      process.exit(0);
    }
    
    // Step 2: First confirmation
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`⚠️  You are about to DELETE ${stats.totalItems} items permanently!\n`);
    
    const firstConfirmation = await askConfirmation(
      '❓ Have you backed up your database? (yes/no): '
    );
    
    if (firstConfirmation.toLowerCase() !== 'yes') {
      console.log('\n❌ Operation cancelled. Please backup your database first!\n');
      console.log('To backup:');
      console.log('  Windows: copy tasks.db tasks-backup.db');
      console.log('  Mac/Linux: cp tasks.db tasks-backup.db\n');
      db.close();
      process.exit(0);
    }
    
    // Step 3: Second confirmation (safety check)
    console.log('\n⚠️  FINAL WARNING: This will delete EVERYTHING!\n');
    console.log(`You will lose:`);
    console.log(`  - ${stats.totalTasks} tasks`);
    console.log(`  - ${stats.totalIdeas} ideas`);
    console.log(`  - All associated metadata (tags, categories, etc.)`);
    console.log(`  - All history (cannot be recovered)\n`);
    
    const secondConfirmation = await askConfirmation(
      '❓ Type "DELETE EVERYTHING" to confirm (case-sensitive): '
    );
    
    if (secondConfirmation !== 'DELETE EVERYTHING') {
      console.log('\n❌ Reset cancelled - confirmation text did not match\n');
      console.log('✓ Your data is safe!\n');
      db.close();
      process.exit(0);
    }
    
    // Step 4: Perform deletion
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    const deletedCount = deleteAllItems();
    
    // Step 5: Verify reset
    verifyReset();
    
    // Step 6: Final message
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ DATABASE RESET COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`✅ Deleted ${deletedCount} items`);
    console.log('✅ Database is now empty and ready for fresh start');
    console.log('✅ FTS (Full-Text Search) table automatically cleared');
    console.log('✅ Auto-increment counter reset to 1\n');
    console.log('💡 You can now start using your bot with a clean slate!');
    console.log('💡 New items will start with ID: 1\n');
    console.log('🔄 If you made a mistake, restore from backup:');
    console.log('   - Windows: copy tasks-backup.db tasks.db');
    console.log('   - Mac/Linux: cp tasks-backup.db tasks.db\n');
    
  } catch (error) {
    console.error('\n❌ ERROR during reset:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('\n💡 Database connection will be closed safely.');
    console.error('💡 Your data may or may not have been affected.\n');
  } finally {
    // Always close database connection
    db.close();
    console.log('✓ Database connection closed\n');
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Process interrupted by user');
  console.log('✓ Database connection closed');
  console.log('✓ Your data is safe!\n');
  db.close();
  process.exit(0);
});

// Run the script
main();

