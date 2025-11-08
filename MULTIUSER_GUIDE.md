# Multi-User System Guide

## Overview

Your WhatsApp Task Bot now supports multiple users! Each user has their own isolated data, authentication, and dashboard access.

---

## What Changed?

### Before:
- ✗ Single hardcoded WhatsApp number
- ✗ Shared database for all tasks
- ✗ Simple username/password dashboard login
- ✗ Anyone with dashboard credentials could see all data

### After:
- ✅ Multiple WhatsApp users
- ✅ Each user has isolated data (phone-based)
- ✅ Phone number + password authentication
- ✅ Users only see their own tasks/ideas
- ✅ 24-hour automatic session for WhatsApp messages
- ✅ Secure password hashing

---

## Current Setup

### Default User Created
- **Phone:** `whatsapp:+916388990545`
- **Name:** Primary User
- **Password:** `change-me-123` ⚠️ **CHANGE THIS IMMEDIATELY!**
- **Tasks Assigned:** All 5 existing tasks are now assigned to this user

---

## How It Works

### Authentication Flow

#### WhatsApp Bot:
1. User sends message to bot
2. Bot checks if phone number exists in users table
3. If exists and active → create 24-hour session
4. Process message normally
5. All tasks/queries are scoped to that user's phone number

#### Dashboard:
1. User enters phone number + password
2. System authenticates against database
3. If valid → create web session
4. All API calls filtered by logged-in user's phone
5. User only sees their own data

---

## Adding New Users

### Method 1: Using the Helper Script (Recommended)

1. Open `src/add-user.js`
2. Edit the `usersToAdd` array:

```javascript
const usersToAdd = [
  {
    phone: 'whatsapp:+1234567890',
    name: 'John Doe',
    password: 'secure-password-123'
  },
  {
    phone: 'whatsapp:+9876543210',
    name: 'Jane Smith',
    password: 'another-password-456'
  }
];
```

3. Run:
```bash
npm run add-user
```

### Method 2: Manual Database Insertion

1. Open SQLite database:
```bash
sqlite3 tasks.db
```

2. Insert user:
```sql
-- You'll need to hash the password first using the app
-- For now, use the add-user.js script instead
```

---

## Phone Number Format

**Important:** All phone numbers must use the Twilio WhatsApp format:

✅ Correct: `whatsapp:+916388990545`
✅ Correct: `whatsapp:+1234567890`
❌ Wrong: `+916388990545`
❌ Wrong: `916388990545`

---

## Changing Your Password

Currently, passwords must be changed manually using the add-user script or database access.

### To Change Password:

1. Open `src/add-user.js`
2. Add the same phone number with new password:
```javascript
const usersToAdd = [
  {
    phone: 'whatsapp:+916388990545',
    name: 'Primary User',
    password: 'my-new-secure-password'
  }
];
```

3. The script will update the existing user

---

## Security Features

### Password Storage:
- ✅ PBKDF2 hashing with SHA-512
- ✅ Random salt per user
- ✅ Never stored in plain text

### Session Management:
- ✅ WhatsApp: 24-hour auto-session (refreshes on each message)
- ✅ Dashboard: Express session with secure cookies
- ✅ Sessions tied to specific phone numbers

### Data Isolation:
- ✅ All database queries filtered by `user_phone`
- ✅ No cross-user data leakage
- ✅ User verification on every operation

---

## User Management

### Checking Active Users

You can query the database directly:

```bash
sqlite3 tasks.db
```

```sql
SELECT phone_number, name, status, created_at, last_active FROM users;
```

### Deactivating a User

```sql
UPDATE users SET status = 'inactive' WHERE phone_number = 'whatsapp:+1234567890';
```

Inactive users:
- Cannot send messages to the bot
- Cannot log into the dashboard
- Data is preserved but inaccessible

### Reactivating a User

```sql
UPDATE users SET status = 'active' WHERE phone_number = 'whatsapp:+1234567890';
```

### Deleting a User (⚠️ Dangerous)

```sql
-- Delete user (their tasks will remain orphaned unless you handle foreign keys)
DELETE FROM users WHERE phone_number = 'whatsapp:+1234567890';

-- To also delete their tasks:
DELETE FROM items WHERE user_phone = 'whatsapp:+1234567890';
DELETE FROM users WHERE phone_number = 'whatsapp:+1234567890';
```

---

## Testing

### Test Dashboard Login:
1. Go to: `http://localhost:3000/login`
2. Enter:
   - Phone: `whatsapp:+916388990545`
   - Password: `change-me-123`
3. Should redirect to dashboard showing your 5 tasks

### Test WhatsApp Bot:
1. Send message from `+916388990545` to your bot
2. Bot checks database → finds you as registered user
3. Creates 24-hour session
4. Processes your message normally
5. All tasks saved with your phone number

### Test Data Isolation:
1. Add a second test user
2. Log in as each user in separate browser windows
3. Verify each sees only their own data

---

## Troubleshooting

### "You are not authorized to use this bot"
- Your phone number is not in the users table
- Run `npm run add-user` to add yourself

### "Your account is inactive"
- Your user status is set to 'inactive'
- Reactivate using SQL query above

### "Invalid credentials" on Dashboard
- Check phone number format (must include `whatsapp:` prefix)
- Verify password is correct
- Check if user exists in database

### Can't see any tasks
- Make sure you're logged in as the correct user
- Check if tasks are assigned to your phone number:
```sql
SELECT COUNT(*) FROM items WHERE user_phone = 'whatsapp:+916388990545';
```

### Session expires too quickly
- WhatsApp sessions last 24 hours (configurable in `webhook.js`)
- Dashboard sessions last 24 hours (configurable in `server.js`)

---

## Configuration

### Adjusting Session Timeout

**WhatsApp Session (in `src/webhook.js`):**
```javascript
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

// Change to 12 hours:
const SESSION_TIMEOUT = 12 * 60 * 60 * 1000;
```

**Dashboard Session (in `src/server.js`):**
```javascript
cookie: {
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}

// Change to 7 days:
cookie: {
  maxAge: 7 * 24 * 60 * 60 * 1000
}
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  phone_number TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_active TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Items Table (Updated)
```sql
CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_phone TEXT NOT NULL,  -- NEW: Links to users table
  type TEXT NOT NULL CHECK(type IN ('task', 'idea')),
  content TEXT NOT NULL,
  priority TEXT CHECK(priority IN ('high', 'medium', 'low')),
  category TEXT,
  deadline TEXT,
  context TEXT,
  tags TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_phone) REFERENCES users(phone_number)
);
```

---

## Next Steps

1. **Change Your Password**
   - Edit `src/add-user.js`
   - Update your password
   - Run `npm run add-user`

2. **Test Everything**
   - Dashboard login
   - WhatsApp messaging
   - Data isolation

3. **Add More Users**
   - Edit `src/add-user.js`
   - Add all users who need access
   - Run the script

4. **Deploy**
   - Deploy to your hosting platform
   - Update environment variables if needed
   - Test in production

---

## API Changes (For Developers)

All database functions now require `user_phone` parameter:

```javascript
// Before
getItems(filters)
getStats()
saveItem({ type, content, ... })

// After
getItems(user_phone, filters)
getStats(user_phone)
saveItem({ user_phone, type, content, ... })
```

All queries automatically filtered by user's phone number for security.

---

## Support

If you encounter issues:

1. Check database: `sqlite3 tasks.db` → `SELECT * FROM users;`
2. Check logs: Look for authentication errors
3. Verify phone number format
4. Test with the default user first
5. Create a new issue with error details

---

**Congratulations! Your bot is now multi-user ready! 🎉**

