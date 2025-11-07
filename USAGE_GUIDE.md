# Usage Guide

Complete guide on how to use your WhatsApp Task Bot effectively.

---

## Getting Started

### 1. Open WhatsApp

Open WhatsApp on your phone (iOS or Android).

### 2. Find "Message Yourself"

- Tap the new chat button (💬 or ✏️)
- At the top of your contacts, you'll see **"Message Yourself"**
- Tap it to open your self-chat

**Alternative:** Save your own phone number as "Task Bot" contact and message that.

---

## Tracking Tasks

### Basic Task Examples

Just message yourself naturally:

```
Finish the presentation by Friday
```

The bot will:
- Detect it's a **task**
- Extract **deadline**: Friday
- Set **priority**: medium (default)
- Assign **category**: based on content
- Reply with confirmation

### More Examples

```
Call the vendor tomorrow - urgent
```
→ Task | High priority | Deadline: tomorrow

```
Review intern projects by next week
```
→ Task | Category: interns | Deadline: next week

```
Buy groceries
```
→ Task | Category: personal | No deadline

---

## Tracking Ideas

### Basic Idea Examples

```
Idea: Build a mobile app for pet tracking
```
→ Idea | Category: suggested by AI

```
Maybe we should automate the reporting process
```
→ Idea | Category: work/automation

```
Thought: Create a YouTube channel about coding
```
→ Idea | Category: personal

---

## Querying Your Tasks

### Show All Tasks

```
Show me all tasks
```

```
List my tasks
```

```
What tasks do I have?
```

### Filter by Priority

```
Show high priority tasks
```

```
What's urgent?
```

```
List low priority items
```

### Filter by Category

```
Show personal tasks
```

```
What do I have for interns?
```

```
List identity labs ideas
```

### Filter by Status

```
Show pending tasks
```

```
What's completed?
```

```
List cancelled items
```

### Combine Filters

```
Show high priority personal tasks
```

```
List pending ideas for interns
```

```
What are my urgent identity labs tasks?
```

### Get Statistics

```
Give me stats
```

```
Show me a summary
```

```
Overview
```

---

## Understanding Bot Responses

### Confirmation Message

When you send a task or idea, the bot replies with:

```
✅ Saved as task (ID: 42)

Priority: 🔴 high
Category: 🏷️ interns
Deadline: 📅 2024-11-08

Type "show tasks" or "list ideas" to see your items
```

### Query Response

When you ask for tasks:

```
📋 3 tasks (high priority)

🔴 HIGH PRIORITY
1. 🔴 Finish presentation [work] 📅 Due in 2 days
2. 🔴 Call vendor [personal] 📅 Due TODAY
3. 🔴 Review proposals [interns] 📅 Due tomorrow
```

---

## Priority System

The bot automatically detects priority based on keywords:

### High Priority

Keywords: `urgent`, `ASAP`, `critical`, `important`, `immediately`, `today`, `now`

**Examples:**
- "URGENT: Fix the bug in production"
- "Call client ASAP"
- "Critical meeting prep needed"

### Medium Priority (Default)

Most tasks without urgency indicators are marked medium.

**Examples:**
- "Finish the report by Friday"
- "Update documentation"
- "Plan next quarter goals"

### Low Priority

Keywords: `maybe`, `eventually`, `someday`, `nice to have`, `if time`

**Examples:**
- "Maybe reorganize the files"
- "Eventually learn Spanish"
- "Nice to have: dark mode for dashboard"

---

## Category System

### Default Categories

- **personal** - Personal life, errands, self-care
- **interns** - Intern-related tasks and projects
- **identity labs** - Identity Labs work and initiatives

### Dynamic Categories

The bot automatically creates new categories based on your content:

```
Deploy the frontend to AWS
```
→ Category: "aws" or "deployment" (created automatically)

```
Plan the marketing campaign for Q4
```
→ Category: "marketing" (created automatically)

You can also explicitly specify:

```
Create category: project-x
```

---

## Deadline Parsing

The bot understands natural language dates:

### Relative Dates

- `today` → Today's date
- `tomorrow` → Tomorrow's date
- `next week` → 7 days from today
- `next month` → 30 days from today

### Day Names

- `by Friday` → Next Friday
- `on Monday` → Next Monday

### Specific Dates

- `by Nov 15` → November 15
- `on 2024-12-01` → December 1, 2024

### Examples

