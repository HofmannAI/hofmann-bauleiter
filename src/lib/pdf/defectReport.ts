/**
 * Generate a per-Gewerk Mängelreport PDF in the browser.
 * Layout (per spec §5.6):
 * - Cover: red-frame logo (SVG-recreated), project, gewerk, date, count, bauleiter, signature line
 * - One page per defect: M-### header, title, description, up to 2 photos
 *   Plan-snippet (crop around pin) is best-effort: when plan is renderable
 *   client-side via PDF.js, we render the page + draw a red circle.
 * - Footer: project · page n/m · printed-on date
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import { getSignedUrl } from '$lib/storage/photos';

const PAGE_W = 595.28; // A4 portrait
const PAGE_H = 841.89;
const MARGIN = 48;
const RED = rgb(0.890, 0.024, 0.075); // #E30613
const INK = rgb(0.059, 0.059, 0.063); // #0F0F10
const MUTED = rgb(0.42, 0.4, 0.376);

export type ReportDefect = {
  shortId: string | null;
  title: string;
  description: string | null;
  status: string;
  deadline: string | null;
  apartmentLabel?: string | null;
  photoUrls: string[];
  /** Pre-rendered Plan-Crop (400×300) als signed-URL — wenn vorhanden,
   * landet er oben über den Fotos im Report. */
  planCropUrl?: string | null;
  planSignedUrl?: string | null;
  page?: number | null;
  xPct?: number | null;
  yPct?: number | null;
};

export type ReportInput = {
  projectName: string;
  gewerkName: string;
  bauleiterName: string;
  defects: ReportDefect[];
};

function fmtDeShort(d: Date): string {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch (_e) {
    return null;
  }
}

function drawHeaderLogo(page: PDFPage, x: number, y: number, size: number) {
  // Red frame + dot — SVG-recreation as drawn rect/circle
  page.drawRectangle({
    x,
    y: y - size,
    width: size,
    height: size,
    borderColor: RED,
    borderWidth: 3
  });
  page.drawCircle({
    x: x + size - 6,
    y: y - size + 6,
    size: 3,
    color: RED
  });
}

function drawFooter(page: PDFPage, font: PDFFont, idx: number, total: number, projectName: string, generatedOn: string) {
  page.drawText(`${projectName}  ·  Seite ${idx} / ${total}  ·  Druckdatum ${generatedOn}`, {
    x: MARGIN,
    y: 24,
    size: 8,
    font,
    color: MUTED
  });
}

