-- ============================================================
-- GOAL GURU — DATABASE SCHEMA (v2 — multi-role)
-- Run this in Supabase → SQL Editor.
-- If you're upgrading from v1, first drop the old tables (your
-- assistant gave you that DROP block earlier), then run this
-- whole file in one go.
-- ============================================================

create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone default now()
);

-- profiles.role can be: 'student', 'parent', 'teacher', 'admin'
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'student',
  school_id uuid references schools(id),
  class_level int, -- for students: their class. for teachers: primary class they teach (optional)
  subject text, -- for teachers: subject they teach
  approved boolean not null default false,
  points int not null default 0,
  streak_count int not null default 0,
  last_active_date date,
  created_at timestamp with time zone default now()
);

-- Links a parent account to one or more student accounts.
-- If student_id is null, it means the parent signed up with a child's
-- phone number that didn't match any student yet — admin resolves it.
create table if not exists parent_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references profiles(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  student_phone text,
  created_at timestamp with time zone default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade,
  class_level int not null,
  plan_type text not null default 'annual',
  status text not null default 'pending',
  razorpay_order_id text,
  razorpay_payment_id text,
  amount int,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  class_level int not null,
  subject text not null,
  title text not null,
  youtube_id text not null,
  sort_order int default 0,
  created_at timestamp with time zone default now()
);

-- Tracks that a student opened a video — used for a simple
-- "lectures watched" stat on the parent dashboard.
create table if not exists video_views (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade,
  video_id uuid references videos(id) on delete cascade,
  viewed_at timestamp with time zone default now()
);

create table if not exists live_classes (
  id uuid primary key default gen_random_uuid(),
  class_level int not null,
  subject text not null,
  title text not null,
  youtube_id text not null,
  scheduled_at timestamp with time zone not null,
  created_by uuid references profiles(id),
  created_at timestamp with time zone default now()
);

create table if not exists study_material (
  id uuid primary key default gen_random_uuid(),
  class_level int not null,
  subject text not null,
  title text not null,
  file_url text not null,
  created_at timestamp with time zone default now()
);

-- Assignments (homework) set by teachers
create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  class_level int not null,
  subject text not null,
  title text not null,
  description text,
  due_date timestamp with time zone,
  file_url text,
  created_by uuid references profiles(id),
  created_at timestamp with time zone default now()
);

create table if not exists assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignments(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  file_url text,
  status text not null default 'submitted',
  grade text,
  submitted_at timestamp with time zone default now()
);

-- Tests / MCQ practice / mock tests.
-- questions is a JSON array like:
-- [{"q":"2+2=?","options":["3","4","5","6"],"correct":1}]
create table if not exists tests (
  id uuid primary key default gen_random_uuid(),
  class_level int not null,
  subject text not null,
  title text not null,
  questions jsonb not null default '[]',
  duration_minutes int default 20,
  scheduled_at timestamp with time zone,
  created_by uuid references profiles(id),
  created_at timestamp with time zone default now()
);

create table if not exists test_attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid references tests(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  answers jsonb,
  score int,
  total int,
  completed_at timestamp with time zone default now()
);

create table if not exists doubts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade,
  subject text,
  question text not null,
  status text not null default 'open',
  response text,
  responded_by uuid references profiles(id),
  responded_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  class_level int,
  title text not null,
  message text not null,
  created_by uuid references profiles(id),
  created_at timestamp with time zone default now()
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade,
  class_date date not null,
  status text not null default 'present',
  marked_by uuid references profiles(id),
  created_at timestamp with time zone default now(),
  unique (student_id, class_date)
);

create table if not exists fees (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade,
  amount int not null,
  status text not null default 'due',
  due_date date,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists teacher_remarks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade,
  teacher_id uuid references profiles(id),
  remark text not null,
  created_at timestamp with time zone default now()
);

