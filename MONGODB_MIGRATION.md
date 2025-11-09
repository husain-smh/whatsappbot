# 🍃 MongoDB Migration Guide

## Why MongoDB > SQLite for Railway

Your issue: **Database resets on every deployment**

### ❌ SQLite Problem:
```
Deploy → Create tasks.db → Add users/tasks → Redeploy → tasks.db GONE!
```

### ✅ MongoDB Solution:
```
Deploy → Connect to MongoDB Atlas → Data persists forever → Redeploy → Same data! ✅
```

MongoDB is an **external service**, so your data survives deployments!

---

## Step-by-Step Migration

### **Step 1: Get MongoDB Atlas Free Cluster**

1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up (free account)
3. Create a **FREE M0 cluster** (512MB storage, perfect for this bot)
4. Choose a region close to your Railway deployment
5. Wait 1-3 minutes for cluster to be ready

### **Step 2: Create Database User**

1. In MongoDB Atlas, go to **"Database Access"** (left sidebar)
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Username: `wabot-user` (or whatever you want)
5. Password: Generate a strong password (save it!)
6. Database User Privileges: **"Read and write to any database"**
7. Click **"Add User"**

### **Step 3: Allow Network Access**

1. Go to **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access From Anywhere"** (0.0.0.0/0)
   - Safe because you have username/password authentication
   - Railway has dynamic IPs so this is necessary
4. Click **"Confirm"**

### **Step 4: Get Connection String**

1. Go to **"Database"** (left sidebar)
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Driver: **Node.js**
5. Copy the connection string, looks like:
```
mongodb+srv://wabot-user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

6. **Replace `<password>` with your actual password** from Step 2
7. **Add database name** before the `?`:
```
mongodb+srv://wabot-user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/wabot?retryWrites=true&w=majority
```

---

## Step 5: Switch to MongoDB in Code

### **Option A: Quick Switch (Rename Files)**

```bash
# Backup old SQLite version
mv src/database.js src/database-sqlite.js

# Use MongoDB version
mv src/database-mongo.js src/database.js
```

### **Option B: Keep Both (Recommended for Testing)**

1. Update imports in your files to use MongoDB version:

```javascript
// In src/server.js, src/webhook.js, etc.
// Change from:
import { ... } from './database.js';

// To:
import { ... } from './database-mongo.js';
```

---

## Step 6: Update Environment Variables

### **Local Testing (`.env` file)**

Add to your `.env`:
```bash
MONGODB_URI=mongodb+srv://wabot-user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/wabot?retryWrites=true&w=majority
MONGODB_DB_NAME=wabot
```

### **Railway Production**

1. Go to Railway dashboard
2. Click your service
3. Go to **Variables** tab
4. Add these variables:

```
MONGODB_URI=mongodb+srv://wabot-user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/wabot?retryWrites=true&w=majority
MONGODB_DB_NAME=wabot
```

---

## Step 7: Install MongoDB Package & Deploy

```bash
# Install MongoDB driver
npm install

# Test locally first
npm start

# If it works, commit and deploy
git add .
git commit -m "Migrate from SQLite to MongoDB"
git push origin main
```

---

## Step 8: Test Everything

### **1. Check Connection**

Railway logs should show:
```
📦 Connecting to MongoDB...
✅ Connected to MongoDB: wabot
✅ Database indexes created
✅ Database initialized
```

### **2. Send WhatsApp Message**

Send a message to your bot. Should get welcome message with password.

### **3. Send Another Message**

Should NOT get another welcome message! Bot should remember you.

### **4. Login to Dashboard**

Use the password from the welcome message. Should work!

### **5. Redeploy Test**

```bash
git commit --allow-empty -m "Test redeployment"
git push origin main
```

Wait for Railway to redeploy. Then:
- Try logging in with same password → Should still work! ✅
- Check your tasks → Should all be there! ✅

---

## Verifying Data Persistence

### **Before MongoDB:**
```
Deploy 1: Send message → Get password "Abc123"
Deploy 2: Send message → Get NEW password "Xyz789" (data lost!)
```

### **After MongoDB:**
```
Deploy 1: Send message → Get password "Abc123"
Deploy 2: Login with "Abc123" → Still works! (data persists!)
```

---

## MongoDB Atlas Dashboard

You can view your data in MongoDB Atlas:

1. Go to **"Database"** → Click **"Browse Collections"**
2. Database: `wabot`
3. Collections:
   - `users` - Your user accounts
   - `items` - Your tasks and ideas
   - `categories` - Categories

You can manually view/edit data here!

---

## Troubleshooting

### "MongoServerError: bad auth"

**Fix:** Password is wrong in connection string
- Make sure you replaced `<password>` with actual password
- Password might need URL encoding if it has special characters
- Use this tool: https://www.urlencoder.org/

### "Connection timeout"

**Fix:** IP not whitelisted
- Go to Network Access in MongoDB Atlas
- Make sure `0.0.0.0/0` is allowed

### "Cannot connect to cluster"

**Fix:** Check connection string format
- Make sure it starts with `mongodb+srv://`
- Make sure database name is before the `?`
- Make sure there are no extra spaces

### "Database not initializing"

**Fix:** Make sure imports are updated
- Check all files that import from `database.js`
- Update to import from `database-mongo.js` if needed

---

## Performance Comparison

### SQLite (File-based):
- ✅ Fast (local file)
- ✅ Simple (no external service)
- ❌ **Resets on redeploy**
- ❌ Single server only
- ❌ No cloud backups

### MongoDB (Cloud):
- ✅ **Persists across deployments** ⭐
- ✅ Automatic backups
- ✅ Scales to multiple servers
- ✅ Web UI to view data
- ⚠️  Slightly slower (network call)
- ⚠️  Requires external service

**For Railway deployment: MongoDB is the clear winner!**

---

## Cost

- **MongoDB Atlas M0 (Free tier):**
  - 512MB storage (plenty for thousands of tasks)
  - Shared RAM
  - No credit card required
  - Perfect for personal bot

- **When to upgrade:**
  - If you have > 10,000 tasks
  - If you need faster performance
  - If you want dedicated resources

---

## Backup Your Data

### SQLite (before migration):
```bash
# Backup your local database
cp tasks.db tasks-backup.db
```

### MongoDB (after migration):
MongoDB Atlas automatically backs up your data every 24 hours!

You can also manually export:
1. Go to **"Database"** in Atlas
2. Click **"..."** → **"Export Data"**
3. Download JSON files

---

## Rollback Plan

If something goes wrong, you can rollback:

```bash
# Restore SQLite version
mv src/database-sqlite.js src/database.js

# Remove MongoDB
rm src/database-mongo.js

# Remove MongoDB from package.json
# Redeploy
```

But with MongoDB, you won't need to rollback! 🚀

---

## Summary

```bash
# 1. Create MongoDB Atlas cluster (free)
# 2. Get connection string
# 3. Add MONGODB_URI to Railway variables
# 4. Update code to use database-mongo.js
# 5. Deploy
# 6. Test - data persists forever! ✅
```

**Your data will now survive every deployment!** 🎉

---

## Need Help?

Common MongoDB connection strings:

**MongoDB Atlas (Cloud):**
```
mongodb+srv://username:password@cluster.mongodb.net/wabot?retryWrites=true&w=majority
```

**Local MongoDB (Testing):**
```
mongodb://localhost:27017
```

**MongoDB Atlas with specific options:**
```
mongodb+srv://username:password@cluster.mongodb.net/wabot?retryWrites=true&w=majority&appName=WaBot
```

---

**Ready to migrate? Follow the steps above and your data will persist forever!** 🍃

