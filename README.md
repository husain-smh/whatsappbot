# WhatsApp Task Bot (Twilio Edition)

AI-powered WhatsApp bot that helps you capture, categorize, and manage tasks and ideas by messaging yourself. Now powered by **Twilio** for rock-solid stability!

## Features

- 📱 Message yourself on WhatsApp to capture tasks/ideas
- 🤖 AI-powered categorization with GPT-4o-mini
- 🏷️ Dynamic categories (personal, interns, identity labs, etc.)
- 🔍 Natural language queries ("show high priority tasks")
- 📊 Simple web dashboard to view all items
- 🔒 Privacy-first: only processes your messages
- ⚡ **No crashes, no QR codes, no browser automation**

## Why Twilio?

Previously used `whatsapp-web.js` which:
- ❌ Required QR code scanning
- ❌ Used headless Chrome (memory leaks)
- ❌ Needed complex recovery logic
- ❌ Crashed frequently

Now uses **Twilio WhatsApp API** which:
- ✅ Webhook-based (stable & fast)
- ✅ No QR codes
- ✅ No browser automation
- ✅ Free sandbox for personal use
- ✅ Just works™

## Setup

### Prerequisites

- Node.js 18+ installed
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))
- Twilio account (free)
- WhatsApp on your phone

### Step 1: Clone and Install

```bash
# Install dependencies
npm install
```

### Step 2: Get Twilio Credentials

1. **Sign up for Twilio** (free): https://www.twilio.com/try-twilio
2. After signup, navigate to:
   ```
   Console → Develop → Messaging → Try it out → Send a WhatsApp message
   ```
3. You'll see:
   - **Sandbox number** (e.g., `+1 415 523 8886`)
   - **Join code** (e.g., `join happy-dog`)
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (click to reveal)

4. **Activate your sandbox:**
   - Open WhatsApp on your phone
   - Start new chat with the Twilio sandbox number
   - Send: `join [your-code]` (e.g., `join happy-dog`)
   - You'll get confirmation: "Sandbox successfully joined!"

### Step 3: Configure Environment Variables

Create a `.env` file in the project root:

```bash
# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key-here

# Twilio Credentials (from Step 2)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Your WhatsApp Number (with country code)
MY_WHATSAPP_NUMBER=whatsapp:+1234567890

# Optional: Server port (defaults to 3000)
PORT=3000
```

**Important:** Replace the values above with your actual credentials!

### Step 4: Start the Bot

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

### Step 5: Expose Webhook (Choose One)

Twilio needs to reach your webhook endpoint. You have two options:

#### Option A: Local Development (ngrok)

```bash
# Install ngrok
npm install -g ngrok

# Expose your local server
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

Then configure Twilio webhook:
1. Go to: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox
2. Under **"When a message comes in"**, paste: `https://abc123.ngrok.io/webhook/whatsapp`
3. Save

**Note:** ngrok URL changes each restart (free tier). For permanent solution, deploy to cloud.

#### Option B: Cloud Deployment (Recommended)

Deploy to Railway, Render, or similar:

```bash
# Railway
railway login
railway init
railway up

# Get your public URL
railway domain  # e.g., https://wabot-production.up.railway.app
```

Then configure Twilio webhook:
1. Go to: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox
2. Under **"When a message comes in"**, paste: `https://your-app.up.railway.app/webhook/whatsapp`
3. Save

### Step 6: Test It!

Send a message to your Twilio WhatsApp number:

```
You → Twilio: "Task: Finish presentation by Friday"

← [BOT] ✅ Saved as task (ID: 1)
   Priority: 🟡 medium
   Deadline: 📅 2024-11-08
```

**It works! 🎉**

## Usage

### Sending Tasks/Ideas

Message your Twilio WhatsApp number naturally:
- `"Finish the presentation for interns by Friday"`
- `"Idea: build a dashboard for identity labs metrics"`
- `"Call the vendor tomorrow - high priority"`

The bot will automatically:
- Detect if it's a task or idea
- Extract priority (high/medium/low)
- Identify category
- Parse deadlines
- Store in database
- Reply with confirmation

### Querying

Ask questions in natural language:
- `"Show me all tasks"`
- `"List high priority items"`
- `"What's pending for interns?"`
- `"Which books I wanted to read?"`

### Web Dashboard

Open your browser to: `http://localhost:3000` (or your deployed URL)

- View all tasks and ideas
- Filter by type, priority, category, status
- Search through content
- See summary statistics

## Cost

- **Twilio Sandbox**: $0 (free forever for personal use)
- **AI Processing**: ~$1-2/month for moderate use (GPT-4o-mini)
- **Hosting**: 
  - Local: Free
  - Railway: $0 (free tier) to $5/month
  - Render: $0 (free tier)

