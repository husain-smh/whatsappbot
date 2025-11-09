# 🚨 Quick Start: Complete Database Reset

## ⚠️ This Will Delete EVERYTHING!

All tasks, ideas, tags, and history will be permanently deleted.

## 🚀 Steps

### 1. Backup First (REQUIRED!)
```bash
copy tasks.db tasks-backup.db
```

### 2. Run Reset
```bash
npm run reset-database
```

### 3. Confirm Twice
- First: Type `yes` (backed up?)
- Second: Type `DELETE EVERYTHING` (exactly!)

## ✅ Done!

Database is now empty and ready for fresh start.

## 🔄 Made a Mistake?

Restore backup:
```bash
copy tasks-backup.db tasks.db
```

## 📖 Full Documentation

See `RESET_DATABASE_GUIDE.md` for detailed information.

---

**Alternative: Only delete bot responses (not everything)**
```bash
npm run cleanup-bot-responses
```


