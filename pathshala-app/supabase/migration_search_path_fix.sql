-- Goal Guru — closes the Supabase "Function Search Path Mutable" warnings.
-- Purely a hardening fix — pins the schema search path on each SECURITY DEFINER
-- function so it can't be tricked into resolving a name from the wrong schema.
-- No behavior change, safe to run any time.

create or replace function is_admin() returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$ language sql security definer set search_path = public;

create or replace function is_staff() returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin','teacher'));
$$ language sql security definer set search_path = public;

create or replace function is_parent_of(target_student uuid) returns boolean as $$
  select exists (
    select 1 from parent_links
    where parent_id = auth.uid() and student_id = target_student
  );
$$ language sql security definer set search_path = public;

create or replace function protect_profile_privileged_columns() returns trigger as $$
begin
  if auth.role() = 'service_role' or is_staff() then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.role := old.role;
    new.approved := old.approved;
    new.points := old.points;
    new.streak_count := old.streak_count;
    new.school_id := old.school_id;
    return new;
  elsif tg_op = 'INSERT' then
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
$$ language plpgsql security definer set search_path = public;
