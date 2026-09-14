-- Goal Guru: wipe all testing/demo content, keep every login and profile intact.
-- Paste this WHOLE file into ONE blank query box in Supabase SQL Editor and run it.
-- Do not combine it with any other .sql file in the same paste.

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
