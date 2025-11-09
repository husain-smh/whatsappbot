# Bot Response Cleanup Guide

## 🎯 Problem

Your WhatsApp bot has been mistakenly storing bot responses in the database as tasks/ideas. This happens when bot messages (that start with `[BOT]` prefix) get saved to the `items` table instead of being ignored.

## ❓ Why This Happened

Looking at the bot architecture:
- Bot sends responses with `[BOT]` prefix (see `bot.js` line 15)
- Bot is supposed to skip its own messages (check at line 254)
- However, some bot responses got stored in the database
- This clutters your tasks/ideas with bot confirmations and responses

## ✨ Solution

We've created a **safe cleanup script** that:
- ✅ Identifies all items starting with `[BOT]` prefix
- ✅ Shows you a preview before deleting anything
- ✅ Asks for confirmation
- ✅ Deletes bot responses from both main table and FTS (Full-Text Search) table
- ✅ Provides detailed statistics and verification

## 🚀 How to Use

### Step 1: Backup (Recommended)

Before running any cleanup, backup your database:

```bash
# On Windows
copy tasks.db tasks-backup.db

# On Mac/Linux
cp tasks.db tasks-backup.db
```

### Step 2: Run the Cleanup Script

```bash
npm run cleanup-bot-responses
```

### Step 3: Review the Preview

The script will show you:
- **Total count** of bot responses found
- **Statistics** by type and category
- **Sample items** (first 10) that will be deleted

Example output:
```
📊 Total bot responses found: 47

By Type:
  - task: 32
  - idea: 15

📝 Sample Items (showing first 10):
[1] ID: 123 | Type: task | Date: 2024-11-05
    Content: [BOT] ✅ Saved as task (ID: 122)
    
[2] ID: 145 | Type: idea | Date: 2024-11-05
    Content: [BOT] 💡 Saved as idea (ID: 144)
...
```

### Step 4: Confirm Deletion

The script will ask for confirmation:

```
❓ Do you want to DELETE 47 bot response(s)? (y/n):
```

- Type `y` or `yes` to proceed
- Type `n` or `no` to cancel

### Step 5: Review Results

After cleanup:
```
✅ Successfully deleted 47 bot responses
✅ Verification passed: No bot responses remaining
✅ Your tasks and ideas are now clean!
```

## 📋 What Gets Deleted

**Will be deleted:**
- Any item where `content` starts with `[BOT]` prefix
- Examples:
  - `[BOT] ✅ Saved as task (ID: 123)`
  - `[BOT] 💡 Saved as idea (ID: 456)`
  - `[BOT] Here are your pending tasks...`

**Will NOT be deleted:**
- Your actual tasks and ideas
- Any item that doesn't start with `[BOT]`
- Items with bot-related content but no prefix

## 🔒 Safety Features

### 1. Preview Mode
- Shows exactly what will be deleted
- No changes until you confirm

### 2. Confirmation Required
- Must explicitly type `y` or `yes`
- Easy to cancel with `n` or `Ctrl+C`

### 3. Transaction-Based
- All deletions happen in a single transaction
- Either all succeed or none (atomic operation)

### 4. Automatic Trigger Handling
- FTS (Full-Text Search) table automatically updated
- Database triggers handle synchronization
- No manual cleanup needed

### 5. Verification
- Script verifies cleanup was successful
- Shows final database statistics

## 💡 Common Scenarios

### Scenario 1: No Bot Responses Found

```bash
$ npm run cleanup-bot-responses

✅ No bot responses found in database!
✨ Database is clean! No action needed.
```

**What this means:** Your database is already clean - no action needed!

### Scenario 2: Bot Responses Found

```bash
$ npm run cleanup-bot-responses

📊 Total bot responses found: 23
... (shows preview) ...

❓ Do you want to DELETE 23 bot response(s)? (y/n): y

✅ Successfully deleted 23 bot responses
```

**What this means:** Found and cleaned up 23 mistaken bot responses.

### Scenario 3: Cancelled by User

```bash
$ npm run cleanup-bot-responses

📊 Total bot responses found: 15
... (shows preview) ...

❓ Do you want to DELETE 15 bot response(s)? (y/n): n

❌ Cleanup cancelled by user
```

**What this means:** You reviewed the preview and decided not to proceed - safe exit.

## 🛠️ Technical Details

### Database Operations

The script:
1. **Queries** items table: `SELECT * FROM items WHERE content LIKE '[BOT]%'`
2. **Deletes** from items table: `DELETE FROM items WHERE id = ?`
3. **Auto-syncs** FTS table via triggers (no manual action needed)

### What Happens to FTS Table

The database has triggers that automatically maintain the Full-Text Search table:

```sql
CREATE TRIGGER items_ad AFTER DELETE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, content, tags) 
  VALUES('delete', old.id, old.content, old.tags);
END;
```

This means when an item is deleted from `items`, it's automatically removed from `items_fts` - you don't need to do anything!

### Performance

- **Fast**: Deletes in a single transaction
- **Efficient**: Uses prepared statements
- **Progress**: Shows progress every 10 items
- **Safe**: Rolls back entire transaction if any error occurs

## 🔧 Troubleshooting

### Issue: Script won't start

**Solution:** Make sure you're in the project directory and dependencies are installed:
```bash
npm install
npm run cleanup-bot-responses
```

### Issue: "Database is locked" error

**Solution:** Stop the bot first:
1. Find the bot process: `ps aux | grep "node src/index.js"`
2. Kill it: `kill <process_id>`
3. Run cleanup again: `npm run cleanup-bot-responses`

### Issue: Still seeing bot responses after cleanup

**Solution:** Check if they have a different prefix:
1. Open database: `sqlite3 tasks.db`
2. Query: `SELECT content FROM items WHERE content LIKE '%BOT%' LIMIT 10;`
3. If found, modify the script or manually clean them

### Issue: Accidentally deleted real items

**Solution:** Restore from backup:
```bash
# Stop the bot first
# Then restore
copy tasks-backup.db tasks.db   # Windows
cp tasks-backup.db tasks.db     # Mac/Linux
```

## 📊 After Cleanup

### Verify Your Data

Check your dashboard: http://localhost:3000
- Should only show your actual tasks and ideas
- No bot confirmations or responses

### Test the Bot

Send a test message to verify bot still works:
```
Finish report by Friday
```

Expected response:
```
[BOT] ✅ Saved as task (ID: X)
Priority: 🔴 high
...
```

### Check Database

You can manually verify:
```bash
sqlite3 tasks.db
> SELECT COUNT(*) FROM items WHERE content LIKE '[BOT]%';
# Should return: 0
```

## 🚫 Prevention

To prevent this from happening again, the bot already has protection:

**In `bot.js` (lines 254-257):**
```javascript
if (messageText.startsWith(BOT_PREFIX)) {
  console.log('⏭️  [STEP 6] Bot-sent message detected, skipping');
  return;
}
```

This check should prevent bot responses from being processed. If they're still getting saved:

1. **Check the logs** - Look for where messages bypass this check
2. **Verify bot logic** - Make sure AI processor isn't misidentifying bot responses
3. **Add additional guard** - Add check in `saveItem()` function

## 📝 Summary

**Use this script when:**
- You notice bot responses in your task/idea lists
- Dashboard shows bot confirmations as items
- Database has items starting with `[BOT]`

**How to run:**
```bash
npm run cleanup-bot-responses
```

**Safety:** Always backup first!

**Result:** Clean database with only your actual tasks and ideas 🎉


