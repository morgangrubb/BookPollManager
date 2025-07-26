-- Migration: Add description and quote fields to polls table (Cloudflare D1 / SQLite)
-- This migration adds two optional fields: description and quote to the polls table.
-- Existing data will be preserved.

ALTER TABLE polls ADD COLUMN description TEXT;
ALTER TABLE polls ADD COLUMN quote TEXT;

-- Both fields are optional (nullable).
