# Deployment Guide

This guide covers deploying your WhatsApp Task Bot to Railway.app or Render.com.

## Prerequisites

- Completed local setup (tested locally)
- OpenAI API key
- Git repository (optional but recommended)

---

## Option 1: Railway.app (Recommended)

Railway provides $5 free credit per month and is super easy to deploy.

### Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (recommended) or email

### Step 2: Deploy from GitHub (Recommended)

**If your code is on GitHub:**

1. Click "New Project" on Railway dashboard
2. Select "Deploy from GitHub repo"
3. Choose your repository
4. Railway will auto-detect Node.js and deploy

**If deploying locally:**

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Initialize project:
   ```bash
   railway init
   ```

4. Deploy:
   ```bash
   railway up
   ```

### Step 3: Configure Environment Variables

1. Go to your project on Railway dashboard
2. Click on "Variables" tab
3. Add environment variable:
   - **Key**: `OPENAI_API_KEY`
   - **Value**: Your OpenAI API key
4. Add another variable (optional):
   - **Key**: `PORT`
   - **Value**: `3000`
5. Click "Deploy" to restart with new variables

### Step 4: Scan QR Code

1. Click on "Deployments" tab
2. Click on the latest deployment
3. Click "View Logs"
4. Scroll to find the QR code (will be ASCII art)
5. Scan with WhatsApp: Settings → Linked Devices → Link a Device

**Note:** The QR code appears only once during first deployment. If you miss it:
- Redeploy the service
- Check logs immediately after deployment starts

### Step 5: Get Your Dashboard URL

1. Click on "Settings" tab
2. Under "Networking" → "Public Networking"
3. Click "Generate Domain"
4. Your dashboard will be available at: `https://your-project-name.up.railway.app`

---

## Option 2: Render.com

Render has a free tier with limitations (spins down after inactivity).

### Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub or email

### Step 2: Create New Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository (or use public repo URL)
3. Configure:
   - **Name**: `whatsapp-task-bot`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### Step 3: Add Environment Variables

In the "Environment" section, add:
- **Key**: `OPENAI_API_KEY`
- **Value**: Your OpenAI API key

### Step 4: Add Persistent Disk

1. Scroll to "Disk" section
2. Click "Add Disk"
3. **Name**: `wabot-data`
4. **Mount Path**: `/opt/render/project/src`
5. **Size**: 1 GB (free tier)

This ensures your SQLite database persists between restarts.

### Step 5: Deploy

1. Click "Create Web Service"
2. Wait for deployment to complete
3. Click "Logs" to see the QR code
4. Scan with WhatsApp

---

## Important Notes

### QR Code Scanning

- **First deployment only**: You need to scan QR code from logs
- **Subsequent deployments**: Session is saved (in `.wwebjs_auth` folder)
- **If session expires**: Check logs for new QR code

### WhatsApp Session Persistence

Railway/Render save the authentication folder (`.wwebjs_auth`), so you won't need to scan QR code on every deployment. However:

- If you delete the service, you'll need to scan again
- If WhatsApp logs out your session manually, scan again
- Session typically lasts weeks/months

### Database Persistence

- SQLite database (`tasks.db`) is saved locally
- **Railway**: Automatically persists files
- **Render**: Requires disk mount (see above)
- Back up your database periodically if data is critical

### Costs

**Railway:**
- $5 free credit per month
- ~$0.50-2/month estimated usage
- Stays running 24/7
- ✅ **Recommended for this project**

**Render:**
- Free tier available
- Spins down after 15 mins of inactivity
- Takes 30-60 seconds to wake up
- May disconnect WhatsApp session if inactive

### Monitoring

**Check if bot is running:**
- Visit: `https://your-domain.com/api/health`
- Should return: `{"success":true,"status":"healthy"}`

**Check bot status:**
- Visit: `https://your-domain.com/api/status`
- Should show: `{"success":true,"status":{"isReady":true}}`

---

## Troubleshooting

### QR Code Not Appearing in Logs

**Solution:**
1. Redeploy the service
2. Watch logs in real-time during startup
3. QR appears within 30-60 seconds of startup

### WhatsApp Disconnecting Frequently

**Possible causes:**
- Free tier spinning down (Render)
- Network issues
- WhatsApp detected unusual activity

**Solutions:**
- Use Railway instead of Render
- Don't use WhatsApp Web manually while bot is running
- Avoid running bot from multiple servers simultaneously

### Database Not Persisting

**Railway:**
- Should work automatically
- Check that `.gitignore` includes `*.db` so it's not in Git

**Render:**
- Verify disk is mounted correctly
- Check mount path matches the app directory

### Out of Memory Errors

**Solution:**
- Increase memory limit in Railway/Render settings
- Free tiers should be sufficient for personal use
- If heavy usage, consider paid tier

---

## Updating the Bot

### Railway (from CLI)

```bash
railway up
```

### Railway/Render (from GitHub)

1. Push changes to GitHub:
   ```bash
   git add .
   git commit -m "Update bot"
   git push
   ```

2. Railway/Render will auto-deploy new changes

---

## Security Best Practices

1. **Never commit `.env` file** (already in `.gitignore`)
2. **Use environment variables** for secrets on Railway/Render
3. **Keep OpenAI API key secure** - rotate if exposed
4. **Monitor API usage** on OpenAI dashboard
5. **Set spending limits** on OpenAI account

---

## Backup & Recovery

### Backup Database

From Railway CLI:
```bash
railway run cat tasks.db > backup.db
```

Or download from Railway/Render dashboard file browser.

### Restore Database

Upload `tasks.db` file to your deployment, or:

```bash
railway run "cat > tasks.db" < backup.db
```

---

## Getting Help

- Check logs first: Railway/Render dashboard → Logs
- Test locally before deploying
- Ensure environment variables are set
- Verify WhatsApp session is active

---

## Next Steps After Deployment

1. **Test the bot**: Message yourself on WhatsApp
2. **Check dashboard**: Visit your public URL
3. **Monitor costs**: Check OpenAI usage after a week
4. **Set up alerts**: Railway/Render can email you if service goes down
5. **Share** (optional): If you want others to use it, they'll need their own instance

Enjoy your WhatsApp Task Bot! 🎉

