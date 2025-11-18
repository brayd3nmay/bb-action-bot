-- Create the sent_emails table for tracking email notifications
CREATE TABLE IF NOT EXISTS sent_emails (
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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_sent_emails_lookup
  ON sent_emails(action_item_page_id, initiative_id, recipient_id);

CREATE INDEX IF NOT EXISTS idx_sent_emails_run_date
  ON sent_emails(run_date);

-- Add comment to table
COMMENT ON TABLE sent_emails IS 'Tracks all emails sent by the Business Builders Action Items Bot to prevent duplicates';
