# Quick Start Guide

Get your WhatsApp Task Bot running in 5 minutes!

## Step 1: Prerequisites

- ✅ Node.js 18+ installed ([download here](https://nodejs.org/))
- ✅ OpenAI API key ([get one here](https://platform.openai.com/api-keys))
- ✅ WhatsApp on your phone

## Step 2: Install Dependencies

```bash
npm install
```

This installs all required packages (~2 minutes).

## Step 3: Configure Environment

Create a `.env` file in the root directory:

```bash
# On Windows
copy .env.example .env

# On Mac/Linux
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-your-actual-api-key-here
PORT=3000
```

## Step 4: Start the Bot

```bash
npm start
```

You should see:
```
🚀 Starting WhatsApp Task Bot...
📦 Setting up database...
✓ Database initialized successfully
🌐 Starting web server...
✓ Dashboard server running at http://localhost:3000
🤖 Starting WhatsApp bot...

📱 Scan this QR code with your WhatsApp:

[QR CODE APPEARS HERE]
```

## Step 5: Connect WhatsApp

1. **On your phone**, open WhatsApp
2. Go to **Settings** → **Linked Devices**
3. Tap **"Link a Device"**
4. Scan the QR code from your terminal
5. Wait for confirmation: `✓ WhatsApp bot is ready!`

## Step 6: Test It!

### On WhatsApp:

1. Tap the new chat button (💬)
2. Find **"Message Yourself"** at the top
3. Send a test message:
   ```
   Finish the presentation by Friday
   ```
4. Bot should reply with confirmation! ✅

### On Dashboard:

1. Open browser: `http://localhost:3000`
2. You should see your task listed!

## That's It! 🎉

You're now ready to use your bot!

---

## Next Steps

### Capture Tasks
Message yourself on WhatsApp:
```
Call the client tomorrow - urgent
```

### Query Tasks
Ask your bot:
```
Show me high priority tasks
```

### View Dashboard
Open: `http://localhost:3000`

---

## Common Issues

### QR Code Not Showing
- Make sure terminal supports Unicode
- Try running in a different terminal
- Check that port 3000 is not in use

### Bot Not Responding
- Verify you're in the self-chat (Message Yourself)
- Check terminal for errors
- Ensure OPENAI_API_KEY is correct in `.env`

### "Module not found" Error
- Run `npm install` again
- Check Node.js version: `node --version` (should be 18+)

---

## Need More Help?

- **Detailed Usage**: See [USAGE_GUIDE.md](USAGE_GUIDE.md)
- **Deployment**: See [DEPLOYMENT.md](DEPLOYMENT.md)
- **Full README**: See [README.md](README.md)

---

## Stopping the Bot

Press `Ctrl + C` in the terminal

To restart:
```bash
npm start
```

You won't need to scan QR code again (session is saved)!

---

**Enjoy your AI-powered task tracking! 📋✨**

