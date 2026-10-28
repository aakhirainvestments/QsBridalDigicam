'use client';

import { useEffect, useState } from 'react';

const EMAIL = 'almaaz.salie6@gmail.com';

function Diamond({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <path d="M6 3h12l4 6-10 12L2 9z" fill="currentColor" fillOpacity="0.15" />
      <path d="M2 9h20M9 3l-2 6 5 12M15 3l2 6-5 12" />
    </svg>
  );
}

export default function BuiltBy() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="fixed bottom-3 right-3 z-20">
      {open && (
        <>
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full right-0 mb-2 w-64 rounded-2xl bg-white shadow-xl border border-leaf/10 p-4 text-sm text-leaf text-left">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute top-2 right-3 text-leaf/50"
            >
              ✕
            </button>
            <p className="font-semibold flex items-center gap-1.5 text-bloom">
              <Diamond /> DiamondDevs
            </p>
            <p className="mt-2 leading-relaxed">
              Looking for something like this for your event? We customise it for any
              occasion — weddings, showers, birthdays, parties and more.
            </p>
            <a
              href={`mailto:${EMAIL}?subject=${encodeURIComponent('Custom event camera')}`}
              className="mt-3 block text-bloom underline break-all"
            >
              {EMAIL}
            </a>
          </div>
        </>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center gap-1.5 rounded-full bg-paper/90 border border-leaf/15 px-3 py-1 text-[10px] font-sans uppercase tracking-[0.15em] text-leaf/70"
      >
        <Diamond className="text-bloom" /> Built by DiamondDevs
      </button>
    </div>
  );
}