**Total: ~$1-7/month** (mostly AI, Twilio is free)

## Deployment to Railway

Detailed deployment guide:

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Login and Initialize

```bash
railway login
railway init
```

### 3. Set Environment Variables

```bash
railway variables set OPENAI_API_KEY=sk-your-key
railway variables set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
railway variables set TWILIO_AUTH_TOKEN=your-auth-token-here
railway variables set TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
railway variables set MY_WHATSAPP_NUMBER=whatsapp:+1234567890
```

### 4. Deploy

```bash
railway up
```

### 5. Get Your URL

```bash
railway domain
# Example output: https://wabot-production.up.railway.app
```

### 6. Configure Twilio Webhook

Go to Twilio Console and set webhook URL to:
```
https://wabot-production.up.railway.app/webhook/whatsapp
```

### 7. Test

Send a message to your Twilio number. Check logs:
```bash
railway logs
```

## Deployment to Render

### 1. Create Render Account

Sign up at: https://render.com

### 2. New Web Service

- Click "New +" → "Web Service"
- Connect your GitHub repo
- Configure:
  - **Name**: wabot
  - **Environment**: Node
  - **Build Command**: `npm install`
  - **Start Command**: `npm start`

### 3. Add Environment Variables

In Render dashboard, add:
```
OPENAI_API_KEY=sk-your-key
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
MY_WHATSAPP_NUMBER=whatsapp:+1234567890
```

### 4. Deploy

Render will auto-deploy. Get your URL from dashboard (e.g., `https://wabot.onrender.com`)

### 5. Configure Twilio

Set webhook to: `https://wabot.onrender.com/webhook/whatsapp`

## Troubleshooting

### Bot not responding?

1. **Check Twilio webhook is configured**
   - Go to: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox
   - Verify webhook URL is correct
   - Should end with `/webhook/whatsapp`

2. **Check environment variables**
   - Make sure all variables in `.env` are set
   - `MY_WHATSAPP_NUMBER` must match your phone number exactly
   - Include `whatsapp:` prefix

3. **Check logs**
   - Local: Look at terminal output
   - Railway: `railway logs`
   - Render: Check logs in dashboard

4. **Test webhook manually**
   ```bash
   curl -X POST http://localhost:3000/webhook/whatsapp \
     -d "From=whatsapp:+1234567890" \
     -d "Body=test message"
   ```

### Messages from wrong number?

Bot only responds to `MY_WHATSAPP_NUMBER` for privacy. Check:
- Your number in `.env` matches your actual WhatsApp number
- Format: `whatsapp:+[country code][number]`
- No spaces or dashes

### Sandbox expired?

If you don't message for 3+ days, sandbox may deactivate. Just send:
```
join [your-code]
```
to the Twilio number again.

### Need to reset database?

```bash
npm run reset-database
```

**Warning:** This deletes all tasks and ideas!

## Privacy & Security

- Bot only processes messages from YOUR number
- All data stored locally in SQLite database
- API keys never shared or logged
- Twilio sandbox is private to your account

## Migration from whatsapp-web.js

If you're upgrading from the old version:

1. **Your data is safe** - Database format is unchanged
2. **No QR scanning** needed anymore
3. **Much more stable** - No browser crashes
4. **Faster responses** - Webhook-based
5. **Old files removed**:
   - `src/bot.js` (625 lines of complexity - gone!)
   - Recovery and troubleshooting docs
   - No more Puppeteer dependencies

## Future Enhancements

- Mark tasks as completed via WhatsApp
- Deadline reminders (proactive messages)
- Export functionality
- Rich media support (images, voice notes)
- Multiple user support

## FAQ

**Q: Can I use my personal WhatsApp number?**  
A: Yes! Sandbox works perfectly for personal use.

**Q: Is this free?**  
A: Twilio sandbox is free. You only pay for OpenAI (~$1-2/month) and hosting (can be free).

**Q: Can I use this for my team?**  
A: Sandbox is single-user. For teams, upgrade to Twilio WhatsApp Business API ($0.005/message after 1,000).

**Q: Is this against WhatsApp ToS?**  
A: No! We're using Twilio's official WhatsApp Business API, which is approved by WhatsApp.

**Q: What if Twilio changes their sandbox?**  
A: You'll get email notification. Just rejoin with the new code.

## License

MIT

## Credits

Built with:
- [Twilio](https://www.twilio.com) - WhatsApp API
- [OpenAI](https://openai.com) - GPT-4o-mini
- [SQLite](https://www.sqlite.org) - Database
- [Express](https://expressjs.com) - Web server

---

**Need help?** Check the logs for detailed debugging info or open an issue on GitHub.

**Enjoying the bot?** Star the repo! ⭐