```
Finish report by Friday
```
→ Deadline: 2024-11-08 (next Friday)

```
Submit proposal tomorrow
```
→ Deadline: 2024-11-06 (tomorrow)

```
Launch product by Dec 1st
```
→ Deadline: 2024-12-01

---

## Web Dashboard

### Access Dashboard

Open your browser and go to: `http://localhost:3000`

(Or your deployed URL if on Railway/Render)

### Dashboard Features

#### Summary Cards

- Total items
- Total tasks
- Total ideas
- Pending count

#### Filters

- **Type**: Tasks, Ideas, or All
- **Priority**: High, Medium, Low, or All
- **Category**: Any category you've created
- **Status**: Pending, Completed, Cancelled
- **Search**: Search by content

#### Item Display

Each item shows:
- Type badge (Task/Idea)
- Priority indicator (color-coded)
- Category tag
- Status badge
- Full content
- Deadline (with overdue warnings)
- Created date
- Sender info

#### Color Coding

- 🔴 High Priority: Red border
- 🟡 Medium Priority: Orange border
- 🟢 Low Priority: Green border

---

## Tips & Best Practices

### 1. Be Natural

Don't overthink it. Just message yourself like you're taking notes:

```
Need to call mom tonight
```

```
Idea for new feature: user profiles
```

### 2. Add Context

More context = better categorization:

```
Review John's code for the intern project by tomorrow
```
→ Better categorized than just "Review code"

### 3. Use Keywords for Priority

If something is urgent, say so:

```
URGENT: Fix production bug
```

### 4. Regular Queries

Check your tasks regularly:

```
Show pending high priority tasks
```

### 5. Dashboard for Overview

Use WhatsApp for quick capture, dashboard for review.

### 6. Clear Old Tasks

Periodically mark completed tasks as done (manual in database for now).

---

## Advanced Usage

### Capture from Anywhere

Forward messages from other chats to yourself:

1. Long-press a message in a group chat
2. Tap "Forward"
3. Select "Message Yourself"
4. Bot will process it

### Voice Messages (Manual)

If you send a voice message to yourself:
1. Bot won't process it automatically
2. Type a text summary instead

### Multiple Items at Once

Send separate messages for each task:

```
Finish presentation by Friday
```

```
Call vendor tomorrow
```

```
Review proposals by Monday
```

Each gets processed individually.

---

## Common Patterns

### Morning Planning

```
Show pending high priority tasks
```
Review what needs to be done today.

### End of Day Review

```
Show stats
```
See what you've captured.

### Weekly Planning

```
Show all tasks
```
Review and plan your week.

### Idea Capture

```
Idea: [your brilliant idea]
```
Capture ideas as they come.

---

## Troubleshooting

### Bot Not Responding

**Check:**
1. Is the bot running? (Check terminal/logs)
2. Are you in self-chat?
3. Is your message text (not media)?

**Solution:**
- Restart bot if needed
- Verify QR code is still connected

### Wrong Categorization

**Why:**
- AI makes educated guesses
- Context might be unclear

**Solution:**
- Add more context in your message
- Manually recategorize in dashboard later

### Deadline Not Detected

**Why:**
- Date format not recognized
- Ambiguous phrasing

**Solution:**
- Use clearer date formats: "by Friday", "tomorrow", "2024-12-01"

---

## Privacy & Security

### What Gets Stored

- Message content
- Priority, category, deadline (extracted)
- Timestamp
- Your name (from WhatsApp)

### What Doesn't Get Stored

- Media files
- Voice messages
- Messages from other chats/groups
- Conversations with others

### Privacy Guarantee

- **Only your self-messages** are processed
- Bot **ignores all other chats**
- Data stored **locally** in SQLite database
- No external sharing except OpenAI API for processing

---

## Example Workflow

### Typical Day

**Morning:**
```
Show pending high priority tasks
```
→ Review what's urgent

**Throughout Day:**
```
Meeting with team at 2pm - urgent
```
→ Capture tasks as they come

```
Idea: Automate daily reports
```
→ Capture ideas when inspired

**Evening:**
```
Show stats
```
→ Review what you captured

**Weekly:**
- Open dashboard
- Review all pending items
- Plan next week

---

## Need Help?

- Check logs if bot isn't responding
- Verify OpenAI API key is set
- Ensure bot is connected to WhatsApp
- Review README.md for setup issues

Happy task tracking! 📋✨