create table if not exists ptm_schedule (
  id uuid primary key default gen_random_uuid(),
  class_level int,
  scheduled_at timestamp with time zone not null,
  notes text,
  created_at timestamp with time zone default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table parent_links enable row level security;
alter table subscriptions enable row level security;
alter table videos enable row level security;
alter table video_views enable row level security;
alter table live_classes enable row level security;
alter table study_material enable row level security;
alter table assignments enable row level security;
alter table assignment_submissions enable row level security;
alter table tests enable row level security;
alter table test_attempts enable row level security;
alter table doubts enable row level security;
alter table announcements enable row level security;
alter table attendance enable row level security;
alter table fees enable row level security;
alter table teacher_remarks enable row level security;
alter table ptm_schedule enable row level security;
alter table schools enable row level security;

create or replace function is_admin() returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$ language sql security definer;

create or replace function is_staff() returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin','teacher'));
$$ language sql security definer;

create or replace function is_parent_of(target_student uuid) returns boolean as $$
  select exists (
    select 1 from parent_links
    where parent_id = auth.uid() and student_id = target_student
  );
$$ language sql security definer;

create policy "read own profile" on profiles for select using (auth.uid() = id);
create policy "update own profile" on profiles for update using (auth.uid() = id);
create policy "insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "staff read all profiles" on profiles for select using (is_staff());
create policy "staff update profiles" on profiles for update using (is_staff());
create policy "parent read child profile" on profiles for select using (is_parent_of(id));

create policy "parent read own links" on parent_links for select using (auth.uid() = parent_id or is_staff());
create policy "parent insert own link" on parent_links for insert with check (auth.uid() = parent_id or is_staff());
create policy "staff manage links" on parent_links for update using (is_staff());

create policy "read own subscriptions" on subscriptions for select using (auth.uid() = student_id or is_staff() or is_parent_of(student_id));
create policy "insert own subscription" on subscriptions for insert with check (auth.uid() = student_id);
create policy "staff manage subscriptions" on subscriptions for update using (is_staff());

create policy "read videos" on videos for select using (auth.role() = 'authenticated');
create policy "staff manage videos" on videos for insert with check (is_staff());
create policy "staff update videos" on videos for update using (is_staff());
create policy "staff delete videos" on videos for delete using (is_staff());

create policy "read live classes" on live_classes for select using (auth.role() = 'authenticated');
create policy "staff manage live classes" on live_classes for insert with check (is_staff());
create policy "staff update live classes" on live_classes for update using (is_staff());
create policy "staff delete live classes" on live_classes for delete using (is_staff());

create policy "read study material" on study_material for select using (auth.role() = 'authenticated');
create policy "staff manage study material" on study_material for insert with check (is_staff());
create policy "staff delete study material" on study_material for delete using (is_staff());

create policy "insert own view" on video_views for insert with check (auth.uid() = student_id);
create policy "read own views" on video_views for select using (auth.uid() = student_id or is_staff() or is_parent_of(student_id));

create policy "read assignments" on assignments for select using (auth.role() = 'authenticated');
create policy "staff manage assignments" on assignments for insert with check (is_staff());
create policy "staff update assignments" on assignments for update using (is_staff());

create policy "read own submissions" on assignment_submissions for select using (auth.uid() = student_id or is_staff() or is_parent_of(student_id));
create policy "insert own submission" on assignment_submissions for insert with check (auth.uid() = student_id);
create policy "staff grade submissions" on assignment_submissions for update using (is_staff());

create policy "read tests" on tests for select using (auth.role() = 'authenticated');
create policy "staff manage tests" on tests for insert with check (is_staff());
create policy "staff update tests" on tests for update using (is_staff());

create policy "read own attempts" on test_attempts for select using (auth.uid() = student_id or is_staff() or is_parent_of(student_id));
create policy "insert own attempt" on test_attempts for insert with check (auth.uid() = student_id);

create policy "read own doubts" on doubts for select using (auth.uid() = student_id or is_staff() or is_parent_of(student_id));
create policy "insert own doubt" on doubts for insert with check (auth.uid() = student_id);
create policy "staff respond doubts" on doubts for update using (is_staff());

create policy "read announcements" on announcements for select using (auth.role() = 'authenticated');
create policy "staff manage announcements" on announcements for insert with check (is_staff());

create policy "read own attendance" on attendance for select using (auth.uid() = student_id or is_staff() or is_parent_of(student_id));
create policy "staff mark attendance" on attendance for insert with check (is_staff());
create policy "staff update attendance" on attendance for update using (is_staff());

create policy "read own fees" on fees for select using (auth.uid() = student_id or is_staff() or is_parent_of(student_id));
create policy "staff manage fees" on fees for insert with check (is_staff());
create policy "staff update fees" on fees for update using (is_staff());

create policy "read own remarks" on teacher_remarks for select using (auth.uid() = student_id or is_staff() or is_parent_of(student_id));
create policy "staff add remarks" on teacher_remarks for insert with check (is_staff());

create policy "read ptm" on ptm_schedule for select using (auth.role() = 'authenticated');
create policy "staff manage ptm" on ptm_schedule for insert with check (is_staff());

create policy "read schools" on schools for select using (auth.role() = 'authenticated');
create policy "staff manage schools" on schools for insert with check (is_staff());

-- ============================================================
-- After running this, make YOUR OWN account an admin:
-- update profiles set role = 'admin', approved = true where id = 'YOUR-USER-UUID';
-- ============================================================
