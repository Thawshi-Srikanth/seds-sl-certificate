# SEDS Sri Lanka - Certificate Verification & Download System

Official, production-ready certificate verification and download web application for **SEDS Sri Lanka** and *International Observe the Moon Night 2026*.

Built with **React + Vite + TypeScript + Tailwind CSS + Supabase (PostgreSQL, Storage, RLS, Edge Functions)**.

---

## Architecture Overview

The system is designed for high-concurrency online events where thousands of participants verify their eligibility using their registered email and a live certificate code revealed during the livestream.

```
[ Participant Phone / Browser ]
             │
             │ (POST Email + Event Code)
             ▼
[ Supabase Edge Function / RPC ] ── (Rate-Limiting & SHA-256 Code Hash Verification)
             │
             ├── Checks: Event active & unexpired?
             ├── Checks: Participant exists & eligible = true?
             │
             ▼
[ Supabase Private Storage Bucket: "certificates" ]
             │
             │ (Generates 5-Minute Signed URL)
             ▼
[ Participant Downloads Certificate PDF ]
```

### Key Security & Design Principles

1. **Zero Secret Leaks**: The frontend never receives Supabase `service_role` keys or private bucket storage tokens.
2. **Private Storage Only**: The `certificates` Supabase bucket is private (`public = false`). Files are served exclusively through short-lived (300 seconds / 5 min) signed URLs.
3. **Cryptographic Hashing**: Event certificate codes are stored exclusively as one-way SHA-256 hashes (`certificate_code_hash`). The plaintext code is never stored in the database.
4. **Anti-Enumeration Protection**: Verification returns an identical generic error message (`"Unable to verify your certificate. Please check your email and certificate code."`) whether the email or code is invalid, preventing participant email harvesting.
5. **Rate Limiting**: Built-in IP hash rate limiting (e.g., max 15 verification attempts per 5 minutes per client IP).
6. **Audit Trail**: Every successful certificate claim records an immutable audit entry in `certificate_claims`.
7. **Mobile-First Astronomy Theme**: Tailored deep-space visual design with twinkling starfield canvas, glowing lunar elements, and responsive form controls for mobile livestream viewers.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite 6, Tailwind CSS, Lucide Icons, Canvas Confetti, PapaParse
- **Backend & Database**: Supabase PostgreSQL, Supabase Storage, Row Level Security (RLS)
- **Serverless API**: Supabase Edge Functions (Deno / TypeScript)
- **Deployment**: Vercel / Netlify / Cloudflare Pages

---

## Quick Start (Local Development)

### 1. Install Dependencies
Using `pnpm` (or `npm` / `yarn`):
```bash
pnpm install
```

### 2. Configure Environment Variables
Copy the sample environment file:
```bash
cp .env.example .env
```
Populate your Supabase Project URL and Anon Public Key:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_DEFAULT_EVENT_SLUG=observe-the-moon-2026
```
*(Note: If left empty or using placeholders, the app automatically runs in interactive **Demo Database Mode** using browser-persistent mock data for instant previewing!)*

### 3. Start Development Server
```bash
pnpm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Supabase Database & Storage Setup

### 1. Run Database Migrations
In your Supabase Dashboard:
1. Navigate to **SQL Editor** -> **New Query**.
2. Copy and paste the entire contents of [`supabase/migrations/20260920000000_init_certificate_system.sql`](supabase/migrations/20260920000000_init_certificate_system.sql).
3. Click **Run**.

This will automatically create:
- `events` table with indexes and RLS.
- `participants` table with `UNIQUE(event_id, email)`.
- `certificate_claims` audit table.
- `verification_rate_limits` table.
- Private `certificates` storage bucket.
- `verify_certificate_claim` atomic PostgreSQL stored procedure.
- Default seeded event: **International Observe the Moon Night 2026** (Code: `IOTM26-X7K9Q`).

### 2. Deploy Supabase Edge Function
To deploy the server-side verification and signed URL generation Edge Function:

