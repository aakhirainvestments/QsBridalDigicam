// Film looks + polaroid frame, all done on <canvas> so it works on every phone (iOS Safari
// doesn't support canvas ctx.filter, so we edit pixels directly). The live viewfinder uses the
// very same function, so what you see is what you get.

export type LookId = 'tezza' | 'kodak' | 'vsco' | 'dreamy' | 'bw' | 'plain';
type RGB = [number, number, number];

type Look = {
  label: string;
  contrast: number;
  brightness: number; // -255..255
  saturation: number;
  tint: RGB; // per-channel multiplier
  shadow: RGB; // added to dark tones (split-toning)
  highlight: RGB; // added to bright tones
  fade: number; // 0..1 matte: lifts the blacks toward fadeColor
  fadeColor: RGB;
  grain: number; // 0..1
  vignette: number; // 0..1
};

const NONE: RGB = [0, 0, 0];

export const LOOKS: Record<LookId, Look> = {
  tezza: {
    label: 'Tezza',
    contrast: 1.06, brightness: 8, saturation: 0.88, tint: [1.04, 1.0, 0.94],
    shadow: [-8, 6, 14], highlight: [22, 10, -16],
    fade: 0.16, fadeColor: [70, 50, 40], grain: 0.05, vignette: 0.18,
  },
  kodak: {
    label: 'Kodak',
    contrast: 1.2, brightness: 2, saturation: 1.3, tint: [1.08, 1.03, 0.84],
    shadow: [8, -2, -14], highlight: [18, 12, -18],
    fade: 0.06, fadeColor: [40, 28, 18], grain: 0.1, vignette: 0.38,
  },
  vsco: {
    label: 'VSCO',
    contrast: 0.96, brightness: 6, saturation: 0.78, tint: [0.97, 1.02, 1.0],
    shadow: [-10, 10, 6], highlight: [6, 6, 14],
    fade: 0.2, fadeColor: [40, 56, 52], grain: 0.06, vignette: 0.15,
  },
  dreamy: {
    label: 'Dreamy',
    contrast: 0.9, brightness: 14, saturation: 0.95, tint: [1.05, 1.0, 1.05],
    shadow: [10, -4, 10], highlight: [14, 6, 12],
    fade: 0.14, fadeColor: [80, 60, 72], grain: 0.03, vignette: 0.08,
  },
  bw: {
    label: 'B&W',
    contrast: 1.3, brightness: 0, saturation: 0, tint: [1, 1, 1],
    shadow: NONE, highlight: NONE,
    fade: 0.06, fadeColor: [30, 30, 30], grain: 0.12, vignette: 0.4,
  },
  plain: {
    label: 'Plain',
    contrast: 1, brightness: 0, saturation: 1, tint: [1, 1, 1],
    shadow: NONE, highlight: NONE, fade: 0, fadeColor: NONE, grain: 0, vignette: 0,
  },
};

function applyLook(ctx: CanvasRenderingContext2D, size: number, look: Look) {
  if (look === LOOKS.plain) return;
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
  for (let i = 0; i < d.length; i += 4) {
    let r = (d[i] - 128) * look.contrast + 128 + look.brightness;
    let g = (d[i + 1] - 128) * look.contrast + 128 + look.brightness;
    let b = (d[i + 2] - 128) * look.contrast + 128 + look.brightness;
    const l0 = 0.299 * r + 0.587 * g + 0.114 * b;
    r = (l0 + (r - l0) * look.saturation) * look.tint[0];
    g = (l0 + (g - l0) * look.saturation) * look.tint[1];
    b = (l0 + (b - l0) * look.saturation) * look.tint[2];

    // split-toning: shadows and highlights pushed toward different colours
    const l = clamp(0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const ws = (1 - l) * (1 - l);
    const wh = l * l;
    r += look.shadow[0] * ws + look.highlight[0] * wh;
    g += look.shadow[1] * ws + look.highlight[1] * wh;
    b += look.shadow[2] * ws + look.highlight[2] * wh;

    if (look.fade) {
      r += (look.fadeColor[0] - r) * look.fade * (1 - clamp(r) / 255);
      g += (look.fadeColor[1] - g) * look.fade * (1 - clamp(g) / 255);
      b += (look.fadeColor[2] - b) * look.fade * (1 - clamp(b) / 255);
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

/** Centre-square crop of the video, optionally mirrored, with the film look applied. */
export function drawLooked(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  size: number,
  lookId: LookId,
  mirror: boolean
) {
  const side = Math.min(video.videoWidth, video.videoHeight);
  const sx = (video.videoWidth - side) / 2;
  const sy = (video.videoHeight - side) / 2;
  ctx.save();
  if (mirror) {
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
  ctx.restore();
  applyLook(ctx, size, LOOKS[lookId]);
}

const SCRIPT = `'Sacramento', 'Snell Roundhand', cursive`;
const SERIF = `'Cormorant Garamond', Georgia, serif`;

/** Frame the shot as a polaroid. The saved photo is NOT mirrored (same as the iPhone camera). */
export async function makePolaroid(
  video: HTMLVideoElement,
  lookId: LookId,
  eventName: string
): Promise<Blob | null> {
  try {
    await Promise.all([
      document.fonts.load(`64px Sacramento`),
      document.fonts.load(`600 30px "Cormorant Garamond"`),
    ]);
  } catch {
    // fall back to system fonts
  }

  const PHOTO = 880;
  const photo = document.createElement('canvas');
  photo.width = PHOTO;
  photo.height = PHOTO;
  const pctx = photo.getContext('2d', { willReadFrequently: true });
  if (!pctx) return null;
  drawLooked(pctx, video, PHOTO, lookId, false);

  const W = 1000, H = 1200, M = 60;
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const ctx = out.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#fbf8f2';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(photo, M, M);

  ctx.fillStyle = '#5f625d';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  let size = 88;
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
