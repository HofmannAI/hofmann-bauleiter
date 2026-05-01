/**
 * VOB-Mängelrüge PDF-Generator (browser-side).
 *
 * Layout:
 * - Briefkopf: Hofmann-Logo + Firma-Adresse oben rechts
 * - Empfänger-Adresse links Mitte
 * - Datum + Aktenzeichen rechts
 * - Betreff
 * - Brieftext (Vorlage mit Platzhaltern)
 * - Mängel-Anlage: 1 Zeile pro Mangel mit ID, Plan-Crop, Beschreibung,
 *   Erledigt-Checkbox + Bemerkung-Linie für handschriftliche Eintragung
 * - Unterschrift-Block + Footer
 *
 * Eingebettet wird der Plan-Ausschnitt pro Mangel (signed URL via
 * defect-crops). Wenn keiner vorhanden, fällt die Zeile auf das erste
 * Foto zurück.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from 'pdf-lib';
import { getSignedUrl } from '$lib/storage/photos';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;
const RED = rgb(0.89, 0.024, 0.075);
const INK = rgb(0.059, 0.059, 0.063);
const MUTED = rgb(0.42, 0.4, 0.376);
const LINE = rgb(0.78, 0.77, 0.75);

export type Firma = {
  name: string;
  strasse: string;
  plzOrt: string;
  telefon: string | null;
  email: string | null;
  web: string | null;
  unterzeichner1: string | null;
  unterzeichner2: string | null;
};

export type RuegeDefect = {
  shortId: string | null;
  title: string;
  description: string | null;
  apartmentLabel?: string | null;
  bauteil?: string | null;
  planCropPath: string | null;
  firstPhotoPath: string | null;
};

export type RuegeInput = {
  projektName: string;
  empfaenger: {
    company: string | null;
    contactName: string | null;
    address: string | null;
    email: string | null;
  };
  frist: string;            // ISO-Datum YYYY-MM-DD
  rechtsgrundlage: string;
  betreff?: string;
  brieftextRendered: string; // Vorlage mit ersetzten Platzhaltern (Rendering vom Caller)
  unterzeichner: string;
  defects: RuegeDefect[];
  firma: Firma;
  qrSvg?: string | null;     // Optional: SVG-Markup eines QR-Codes (siehe PR #19)
};

async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function embedSafeImage(pdf: PDFDocument, url: string): Promise<PDFImage | null> {
  const bytes = await fetchImageBytes(url);
  if (!bytes) return null;
  try {
    return await pdf.embedJpg(bytes);
  } catch {
    try {
      return await pdf.embedPng(bytes);
    } catch {
      return null;
    }
  }
}

function fmtDeShort(d: Date): string {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDeFromIso(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function drawHeaderLogo(page: PDFPage, x: number, y: number, size: number) {
  page.drawRectangle({ x, y: y - size, width: size, height: size, borderColor: RED, borderWidth: 3 });
  page.drawCircle({ x: x + size - 6, y: y - size + 6, size: 3, color: RED });
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  fontSize: number,
  x: number,
  yStart: number,
  maxWidth: number,
  lineHeight: number,
  color = INK
): number {
  const paragraphs = text.split('\n');
  let y = yStart;
  for (const para of paragraphs) {
    const words = para.split(' ');
    let line = '';
    for (const w of words) {
      const tentative = line ? line + ' ' + w : w;
      const width = font.widthOfTextAtSize(tentative, fontSize);
      if (width > maxWidth && line) {
        page.drawText(line, { x, y, size: fontSize, font, color });
        y -= lineHeight;
        line = w;
      } else {
        line = tentative;
      }
    }
    if (line) {
      page.drawText(line, { x, y, size: fontSize, font, color });
      y -= lineHeight;
    } else {
      y -= lineHeight;
    }
  }
  return y;
}

export async function generateMaengelruege(input: RuegeInput): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const today = fmtDeShort(new Date());
  const fristFmt = fmtDeFromIso(input.frist);

  // ----- Anschreiben (Seite 1) -----
  const p1 = pdf.addPage([PAGE_W, PAGE_H]);

  // Briefkopf rechts oben
  drawHeaderLogo(p1, PAGE_W - MARGIN - 38, PAGE_H - MARGIN, 38);
  p1.drawText(input.firma.name, {
    x: PAGE_W - MARGIN - 200,
    y: PAGE_H - MARGIN - 8,
    size: 11,
    font: helvBold,
    color: INK
  });
  const headerLines = [input.firma.strasse, input.firma.plzOrt];
  if (input.firma.telefon) headerLines.push(`Tel ${input.firma.telefon}`);
  if (input.firma.email) headerLines.push(input.firma.email);
  let yh = PAGE_H - MARGIN - 22;
  for (const l of headerLines) {
    p1.drawText(l, { x: PAGE_W - MARGIN - 200, y: yh, size: 9, font: helv, color: MUTED });
    yh -= 11;
  }

  // Empfänger-Adresse links Mitte
  const yEmp = PAGE_H - MARGIN - 110;
  const adressLines = [
    input.empfaenger.company ?? '—',
    input.empfaenger.contactName ?? '',
    ...(input.empfaenger.address ?? '').split('\n')
  ].filter((s) => s.trim());
  let ya = yEmp;
  for (const l of adressLines) {
    p1.drawText(l, { x: MARGIN, y: ya, size: 11, font: helv, color: INK });
    ya -= 13;
  }

  // Datum + Aktenzeichen rechts oben unter Briefkopf
  p1.drawText(`Schwäbisch Hall, ${today}`, {
    x: PAGE_W - MARGIN - 200,
    y: PAGE_H - MARGIN - 110,
    size: 10,
    font: helv,
    color: INK
  });

  // Betreff
  const betreff = input.betreff ?? `Mängelrüge gem. ${input.rechtsgrundlage}`;
  p1.drawText(`Bauvorhaben: ${input.projektName}`, {
    x: MARGIN,
    y: PAGE_H - MARGIN - 220,
    size: 11,
    font: helvBold,
    color: INK
  });
  p1.drawText(betreff, {
    x: MARGIN,
    y: PAGE_H - MARGIN - 238,
    size: 11,
    font: helvBold,
    color: INK
  });

  // Brieftext
  const yText = drawWrappedText(
    p1,
    input.brieftextRendered,
    helv,
    11,
    MARGIN,
    PAGE_H - MARGIN - 270,
    PAGE_W - 2 * MARGIN,
    15
  );

  // Unterschrift
  const yUnter = Math.max(180, yText - 40);
  p1.drawText('Mit freundlichen Grüßen', {
    x: MARGIN,
    y: yUnter,
    size: 11,
    font: helv,
    color: INK
  });
  p1.drawText(input.unterzeichner, {
    x: MARGIN,
    y: yUnter - 60,
    size: 11,
    font: helvBold,
    color: INK
  });
  p1.drawText(input.firma.name, {
    x: MARGIN,
    y: yUnter - 75,
    size: 9,
    font: helv,
    color: MUTED
  });

  // QR-Code unten rechts (optional)
  if (input.qrSvg) {
    p1.drawText('Online-Freimeldung:', {
      x: PAGE_W - MARGIN - 120,
      y: 110,
      size: 8,
      font: helv,
      color: MUTED
    });
    p1.drawRectangle({
      x: PAGE_W - MARGIN - 80,
      y: 30,
      width: 70,
      height: 70,
      borderColor: INK,
      borderWidth: 1
    });
    p1.drawText('QR-Code', {
      x: PAGE_W - MARGIN - 60,
      y: 60,
      size: 7,
      font: helv,
      color: MUTED
    });
  }

  // Footer
  p1.drawText(`Frist zur Beseitigung: ${fristFmt}`, {
    x: MARGIN,
    y: 30,
    size: 9,
    font: helvBold,
    color: RED
  });

  // ----- Anlage: Mängelliste -----
  const p2 = pdf.addPage([PAGE_W, PAGE_H]);
  drawHeaderLogo(p2, PAGE_W - MARGIN - 28, PAGE_H - MARGIN, 28);
  p2.drawText('Anlage: Mängelliste', {
    x: MARGIN,
    y: PAGE_H - MARGIN - 8,
    size: 14,
    font: helvBold,
    color: INK
  });
  p2.drawText(`Bauvorhaben: ${input.projektName}  ·  Frist: ${fristFmt}`, {
    x: MARGIN,
    y: PAGE_H - MARGIN - 28,
    size: 10,
    font: helv,
    color: MUTED
  });
  p2.drawLine({
    start: { x: MARGIN, y: PAGE_H - MARGIN - 36 },
    end: { x: PAGE_W - MARGIN, y: PAGE_H - MARGIN - 36 },
    thickness: 0.7,
    color: LINE
  });

  let yRow = PAGE_H - MARGIN - 60;
  const ROW_H = 110;
  let pageRef: PDFPage = p2;
  let rowsOnPage = 0;
  const ROWS_PER_PAGE = 5;

  for (const d of input.defects) {
    if (rowsOnPage >= ROWS_PER_PAGE) {
      pageRef = pdf.addPage([PAGE_W, PAGE_H]);
      yRow = PAGE_H - MARGIN;
      rowsOnPage = 0;
    }

    // Plan-Crop oder Foto-Fallback
    let img: PDFImage | null = null;
    if (d.planCropPath) {
      const url = await getSignedUrl('defect-crops', d.planCropPath, 600);
      if (url) img = await embedSafeImage(pdf, url);
    }
    if (!img && d.firstPhotoPath) {
      const url = await getSignedUrl('defect-photos', d.firstPhotoPath, 600);
      if (url) img = await embedSafeImage(pdf, url);
    }

    // Bild links
    if (img) {
      const ratio = img.width / img.height;
      const w = 100;
      const h = w / ratio;
      pageRef.drawImage(img, {
        x: MARGIN,
        y: yRow - h - 4,
        width: w,
        height: h
      });
    } else {
      pageRef.drawRectangle({
        x: MARGIN,
        y: yRow - 75,
        width: 100,
        height: 75,
        borderColor: LINE,
        borderWidth: 0.5
      });
    }

    // Mangel-ID + Titel rechts
    const xText = MARGIN + 115;
    pageRef.drawText(d.shortId ?? '?', {
      x: xText,
      y: yRow - 6,
      size: 11,
      font: helvBold,
      color: RED
    });
    pageRef.drawText(d.title, {
      x: xText + 50,
      y: yRow - 6,
      size: 11,
      font: helvBold,
      color: INK
    });

    if (d.apartmentLabel) {
      pageRef.drawText(d.apartmentLabel, {
        x: xText,
        y: yRow - 22,
        size: 9,
        font: helv,
        color: MUTED
      });
    }

    if (d.description) {
      drawWrappedText(
        pageRef,
        d.description.slice(0, 240),
        helv,
        9,
        xText,
        yRow - 38,
        PAGE_W - MARGIN - xText - 60,
        12,
        INK
      );
    }

    // Erledigt-Checkbox rechts
    pageRef.drawRectangle({
      x: PAGE_W - MARGIN - 50,
      y: yRow - 22,
      width: 14,
      height: 14,
      borderColor: INK,
      borderWidth: 0.7
    });
    pageRef.drawText('Erledigt', {
      x: PAGE_W - MARGIN - 50,
      y: yRow - 36,
      size: 8,
      font: helv,
      color: MUTED
    });

    // Trennlinie
    pageRef.drawLine({
      start: { x: MARGIN, y: yRow - ROW_H + 6 },
      end: { x: PAGE_W - MARGIN, y: yRow - ROW_H + 6 },
      thickness: 0.5,
      color: LINE
    });

    yRow -= ROW_H;
    rowsOnPage++;
  }

  // Bestätigungs-Block
  const allPages = pdf.getPages();
  const last = allPages[allPages.length - 1];
  last.drawText('Bestätigung der Mängelbeseitigung:', {
    x: MARGIN,
    y: 80,
    size: 9,
    font: helvBold,
    color: INK
  });
  last.drawLine({
    start: { x: MARGIN, y: 50 },
    end: { x: PAGE_W / 2, y: 50 },
    thickness: 0.5,
    color: INK
  });
  last.drawText('Datum, Unterschrift Auftragnehmer', {
    x: MARGIN,
    y: 36,
    size: 8,
    font: helv,
    color: MUTED
  });

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}

/**
 * Fülllt eine Vorlage mit Platzhaltern. Unterstützte Tokens:
 * {{projekt}} {{frist}} {{rechtsgrundlage}} {{unterzeichner}}
 * {{datum_anzeige}} {{frist_alt}} {{datum_freimeldung}}
 */
export function renderVorlage(vorlage: string, vars: Record<string, string>): string {
  return vorlage.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
