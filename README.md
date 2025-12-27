# Builders Action Items Bot

An automated email notification system for managing action items in Notion. This bot sends daily digest emails to team leads with intelligent escalation based on task urgency.

## Features

### Daily Digest Emails
- **One email per person per day** - All notifications are consolidated into a single daily digest
- **Smart categorization** - Items are grouped into sections: Newly Assigned, Due Tomorrow, and Past Due
- **Duplicate prevention** - Uses Supabase to track sent emails and prevent duplicates on the same day

### Notification Types

1. **Newly Assigned Items**
   - Triggered when an action item is assigned to a team member
   - Sends on the day of assignment

2. **Due Tomorrow**
   - Reminder sent the day before an item is due
   - Helps team members stay ahead of deadlines

3. **Past Due**
   - Daily reminder for overdue items
   - Sent until the item is completed

4. **2 Days Past Due (Escalation)**
   - Sent to team lead
   - **CC's President and VP** for visibility
   - More urgent tone and formatting

5. **4+ Days Past Due (Critical)**
   - Sent **only to designated admins** (not the team lead)
   - Critical alert indicating team needs intervention
   - Highest priority notification

### Email Recipient Rules

| Notification Type | Primary Recipient | CC Recipients |
|------------------|------------------|---------------|
| Assigned         | Team Lead        | None          |
| Due Tomorrow     | Team Lead        | None          |
| Past Due         | Team Lead        | None          |
| 2 Days Past Due  | Team Lead        | Prez & VP     |
| 4+ Days Past Due | Admins Only      | None          |

### Priority System

When multiple notification types apply to the same person on the same day, the system sends **one email** with the highest priority category:

**Priority Order:** 4+ Days Past Due > 2 Days Past Due > Past Due > Due Tomorrow > Newly Assigned

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `NOTION_KEY` - Your Notion integration API key
- `NOTION_DATABASE_ID` - The ID of your action items database
- `RESEND_KEY` - Your Resend API key for sending emails
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase API key
- `PREZ_EMAIL` - President's email for escalation
- `VP_EMAIL` - VP's email for escalation
- `ADMIN_EMAIL_1` - First admin email (for 4+ days past due)
- `ADMIN_EMAIL_2` - Second admin email (for 4+ days past due)
- `CRON_SECRET` - Random secret key for securing the cron endpoint

### 3. Supabase Database Setup

Create a table called `sent_emails` with the following schema:

```sql
CREATE TABLE sent_emails (
  id BIGSERIAL PRIMARY KEY,
  action_item_page_id TEXT NOT NULL,
  initiative_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  original_due_date DATE,
  current_due_date DATE,
  category TEXT NOT NULL,
  provider_name TEXT,
  provider_message_id TEXT,
  email_status TEXT,
  run_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sent_emails_lookup ON sent_emails(action_item_page_id, initiative_id, recipient_id);
CREATE INDEX idx_sent_emails_run_date ON sent_emails(run_date);
```

### 4. Notion Database Structure

Your Notion database should have the following properties:
- `Action Item` (title) - The task description
- `Status` (status) - Options: Assigned, Delegated, In Progress, Past Due, Completed
- `Due Date` (date) - When the task is due
- `Assigned Initiative(s)` (relation) - Links to initiative pages
- Initiative pages should have:
  - `Initiative` (title) - Initiative name
  - `Lead` (relation) - Links to people pages
- People pages should have:
  - `Name` (title) - Full name
  - `School Email` (email) - Email address

## Usage

### Deploy to Vercel (Recommended)

This bot is configured to run automatically on Vercel using cron jobs.

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel
   ```

3. **Add Environment Variables** in Vercel Dashboard:
   - Go to your project settings
   - Add all environment variables from `.env` (including `CRON_SECRET`)
   - Generate a secure random string for `CRON_SECRET`

4. **Cron Schedule**:
   - The bot runs automatically every day at **9:00 AM EST** (14:00 UTC)
   - Configured in `vercel.json`

### Run Locally for Testing

Run the bot manually:

```bash
node main.js
```

## Email Templates

The bot uses responsive HTML email templates that work across all major email clients. Each notification type has:

- Custom subject lines
- Color-coded sections
- Business Builders branding
- Action buttons linking to Notion
- Mobile-friendly design

## How It Works

1. **Query Notion** - Fetches action items in different categories (assigned, due tomorrow, past due, etc.)
2. **Aggregate by Initiative** - Groups items by initiative and team lead
3. **Check for Duplicates** - Queries Supabase to see if emails were already sent today
4. **Create Digest** - Combines all applicable items into one email per person
5. **Determine Priority** - Selects the highest priority notification type
6. **Send Email** - Sends via Resend with appropriate recipients and CC's
7. **Track Sent Emails** - Records in Supabase to prevent duplicates

## File Structure

```
bb-action-bot/
├── api/
│   └── cron.js          # Vercel serverless function for cron job
├── main.js              # Entry point for local testing
├── notionUtils.js       # Notion API queries and data aggregation
├── emailUtils.js        # Email generation and sending logic
├── supabaseUtils.js     # Supabase tracking functions
├── vercel.json          # Vercel cron job configuration
├── package.json         # Dependencies
├── .env                 # Environment variables (not in git)
├── .env.example         # Template for environment variables
└── README.md            # This file
```

## Troubleshooting

### Emails not sending
- Check that all environment variables are set correctly
- Verify Resend API key is valid
- Check console output for error messages

### Duplicate emails
- Ensure Supabase credentials are correct
- Check that the `sent_emails` table exists
- Verify timezone settings match ('America/New_York')

### Missing items
- Verify Notion database structure matches expected format
- Check that items have proper status values
- Ensure initiatives and people pages are properly linked

## Contributing

When making changes:
1. Test thoroughly with sample data
2. Update documentation
3. Follow existing code style
4. Add comments for complex logic

## License

MIT
