# SynQ

A real-time queue management app, built with Next.js 16 and Supabase — inspired by Qwaiting, styled with a light, minimalist theme.

Joining a queue is intentionally **not** advertised anywhere public. The `/join` link only reaches customers because an admin generated and shared it (QR code or copied link from `/admin/qr`) — the landing page has no public "join" button, so there's no way to stumble onto a live queue without a staff member having handed out the link first.

## What's included

- **`/join`** — customers scan a QR code, pick a service, and get a ticket number, then watch their live position on `/join/ticket/[id]`. No login required.
- **`/display`** — a public TV/monitor board showing "now serving" per counter, recent calls, and how many people are waiting per service.
- **`/counter`** — staff sign in, claim a counter, and call next / start serving / finish / skip / recall tickets. Requires login.
- **`/admin`** — manage services, counters (and which services each counter handles), staff roles, view today's stats and a tickets-by-service chart, and generate/download the QR code that points to `/join`. Admin role required.

Everything (tickets, counters, "now serving") updates live across all open screens via Supabase Realtime — no refresh needed.

## Tech stack

- Next.js 16 (App Router, Turbopack, Server Actions)
- Supabase (Postgres + Auth + Realtime), with row-level security on every table
- Tailwind CSS
- recharts (admin analytics), qrcode.react (QR generation), lucide-react (icons)

## Running locally

```bash
npm install
npm run dev
```

The app is already wired to a live Supabase project — connection details are in `.env.local`. If you ever need to point it at a different project, update:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## First-time setup

1. Go to `/login?mode=signup` and create an account. **The very first account created automatically becomes an admin** — everyone who signs up after that defaults to the "agent" role (an admin can promote/demote anyone from Admin → Staff).
2. **Check your email to confirm the account** — Supabase requires email confirmation by default before you can sign in. If you'd rather skip this for an internal tool, turn off "Confirm email" under Authentication → Providers → Email in the Supabase dashboard.
3. Sign in, go to `/admin`, and review the seeded services (Customer Service, Cash Transaction, Account Opening) and counters (Counter 1–3) — edit, rename, or add your own.
4. Visit `/admin/qr` to grab the QR code / link for `/join` and put it wherever customers will scan it.
5. Open `/display` on a TV or monitor for the public queue board.
6. Staff sign in at `/login` and go to `/counter` to start serving.

## Database schema

Defined via Supabase migrations (already applied to the live project):

- `services` — the types of service customers can queue for (name, code prefix, color)
- `counters` — physical/virtual serving counters, with a `current_ticket_id` and `current_agent_id`
- `counter_services` — which services each counter can serve
- `tickets` — one row per queue ticket, with status (`waiting → called → serving → served`, or `skipped`/`cancelled`) and timestamps for wait/service-time analytics
- `profiles` — extends Supabase Auth users with a display name and `role` (`admin` / `agent`)
- `ticket_counters` + `next_ticket_number()` — generates gapless per-service, per-day ticket numbers safely under concurrent requests

Row-level security: anyone can read active services/counters and today's tickets (needed for the kiosk and display board), anyone can create a `waiting` ticket, but only signed-in staff can update ticket status, and only admins can manage services/counters/staff roles.

## Deploying

This is a standard Next.js app — deploy it anywhere that supports Next.js (Vercel, etc.) and set the two `NEXT_PUBLIC_SUPABASE_*` environment variables there too.
