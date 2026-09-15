-- Migration: Add is_test flag to polls table (Cloudflare D1 / SQLite)
-- Marks a poll as a test poll so it can be excluded from the /stats page.
-- Existing polls default to 0 (not a test poll).

ALTER TABLE polls ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0;
