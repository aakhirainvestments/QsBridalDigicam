'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { LOOKS, LookId, makePolaroid } from '@/lib/photoLook';

export default function CameraCapture({
  eventId,
  guestId,
  shotsTaken,
  shotLimit,
  prompts,
  eventName,
  onShotTaken,
}: {
  eventId: string;
  guestId: string;
  shotsTaken: number;
  shotLimit: number;
  prompts: string[];
  eventName: string;
  onShotTaken: (newCount: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [look, setLook] = useState<LookId>('kodak');
  const [done, setDone] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const remaining = shotLimit - shotsTaken;

  // Which prompts has this guest already shot? (survives refresh / reopening the link)
  useEffect(() => {
    if (!prompts.length) return;
    supabase
      .from('photos')
      .select('prompt')
      .eq('guest_id', guestId)
      .not('prompt', 'is', null)
      .then(({ data }) => {
        const d = (data ?? []).map((r) => r.prompt as string);
        setDone(d);
        setSelected(prompts.find((p) => !d.includes(p)) ?? null);
      });
  }, [guestId, prompts]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e) {
        setError('Camera access was denied. Enable camera permission for this site and reload.');
      }
    }
    start();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  async function takeShot() {
    if (remaining <= 0 || uploading) return;
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const promptForShot = selected;
    setUploading(true);
    setError(null);

    try {
      const blob = await makePolaroid(video, look, eventName);
      if (!blob) throw new Error('no blob');

      const path = `${eventId}/${guestId}/${crypto.randomUUID()}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from('wedding-photos')
        .upload(path, blob, { contentType: 'image/jpeg' });
      if (uploadErr) throw uploadErr;

      const { error: insertErr } = await supabase.from('photos').insert({
        event_id: eventId,
        guest_id: guestId,
        storage_path: path,
        prompt: promptForShot,
      });
      if (insertErr) throw insertErr;

      const newCount = shotsTaken + 1;
      const { error: updateErr } = await supabase
        .from('guests')
        .update({ shots_taken: newCount })
        .eq('id', guestId);
      if (updateErr) throw updateErr;

      if (promptForShot) {
        const nowDone = [...done, promptForShot];
        setDone(nowDone);
        // hop to the next prompt you haven't shot yet
        setSelected(prompts.find((p) => !nowDone.includes(p)) ?? null);
      }
      onShotTaken(newCount);
    } catch (e) {
      setError('Upload failed — check your connection and try again.');
    } finally {
      setUploading(false);
    }
  }

  if (remaining <= 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-6">
        <p className="text-xl font-semibold">You've used all {shotLimit} of your shots 🎞️</p>
        <p className="text-leaf/70">
          That's everyone's roll, honestly — go enjoy the rest of the day. The album unlocks for
          everyone once the reveal timer hits zero.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ filter: LOOKS[look].css }}
        />
        <div className="absolute top-3 right-3 bg-black/60 text-white rounded-full px-3 py-1 text-sm font-mono">
          {remaining} left
        </div>
        {selected && (
          <div className="absolute bottom-3 inset-x-3 bg-black/60 text-white rounded-xl px-3 py-2 text-center text-sm">
            {selected}
          </div>
        )}
      </div>

      {error && <p className="text-red-600 text-sm max-w-sm text-center">{error}</p>}

      <div className="flex items-center gap-6">
        <button
          onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
          className="text-leaf/70 text-sm underline"
        >
          Flip camera
        </button>
        <button
          onClick={takeShot}
          disabled={uploading}
          className="w-16 h-16 rounded-full bg-white border-4 border-bloom/60 shadow disabled:opacity-50 active:scale-95 transition"
          aria-label="Take photo"
        />
      </div>
      {uploading && <p className="text-leaf/60 text-sm">Developing…</p>}

      <div className="flex gap-2">
        {(Object.keys(LOOKS) as LookId[]).map((id) => (
          <button
            key={id}
            onClick={() => setLook(id)}
            className={`rounded-full px-3 py-1 text-sm border transition ${
              look === id ? 'border-bloom text-bloom bg-bloom/10' : 'border-leaf/20 text-leaf/70'
            }`}
          >
            {LOOKS[id].label}
          </button>
        ))}
      </div>

      {prompts.length > 0 && (
        <div className="w-full max-w-sm px-1">
          <p className="text-leaf/50 text-xs mb-2">
            Your shot list — tap one to aim for it, or shoot whatever you like.
          </p>
          <ul className="flex flex-col gap-1.5">
            {prompts.map((p) => {
              const isDone = done.includes(p);
              const isSel = selected === p;
              return (
                <li key={p}>
                  <button
                    onClick={() => setSelected(isSel ? null : p)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-sm border transition ${
                      isSel ? 'border-bloom text-bloom bg-bloom/10' : 'border-leaf/15 text-leaf/80'
                    } ${isDone ? 'opacity-50' : ''}`}
                  >
                    <span className="mr-2">{isDone ? '✓' : '○'}</span>
                    <span className={isDone ? 'line-through' : ''}>{p}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
