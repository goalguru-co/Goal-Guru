-- Goal Guru: wipe all testing content AND delete every non-admin account.
-- Keeps admin accounts (login, password, profile) fully intact.
-- Paste this WHOLE file into ONE blank query box in Supabase SQL Editor and run it.
-- Do not combine it with any other .sql file in the same paste.

-- Step 1: clear all content/activity data first. This must run before step 2,
-- since several tables reference profiles without cascading, and would block
-- user deletion if any rows in them still pointed at a teacher or student.
truncate table
  test_attempts,
  tests,
  doubts,
  announcements,
  attendance,
  fees,
  teacher_remarks,
  ptm_schedule,
  assignment_submissions,
  assignments,
  study_material,
  live_classes,
  video_views,
  videos,
  subscriptions,
  parent_links
restart identity cascade;

-- Step 2: delete every account that is not an admin. This removes the auth
-- login itself, which automatically removes the matching profile too.
-- Every admin account, of any count, is left completely untouched.
delete from auth.users
where id in (
  select id from profiles where role <> 'admin'
);
