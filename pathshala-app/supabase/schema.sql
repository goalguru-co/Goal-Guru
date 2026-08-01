-- ============================================================
-- PATHSHALA APP — DATABASE SCHEMA
-- Copy-paste this entire file into Supabase → SQL Editor → Run
-- ============================================================

-- Schools (colleges) you are partnering with
create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone default now()
);

-- Extra profile info for every logged-in user (students + admins)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'student', -- 'student' or 'admin'
  school_id uuid references schools(id),
  class_level int, -- 6,7,8,9,10
  approved boolean not null default false, -- admin must approve self-signups
  created_at timestamp with time zone default now()
);

-- Subscription plans a student has bought
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade,
  class_level int not null,
  plan_type text not null default 'annual', -- 'annual' or 'single_class'
  status text not null default 'pending', -- 'pending','active','expired'
  razorpay_order_id text,
  razorpay_payment_id text,
  amount int, -- in paise
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Recorded video lectures (YouTube unlisted videos, embedded)
create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  class_level int not null,
  subject text not null,
  title text not null,
  youtube_id text not null, -- just the 11-char YouTube video ID
  sort_order int default 0,
  created_at timestamp with time zone default now()
);

-- Live class schedule (YouTube Live unlisted stream link)
create table if not exists live_classes (
  id uuid primary key default gen_random_uuid(),
  class_level int not null,
  subject text not null,
  title text not null,
  youtube_id text not null,
  scheduled_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

-- Study material (PDFs etc, stored as external links or Supabase Storage paths)
create table if not exists study_material (
  id uuid primary key default gen_random_uuid(),
  class_level int not null,
  subject text not null,
  title text not null,
  file_url text not null,
  created_at timestamp with time zone default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table videos enable row level security;
alter table live_classes enable row level security;
alter table study_material enable row level security;
alter table schools enable row level security;

-- Profiles: a user can read/update only their own row
create policy "read own profile" on profiles for select using (auth.uid() = id);
create policy "update own profile" on profiles for update using (auth.uid() = id);
create policy "insert own profile" on profiles for insert with check (auth.uid() = id);

-- Admins can read every profile (checked via a function below)
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

create policy "admin read all profiles" on profiles for select using (is_admin());
create policy "admin update all profiles" on profiles for update using (is_admin());

-- Subscriptions: student sees own; admin sees all
create policy "read own subscriptions" on subscriptions for select using (auth.uid() = student_id or is_admin());
create policy "insert own subscription" on subscriptions for insert with check (auth.uid() = student_id);
create policy "admin manage subscriptions" on subscriptions for update using (is_admin());

-- Videos / live classes / study material:
-- Anyone logged in can READ the list, but the app only shows the
-- play button if the student has an active subscription for that class
-- (checked in application code before rendering the embed).
create policy "read videos" on videos for select using (auth.role() = 'authenticated');
create policy "admin manage videos" on videos for insert with check (is_admin());
create policy "admin update videos" on videos for update using (is_admin());
create policy "admin delete videos" on videos for delete using (is_admin());

create policy "read live classes" on live_classes for select using (auth.role() = 'authenticated');
create policy "admin manage live classes" on live_classes for insert with check (is_admin());
create policy "admin update live classes" on live_classes for update using (is_admin());
create policy "admin delete live classes" on live_classes for delete using (is_admin());

create policy "read study material" on study_material for select using (auth.role() = 'authenticated');
create policy "admin manage study material" on study_material for insert with check (is_admin());
create policy "admin delete study material" on study_material for delete using (is_admin());

create policy "read schools" on schools for select using (auth.role() = 'authenticated');
create policy "admin manage schools" on schools for insert with check (is_admin());

-- ============================================================
-- After running this, make YOUR OWN account an admin by running:
-- update profiles set role = 'admin', approved = true where id = 'YOUR-USER-UUID';
-- (Get your UUID from Supabase → Authentication → Users, after you sign up once)
-- ============================================================
