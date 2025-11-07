# Deployment Checklist - Railway (For Developer)

## 📋 Pre-Deployment Checklist

### ✅ Before You Start

- [ ] Tested bot locally (works correctly)
- [ ] Have OpenAI API key ready
- [ ] Have Twilio credentials ready
- [ ] Founder's WhatsApp number (with country code)
- [ ] Clean codebase (no personal data exposed)

---

## 🚀 Deploy to Railway (10 Minutes)

### Step 1: Create Railway Account

1. Go to: https://railway.app
2. Click "Login" → Sign up with GitHub (recommended) or email
3. Verify your email
4. Free account gives $5 credit/month

**Done? ✅**

---

### Step 2: Create New Project from Local Code

**Option A: Via Railway Dashboard (Easiest)**

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account
4. Select repository (or create new one - see below)

**Option B: Push to GitHub First (Recommended)**

```bash
# In your project directory
git init
git add .
git commit -m "WhatsApp Task Bot - Production Ready"

# Create repo on GitHub, then:
git remote add origin https://github.com/yourusername/wabot.git
git branch -M main
git push -u origin main
```

Then deploy from Railway → "Deploy from GitHub"

**Option C: Railway CLI (Advanced)**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

**Done? ✅**

---

### Step 3: Configure Environment Variables

**In Railway Dashboard:**

1. Click on your project
2. Go to "Variables" tab
3. Click "New Variable"
4. Add each variable:

```
OPENAI_API_KEY=sk-your-actual-key-here
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
MY_WHATSAPP_NUMBER=whatsapp:+[FOUNDER_NUMBER]
PORT=3000
```

**IMPORTANT:** 
- Use FOUNDER'S WhatsApp number (not yours!)
- Format: `whatsapp:+[country code][number]`
- No spaces, no dashes
- Example: `whatsapp:+918765432109`

5. Click "Deploy" (if not auto-deployed)

**Done? ✅**

---

### Step 4: Get Public URL

1. In Railway dashboard, go to "Settings" tab
2. Under "Networking" → "Public Networking"
3. Click "Generate Domain"
4. Copy the URL (e.g., `https://wabot-production.up.railway.app`)

**Save this URL - you'll need it next!**

**Done? ✅**

---

### Step 5: Configure Twilio Webhook

1. Go to: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox
2. Login with your Twilio account
3. Scroll to **"When a message comes in"**
4. Paste: `https://[your-railway-url].up.railway.app/webhook/whatsapp`
5. Keep HTTP method as "POST"
6. Click "Save"

**Example:**
```
https://wabot-production.up.railway.app/webhook/whatsapp
```

**Done? ✅**

---

### Step 6: Founder Joins Twilio Sandbox

**Guide founder to:**

1. Open WhatsApp on their phone
2. Start new chat with: `+14155238886` (your Twilio sandbox number)
3. Send: `join [your-code]` (find code in Twilio console)
4. Wait for confirmation message

**Find your join code:**
- Twilio Console → Messaging → WhatsApp Sandbox
- Look for "Sandbox Join Code" (e.g., "join happy-tiger")

**Done? ✅**

---

### Step 7: Test the Bot

**Founder sends test message:**

```
"Task: Test the bot - finish presentation by Friday"
```

**Bot should reply within 2-3 seconds:**

```
✅ Saved as task (ID: 1)
Priority: 🟡 medium
Deadline: 📅 2024-11-08
```

**Check Railway logs if issues:**
1. Railway Dashboard → "Deployments" tab
2. Click latest deployment
3. View logs in real-time

**Done? ✅**

---

### Step 8: Verify Dashboard

1. Open: `https://[your-railway-url].up.railway.app`
2. Should see web dashboard
3. Task from Step 7 should appear
4. Bookmark URL for founder

**Done? ✅**

---

### Step 9: Run Database Migrations (Important!)

**If founder will use bot for first time:**

Railway doesn't run migration scripts automatically. You have two options:

**Option A: Run Locally First (Before Deploy)**
```bash
# On your local machine with production .env
npm run migrate-schema
npm run migrate-tags

# This creates tasks.db with proper schema
# Deploy to Railway (db is included)
```

**Option B: Run on Railway (After Deploy)**
```bash
# Install Railway CLI
railway login
railway link  # Select your project

# Run migrations
railway run npm run migrate-schema
railway run npm run migrate-tags
```

**Note:** Migrations only needed once. New installs have clean database.

**Done? ✅**

---

### Step 10: Transfer Railway Project to Founder (Optional)

**If founder will manage billing:**

1. Railway Dashboard → Project Settings
2. Scroll to "Transfer Project"
3. Enter founder's email
4. They receive email → Accept transfer
5. Billing transfers to their account

**Or keep it on your account:**
- You manage everything
- Founder reimburses you monthly
- Simpler for non-technical founder

**Done? ✅**

---

## 📄 Documents to Give Founder

After deployment, share these with founder:

- [ ] `HANDOVER_SIMPLE.md` (usage guide)
- [ ] Dashboard URL (bookmark link)
- [ ] Twilio join code (for re-joining if needed)
- [ ] Your contact info (for support period)
- [ ] Railway login credentials (if transferred)

---

## ✅ Final Verification Checklist

**Before marking as complete:**

- [ ] Bot responds to founder's WhatsApp messages
- [ ] Dashboard loads and shows tasks
- [ ] Railway deployment is "Active" (green)
- [ ] Twilio webhook configured correctly
- [ ] Environment variables set properly
- [ ] Founder successfully joined sandbox
- [ ] Test task appears in dashboard
- [ ] Logs show no errors
- [ ] Founder has all necessary info
- [ ] Support period timeline agreed

---

## 💰 Cost Tracking

**Monitor costs for founder:**

**Railway:**
- Dashboard → Usage tab
- Check daily/monthly usage
- Should be under $5/month (free credit)

**OpenAI:**
- https://platform.openai.com/usage
- Check API usage
- Should be ~$1-2/month

**Total expected: $2-5/month for single user**

---

## 🆘 Troubleshooting

### Bot not responding to messages

**Check:**
1. Railway status (must be Active/green)
2. Environment variables (especially `MY_WHATSAPP_NUMBER`)
3. Twilio webhook URL (must end with `/webhook/whatsapp`)
4. Railway logs for errors
5. Founder joined sandbox correctly

### Dashboard not loading

**Check:**
1. Railway deployment successful
2. Public domain generated
3. No errors in logs
4. Try: `[url]/api/health` (should return healthy)

### Database not persisting

**Check:**
1. Migrations ran successfully
2. SQLite file created
3. Railway has persistent storage (automatic)

### High costs

**Check:**
1. OpenAI usage (should be minimal)
2. Railway usage (should be under free tier)
3. No infinite loops in logs
4. Only one instance running

---

## 📞 Support Plan

**First 2 weeks:**
- Monitor Railway for issues
- Answer founder's questions
- Fix any bugs that appear
- Optimize if needed

**After 2 weeks:**
- Emergency support only
- Founder should be self-sufficient
- Documentation should cover most issues

---

## ✨ You're Done!

**Deployment complete! 🎉**

The bot is now:
- ✅ Running 24/7 on Railway
- ✅ Responding to founder's WhatsApp
- ✅ Storing tasks in database
- ✅ Accessible via dashboard
- ✅ Costing ~$2-5/month

**Great work! Hand over the docs and enjoy your success! 🚀**

