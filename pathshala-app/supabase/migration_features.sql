-- Goal Guru — schema updates for: teacher study-material uploads, short-answer
-- marking scheme + review workflow, and configurable subscription plans.
-- Run this in Supabase → SQL Editor before deploying the updated app.

-- ============================================================
-- 1. Track who uploaded content (teachers can now upload their own)
-- ============================================================
alter table study_material add column if not exists created_by uuid references profiles(id);
alter table videos add column if not exists created_by uuid references profiles(id);

-- study_material was missing an update policy entirely (had insert + delete only).
drop policy if exists "staff update study material" on study_material;
create policy "staff update study material" on study_material for update using (is_staff());

-- ============================================================
-- 2. Short-answer marking scheme + review workflow
-- ============================================================
-- short_answer_review stores { "<question index>": marksAwarded } once a
-- teacher grades each short-answer response. pending_review is true for any
-- attempt on a test that has short-answer questions, until a teacher grades them.
alter table test_attempts add column if not exists short_answer_review jsonb not null default '{}'::jsonb;
alter table test_attempts add column if not exists pending_review boolean not null default false;

-- Staff need to update attempts to record grading (previously no update policy existed).
drop policy if exists "staff update attempts" on test_attempts;
create policy "staff update attempts" on test_attempts for update using (is_staff());

-- ============================================================
-- 3. Configurable subscription plans (admin-managed, student-selectable)
-- ============================================================
create table if not exists subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,               -- e.g. "Full access", "Tests only", "Lectures only"
  description text,                 -- shown to students, e.g. what's included
  price_paise int not null,         -- price in paise (₹1 = 100 paise)
  includes_videos boolean not null default true,
  includes_live_classes boolean not null default true,
  includes_tests boolean not null default true,
  includes_material boolean not null default true,
  active boolean not null default true,
  created_at timestamp with time zone default now()
);

alter table subscription_plans enable row level security;
create policy "anyone can read active plans" on subscription_plans for select using (true);
create policy "staff manage plans" on subscription_plans for insert with check (is_staff());
create policy "staff update plans" on subscription_plans for update using (is_staff());
create policy "staff delete plans" on subscription_plans for delete using (is_staff());

-- Track which plan a subscription is for, and what it includes at the time of
-- purchase (so changing a plan later doesn't retroactively change what an
-- existing subscriber has already paid for).
alter table subscriptions add column if not exists plan_id uuid references subscription_plans(id);
alter table subscriptions add column if not exists includes_videos boolean not null default true;
alter table subscriptions add column if not exists includes_live_classes boolean not null default true;
alter table subscriptions add column if not exists includes_tests boolean not null default true;
alter table subscriptions add column if not exists includes_material boolean not null default true;

-- Seed one default "Full access" plan matching the current fixed price, so the
-- app keeps working immediately after this migration without admin setup.
insert into subscription_plans (name, description, price_paise, includes_videos, includes_live_classes, includes_tests, includes_material)
select 'Full access', 'Video lectures, live classes, tests, and study material — everything in one plan.', 150000, true, true, true, true
where not exists (select 1 from subscription_plans);
