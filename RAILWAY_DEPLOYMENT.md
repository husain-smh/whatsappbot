# 🚂 Railway Deployment Guide

## Current Issue

Your Railway app at `https://whatsappbotil.up.railway.app/` is running **old code** without the multi-user authentication system.

---

## 📋 What You Need to Deploy

### New Features:
- ✅ Multi-user authentication system
- ✅ Auto-registration for new WhatsApp users
- ✅ Users table in database
- ✅ Password hashing (PBKDF2 + SHA-512)
- ✅ Configurable dashboard URL

---

## 🚀 Deployment Steps

### **Step 1: Commit Your Changes**

```bash
# Check what files have changed
git status

# Add all changes
git add .

# Commit with a descriptive message
git commit -m "Add multi-user authentication with auto-registration"

# Push to your repository
git push origin main
```

**Note:** Railway will automatically detect the push and start redeploying!

---

### **Step 2: Add Environment Variable in Railway**

1. Go to: https://railway.app/dashboard
2. Click on your **whatsappbotil** project
3. Click on your **service/app**
4. Go to **Variables** tab
5. Click **+ New Variable**
6. Add this:

```
Variable Name: DASHBOARD_URL
Value: https://whatsappbotil.up.railway.app
```

7. Click **Add** (Railway will automatically redeploy)

---

### **Step 3: Database Migration**

Your Railway app uses a **persistent volume** for the SQLite database. The database needs to be updated with the new `users` table.

**Option A: Automatic (Recommended)**

The code will automatically create the `users` table on startup if it doesn't exist! Just wait for the deployment to complete.

**Option B: Manual (If Option A Fails)**

If you need to manually access the Railway database:

1. In Railway dashboard, go to your service
2. Click on **Settings** → **Connect**
3. Use Railway CLI:
```bash
railway link
railway run sqlite3 tasks.db
```

4. Then run the migration:
```sql
CREATE TABLE IF NOT EXISTS users (
  phone_number TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_active TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Update existing items table to add user_phone if not exists
ALTER TABLE items ADD COLUMN user_phone TEXT;
```

---

### **Step 4: Test the Deployment**

#### **Test 1: Check if deployment succeeded**
1. Go to Railway dashboard
2. Check **Deployments** tab
3. Wait for status to show "SUCCESS ✓"
4. Check logs for any errors

#### **Test 2: Test auto-registration**
1. Send a WhatsApp message to your bot **from a new number**
2. You should receive:
```
[BOT] 🎉 Welcome to Task Bot!

You've been automatically registered.

📊 Dashboard Access:
• URL: https://whatsappbotil.up.railway.app/login
• Phone: whatsapp:+1234567890
• Password: Xy9mK4nPq2sR

💡 You can now send me tasks and ideas...
```

#### **Test 3: Test dashboard login**
1. Go to: https://whatsappbotil.up.railway.app/login
2. Enter the phone number and password from the welcome message
3. Should redirect to dashboard with your tasks!

---

## 🔍 Troubleshooting

### "Invalid credentials" on dashboard
- ✅ **Fix:** Wait for Railway to finish deploying the new code
- ✅ **Check:** Railway logs show "Users table created" or "Users table already exists"

### Welcome message still shows localhost
- ✅ **Fix:** Make sure you added `DASHBOARD_URL` environment variable in Railway
- ✅ **Check:** Railway variables tab should show the variable

### Database errors
- ✅ **Fix:** The code auto-creates tables on startup
- ✅ **Check:** Look for "Database initialized" in Railway logs

### Deployment stuck or failed
- ✅ **Check:** Railway logs for error messages
- ✅ **Fix:** Make sure all your code is committed and pushed
- ✅ **Try:** Manual redeploy from Railway dashboard

---

## 📊 What Happens to Existing Data?

### ✅ Your existing tasks are SAFE!
- All tasks in the `items` table remain unchanged
- You may need to assign them to a user manually

### Option 1: Assign existing tasks to your phone number

```sql
-- Connect to Railway database
railway run sqlite3 tasks.db

-- Update all existing tasks
UPDATE items 
SET user_phone = 'whatsapp:+916388990545' 
WHERE user_phone IS NULL;
```

### Option 2: Let users claim tasks on first login
(This would require custom code - ask if you want this feature!)

---

## 🔐 Security Checklist

Before going live, make sure:

- [ ] `DASHBOARD_URL` is set to your Railway URL
- [ ] `SESSION_SECRET` is set to a random string (at least 32 chars)
- [ ] Your Twilio webhook points to: `https://whatsappbotil.up.railway.app/webhook/whatsapp`
- [ ] Test with a real WhatsApp message
- [ ] Test dashboard login with auto-generated password
- [ ] Verify data isolation (each user sees only their tasks)

---

## 🎯 Summary

```bash
# 1. Commit and push
git add .
git commit -m "Add multi-user auth"
git push origin main

# 2. Add environment variable in Railway dashboard
DASHBOARD_URL=https://whatsappbotil.up.railway.app

# 3. Wait for deployment (Railway auto-deploys on push)

# 4. Test with WhatsApp message to get credentials

# 5. Login to dashboard with credentials from WhatsApp
```

---

## 📞 Need Help?

If you run into issues:
1. Check Railway deployment logs
2. Verify environment variables are set
3. Test with a fresh WhatsApp message
4. Check database tables exist

---

**You're almost there! Once deployed, your bot will have proper multi-user authentication! 🎉**

