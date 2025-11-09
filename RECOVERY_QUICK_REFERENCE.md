# Recovery System - Quick Reference

## 🎯 What Changed (Simple Version)

### **The Problem:**
Browser crashed → Bot got stuck → Never recovered → You had to manually restart

### **The Fix:**
Browser crashed → Bot detects it → Waits 5-10-30s (smart delays) → Restarts automatically → Back online! ✅

---

## 📊 Visual Flow

```
┌─────────────────────────────────────────────────────────┐
│           NORMAL OPERATION                               │
│  Bot receives messages → Processes them → Sends replies  │
│  Health checks every 2 minutes: "✓ Healthy"             │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
              ⚠️ BROWSER CRASHES
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              RECOVERY MODE                               │
│  1. Stop health checks (prevent interference)            │
│  2. Set isRecovering=true (prevent duplicate attempts)   │
│  3. Wait 5s (exponential backoff)                        │
│  4. Destroy old browser                                  │
│  5. Start new browser                                    │
│  6. Wait for WhatsApp to connect                         │
└─────────────────────────────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          │                              │
          ▼                              ▼
      SUCCESS                         FAILED
          │                              │
          ▼                              ▼
┌─────────────────┐            ┌──────────────────┐
│  BACK ONLINE!   │            │  RETRY (10s)     │
│  Reset counters │            │  Then 30s, 60s.. │
│  Resume health  │            │  Max 5 attempts  │
│  checks         │            └──────────────────┘
└─────────────────┘                     │
                                        ▼
                               After 5 failures:
                               Manual restart needed
```

---

## 🔧 Key Configuration

**Location:** Top of `src/bot.js`

```javascript
// How often to check if bot is alive
CONNECTION_CHECK_INTERVAL = 120000  // 2 minutes

// Retry delays (exponential backoff)
RECOVERY_DELAYS = [5s, 10s, 30s, 60s, 120s]

// Max recovery attempts before giving up
MAX_RECOVERY_ATTEMPTS = 5

// Auto-restart every 6 hours (prevent crashes)
PROACTIVE_RESTART_INTERVAL = 6 hours
```

---

## 🎓 What Each Part Does

### **State Flags**
- `isReady` → Is bot working and can process messages?
- `isRecovering` → Is bot currently trying to fix itself?
- `recoveryAttempts` → How many times have we tried to recover?

### **Recovery Function** (`attemptRecovery`)
- Prevents multiple recoveries at once
- Waits before retrying (5s, then 10s, then 30s...)
- Destroys crashed browser
- Starts fresh browser
- Waits for it to connect

### **Health Check** (`startConnectionMonitoring`)
- Runs every 2 minutes
- Checks if browser is still alive
- If dead → triggers recovery
- If recovering → skips check (don't interfere)

### **Proactive Restart** (`scheduleProactiveRestart`)
- Timer set for 6 hours
- When it fires → triggers clean restart
- Prevents crashes before they happen
- Like restarting your computer to keep it fresh

---

## 📱 What You'll See

### **Normal Operation**
```
✓ Connection healthy (idle: 3m, uptime: 47m)
```
Every 2 minutes, confirms bot is alive

### **Crash Detected**
```
⚠️  Health check failed: Protocol error (Runtime.callFunctionOn): Session closed
```
Browser crashed, bot knows something is wrong

### **Recovery Starting**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 RECOVERY MODE ACTIVATED (Reason: health_check_failed)
   Attempt: 1/5
   Waiting 5s before retry (exponential backoff)...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
Bot is fixing itself, please wait

### **Recovery Success**
```
🎉 WhatsApp bot RECOVERED successfully!
✓ Connected as: Your Name (919123456789)
✓ Bot back online after recovery (uptime: 47m)
```
Bot is back online! 🎉

### **Proactive Restart (Every 6 Hours)**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 PROACTIVE RESTART - Refreshing browser to prevent issues
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
Bot is refreshing itself to stay healthy

### **Manual Restart Needed (Rare)**
```
❌ Maximum recovery attempts reached. Manual restart required.
💡 Please stop the bot (Ctrl+C) and run: npm start
```
Only happens if recovery fails 5 times in a row

---

## 🎯 Common Questions

### **Q: Will my bot crash anymore?**
A: It might, but it will automatically restart itself! No manual intervention needed (usually).

### **Q: How long does recovery take?**
A: Typically 10-20 seconds. Could be up to 2 minutes if multiple retries needed.

### **Q: Will I lose messages during recovery?**
A: Messages sent during recovery (10-20s window) might be missed. WhatsApp doesn't queue them. But bot will be back online quickly.

### **Q: Why restart every 6 hours?**
A: Chrome/Puppeteer has memory leaks. Proactive restart clears memory before problems start. Like rebooting your computer monthly.

### **Q: Can I change the 6 hour interval?**
A: Yes! Edit `PROACTIVE_RESTART_INTERVAL` in `src/bot.js`:
```javascript
// 12 hours
const PROACTIVE_RESTART_INTERVAL = 12 * 60 * 60 * 1000;

// 24 hours
const PROACTIVE_RESTART_INTERVAL = 24 * 60 * 60 * 1000;
```

### **Q: What if recovery keeps failing?**
A: After 5 attempts, bot gives up and asks you to manually restart:
```bash
# Stop the bot
Ctrl + C

# Restart it
npm start
```

### **Q: How do I know bot is working?**
A: Look for health check messages every 2 minutes:
```
✓ Connection healthy (idle: 3m, uptime: 120m)
```
If you see these, bot is fine!

---

## 🛠️ Troubleshooting

### **Bot keeps recovering constantly**
- **Cause:** System resources too low (RAM, CPU)
- **Fix:** Close other apps, or increase Windows virtual memory

### **Recovery never succeeds**
- **Cause:** Network issues or firewall blocking reconnection
- **Fix:** Check internet connection, disable VPN, allow Node.js through firewall

### **Bot crashes after exactly 6 hours**
- **Not a bug!** That's the proactive restart. It should recover automatically within 20 seconds.

### **"Manual restart required" appears**
- **Rare:** Only after 5 failed recoveries
- **Action Required:** Stop bot (Ctrl+C) and restart (`npm start`)

---

## ✅ Success Checklist

After starting bot, you should see:
- ✅ QR code → Scan with WhatsApp
- ✅ "✓ WhatsApp bot is ready!"
- ✅ "🔍 Starting connection health monitoring..."
- ✅ "🔄 Proactive restart scheduled in 6 hours"
- ✅ Health checks every 2 minutes: "✓ Connection healthy"

Now let it run! 🚀

---

## 🔗 Related Files

- **Main bot code:** `src/bot.js`
- **Detailed explanation:** `RECOVERY_FIX_SUMMARY.md`
- **General troubleshooting:** `TROUBLESHOOTING.md`

---

## 💡 Pro Tips

1. **Monitor the logs** - Keep terminal visible to see health checks
2. **Don't spam health checks** - 2 minutes is good balance (don't decrease to 30s)
3. **Trust the system** - If you see "Recovery in progress", just wait
4. **Close WhatsApp Web** - Don't use WhatsApp Web manually while bot runs
5. **Stable internet** - Bot needs continuous connection to work

---

**TL;DR:** Start your bot once. It will auto-recover from crashes. Only manual restart needed if 5 recoveries fail (very rare). Enjoy 24/7 uptime! 🎉


