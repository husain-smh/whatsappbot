# 🧹 Quick Start: Bot Response Cleanup

## TL;DR

**Problem:** Bot responses (starting with `[BOT]`) were saved to database  
**Solution:** Safe cleanup script with preview and confirmation  

## 🚀 Quick Usage

### 1. Backup First (Optional but Recommended)
```bash
copy tasks.db tasks-backup.db
```

### 2. Run Cleanup
```bash
npm run cleanup-bot-responses
```

### 3. Review & Confirm
- Script shows preview
- Type `y` to delete
- Type `n` to cancel

## ✅ Done!

That's it! The script will:
- Show what will be deleted
- Ask for confirmation
- Delete bot responses
- Verify cleanup
- Show final stats

## 📖 Full Documentation

See `CLEANUP_GUIDE.md` for detailed information, troubleshooting, and technical details.


