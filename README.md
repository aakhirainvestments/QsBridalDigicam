# Our Wedding Scene

A shared "disposable camera" album for one wedding. Guests scan a QR code, get a limited
number of shots, and nobody — including the couple — sees any photo until a reveal countdown
hits zero. Then the whole album unlocks for everyone at once.

## How it works

- `/` — guest lands here, enters their name, and joins (creates a `guests` row)
- `/camera` — the disposable-camera UI: live camera, shutter button, shot counter
- `/gallery` — locked with a countdown until reveal time, then shows every photo
- `/host?` — enter the admin key to see the QR code to display at the venue + live guest/photo counts

One event = one deployment. Simplest possible setup for one wedding.

## 1. Create the Supabase project (free tier is plenty)

1. Go to supabase.com → New project.
2. Once it's up, go to SQL Editor → New query, paste in `supabase/schema.sql`, and run it.
3. At the bottom of that file there's a commented-out `insert into events (...)` — uncomment it,
   fill in:
   - `name`: e.g. `'Jason & Chloe Wedding Day'`
   - `start_time`: when the reveal countdown should start (usually ceremony start time), in ISO
     format with your timezone offset, e.g. `'2026-09-12T16:00:00+02:00'`
   - `reveal_delay_hours`: how many hours after `start_time` the album unlocks (12 in the demo video)
   - `shot_limit`: shots per guest (set to 10 for a short roll)
   - `prompts`: the shot list guests see — an array of strings, one per idea (see the example in the SQL file). Guests tap one to aim for it, it gets checked off after they shoot it, and the caption shows up under the photo in the gallery. Leave it empty for a plain camera with no list.
   - `admin_key`: any password-like string only the host knows — this is how you access `/host`
   Run that insert.
4. Go to Project Settings → API. Copy the **Project URL** and the **anon public key**.

## 2. Configure the app

```bash
cp .env.example .env.local
# paste the URL and anon key into .env.local
npm install
npm run dev   # test at localhost:3000
```

## 3. Deploy (Vercel is the easiest path)

1. Push this folder to a GitHub repo.
2. vercel.com → New Project → import the repo.
3. Add the two env vars from `.env.local` in Vercel's project settings.
4. Deploy. You'll get a URL like `wedding-scene.vercel.app` — optionally attach a custom
   domain (e.g. `jasonandchloe.wedding`) in Vercel's Domains tab.

## 4. Day-of

- Visit `yourdomain.com/host`, enter the admin key, and you'll get a QR code plus live counts.
  Print it or show it on a screen at the entrance/tables.
- Guests scan → land on `/` → enter name → `/camera`. Their shot count and join record persist
  in their own browser (`localStorage`), so refreshing or reopening the link on the same phone
  resumes where they left off.
- After `start_time + reveal_delay_hours`, `/gallery` unlocks automatically for everyone — no
  action needed from the host.

## Reveal emails (optional, free)

Guests can leave an email at join time. Once the reveal time passes, the next person to open
`/camera` or `/gallery` silently triggers a one-time send to everyone who left an email — no
cron job or always-on server needed, and it can't double-send (an `events.notified` flag is
flipped atomically the first time).

To enable it:
1. Sign up at resend.com (free — 3,000 emails/month, 100/day).
2. Copy your API key into `RESEND_API_KEY`.
3. Set `NEXT_PUBLIC_SITE_URL` to your real Vercel URL so the email's link works.
4. `RESEND_FROM` can stay as `onboarding@resend.dev` for testing — it works with no domain
   setup, but Resend may rate-limit or flag it at scale. For a real send to 100+ guests,
   verify your own domain in Resend (also free) and use an address on it instead.

Leave `RESEND_API_KEY` blank and this whole feature just no-ops — nothing else breaks.

## Download all (for the couple)

On `/gallery`, once unlocked, a "Download all" button zips every photo client-side (via JSZip)
and downloads it as one file — no server-side zipping, no extra cost.

## Notes on scale & security

- RLS policies are intentionally wide open (anyone can read/insert) since this is a single
  private link for one event, not a public multi-tenant product. Don't reuse this schema
  as-is if you turn this into a product for many weddings — you'd want to scope every query
  to an authenticated event/session instead of trusting the client.
- Supabase's free tier storage (1GB) comfortably covers several thousand compressed JPEGs
  (photos are captured at ~75% JPEG quality client-side before upload). If you expect a much
  larger guest list, bump the Supabase plan.
- No push notifications for the reveal — guests need to have the tab/PWA open or reopen the
  link after the countdown to see the gallery. Adding real push notifications would need a
  service worker + a notifications provider (e.g. web push or a Twilio/SMS reveal-alert) —
  happy to add that if it matters for this wedding.

## Shot list

Guests see `events.prompts` under the viewfinder. Each photo stores the prompt it was taken for (`photos.prompt`, null for a free shot). Prompts are suggestions, not locks: a guest can ignore the list entirely or skip around. Aim for a few more prompts than `shot_limit` so people get to choose.
