'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabaseClient';
import { EventRow, revealTime } from '@/lib/types';
import Countdown from '@/components/Countdown';

export default function HostPage() {
  const [key, setKey] = useState('');
  const [event, setEvent] = useState<EventRow | null>(null);
  const [guestCount, setGuestCount] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [siteUrl, setSiteUrl] = useState('');

  useEffect(() => {
    setSiteUrl(window.location.origin);
  }, []);

  async function unlock() {
    setError(null);
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('admin_key', key.trim())
      .maybeSingle();
    if (!data) {
      setError('No event matches that key.');
      return;
    }
    setEvent(data as EventRow);
  }

  useEffect(() => {
    if (!event) return;
    async function refresh() {
      const [{ count: g }, { count: p }] = await Promise.all([
        supabase.from('guests').select('*', { count: 'exact', head: true }).eq('event_id', event!.id),
        supabase.from('photos').select('*', { count: 'exact', head: true }).eq('event_id', event!.id),
      ]);
      setGuestCount(g ?? 0);
      setPhotoCount(p ?? 0);
    }
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [event]);

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <h1 className="font-serif text-2xl">Host access</h1>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Admin key"
          className="rounded-lg px-4 py-3 bg-leaf/10 border border-leaf/20 w-full max-w-xs text-leaf"
        />
        <button onClick={unlock} className="rounded-lg px-4 py-3 bg-bloom text-paper font-semibold">
          View dashboard
        </button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    );
  }

  const reveal = revealTime(event);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-serif text-2xl">{event.name}</h1>

      <div className="bg-white p-4 rounded-xl">
        <QRCodeSVG value={siteUrl} size={220} />
      </div>
      <p className="text-leaf/60 text-sm max-w-xs">
        Print this or display it at the venue. Guests scan it, land on {siteUrl}, and start
        shooting.
      </p>

      <div className="flex gap-8">
        <div>
          <p className="text-3xl font-serif">{guestCount}</p>
          <p className="text-leaf/60 text-sm">guests joined</p>
        </div>
        <div>
          <p className="text-3xl font-serif">{photoCount}</p>
          <p className="text-leaf/60 text-sm">photos taken</p>
        </div>
      </div>

      <p className="text-bloom text-sm">
        Reveals in <Countdown target={reveal} /> ({reveal.toLocaleString()})
      </p>
    </div>
  );
}
