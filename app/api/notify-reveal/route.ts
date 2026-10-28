import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Uses the anon key like the rest of the app — fine here since RLS on this project
// is intentionally open for a single private event. Runs server-side on Vercel.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { eventId } = await req.json();
  if (!eventId) return NextResponse.json({ error: 'missing eventId' }, { status: 400 });

  const { data: event } = await supabase.from('events').select('*').eq('id', eventId).single();
  if (!event) return NextResponse.json({ error: 'event not found' }, { status: 404 });

  const revealAt = new Date(event.start_time).getTime() + event.reveal_delay_hours * 3600 * 1000;
  if (revealAt > Date.now()) {
    return NextResponse.json({ sent: false, reason: 'not revealed yet' });
  }

  // Claim the send: only the request that flips notified false->true proceeds.
  // Anyone else calling this concurrently just gets updated: [] and does nothing.
  const { data: claimed } = await supabase
    .from('events')
    .update({ notified: true })
    .eq('id', eventId)
    .eq('notified', false)
    .select();

  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ sent: false, reason: 'already sent' });
  }

  const { data: guests } = await supabase
    .from('guests')
    .select('email, name')
    .eq('event_id', eventId)
    .not('email', 'is', null);

  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'onboarding@resend.dev';
  const galleryUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/gallery`;

  if (!resendKey || !guests?.length) {
    return NextResponse.json({ sent: true, emailed: 0 });
  }

  let emailed = 0;
  for (const guest of guests) {
    if (!guest.email) continue;
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: guest.email,
          subject: `${event.name} — the album is unlocked 🎉`,
          html: `<p>Hi ${guest.name || 'there'},</p>
                 <p>The wait's over — every photo from <strong>${event.name}</strong> just unlocked.</p>
                 <p><a href="${galleryUrl}">View the album</a></p>`,
        }),
      });
      if (res.ok) emailed += 1;
    } catch {
      // best-effort; one failed email shouldn't stop the rest
    }
  }

  return NextResponse.json({ sent: true, emailed });
}
