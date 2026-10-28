'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { EventRow, PhotoRow, revealTime } from '@/lib/types';
import Countdown from '@/components/Countdown';

export default function GalleryPage() {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [photos, setPhotos] = useState<(PhotoRow & { url: string })[]>([]);
  const [locked, setLocked] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    async function load() {
      const { data: ev } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!ev) return;
      setEvent(ev as EventRow);

      const reveal = revealTime(ev as EventRow);
      if (reveal.getTime() > Date.now()) {
        setLocked(true);
        return;
      }

      fetch('/api/notify-reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: ev.id }),
      }).catch(() => {});

      const { data: pics } = await supabase
        .from('photos')
        .select('*')
        .eq('event_id', ev.id)
        .order('created_at', { ascending: true });

      const withUrls = (pics ?? []).map((p) => ({
        ...p,
        url: supabase.storage.from('wedding-photos').getPublicUrl(p.storage_path).data
          .publicUrl,
      }));
      setPhotos(withUrls);
    }
    load();
  }, []);

  async function downloadAll() {
    if (!photos.length || downloading) return;
    setDownloading(true);
    setDownloadProgress(0);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();

      for (let i = 0; i < photos.length; i++) {
        const res = await fetch(photos[i].url);
        const blob = await res.blob();
        zip.file(`photo-${String(i + 1).padStart(4, '0')}.jpg`, blob);
        setDownloadProgress(Math.round(((i + 1) / photos.length) * 100));
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event?.name.replace(/\s+/g, '-') || 'wedding'}-photos.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-leaf/60">Loading…</p>
      </div>
    );
  }

  if (locked) {
    const reveal = revealTime(event);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6">
        <h1 className="font-serif text-2xl">{event.name}</h1>
        <p className="text-leaf/70">Still locked — this is the whole point 🔒</p>
        <p className="text-bloom">
          <Countdown target={reveal} onComplete={() => location.reload()} />
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <h1 className="font-serif text-2xl text-center mb-1">{event.name}</h1>
      <p className="text-center text-leaf/60 mb-4">{photos.length} photos, unlocked at last ✨</p>

      <div className="flex justify-center mb-6">
        <button
          onClick={downloadAll}
          disabled={downloading || !photos.length}
          className="rounded-lg px-5 py-2.5 bg-bloom text-paper font-semibold disabled:opacity-50"
        >
          {downloading ? `Zipping… ${downloadProgress}%` : `Download all ${photos.length} photos`}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {photos.map((p) => (
          <figure key={p.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={p.prompt ?? ''}
              className="w-full aspect-[5/6] object-cover rounded-md shadow-md"
              loading="lazy"
            />
            {p.prompt && (
              <figcaption className="mt-1 px-1 text-[11px] leading-tight text-leaf/70">
                {p.prompt}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </div>
  );
}
