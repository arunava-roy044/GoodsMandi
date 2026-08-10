-- Add bid_attempts column to track number of bid revisions per user per listing
-- Default is 1 (first bid counts as attempt 1)
ALTER TABLE bids ADD COLUMN IF NOT EXISTS bid_attempts INTEGER NOT NULL DEFAULT 1;
