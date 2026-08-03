-- Goal Guru — chatbot FAQ table.
-- Run this in Supabase → SQL Editor before deploying the updated app.

create table if not exists chatbot_faqs (
  id uuid primary key default gen_random_uuid(),
  role text, -- null = shown to everyone; otherwise 'student' | 'parent' | 'teacher' | 'admin'
  keywords text not null, -- comma-separated words/phrases used to match a user's message
  question text not null, -- example question shown in the chatbot's suggestion list
  answer text not null,
  created_at timestamp with time zone default now()
);

alter table chatbot_faqs enable row level security;

-- FAQ content isn't sensitive, and the widget needs to work the moment someone opens it.
create policy "anyone can read faqs" on chatbot_faqs for select using (true);
create policy "staff insert faqs" on chatbot_faqs for insert with check (is_staff());
create policy "staff update faqs" on chatbot_faqs for update using (is_staff());
create policy "staff delete faqs" on chatbot_faqs for delete using (is_staff());

-- Seed with anticipated questions per role. Admin can edit/add more later from the app.

insert into chatbot_faqs (role, keywords, question, answer) values
(null, 'what is goal guru, about this app, what is this app', 'What is Goal Guru?', 'Goal Guru is a learning app for classes 6 to 10 with video lectures, live classes, tests, assignments, and progress tracking for students, parents, teachers, and admins.'),
(null, 'forgot password, reset password, cant login, cannot log in, locked out', 'I forgot my password, what do I do?', 'There isn''t a self-serve password reset yet — please contact your school admin and ask them to help you regain access.'),
(null, 'contact support, report a problem, report an issue, help', 'How do I report a problem?', 'For account or technical issues, reach out to your school admin. For a subject doubt, use the Doubts tab to ask your teacher directly.'),

('student', 'submit assignment, how to submit, upload assignment, homework submit', 'How do I submit an assignment?', 'Go to the Assignments tab, find the assignment, and type your answer or paste a link to your work in the box, then hit Submit.'),
('student', 'take a test, start test, attempt test, how to test', 'How do I take a test?', 'Go to the Tests or Practice tab, pick a subject, then click Start on the test you want to attempt.'),
('student', 'difference between practice and tests, practice vs tests, what is practice', 'What''s the difference between Practice and Tests?', 'Practice sets are always available with no deadline — attempt them anytime to sharpen a topic. Tests are scheduled by your teacher and open at a specific date and time.'),
('student', 'ask a doubt, ask question, ask teacher, doubt not clear', 'How do I ask my teacher a question?', 'Go to the Doubts tab, type your subject and question, and submit — your teacher will reply there.'),
('student', 'subscribe, subscription, unlock content, pay, payment', 'How do I subscribe?', 'Go to your dashboard and click "Subscribe now" on the banner, or visit the Subscribe page from there to pay and unlock videos, tests, and live classes.'),
('student', 'points, badge, bronze, silver, gold, how to earn points', 'How do I earn points and badges?', 'You earn 10 points per correct answer on a test, and 20 points for submitting an assignment. Your badge (Bronze, Silver, Gold) upgrades automatically as your total points grow.'),
('student', 'weekly rank, class rank, leaderboard', 'How is my weekly rank calculated?', 'Your weekly rank compares points earned from tests completed this week against your classmates — check the Overview tab.'),

('parent', 'link child, link account, connect child, my child not showing', 'How do I link my child''s account?', 'This usually happens automatically at signup if your child''s phone number matches what you entered. If it hasn''t linked, ask your school admin to link it manually from their side.'),
('parent', 'pay fee, fee payment, how to pay fees', 'How do I pay my child''s fees?', 'Online fee payment isn''t available in the app yet — fees are recorded and marked paid by the school admin. Check the Fee/Payment card on your dashboard for the current status.'),
('parent', 'ptm, parent teacher meeting, when is ptm', 'How do I find out about PTMs?', 'Scheduled parent-teacher meetings appear in the "Parent-teacher meeting schedule" card on your dashboard.'),

('teacher', 'create test, add test, new test, make a test', 'How do I create a test?', 'Go to the Tests tab, fill in the subject and title, add your questions (multiple choice or short answer), and click Create test.'),
('teacher', 'add assignment, create assignment, new assignment', 'How do I add an assignment?', 'Go to the Assignments tab, fill in the class, subject, title and description, and click Add assignment.'),
('teacher', 'grade assignment, review submission, mark assignment', 'How do I grade a submission?', 'In the Assignments tab, click on a past assignment to expand it, then enter a grade next to each student''s submission and click Save.'),
('teacher', 'mark attendance, take attendance', 'How do I mark attendance?', 'Go to the Attendance tab, pick a class and date, load the students, and mark each one present, absent, or late, then Save.'),
('teacher', 'add remark, teacher remark, remark for student', 'How do I add a remark for a student?', 'Go to the Remarks tab, pick a class, load its students, and write a remark for the one you want.'),

('admin', 'approve student, approve signup, pending approval', 'How do I approve a new signup?', 'Go to Manage Users — pending signups appear at the top with Approve and Reject buttons.'),
('admin', 'grant subscription, free access, unlock student', 'How do I give a student free access?', 'Go to Manage Users → All students, and click "Grant free access" next to the student.'),
('admin', 'link parent, connect parent to student', 'How do I link a parent to a student?', 'Go to Manage Users → Parent-child links, enter the child''s phone number next to the parent, and click Link.'),
('admin', 'add fee, fee record, create fee', 'How do I add a fee record?', 'Go to Manage Users → All students, click "Manage fees" on a student, then enter an amount and due date.'),
('admin', 'schedule ptm, add ptm, parent teacher meeting', 'How do I schedule a PTM?', 'Go to Manage Content → PTM schedule, choose a class (or all classes), set a date and time, and add notes.'),
('admin', 'upload video, add video, add live class, upload content', 'How do I add content?', 'Go to Manage Content, pick the Video lecture, Live class, or Study material tab, and fill in the form.'),
('admin', 'bulk upload, csv upload, upload students', 'How do I bulk-upload students?', 'Go to Manage Users → Bulk upload school students, and upload a CSV with columns full_name, phone, class_level, school_name.');
