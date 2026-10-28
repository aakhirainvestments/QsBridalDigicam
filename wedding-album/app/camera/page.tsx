'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { EventRow, GuestRow, revealTime } from '@/lib/types';
import CameraCapture from '@/components/CameraCapture';
import Countdown from '@/components/Countdown';
import EventTitle from '@/components/EventTitle';

export default function CameraPage() {
  const router = useRouter();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [guest, setGuest] = useState<GuestRow | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const guestId = localStorage.getItem('guestId');
    const eventId = localStorage.getItem('eventId');
    if (!guestId || !eventId) {
      router.replace('/');
      return;
    }

    async function load() {
      const [{ data: ev }, { data: gu }] = await Promise.all([
        supabase.from('events').select('*').eq('id', eventId).single(),
        supabase.from('guests').select('*').eq('id', guestId).single(),
      ]);
      if (!ev || !gu) {
        router.replace('/');
        return;
      }
      setEvent(ev as EventRow);
      setGuest(gu as GuestRow);
      if (revealTime(ev as EventRow).getTime() <= Date.now()) {
        setRevealed(true);
        notifyReveal((ev as EventRow).id);
      }
    }
    load();
  }, [router]);

  async function notifyReveal(eventId: string) {
    try {
      await fetch('/api/notify-reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
    } catch {
      // non-critical, someone else's visit will retry this
    }
  }

  if (!event || !guest) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-leaf/60">Loading…</p>
      </div>
    );
  }

  const reveal = revealTime(event);

  return (
    <div className="flex-1 flex flex-col">
      <header className="text-center pt-6 pb-2 px-4">
        <EventTitle name={event.name} size="sm" />
        {!revealed ? (
          <p className="text-bloom text-xs mt-1">
            Album unlocks in{' '}
            <Countdown
              target={reveal}
              onComplete={() => {
                setRevealed(true);
                notifyReveal(event.id);
              }}
            />
          </p>
        ) : (
          <a href="/gallery" className="text-bloom underline text-xs mt-1 inline-block">
            It's unlocked — view the album
          </a>
        )}
      </header>

      <CameraCapture
        eventId={event.id}
        guestId={guest.id}
        shotsTaken={guest.shots_taken}
        shotLimit={event.shot_limit}
        prompts={event.prompts ?? []}
        eventName={event.name}
        onShotTaken={(newCount) => setGuest({ ...guest, shots_taken: newCount })}
      />
    </div>
  );
}
