'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { EventRow, PhotoRow, revealTime } from '@/lib/types';
import Countdown from '@/components/Countdown';
import EventTitle from '@/components/EventTitle';

export default function GalleryPage() {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [photos, setPhotos] = useState<(PhotoRow & { url: string })[]>([]);
  const [locked, setLocked] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const touchX = useRef(0);
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

  function step(d: number) {
    setOpenIdx((i) => (i === null || !photos.length ? null : (i + d + photos.length) % photos.length));
  }

  useEffect(() => {
    if (openIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenIdx(null);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIdx, photos.length]);

  async function savePhoto(url: string, n: number) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], `photo-${n}.jpg`, { type: 'image/jpeg' });
      // On phones this opens the share sheet, which has "Save Image" for the camera roll
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch {
      // share sheet dismissed, or the fetch failed
    }
  }

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
      <div className="flex-1 flex items-center justify-center">
        <p className="text-leaf/60">Loading…</p>
      </div>
    );
  }

  if (locked) {
    const reveal = revealTime(event);
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
        <EventTitle name={event.name} size="sm" />
        <p className="text-leaf/70">Still locked — this is the whole point 🔒</p>
        <p className="text-bloom">
          <Countdown target={reveal} onComplete={() => location.reload()} />
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 py-8">
      <EventTitle name={event.name} size="sm" />
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
        {photos.map((p, i) => (
          <figure key={p.id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={p.prompt ?? ''}
              onClick={() => setOpenIdx(i)}
              className="w-full aspect-[5/6] object-cover rounded-md shadow-md cursor-zoom-in"
              loading="lazy"
            />
            <button
              onClick={() => savePhoto(p.url, i + 1)}
              aria-label="Save this photo"
              className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center active:scale-95 transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
              </svg>
            </button>
            {p.prompt && (
              <figcaption className="mt-1 px-1 text-[11px] leading-tight text-leaf/70">
                {p.prompt}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {openIdx !== null && photos[openIdx] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => setOpenIdx(null)}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1);
          }}
        >
          <button
            onClick={() => setOpenIdx(null)}
            aria-label="Close"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white text-xl"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[openIdx].url}
            alt={photos[openIdx].prompt ?? ''}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[75vh] max-w-full rounded-md shadow-2xl"
          />
          {photos[openIdx].prompt && (
            <p className="text-white/80 text-sm mt-3 text-center">{photos[openIdx].prompt}</p>
          )}
          <div className="mt-4 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => step(-1)} aria-label="Previous" className="w-11 h-11 rounded-full bg-white/15 text-white text-2xl">‹</button>
            <button
              onClick={() => savePhoto(photos[openIdx].url, openIdx + 1)}
              className="rounded-full px-6 py-3 bg-white text-black font-sans text-xs uppercase tracking-[0.2em]"
            >
              Save photo
            </button>
            <button onClick={() => step(1)} aria-label="Next" className="w-11 h-11 rounded-full bg-white/15 text-white text-2xl">›</button>
          </div>
        </div>
      )}
    </div>
  );
}
