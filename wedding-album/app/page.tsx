'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { EventRow, revealTime } from '@/lib/types';
import Countdown from '@/components/Countdown';
import EventTitle from '@/components/EventTitle';

export default function JoinPage() {
  const router = useRouter();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Already joined on this device? skip straight to camera / gallery.
    const existingGuest = localStorage.getItem('guestId');
    const existingEvent = localStorage.getItem('eventId');
    if (existingGuest && existingEvent) {
      router.replace('/camera');
      return;
    }

    supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setEvent(data as EventRow | null));
  }, [router]);

  async function join() {
    if (!event) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('guests')
      .insert({ event_id: event.id, name: name.trim() || null, email: email.trim() || null })
      .select()
      .single();

    if (err || !data) {
      setError('Something went wrong joining — try again.');
      setLoading(false);
      return;
    }

    localStorage.setItem('guestId', data.id);
    localStorage.setItem('eventId', event.id);
    router.push('/camera');
  }

  if (!event) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-leaf/60">Loading…</p>
      </div>
    );
  }

  const reveal = revealTime(event);
  const alreadyRevealed = reveal.getTime() <= Date.now();

  return (
    <div className="flex-1 relative flex flex-col items-center justify-start px-6 pt-14 pb-16 gap-4 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/butterfly.png" alt="" className="absolute top-6 right-5 w-20 pointer-events-none select-none" />
      <EventTitle name={event.name} size="lg" />
      <p className="text-leaf/80 max-w-sm leading-relaxed">
        This works like an old-time film camera. Click away, stay in the moment — all photos
        will be released at the end of the day.
      </p>
      <ul className="text-leaf/70 text-sm max-w-xs text-left flex flex-col gap-1.5">
        <li>✦ You get {event.shot_limit} shots. No previews, no retakes.</li>
        {(event.prompts?.length ?? 0) > 0 && (
          <li>✦ Follow the shot list for ideas, or shoot whatever you love.</li>
        )}
        <li>
          ✦ At {reveal.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} the whole album
          unlocks for everyone to view and save.
        </li>
      </ul>

      {!alreadyRevealed ? (
        <p className="text-bloom text-sm">
          Reveal in <Countdown target={reveal} />
        </p>
      ) : (
        <a href="/gallery" className="text-bloom underline text-sm">
          The album already unlocked — view it
        </a>
      )}

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          className="rounded-full px-5 py-3 text-center bg-white/90 border border-leaf/20 text-leaf placeholder:text-leaf/40 outline-none"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email — get notified when it unlocks (optional)"
          className="rounded-full px-5 py-3 text-center bg-white/90 border border-leaf/20 text-leaf placeholder:text-leaf/40 outline-none"
        />
        <button
          onClick={join}
          disabled={loading}
          className="rounded-full px-4 py-3 bg-bloom text-paper font-sans text-xs uppercase tracking-[0.2em] disabled:opacity-50"
        >
          {loading ? 'Joining…' : `Start shooting (${event.shot_limit} shots)`}
        </button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    </div>
  );
}
