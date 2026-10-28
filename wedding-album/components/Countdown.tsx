'use client';

import { useEffect, useState } from 'react';

function format(ms: number) {
  if (ms <= 0) return '0h 0m 0s';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}h ${m}m ${s}s`;
}

export default function Countdown({
  target,
  onComplete,
}: {
  target: Date;
  onComplete?: () => void;
}) {
  const [remaining, setRemaining] = useState(target.getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const diff = target.getTime() - Date.now();
      setRemaining(diff);
      if (diff <= 0) {
        clearInterval(id);
        onComplete?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [target, onComplete]);

  return <span>{format(remaining)}</span>;
}
