-- Goal Guru — critical security fixes.
-- Run this in Supabase → SQL Editor. Read the comments — this closes real holes.

-- ============================================================
-- 1. PRIVILEGE ESCALATION FIX (the most severe issue found)
-- ============================================================
-- The existing "update own profile" policy only checks that a user is updating
-- their own row — it does NOT restrict which columns they can change. Right now,
-- any logged-in user can run one Supabase call from their browser console to set
-- their own role to 'admin', mark themselves approved, or set arbitrary points.
--
-- This trigger locks down the privileged columns (role, approved, points,
-- streak_count, school_id) so only staff (admin/teacher) or your server's
-- service-role key can change them — regardless of what a regular user submits.
-- Everything else (full_name, phone, last_active_date, etc.) still updates freely.

create or replace function protect_profile_privileged_columns() returns trigger as $$
begin
  -- Trusted contexts: your server-side API routes (service role), or staff
  -- acting on any profile (e.g. admin approving a signup) — allow as submitted.
  if auth.role() = 'service_role' or is_staff() then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- Regular user updating their own row: force privileged columns back to
    -- whatever they already were, no matter what the client tried to send.
    new.role := old.role;
    new.approved := old.approved;
    new.points := old.points;
    new.streak_count := old.streak_count;
    new.school_id := old.school_id;
    return new;
  elsif tg_op = 'INSERT' then
    -- Defense in depth: profiles should only ever be created via the service-role
    -- signup routes, but if a direct client insert ever slips through, force safe
    -- defaults rather than trusting the submitted role/approved/points.
    new.approved := false;
    new.points := 0;
    new.streak_count := 0;
    if new.role not in ('student', 'parent', 'teacher') then
      new.role := 'student';
    end if;
    return new;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists protect_profile_columns_update on profiles;
create trigger protect_profile_columns_update
  before update on profiles
  for each row execute function protect_profile_privileged_columns();

drop trigger if exists protect_profile_columns_insert on profiles;
create trigger protect_profile_columns_insert
  before insert on profiles
  for each row execute function protect_profile_privileged_columns();

-- ============================================================
-- 2. REMOVE UNUSED-BUT-EXPLOITABLE CLIENT INSERT POLICIES
-- ============================================================
-- None of these are used by the app anymore — signup, subscriptions, test
-- completion, and assignment submission all go through server routes using the
-- service-role key (which bypasses RLS entirely, so dropping these client
-- policies doesn't break anything legitimate). Left in place, each one is a
-- direct exploit:
--   - insert own profile:      self-insert a profile with any role (e.g. admin)
--   - insert own subscription: grant yourself free active access, no payment
--   - insert own attempt:      fabricate a perfect test score directly
--   - insert own submission:   resubmit an assignment repeatedly for free points

drop policy if exists "insert own profile" on profiles;
drop policy if exists "insert own subscription" on subscriptions;
drop policy if exists "insert own attempt" on test_attempts;
drop policy if exists "insert own submission" on assignment_submissions;

-- ============================================================
-- 3. PREVENT DUPLICATE ATTEMPTS/SUBMISSIONS AT THE DATABASE LEVEL
-- ============================================================
-- The app already blocks this in the UI and now in the new server routes too,
-- but a real database constraint is the only guarantee that can never be
-- bypassed. Clean up any pre-existing duplicates first (keeps the earliest one),
-- since the constraint will fail to apply if duplicates already exist.

delete from test_attempts a using test_attempts b
  where a.id > b.id and a.test_id = b.test_id and a.student_id = b.student_id;

alter table test_attempts
  drop constraint if exists unique_student_test,
  add constraint unique_student_test unique (test_id, student_id);

delete from assignment_submissions a using assignment_submissions b
  where a.id > b.id and a.assignment_id = b.assignment_id and a.student_id = b.student_id;

alter table assignment_submissions
  drop constraint if exists unique_student_assignment,
  add constraint unique_student_assignment unique (assignment_id, student_id);
