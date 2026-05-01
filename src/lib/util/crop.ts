/**
 * Erzeuge einen 400×300px-JPEG-Ausschnitt um einen Pin auf einem
 * gerenderten Canvas (z.B. eine Plan-Seite via PDF.js).
 *
 * Strategie: Source-Region rund um den Pin sampeln, mit roter Markierung
 * an der exakten Pin-Position überlagern, dann als JPEG-Blob zurück geben.
 *
 * - srcCanvas: das vollständig gerenderte Plan-Canvas
 * - xPct/yPct: Pin-Position (0..100)
 * - returns: 400×300 JPEG-Blob (q=0.82)
 *
 * Pure (kein DOM-Effekt außerhalb eines temporären Canvas).
 */
export const PLAN_CROP_W = 400;
export const PLAN_CROP_H = 300;

export async function cropPlanAroundPin(
  srcCanvas: HTMLCanvasElement,
  xPct: number,
  yPct: number
): Promise<Blob> {
  const sw = srcCanvas.width;
  const sh = srcCanvas.height;
  if (sw === 0 || sh === 0) throw new Error('Source canvas hat keine Dimensionen.');

  // Pin in Pixeln
  const px = (xPct / 100) * sw;
  const py = (yPct / 100) * sh;

  // Source-Region (zentriert um den Pin), in Source-Pixel-Koordinaten.
  // Wir wollen 400×300 sehen, also wenn das Source-Canvas größer ist, einen
  // Ausschnitt nehmen; wenn kleiner, hochskalieren (bleibt sichtbar, ggf.
  // verpixelt — besser als gar kein Crop).
  const targetAspect = PLAN_CROP_W / PLAN_CROP_H;
  // Wir samplen einen Source-Bereich mit 400×300 Aspect Ratio bei einer
  // Source-Höhe von min(sh, 600px) — das ergibt einen sinnvollen Zoom.
  const srcH = Math.min(sh, 600);
  const srcW = srcH * targetAspect;

  let sx = px - srcW / 2;
  let sy = py - srcH / 2;
  // Clamp ins Bild
  if (sx < 0) sx = 0;
  if (sy < 0) sy = 0;
  if (sx + srcW > sw) sx = sw - srcW;
  if (sy + srcH > sh) sy = sh - srcH;

  const out = document.createElement('canvas');
  out.width = PLAN_CROP_W;
  out.height = PLAN_CROP_H;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Kein 2D-Context auf Crop-Canvas.');

  // Bild-Region zeichnen
  ctx.drawImage(srcCanvas, sx, sy, srcW, srcH, 0, 0, PLAN_CROP_W, PLAN_CROP_H);

  // Pin-Marker zeichnen (roter Kreis mit weißem Inneren-Ring)
  const markerX = ((px - sx) / srcW) * PLAN_CROP_W;
  const markerY = ((py - sy) / srcH) * PLAN_CROP_H;
  const r = 14;

  ctx.strokeStyle = '#E30613';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(markerX, markerY, r, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(markerX, markerY, r - 3, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = '#E30613';
  ctx.beginPath();
  ctx.arc(markerX, markerY, 3, 0, 2 * Math.PI);
  ctx.fill();

  return await new Promise<Blob>((resolve, reject) =>
    out.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob() failed'))),
      'image/jpeg',
      0.82
    )
  );
}
