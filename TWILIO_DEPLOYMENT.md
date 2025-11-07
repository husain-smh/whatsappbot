# Twilio WhatsApp Bot - Complete Deployment Guide

This guide covers deploying your WhatsApp Task Bot to production using Twilio's stable webhook-based architecture.

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Railway Deployment](#railway-deployment)
3. [Render Deployment](#render-deployment)
4. [Configuring Twilio Webhook](#configuring-twilio-webhook)
5. [Testing Your Deployment](#testing-your-deployment)
6. [Monitoring and Logs](#monitoring-and-logs)
7. [Common Issues](#common-issues)

---

## Local Development Setup

### 1. Prerequisites

```bash
# Check Node.js version (need 18+)
node --version

# Install dependencies
npm install
```

### 2. Create .env File

Create a `.env` file in the project root:

```env
# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key-here

# Twilio Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Your WhatsApp Number
MY_WHATSAPP_NUMBER=whatsapp:+1234567890

# Server Port
PORT=3000
```

### 3. Start Server

```bash
npm start
```

You should see:
```
✓ Database initialized successfully
✓ Dashboard server running at http://localhost:3000
✓ Twilio webhook endpoint: http://localhost:3000/webhook/whatsapp
✅ All systems ready!
```

### 4. Expose Webhook with ngrok

Twilio needs to reach your local server. Use ngrok:

```bash
# Install ngrok (one-time)
npm install -g ngrok

# In a new terminal, expose port 3000
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)

### 5. Configure Twilio Sandbox

1. Go to: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox
2. Under **"When a message comes in"**:
   - Paste your ngrok URL + `/webhook/whatsapp`
   - Example: `https://abc123.ngrok-free.app/webhook/whatsapp`
3. Click **Save**

### 6. Test Locally

Send a message to your Twilio WhatsApp number:
```
"Task: Test local deployment"
```

Check your terminal for logs. You should see the webhook being called.

---

## Railway Deployment

Railway provides free hosting with $5/month credit (enough for this bot).

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login

```bash
railway login
```

This opens your browser for authentication.

### Step 3: Initialize Project

```bash
# In your project directory
railway init

# Choose "Create new project"
# Give it a name: "wabot"
```

### Step 4: Set Environment Variables

```bash
railway variables set OPENAI_API_KEY=sk-your-key-here
railway variables set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
railway variables set TWILIO_AUTH_TOKEN=your-auth-token-here
railway variables set TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
railway variables set MY_WHATSAPP_NUMBER=whatsapp:+1234567890
```

**Important:** Replace with your actual values!

### Step 5: Deploy

```bash
railway up
```

This will:
1. Upload your code
2. Install dependencies
3. Start the server
4. Generate a public URL

### Step 6: Get Your Public URL

```bash
railway domain
```

Example output: `https://wabot-production.up.railway.app`

If no domain exists, create one:
```bash
railway domain create
```

### Step 7: Configure Twilio Webhook

1. Go to: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox
2. Under **"When a message comes in"**:
   - Paste: `https://wabot-production.up.railway.app/webhook/whatsapp`
3. Click **Save**

### Step 8: Verify Deployment

```bash
# Check logs
railway logs

# Check status
railway status
```

Send a test message to your Twilio number and watch the logs!

### Railway Dashboard

View your deployment at: https://railway.app/dashboard

- Monitor resource usage
- View logs
- Update environment variables
- Scale if needed (unlikely for personal use)

---

## Render Deployment

Render offers free tier (good for side projects, sleeps after 15 min inactivity).

### Step 1: Create Render Account

Sign up at: https://render.com

### Step 2: Connect GitHub (Optional but Recommended)

1. Push your code to GitHub
2. In Render dashboard: Connect your repo

**OR** deploy without Git:

```bash
# Install Render CLI
npm install -g render

# Login
render login
```

### Step 3: Create Web Service

#### Via Dashboard:

1. Click **"New +"** → **"Web Service"**
2. Connect your repo (or use public Git URL)
3. Configure:
   - **Name**: `wabot`
   - **Environment**: `Node`
   - **Region**: Choose closest to you
   - **Branch**: `main` or `master`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (or paid for always-on)

#### Via render.yaml (Recommended):

Create `render.yaml` in project root:

```yaml
services:
  - type: web
    name: wabot
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: OPENAI_API_KEY
        sync: false
      - key: TWILIO_ACCOUNT_SID
        sync: false
      - key: TWILIO_AUTH_TOKEN
        sync: false
      - key: TWILIO_WHATSAPP_FROM
        value: whatsapp:+14155238886
      - key: MY_WHATSAPP_NUMBER
        sync: false
```

Then deploy:
```bash
render deploy
```

### Step 4: Add Environment Variables

In Render dashboard:
1. Go to your service
2. Click **"Environment"**
3. Add variables:
   ```
   OPENAI_API_KEY=sk-...
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   MY_WHATSAPP_NUMBER=whatsapp:+1234567890
   ```

### Step 5: Get Your URL

After deployment completes, your URL will be:
```
https://wabot.onrender.com
```

(Visible in dashboard)

### Step 6: Configure Twilio

Set webhook to: `https://wabot.onrender.com/webhook/whatsapp`

### Step 7: Keep-Alive (Free Tier)

Free tier sleeps after 15 min. To keep alive, use cron-job.org:

1. Sign up at: https://cron-job.org
2. Create job:
   - URL: `https://wabot.onrender.com/api/health`
   - Schedule: Every 10 minutes
3. Enable

**OR** upgrade to paid tier ($7/month) for always-on.

---

## Configuring Twilio Webhook

### 1. Access Twilio Console

Go to: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox

### 2. Configure Incoming Message Webhook

Under **"When a message comes in"**:

- **URL**: Your deployment URL + `/webhook/whatsapp`
  - Local: `https://your-ngrok-url.ngrok-free.app/webhook/whatsapp`
  - Railway: `https://wabot-production.up.railway.app/webhook/whatsapp`
  - Render: `https://wabot.onrender.com/webhook/whatsapp`

- **Method**: `POST`

### 3. Save Configuration

Click **Save** at the bottom.

### 4. Verify Webhook

Twilio will send a test request. Check:
- ✅ Green checkmark appears
- ✅ No error messages

---

## Testing Your Deployment

### 1. Send Test Message

```
You → Twilio: "Task: Deploy bot successfully"
```

Expected response:
```
← [BOT] ✅ Saved as task (ID: 1)
   Priority: 🟡 medium
```

### 2. Test Query

```
You → Twilio: "Show all tasks"
```

Expected: List of your tasks

### 3. Test Dashboard

Open: `https://your-deployment-url.com`

You should see:
- Task list
- Statistics
- Filters working

### 4. Check Logs

**Railway:**
```bash
railway logs --tail
```

**Render:**
View in dashboard → Logs tab

**Look for:**
```
🔄 [WEBHOOK] INCOMING MESSAGE
✓ [WEBHOOK] Message is from authorized number
✓ [WEBHOOK] AI analysis complete
✓ [WEBHOOK] Response sent successfully!
```

---

## Monitoring and Logs

### Railway Monitoring

```bash
# Real-time logs
railway logs --tail

# Last 100 lines
railway logs

# Status
railway status

# Resource usage
railway stats
```

**Dashboard:** https://railway.app/dashboard
- CPU usage
- Memory usage
- Network traffic
- Build logs

### Render Monitoring

**Dashboard:** https://dashboard.render.com
- Service logs (searchable)
- Metrics (CPU, memory, bandwidth)
- Deploy history
- Custom alerts (paid tier)

### What to Monitor

**Key Metrics:**
- Response time (should be < 5s)
- Error rate (should be 0%)
- Memory usage (should be < 200MB)
- OpenAI API calls (track costs)

**Set Alerts:**
- Server downtime
- High error rate
- API quota exceeded

---

## Common Issues

### Issue: Webhook Not Receiving Messages

**Symptoms:** You send message, nothing happens

**Fixes:**
1. Check Twilio webhook URL is correct
   - Should end with `/webhook/whatsapp`
   - Should be HTTPS
   - Should match your deployment URL

2. Check logs for incoming requests
   ```bash
   railway logs | grep WEBHOOK
   ```

3. Test webhook manually:
   ```bash
   curl -X POST https://your-url.com/webhook/whatsapp \
     -d "From=whatsapp:+1234567890" \
     -d "Body=test"
   ```

4. Check Twilio debugger:
   https://console.twilio.com/us1/monitor/debugger

### Issue: Bot Responds to Wrong Number

**Symptoms:** Bot ignores your messages

**Fixes:**
1. Verify `MY_WHATSAPP_NUMBER` in environment variables
   ```bash
   railway variables
   ```

2. Format must be: `whatsapp:+[country code][number]`
   - ✅ `whatsapp:+1234567890`
   - ❌ `+1234567890` (missing prefix)
   - ❌ `whatsapp:+91 6388 990 545` (has spaces)

3. Check logs for actual incoming number:
   ```
   📱 From: whatsapp:+1234567890
   ```

### Issue: OpenAI API Errors

**Symptoms:** "AI processing failed"

**Fixes:**
1. Check API key is valid
2. Check OpenAI account has credits
3. Check rate limits (unlikely with gpt-4o-mini)
4. View detailed error in logs

### Issue: Database Not Persisting

**Symptoms:** Tasks disappear after restart

**Fixes:**

**Railway:**
```bash
# Add volume for database persistence
railway volume create
```

**Render:**
- Free tier: Database resets on deploy (use paid tier)
- Use external DB (PostgreSQL) for persistence

### Issue: Render Service Sleeping

**Symptoms:** First message slow (15s+), then normal

**Cause:** Free tier sleeps after 15 min

**Fixes:**
1. Use cron-job to ping every 10 min (see above)
2. Upgrade to paid tier ($7/month always-on)
3. Accept the delay (fine for personal use)

### Issue: Port Already in Use (Local)

**Symptoms:** `Error: listen EADDRINUSE :::3000`

**Fixes:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 [PID]

# OR use different port
PORT=3001 npm start
```

---

## Cost Breakdown

### Twilio Sandbox
- **Cost:** $0 (free forever)
- **Limits:** None for personal use
- **Notes:** Requires "join" every 3 days of inactivity

### OpenAI API (GPT-4o-mini)
- **Input:** $0.15 per 1M tokens
- **Output:** $0.60 per 1M tokens
- **Typical:** ~$1-2/month for moderate use
- **Per message:** ~$0.001

### Hosting

| Platform | Free Tier | Paid Tier | Recommendation |
|----------|-----------|-----------|----------------|
| **Railway** | $5 credit/month | $5/month + usage | ⭐ Best for always-on |
| **Render** | 750 hours/month | $7/month | ⭐ Best for budget |
| **Fly.io** | 3 shared VMs | $1.94/month | Good alternative |
| **Heroku** | No free tier | $7/month | Not recommended |

**Total Monthly Cost:**
- Minimum: $0 (Render free + OpenAI $1)
- Recommended: $7-12 (Railway/Render paid + OpenAI $2)

---

## Next Steps

1. **Set up monitoring alerts**
   - Use UptimeRobot or similar
   - Monitor: `https://your-url.com/api/health`

2. **Enable HTTPS only**
   - Railway/Render handle this automatically

3. **Backup database regularly**
   ```bash
   # Download from Railway
   railway run 'cat tasks.db' > backup.db
   
   # Or copy via SCP
   ```

4. **Set up CI/CD**
   - Auto-deploy on git push
   - Railway/Render do this by default when connected to GitHub

5. **Scale if needed**
   - Unlikely for personal use
   - Can handle 1000s of messages/day on free tier

---

## Support

**Logs not helping?**
- Check Twilio debugger: https://console.twilio.com/us1/monitor/debugger
- Check OpenAI usage: https://platform.openai.com/usage

**Still stuck?**
- Railway Discord: https://discord.gg/railway
- Render Community: https://community.render.com

**Found a bug?**
- Open issue on GitHub

---

**Happy deploying! 🚀**

Your bot is now running 24/7 with zero QR codes, zero crashes, zero headaches.

