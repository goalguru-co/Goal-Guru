# Pathshala — Ed-tech App (Classes 6-10)

Ye ek ready-made web app hai jo bina kisi developer ko hire kiye, khud deploy
kar sakte hain — poori tarah free/minimal cost pe (sirf domain ka paisa lagta
hai shuru me).

Ye ek **web app (PWA)** hai — students isse apne phone ke browser (Chrome)
me khol sakte hain, aur "Add to Home Screen" karke ye bilkul normal app jaisa
dikhega/kaam karega. Play Store pe daalne ki zaroorat nahi hai (chahen toh
baad me daal sakte hain).

## Isme kya hai

- Student sign up (khud se) + admin approval
- Admin: school ki CSV list upload karke bulk me student accounts bana sakte hain
- Class-wise (6-10) video lectures — YouTube unlisted videos embed hoti hain
- Live classes — YouTube Live unlisted stream embed
- Study material (PDF/notes) links
- Razorpay se subscription payment (annual, per class)
- Admin panel: students approve karna, content upload karna

## Setup — Step by Step (koi coding experience zaroori nahi)

### Step 1: Accounts bana lein (sab free hain)

1. **GitHub** — https://github.com (code rakhne ke liye)
2. **Supabase** — https://supabase.com (database + login system, free tier)
3. **Vercel** — https://vercel.com (app hosting, free tier)
4. **Razorpay** — https://razorpay.com (payment gateway — business KYC lagega)

### Step 2: Supabase project banayein

1. Supabase.com pe "New Project" banayein
2. Project banne ke baad, left sidebar me **SQL Editor** kholein
3. Is project ke `supabase/schema.sql` file ko poora copy karke SQL Editor
   me paste karein aur **Run** dabayein — isse saari tables ban jayengi
4. Left sidebar me **Project Settings → API** me jayein — yahan se aapko
   3 cheezein milengi: `Project URL`, `anon public key`, `service_role key`
   (in teeno ko safe rakhein, aage kaam aayenge)

### Step 3: Khud ko admin banayein

1. App live hone ke baad (Step 5 ke baad), ek baar khud `/signup` se
   account banayein
2. Supabase → **Authentication → Users** me jayein, apna UUID copy karein
3. Supabase → **SQL Editor** me ye query run karein (UUID replace karke):
   ```sql
   update profiles set role = 'admin', approved = true where id = 'YAHAN-APNA-UUID-DAALEIN';
   ```
4. Ab dobara login karein — aapko `/admin` panel dikhega

### Step 4: Razorpay setup

1. Razorpay dashboard → **Settings → API Keys** se `Key ID` aur `Key Secret`
   copy karein
2. Business KYC complete karein (payments live lene ke liye zaroori hai;
   test mode me bina KYC ke bhi try kar sakte hain)

### Step 5: Deploy karein (Vercel pe)

1. Is poore project folder ko apne GitHub account me ek naye repository me
   upload karein (GitHub website pe "Upload files" se drag-drop kar sakte
   hain, coding command zaroori nahi)
2. Vercel.com pe login karke **"Add New Project"** dabayein, apna GitHub
   repo select karein
3. Deploy karne se pehle, **Environment Variables** section me ye sab add
   karein (`.env.example` file me list hai):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
4. **Deploy** dabayein — 2-3 minute me aapki app live ho jayegi, ek link
   milega jaise `pathshala-app.vercel.app`
5. Chahen toh baad me apna khud ka domain (jaise `pathshala.in`) Vercel me
   add kar sakte hain (Settings → Domains)

### Step 6: Content daalna shuru karein

1. Apne YouTube channel pe lectures **Unlisted** (Public nahi, Private
   nahi) mode me upload karein
2. Admin panel (`/admin/content`) me jaake video ka link paste karke,
   class/subject select karke add kar dein
3. School students ki CSV list (`full_name, phone, class_level,
   school_name` columns ke saath) `/admin/students` pe upload karke bulk
   me accounts bana sakte hain — ek credentials file download hogi jo aap
   school ko de sakte hain

## Zaroori baatein (limitations samajh lein)

- **YouTube unlisted videos** free hain lekin agar link kahin leak ho jaye
  toh koi bhi dekh sakta hai bina login ke. Jaise-jaise revenue aaye, isko
  **Cloudflare Stream** ya **Bunny.net** jaisi paid, DRM-protected service
  me migrate karna better rahega (per-GB cost lagta hai lekin download/
  screen-recording se protection milta hai).
- Ye app abhi **basic MVP** hai — jaise jaise students badhenge, Supabase
  ka free tier (500MB database, 50,000 monthly active users) shayad
  upgrade karna pade (~$25/month), jo ki 10,000 students ke liye bhi
  kaafi affordable hai.
- Agar koi feature add/change karna ho, is poore project folder ko wapas
  Claude ko de kar keh sakte hain "ye feature add karo" — code samajh ke
  aage badha sakta hoon.

## Local testing (optional, agar apne computer pe dekhna ho)

```bash
npm install
cp .env.example .env.local   # fir isme apni actual keys bharein
npm run dev
```

Browser me `http://localhost:3000` khol kar dekh sakte hain.