export async function generateDefectReport(input: ReportInput): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const generatedOn = fmtDeShort(new Date());

  // ----- Cover -----
  const cover = pdf.addPage([PAGE_W, PAGE_H]);
  drawHeaderLogo(cover, MARGIN, PAGE_H - MARGIN, 38);
  cover.drawText('HOFMANN HAUS', {
    x: MARGIN + 50,
    y: PAGE_H - MARGIN - 16,
    size: 14,
    font: helvBold,
    color: INK
  });
  cover.drawText('BAULEITER-COCKPIT', {
    x: MARGIN + 50,
    y: PAGE_H - MARGIN - 32,
    size: 9,
    font: helv,
    color: MUTED
  });

  // Title block
  const cy = PAGE_H - 200;
  cover.drawText('Mängelmeldung', { x: MARGIN, y: cy, size: 28, font: helvBold, color: INK });
  cover.drawText(input.projectName, { x: MARGIN, y: cy - 36, size: 18, font: helvBold, color: INK });
  cover.drawText(`Gewerk: ${input.gewerkName}`, { x: MARGIN, y: cy - 64, size: 14, font: helv, color: INK });
  cover.drawText(`Stand: ${generatedOn}`, { x: MARGIN, y: cy - 86, size: 12, font: helv, color: MUTED });
  cover.drawText(`${input.defects.length} Mangel${input.defects.length === 1 ? '' : ' / Mängel'}`, {
    x: MARGIN,
    y: cy - 108,
    size: 12,
    font: helvBold,
    color: RED
  });

  // Signature
  cover.drawText('Bauleiter:', { x: MARGIN, y: 140, size: 11, font: helv, color: MUTED });
  cover.drawText(input.bauleiterName, { x: MARGIN, y: 122, size: 13, font: helvBold, color: INK });
  cover.drawLine({ start: { x: MARGIN, y: 80 }, end: { x: MARGIN + 240, y: 80 }, color: INK, thickness: 0.6 });
  cover.drawText('Unterschrift', { x: MARGIN, y: 66, size: 9, font: helv, color: MUTED });

  // ----- Defect pages -----
  const total = input.defects.length + 1; // cover + per defect
  drawFooter(cover, helv, 1, total, input.projectName, generatedOn);

  for (let i = 0; i < input.defects.length; i++) {
    const d = input.defects[i];
    const page = pdf.addPage([PAGE_W, PAGE_H]);

    // Header bar
    page.drawRectangle({ x: 0, y: PAGE_H - 56, width: PAGE_W, height: 56, color: rgb(0.06, 0.06, 0.063) });
    page.drawText(d.shortId ?? `Mangel ${i + 1}`, {
      x: MARGIN, y: PAGE_H - 32, size: 14, font: helvBold, color: rgb(1, 1, 1)
    });
    const headerRight = `${input.gewerkName}${d.apartmentLabel ? ' · ' + d.apartmentLabel : ''}${d.deadline ? ' · Deadline ' + fmtDeShort(new Date(d.deadline + 'T00:00:00')) : ''}`;
    const rightWidth = helv.widthOfTextAtSize(headerRight, 9);
    page.drawText(headerRight, { x: PAGE_W - MARGIN - rightWidth, y: PAGE_H - 28, size: 9, font: helv, color: rgb(1, 1, 1) });

    // Title
    let cursor = PAGE_H - 90;
    page.drawText(d.title.slice(0, 80), { x: MARGIN, y: cursor, size: 16, font: helvBold, color: INK });
    cursor -= 24;

    // Description (wrap)
    if (d.description) {
      const lines = wrapText(d.description, helv, 11, PAGE_W - 2 * MARGIN);
      for (const line of lines.slice(0, 18)) {
        page.drawText(line, { x: MARGIN, y: cursor, size: 11, font: helv, color: INK });
        cursor -= 14;
      }
      cursor -= 6;
    }

    // Plan-Crop (400×300, mit rotem Pin-Marker), wenn vorhanden — oberhalb der Fotos
    if (d.planCropUrl) {
      const bytes = await fetchImageBytes(d.planCropUrl);
      if (bytes) {
        let img: PDFImage | null = null;
        try { img = await pdf.embedJpg(bytes); } catch (_e) {
          try { img = await pdf.embedPng(bytes); } catch (_e2) { img = null; }
        }
        if (img) {
          const cropW = 320;
          const cropH = 240;
          cursor -= cropH;
          page.drawText('Plan-Ausschnitt', {
            x: MARGIN, y: cursor + cropH + 4, size: 9, font: helv, color: MUTED
          });
          page.drawImage(img, { x: MARGIN, y: cursor, width: cropW, height: cropH });
          page.drawRectangle({
            x: MARGIN, y: cursor, width: cropW, height: cropH,
            borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5
          });
          cursor -= 12;
        }
      }
    }

    // Up to 2 photos side-by-side
    const photos = d.photoUrls.slice(0, 2);
    if (photos.length > 0) {
      const photoW = (PAGE_W - 2 * MARGIN - 10) / Math.max(1, photos.length);
      const photoH = 200;
      cursor -= photoH;
      for (let pi = 0; pi < photos.length; pi++) {
        const url = photos[pi];
        const bytes = await fetchImageBytes(url);
        if (!bytes) continue;
        let img: PDFImage | null = null;
        try { img = await pdf.embedJpg(bytes); } catch (_e) {
          try { img = await pdf.embedPng(bytes); } catch (_e2) { img = null; }
        }
        if (!img) continue;
        const x = MARGIN + pi * (photoW + 10);
        const dim = img.scaleToFit(photoW, photoH);
        page.drawImage(img, { x, y: cursor, width: dim.width, height: dim.height });
      }
      cursor -= 10;
    }

    // Pin coordinates note
    if (d.planSignedUrl && d.page != null && d.xPct != null && d.yPct != null) {
      page.drawText(
        `Plan-Pin: Seite ${d.page} bei ${d.xPct.toFixed(1)}% / ${d.yPct.toFixed(1)}%`,
        { x: MARGIN, y: cursor, size: 9, font: helv, color: MUTED }
      );
      cursor -= 12;
    }

    drawFooter(page, helv, i + 2, total, input.projectName, generatedOn);
  }

  const bytes = await pdf.save();
  // Copy to a fresh ArrayBuffer to avoid SharedArrayBuffer typing union
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return new Blob([ab], { type: 'application/pdf' });
}

function wrapText(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.replace(/\r/g, '').split(/(\s+)/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if (w === '\n') { lines.push(line); line = ''; continue; }
    const test = line + w;
    if (font.widthOfTextAtSize(test, size) > maxW) {
      lines.push(line.trimEnd());
      line = w.trimStart();
    } else {
      line = test;
    }
  }
  if (line) lines.push(line.trimEnd());
  // Also break on explicit newlines that wrap consumed
  return lines.flatMap((l) => l.split('\n'));
}

/** Convenience: build report input for a gewerk and trigger browser download. */
export async function downloadGewerkReport(args: {
  projectName: string;
  gewerkName: string;
  bauleiterName: string;
  defects: Array<{
    id: string;
    shortId: string | null;
    title: string;
    description: string | null;
    status: string;
    deadline: string | null;
    apartmentLabel?: string | null;
    photoStoragePaths: string[];
    planCropPath?: string | null;
    planStoragePath?: string | null;
    page?: number | null;
    xPct?: number | null;
    yPct?: number | null;
  }>;
}) {
  const reportDefects: ReportDefect[] = [];
  for (const d of args.defects) {
    const photoUrls: string[] = [];
    for (const p of d.photoStoragePaths) {
      const u = await getSignedUrl('defect-photos', p, 600);
      if (u) photoUrls.push(u);
    }
    let planSignedUrl: string | null = null;
    if (d.planStoragePath) planSignedUrl = await getSignedUrl('plans', d.planStoragePath, 600);
    let planCropUrl: string | null = null;
    if (d.planCropPath) planCropUrl = await getSignedUrl('defect-crops', d.planCropPath, 600);
    reportDefects.push({
      shortId: d.shortId,
      title: d.title,
      description: d.description,
      status: d.status,
      deadline: d.deadline,
      apartmentLabel: d.apartmentLabel,
      photoUrls,
      planCropUrl,
      planSignedUrl,
      page: d.page,
      xPct: d.xPct,
      yPct: d.yPct
    });
  }
  const blob = await generateDefectReport({
    projectName: args.projectName,
    gewerkName: args.gewerkName,
    bauleiterName: args.bauleiterName,
    defects: reportDefects
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Maengelreport_${args.projectName.replace(/\s+/g, '_')}_${args.gewerkName.replace(/\s+/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
