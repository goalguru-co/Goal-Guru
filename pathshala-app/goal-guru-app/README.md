# Goal Guru — Ed-tech App (Classes 6-10)

A ready-made web app you can deploy yourself without hiring a developer —
free or near-free to run.

This is a **web app (PWA)** — students, parents, teachers and admins open it
in their phone's browser (Chrome), and can "Add to Home Screen" so it works
like a normal app. No Play Store listing needed (you can add one later if
you want).

## Roles

The app supports four account types:

- **Student** — signs up, gets approved by an admin, subscribes, then gets
  a personalized dashboard: Learn, Practice, Tests, Live Classes, Results,
  Notes, Doubts, Profile — plus points/streaks and progress tracking.
- **Parent** — signs up with their child's phone number, which auto-links
  to the matching student account. Sees attendance, test scores, homework
  status, fees, teacher remarks and PTM schedule for their child.
- **Teacher** — manages attendance, assignments, creates MCQ tests,
  answers student doubts, and sees performance analytics.
- **Admin** — approves signups, manages content, sees revenue/admissions/
  active-user stats, posts announcements, and manages the live class
  schedule.

Every account (except admin, which is set manually) needs admin approval
before it can log in.

## What's included

- Signup with role selection (student / parent / teacher) + admin approval
- Admin: bulk CSV upload for school student lists (auto-generates login IDs)
- Class-wise video lectures — embedded from YouTube (upload as *Unlisted*)
- Live classes — embedded from YouTube Live (Unlisted)
- Study material (PDF/notes) links
- MCQ practice sets and scheduled mock tests, auto-graded
- Points, streaks and badges for students
- Attendance tracking, assignments, teacher remarks, fee records
- Parent-teacher meeting schedule
- Doubt-asking and teacher responses
- Announcements
- Razorpay subscription payments (annual, per class)

## Setup — step by step (no coding experience required)

### Step 1: Create accounts (all free)

1. **GitHub** — https://github.com (to hold the code)
2. **Supabase** — https://supabase.com (database + login system, free tier)
3. **Vercel** — https://vercel.com (app hosting, free tier)
4. **Razorpay** — https://razorpay.com (payment gateway — business KYC required for live payments)

### Step 2: Create a Supabase project

1. On Supabase.com, click "New Project"
2. Once it's created, open **SQL Editor** in the left sidebar
3. Copy the entire contents of `supabase/schema.sql` from this project,
   paste it into the SQL Editor, and click **Run** — this creates all the
   tables and security rules
4. Go to **Project Settings → API** — note the `Project URL`,
   `anon public key`, and `service_role key` (or the newer "Publishable"
   and "Secret" keys — both formats work)

### Step 3: Make yourself an admin

1. Once the app is live (after Step 5), sign up once through `/signup`
   using any role
2. In Supabase, go to **Authentication → Users**, copy your UUID
3. In **SQL Editor**, run (replacing the UUID):
   ```sql
   update profiles set role = 'admin', approved = true where id = 'YOUR-USER-UUID';
   ```
4. Log in again — you'll now see the `/admin` dashboard

### Step 4: Set up Razorpay

1. In the Razorpay dashboard, go to **Settings → API Keys** and copy the
   `Key ID` and `Key Secret`
2. Complete business KYC to accept live payments (you can use Test Mode
   without KYC to try it out first)

### Step 5: Deploy (on Vercel)

1. Upload this whole project folder to a new repository in your GitHub
   account (you can drag-and-drop files using GitHub's "Upload files"
   button — no command line needed)
2. On Vercel, click **"Add New Project"**, select your GitHub repo
3. If your `package.json` sits inside a subfolder of the repo, set the
   **Root Directory** to that folder name during import
4. Before deploying, add these **Environment Variables**
   (see `.env.example` for the full list):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
5. Click **Deploy** — in 2-3 minutes your app goes live at a link like
   `goal-guru-app.vercel.app`
6. You can later add your own domain (e.g. `goalguru.in`) under
   Settings → Domains

### Step 6: Start adding content

1. Upload lectures to your YouTube channel as **Unlisted** (not Public,
   not Private)
2. In the admin panel (`/admin/content`), paste the video link, pick the
   class/subject, and add it
3. Upload a school's student list as CSV (`full_name, phone, class_level,
   school_name` columns) at `/admin/students` to bulk-create accounts —
   you'll get a downloadable credentials file to share with the school
4. As a teacher, log in and create assignments and MCQ tests from the
   Teacher dashboard

## Important things to know

- **YouTube unlisted videos** are free but not fully piracy-proof — if a
  link leaks, anyone with it can watch without logging in. As revenue
  grows, consider migrating to a paid, DRM-protected service like
  **Cloudflare Stream** or **Bunny.net**.
- This is a solid **MVP** — some features are intentionally simplified for
  a first version:
  - "Time spent learning" on the parent dashboard is approximated as a
    count of lectures opened, not exact minutes watched.
  - Teacher-parent "messaging" reuses the doubts/Q&A system rather than a
    separate chat feature.
  - Test answer keys are sent to the browser when a student starts a test
    (not server-graded) — fine for low-stakes practice, but not
    exam-proof; a server-side grading pass can be added later if needed
    for high-stakes tests.
- Supabase's free tier (500MB database, 50,000 monthly active users) should
  comfortably cover 10,000 students; if you outgrow it, the paid tier is
  about $25/month.
- To add or change a feature, hand this whole project folder back to
  Claude and describe what you'd like changed.

## Local testing (optional)

```bash
npm install
cp .env.example .env.local   # then fill in your actual keys
npm run dev
```

Open `http://localhost:3000` in your browser.