```bash
# Login to Supabase CLI
supabase login

# Link your Supabase Project
supabase link --project-ref your-project-ref

# Deploy the Edge Function
supabase functions deploy verify-certificate --no-verify-jwt
```

---

## CSV Participant Import Format

Admins can upload participants in bulk from the `/admin` dashboard. The CSV must have the following column headers:

```csv
name,email,registration_id,eligible,certificate_path
John Silva,john@example.com,SEDS-001,true,events/observe-the-moon-2026/john-silva.pdf
Sarah Perera,sarah@example.com,SEDS-002,false,
Kasun Fernando,kasun@example.com,SEDS-003,true,events/observe-the-moon-2026/kasun-fernando.pdf
```

### Column Specifications
- `name` *(Required)*: Full participant name as printed on certificate.
- `email` *(Required)*: Participant email (automatically normalized to lowercase).
- `registration_id` *(Optional)*: Event ticket or registration identifier (e.g. `SEDS-001`).
- `eligible` *(Required)*: `true` or `false`. Only eligible participants can claim certificates.
- `certificate_path` *(Optional/Required for download)*: Path inside the private `certificates` storage bucket.

---

## Admin Dashboard (`/admin`)

Access the Admin Dashboard at `/admin`.

### Features:
1. **Overview & Analytics**:
   - Total registered participants
   - Total eligible participants
   - Total certificates claimed vs. pending
   - Real-time claim percentage progress bar
2. **Participants Manager**:
   - Drag & drop CSV import with live preview modal
   - Instant search by Name, Email, or Registration ID
   - Filter by All, Eligible, Ineligible, Claimed, Unclaimed
   - One-click eligibility toggling
   - Manual participant creation & deletion
3. **Event Settings & Live Code Hashing**:
   - Change event title and slug
   - Update livestream certificate code (shows real-time SHA-256 hash preview)
   - Enable / Disable certificate claiming instantly
   - Configure code expiration date and time
4. **Audit Trail**:
   - Live log of all certificate downloads with timestamps, masked email addresses (`j***a@example.com`), and anonymized client IP hashes.

---

## Production Deployment Guides

### 1. Deploy to Vercel
1. Push your repository to GitHub / GitLab.
2. Import the project in [Vercel](https://vercel.com).
3. Set Framework Preset to **Vite**.
4. Configure Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_DEFAULT_EVENT_SLUG`
5. Deploy! (The included [`vercel.json`](vercel.json) handles SPA rewrites and security headers automatically).

### 2. Deploy to Netlify
1. Connect your repository to [Netlify](https://netlify.com).
2. Build command: `pnpm run build` (or `npm run build`).
3. Publish directory: `dist`.
4. The included [`public/_redirects`](public/_redirects) file ensures seamless client-side routing.

### 3. Deploy to Cloudflare Pages
1. In Cloudflare Dashboard, go to **Workers & Pages** -> **Create Application** -> **Pages**.
2. Connect Git repository.
3. Build command: `pnpm run build`
4. Build output directory: `dist`
5. Add environment variables and deploy.

---

## Security Audit & Compliance

- **CWE-79 (XSS)**: Safe framework-native React JSX escaping; zero usage of `dangerouslySetInnerHTML`.
- **CWE-89 (SQL Injection)**: Parameterized queries in Postgres stored procedures and Supabase client SDK.
- **CWE-200 (Information Exposure)**: Anti-enumeration design prevents unauthorized email harvesting. Code hashes never exposed to public anon keys.
- **CWE-306 / CWE-862 (Authorization & Least Privilege)**: Private Supabase Storage bucket with strict RLS; download URLs expire after 300 seconds.
- **CWE-307 (Brute Force Protection)**: IP hash rate limiting enforced on verification attempts.

---

## License & Credits

Developed for **SEDS Sri Lanka** (Students for the Exploration and Development of Space).
All rights reserved.
