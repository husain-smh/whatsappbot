# 🚨 Database Reset Guide - Nuclear Option

## ⚠️ WARNING

This script will **DELETE EVERYTHING** from your database:
- All tasks
- All ideas
- All tags
- All metadata
- All history

**This operation CANNOT be undone!**

## 🎯 When to Use This

Use this script when you want to:
- Start completely fresh
- Clear all test data
- Wipe everything and begin again

**Do NOT use this** if you only want to:
- Delete specific items
- Remove bot responses only (use `cleanup-bot-responses` instead)
- Clean up partial data

## 🚀 How to Use

### Step 1: Backup Your Database (CRITICAL!)

**Windows:**
```bash
copy tasks.db tasks-backup.db
```

**Mac/Linux:**
```bash
cp tasks.db tasks-backup.db
```

### Step 2: Run the Reset Script

```bash
npm run reset-database
```

### Step 3: Review Current State

The script will show you:
- Total items in database
- Breakdown by type (tasks/ideas)
- Breakdown by status and priority
- Sample of last 5 items

Example:
```
📊 CURRENT DATABASE STATE
Total Items: 156
  - Tasks: 98
  - Ideas: 58

By Status:
  - pending: 120
  - completed: 30
  - cancelled: 6
```

### Step 4: First Confirmation - Backup Check

```
❓ Have you backed up your database? (yes/no):
```

- Type `yes` if you've backed up
- Type `no` to cancel and backup first

### Step 5: Second Confirmation - Final Safety

```
❓ Type "DELETE EVERYTHING" to confirm (case-sensitive):
```

- Type **exactly**: `DELETE EVERYTHING` (case-sensitive!)
- Anything else will cancel the operation

### Step 6: Database Reset Complete

```
✨ DATABASE RESET COMPLETE
✅ Deleted 156 items
✅ Database is now empty
✅ Auto-increment counter reset to 1
```

Your database is now completely empty and ready for fresh start!

## 🔒 Safety Features

### 1. Double Confirmation
- First: Checks if you backed up
- Second: Requires typing "DELETE EVERYTHING" exactly

### 2. Preview Before Delete
- Shows current database state
- Displays sample items
- Shows exact counts

### 3. Transaction-Based
- All deletions in single transaction
- Automatic rollback on error
- Database integrity maintained

### 4. Auto-Cleanup
- FTS (Full-Text Search) table automatically cleared
- Database triggers handle synchronization
- Auto-increment counter reset

### 5. Graceful Interrupts
- Ctrl+C handled safely
- Database connection always closed properly
- No corruption risk

## 📊 What Happens

### Before Reset:
```
Items Table: 156 records
FTS Table: 156 records
Next ID: 157
```

### After Reset:
```
Items Table: 0 records
FTS Table: 0 records
Next ID: 1 (reset)
```

## 🔄 If You Make a Mistake

### Restore from Backup:

**Windows:**
```bash
copy tasks-backup.db tasks.db
```

**Mac/Linux:**
```bash
cp tasks-backup.db tasks.db
```

This will restore all your data!

## 💡 Common Scenarios

### Scenario 1: Database Already Empty

```bash
$ npm run reset-database

✅ Database is already empty!
✨ Nothing to delete!
```

**Action:** None needed - already clean!

### Scenario 2: Forgot to Backup

```bash
❓ Have you backed up your database? (yes/no): no

❌ Operation cancelled. Please backup first!
```

**Action:** Backup first, then run again

### Scenario 3: Wrong Confirmation Text

```bash
❓ Type "DELETE EVERYTHING" to confirm: delete everything

❌ Reset cancelled - confirmation text did not match
✓ Your data is safe!
```

**Action:** Must type exactly `DELETE EVERYTHING` (case-sensitive)

### Scenario 4: Successful Reset

```bash
✅ Deleted 156 items
✅ Database is now empty
💡 New items will start with ID: 1
```

**Action:** Done! Start using bot with clean slate

## 🛠️ Technical Details

### SQL Operations:

```sql
-- Delete all items (triggers auto-clean FTS)
DELETE FROM items;

-- Reset auto-increment counter
DELETE FROM sqlite_sequence WHERE name = 'items';
```

### What Gets Reset:
- ✅ All items deleted
- ✅ FTS table cleared (via triggers)
- ✅ Auto-increment counter reset to 1
- ✅ Categories preserved (not deleted)

### What Stays:
- ✅ Database schema (tables, indexes, triggers)
- ✅ Categories table (keeps your categories)
- ✅ Database structure intact

## ⚡ Quick Reference

**To reset database:**
```bash
# 1. Backup
copy tasks.db tasks-backup.db

# 2. Reset
npm run reset-database

# 3. Confirm twice:
#    - "yes" for backup
#    - "DELETE EVERYTHING" to proceed
```

**To restore if needed:**
```bash
copy tasks-backup.db tasks.db
```

## 🎯 Alternative: Selective Deletion

If you don't want to delete EVERYTHING, consider:

**Delete only bot responses:**
```bash
npm run cleanup-bot-responses
```

**Delete specific items:** Use dashboard at http://localhost:3000

**Delete by SQL query:** Connect to database manually

## 📝 Summary

- **Purpose:** Complete database wipe
- **Safety:** Double confirmation required
- **Backup:** Always backup first!
- **Recovery:** Restore from backup if needed
- **Result:** Empty database, fresh start

**Remember:** This is the nuclear option - only use when you truly want to delete everything and start fresh!


