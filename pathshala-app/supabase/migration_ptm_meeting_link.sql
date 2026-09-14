-- Goal Guru — add an optional meeting link to PTM schedule (e.g. Zoom join link),
-- so parents have a direct way to join, not just a date/time on a card.
-- Run this in Supabase → SQL Editor before deploying the updated code.

alter table ptm_schedule add column if not exists meeting_link text;
