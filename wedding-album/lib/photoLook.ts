// Film looks + polaroid frame, all done on <canvas> so it works on every phone (iOS Safari
// doesn't support canvas ctx.filter, so we edit pixels directly).

export type LookId = 'kodak' | 'dreamy' | 'bw' | 'plain';

type Look = {
  label: string;
  css: string; // approximate live-preview on the viewfinder
  contrast: number;
  brightness: number; // -255..255
  saturation: number;
  tint: [number, number, number]; // per-channel multiplier
  fade: number; // 0..1 lift blacks toward a soft grey
  grain: number; // 0..1
  vignette: number; // 0..1
};

export const LOOKS: Record<LookId, Look> = {
  kodak: {
    label: 'Kodak',
    css: 'contrast(1.1) saturate(1.2) sepia(0.2) brightness(1.03)',
    contrast: 1.12, brightness: 4, saturation: 1.18, tint: [1.07, 1.02, 0.88],
    fade: 0.05, grain: 0.07, vignette: 0.28,
  },
  dreamy: {
    label: 'Dreamy',
    css: 'contrast(0.92) brightness(1.08) saturate(0.95)',
    contrast: 0.92, brightness: 12, saturation: 0.95, tint: [1.04, 1.0, 1.04],
    fade: 0.1, grain: 0.03, vignette: 0.1,
  },
  bw: {
    label: 'B&W',
    css: 'grayscale(1) contrast(1.15)',
    contrast: 1.15, brightness: 0, saturation: 0, tint: [1, 1, 1],
    fade: 0.04, grain: 0.09, vignette: 0.3,
  },
  plain: {
    label: 'Plain',
    css: 'none',
    contrast: 1, brightness: 0, saturation: 1, tint: [1, 1, 1],
    fade: 0, grain: 0, vignette: 0,
  },
};

function applyLook(ctx: CanvasRenderingContext2D, size: number, look: Look) {
  if (look === LOOKS.plain) return;
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
  const lift = 36; // the soft grey that faded blacks drift toward
  for (let i = 0; i < d.length; i += 4) {
    let r = (d[i] - 128) * look.contrast + 128 + look.brightness;
    let g = (d[i + 1] - 128) * look.contrast + 128 + look.brightness;
    let b = (d[i + 2] - 128) * look.contrast + 128 + look.brightness;
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    r = l + (r - l) * look.saturation;
    g = l + (g - l) * look.saturation;
    b = l + (b - l) * look.saturation;
    r *= look.tint[0]; g *= look.tint[1]; b *= look.tint[2];
    if (look.fade) {
      r = r * (1 - look.fade) + lift * look.fade;
      g = g * (1 - look.fade) + lift * look.fade;
      b = b * (1 - look.fade) + lift * look.fade;
    }
    if (look.grain) {
      const n = (Math.random() - 0.5) * look.grain * 255;
      r += n; g += n; b += n;
    }
    d[i] = clamp(r); d[i + 1] = clamp(g); d[i + 2] = clamp(b);
  }
  ctx.putImageData(img, 0, 0);

  if (look.vignette) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.35, size / 2, size / 2, size * 0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${look.vignette})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
}

const SCRIPT = `'Allura', 'Snell Roundhand', cursive`;
const SERIF = `'Cormorant Garamond', Georgia, serif`;

/** Square-crop the video, apply the film look, and frame it as a polaroid. Returns a JPEG blob. */
export async function makePolaroid(
  video: HTMLVideoElement,
  lookId: LookId,
  eventName: string
): Promise<Blob | null> {
  try {
    await Promise.all([
      document.fonts.load(`64px Allura`),
      document.fonts.load(`600 30px "Cormorant Garamond"`),
    ]);
  } catch {
    // fall back to system fonts
  }

  const PHOTO = 880;
  const photo = document.createElement('canvas');
  photo.width = PHOTO;
  photo.height = PHOTO;
  const pctx = photo.getContext('2d');
  if (!pctx) return null;
  const side = Math.min(video.videoWidth, video.videoHeight);
  const sx = (video.videoWidth - side) / 2;
  const sy = (video.videoHeight - side) / 2;
  pctx.drawImage(video, sx, sy, side, side, 0, 0, PHOTO, PHOTO);
  applyLook(pctx, PHOTO, LOOKS[lookId]);

  const W = 1000, H = 1200, M = 60;
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const ctx = out.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#fbf8f2';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(photo, M, M);

  // caption: event name (script, shrunk to fit) + date/time of the shot
  ctx.fillStyle = '#5f625d';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  let size = 72;
  ctx.font = `${size}px ${SCRIPT}`;
  while (ctx.measureText(eventName).width > PHOTO && size > 28) {
    size -= 2;
    ctx.font = `${size}px ${SCRIPT}`;
  }
  ctx.fillText(eventName, W / 2, 1040);

  const now = new Date();
  const date = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const time = now
    .toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\s/g, ' ');
  ctx.fillStyle = '#8a8c86';
  ctx.font = `600 30px ${SERIF}`;
  ctx.fillText(`${date.toUpperCase()}  ·  ${time.toUpperCase()}`, W / 2, 1110);

  return new Promise((resolve) => out.toBlob(resolve, 'image/jpeg', 0.82));
}
