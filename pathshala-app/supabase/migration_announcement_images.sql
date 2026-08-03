-- Goal Guru — add optional image support to announcements.
-- Run this in Supabase → SQL Editor before deploying the updated app.

alter table announcements add column if not exists image_url text;
