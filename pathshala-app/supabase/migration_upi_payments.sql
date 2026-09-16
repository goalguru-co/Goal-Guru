-- Goal Guru: UPI/QR payment system, replacing Razorpay.
-- Run this in Supabase SQL Editor before deploying the updated code.

-- Single-row config: your UPI ID, payee name, and the subscription price.
-- Only admin can change where the money goes.
create table if not exists payment_settings (
  id uuid primary key default gen_random_uuid(),
  upi_vpa text,
  payee_name text,
  amount_paise int not null default 150000,
  updated_at timestamp with time zone default now()
);

alter table payment_settings enable row level security;
create policy "anyone can read payment settings" on payment_settings for select using (true);
create policy "admin insert payment settings" on payment_settings for insert with check (is_admin());
create policy "admin update payment settings" on payment_settings for update using (is_admin());

insert into payment_settings (amount_paise)
select 150000
where not exists (select 1 from payment_settings);

-- A student's self-reported UPI transaction ID after paying outside the app.
-- Approving one (via the server route, service role) creates the real
-- subscription row — nothing here activates access on its own.
create table if not exists payment_claims (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade,
  class_level int,
  amount_paise int not null,
  transaction_id text not null,
  status text not null default 'pending',
  submitted_at timestamp with time zone default now(),
  reviewed_by uuid references profiles(id),
  reviewed_at timestamp with time zone
);

alter table payment_claims enable row level security;
create policy "student insert own claim" on payment_claims for insert with check (auth.uid() = student_id);
create policy "student and admin read claims" on payment_claims for select using (auth.uid() = student_id or is_admin());
create policy "admin update claims" on payment_claims for update using (is_admin());
