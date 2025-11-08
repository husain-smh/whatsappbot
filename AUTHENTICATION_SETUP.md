# 🔒 Authentication Setup Guide

Your dashboard is now protected with password authentication!

## ✅ What's Done

- **Login page** - Beautiful custom login matching your dashboard style
- **Session management** - Secure 24-hour sessions with HTTP-only cookies
- **Protected routes** - All API endpoints require authentication
- **Public webhook** - WhatsApp messages still work without login
- **Logout button** - Easy logout from dashboard
- **Auto-redirect** - Expired sessions redirect to login automatically

---

## 🚀 Setup Steps

### 1. Update your `.env` file

Add these new credentials to your `.env` file:

```bash
# Dashboard Authentication
DASHBOARD_USERNAME=your-username-here
DASHBOARD_PASSWORD=your-strong-password-here

# Session Secret (change to random string)
SESSION_SECRET=your-random-secret-key-at-least-32-chars-long
```

**Important:**
- Change `DASHBOARD_USERNAME` to your desired username
- Change `DASHBOARD_PASSWORD` to a strong password
- Change `SESSION_SECRET` to a random string (at least 32 characters)

### 2. Restart your server

```bash
npm start
```

### 3. Test it out

1. Go to `http://localhost:3000`
2. You'll be redirected to `/login`
3. Enter your username and password
4. You're in! 🎉

---

## 🔐 Security Features

**✅ Session-based auth** - No passwords stored in browser  
**✅ HTTP-only cookies** - Protected from XSS attacks  
**✅ 24-hour expiry** - Auto-logout after inactivity  
**✅ Webhook stays public** - WhatsApp messages work without auth  
**✅ Auto-redirect** - Expired sessions handled gracefully  

---

## 🧪 Testing Checklist

- [ ] Login page loads at `/login`
- [ ] Invalid credentials show error
- [ ] Valid credentials redirect to dashboard
- [ ] Dashboard loads all data
- [ ] Logout button works
- [ ] After logout, can't access dashboard
- [ ] WhatsApp webhook still receives messages (public)
- [ ] Session expires after 24 hours

---

## 🛠️ Troubleshooting

### Problem: "Unauthorized" errors
**Solution:** Make sure credentials in `.env` match what you're entering

### Problem: Can't login
**Solution:** Check that `DASHBOARD_USERNAME` and `DASHBOARD_PASSWORD` are set in `.env`

### Problem: Session keeps expiring
**Solution:** Check that `SESSION_SECRET` is set (used to sign cookies)

### Problem: Webhook not working
**Solution:** Webhook is public and doesn't need auth - should work fine!

---

## 📝 Notes

- **Production:** Set `NODE_ENV=production` for HTTPS-only cookies
- **Multiple users:** Currently supports one user (from .env)
- **Session storage:** In-memory (resets on server restart)
- **Password strength:** Use a strong password (12+ characters)

---

## 🎨 What Changed

### New Files:
- `public/login.html` - Login page

### Modified Files:
- `src/server.js` - Added auth middleware & routes
- `public/app.js` - Added auth checks & logout
- `public/index.html` - Added logout button
- `public/style.css` - Added logout button styles
- `env.example` - Added auth variables

---

**All done! Your dashboard is now secure.** 🔒

