/**
 * Bauleiter-Übergabe-PDF: Stand, offene Mängel, kommende Termine.
 * Generiert im Browser via pdf-lib, herunterladbar als PDF.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const RED = rgb(0.886, 0.086, 0.165);
const INK = rgb(0.102, 0.110, 0.122);
const MUTED = rgb(0.365, 0.369, 0.373);

export type HandoverDefect = {
	shortId: string | null;
	title: string;
	status: string;
	deadline: string | null;
	gewerkName: string | null;
};

export type HandoverTask = {
	name: string;
	startDate: string;
	endDate: string;
	progressPct: number;
	gewerkName: string | null;
};

export type HandoverInput = {
	projectName: string;
	fromBauleiter: string;
	toBauleiter: string;
	date: string;
	openDefects: HandoverDefect[];
	upcomingTasks: HandoverTask[];
	overdueTasks: HandoverTask[];
	stats: {
		totalDefects: number;
		openDefects: number;
		overdueDefects: number;
		totalTasks: number;
		completedTasks: number;
	};
};

function drawLine(page: PDFPage, y: number) {
	page.drawLine({
		start: { x: MARGIN, y },
		end: { x: PAGE_W - MARGIN, y },
		thickness: 0.5,
		color: rgb(0.85, 0.85, 0.85)
	});
}

export async function generateHandoverPdf(input: HandoverInput): Promise<void> {
	const doc = await PDFDocument.create();
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
	const contentWidth = PAGE_W - 2 * MARGIN;

	let page = doc.addPage([PAGE_W, PAGE_H]);
	let y = PAGE_H - MARGIN;

	function newPage() {
		page = doc.addPage([PAGE_W, PAGE_H]);
		y = PAGE_H - MARGIN;
	}

	function ensureSpace(needed: number) {
		if (y - needed < MARGIN + 40) newPage();
	}

	// === HEADER ===
	page.drawRectangle({ x: MARGIN, y: y - 4, width: contentWidth, height: 4, color: RED });
	y -= 24;
	page.drawText('ÜBERGABE-BERICHT', { x: MARGIN, y, font: fontBold, size: 20, color: RED });
	y -= 20;
	page.drawText(input.projectName, { x: MARGIN, y, font: fontBold, size: 14, color: INK });
	y -= 30;

	// Meta
	const meta = [
		['Datum', input.date],
		['Von', input.fromBauleiter],
		['An', input.toBauleiter]
	];
	for (const [label, value] of meta) {
		page.drawText(`${label}:`, { x: MARGIN, y, font, size: 9, color: MUTED });
		page.drawText(value, { x: MARGIN + 60, y, font: fontBold, size: 9, color: INK });
		y -= 14;
	}
	y -= 10;
	drawLine(page, y);
	y -= 20;

	// === STATISTIK ===
	page.drawText('PROJEKT-STATUS', { x: MARGIN, y, font: fontBold, size: 12, color: INK });
	y -= 18;

	const stats = [
		['Termine gesamt', String(input.stats.totalTasks)],
		['Termine abgeschlossen', String(input.stats.completedTasks)],
		['Mängel gesamt', String(input.stats.totalDefects)],
		['Mängel offen', String(input.stats.openDefects)],
		['Mängel überfällig', String(input.stats.overdueDefects)]
	];
	for (const [label, value] of stats) {
		page.drawText(label, { x: MARGIN, y, font, size: 9, color: MUTED });
		page.drawText(value, { x: MARGIN + 160, y, font: fontBold, size: 9, color: INK });
		y -= 14;
	}
	y -= 10;
	drawLine(page, y);
	y -= 20;

	// === OFFENE MÄNGEL ===
	page.drawText(`OFFENE MÄNGEL (${input.openDefects.length})`, { x: MARGIN, y, font: fontBold, size: 12, color: RED });
	y -= 18;

	// Table header
	page.drawText('Nr.', { x: MARGIN, y, font: fontBold, size: 8, color: MUTED });
	page.drawText('Titel', { x: MARGIN + 50, y, font: fontBold, size: 8, color: MUTED });
	page.drawText('Gewerk', { x: MARGIN + 300, y, font: fontBold, size: 8, color: MUTED });
	page.drawText('Frist', { x: MARGIN + 400, y, font: fontBold, size: 8, color: MUTED });
	y -= 4;
	drawLine(page, y);
	y -= 12;

	for (const d of input.openDefects.slice(0, 40)) {
		ensureSpace(14);
		page.drawText(d.shortId ?? '-', { x: MARGIN, y, font, size: 8, color: INK });
		page.drawText((d.title ?? '').slice(0, 50), { x: MARGIN + 50, y, font, size: 8, color: INK });
		page.drawText((d.gewerkName ?? '').slice(0, 20), { x: MARGIN + 300, y, font, size: 8, color: MUTED });
		page.drawText(d.deadline ?? '-', { x: MARGIN + 400, y, font, size: 8, color: d.deadline && d.deadline < input.date ? RED : MUTED });
		y -= 12;
	}
	if (input.openDefects.length > 40) {
		page.drawText(`…und ${input.openDefects.length - 40} weitere`, { x: MARGIN, y, font, size: 8, color: MUTED });
		y -= 12;
	}

	y -= 10;
	drawLine(page, y);
	y -= 20;

	// === KOMMENDE TERMINE ===
	ensureSpace(40);
	page.drawText(`KOMMENDE TERMINE (${input.upcomingTasks.length})`, { x: MARGIN, y, font: fontBold, size: 12, color: INK });
	y -= 18;

	page.drawText('Termin', { x: MARGIN, y, font: fontBold, size: 8, color: MUTED });
	page.drawText('Gewerk', { x: MARGIN + 250, y, font: fontBold, size: 8, color: MUTED });
	page.drawText('Zeitraum', { x: MARGIN + 360, y, font: fontBold, size: 8, color: MUTED });
	y -= 4;
	drawLine(page, y);
	y -= 12;

	for (const t of input.upcomingTasks.slice(0, 30)) {
		ensureSpace(14);
		page.drawText((t.name ?? '').slice(0, 45), { x: MARGIN, y, font, size: 8, color: INK });
		page.drawText((t.gewerkName ?? '').slice(0, 20), { x: MARGIN + 250, y, font, size: 8, color: MUTED });
		page.drawText(`${t.startDate} – ${t.endDate}`, { x: MARGIN + 360, y, font, size: 8, color: INK });
		y -= 12;
	}

	// === ÜBERFÄLLIGE TERMINE ===
	if (input.overdueTasks.length > 0) {
		y -= 10;
		drawLine(page, y);
		y -= 20;
		ensureSpace(40);
		page.drawText(`ÜBERFÄLLIGE TERMINE (${input.overdueTasks.length})`, { x: MARGIN, y, font: fontBold, size: 12, color: RED });
		y -= 18;

		for (const t of input.overdueTasks.slice(0, 15)) {
			ensureSpace(14);
			page.drawText((t.name ?? '').slice(0, 45), { x: MARGIN, y, font, size: 8, color: INK });
			page.drawText(`${t.endDate} (${t.progressPct}%)`, { x: MARGIN + 360, y, font, size: 8, color: RED });
			y -= 12;
		}
	}

	// === FOOTER ===
	y -= 30;
	ensureSpace(60);
	drawLine(page, y);
	y -= 20;
	page.drawText('Übergabe bestätigt:', { x: MARGIN, y, font, size: 9, color: MUTED });
	y -= 30;
	page.drawText('_________________________', { x: MARGIN, y, font, size: 9, color: MUTED });
	page.drawText('_________________________', { x: PAGE_W / 2 + 20, y, font, size: 9, color: MUTED });
	y -= 12;
	page.drawText(input.fromBauleiter, { x: MARGIN, y, font, size: 8, color: MUTED });
	page.drawText(input.toBauleiter, { x: PAGE_W / 2 + 20, y, font, size: 8, color: MUTED });

	// Page numbers
	const pages = doc.getPages();
	for (let i = 0; i < pages.length; i++) {
		pages[i].drawText(`Seite ${i + 1} / ${pages.length}`, {
			x: PAGE_W - MARGIN - 60, y: MARGIN / 2, font, size: 7, color: MUTED
		});
	}

	const bytes = await doc.save();
	const blob = new Blob([bytes as unknown as ArrayBuffer], { type: 'application/pdf' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `Uebergabe_${input.projectName.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_')}_${input.date}.pdf`;
	a.click();
	URL.revokeObjectURL(url);
}
