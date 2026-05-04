/**
 * Gantt-Chart PDF Export — A0/A3/A4 Formate
 * Rendert den Bauzeitenplan als druckbares PDF mit:
 * - Task-Liste links
 * - Zeitachse mit Balken rechts
 * - Dynamische Schriftgrößen je Format
 * - Farbcodierte Gewerk-Balken
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

export type PdfFormat = 'A4' | 'A3' | 'A0';

// Page dimensions in points (landscape)
const FORMATS: Record<PdfFormat, { w: number; h: number }> = {
	A4: { w: 841.89, h: 595.28 },  // A4 landscape
	A3: { w: 1190.55, h: 841.89 }, // A3 landscape
	A0: { w: 3370.39, h: 2383.94 } // A0 landscape
};

// Font sizes scale with format
const FONT_SCALE: Record<PdfFormat, number> = { A4: 1, A3: 1.2, A0: 2.5 };

export type GanttPdfTask = {
	id: string;
	num: string;
	name: string;
	startDate: string;
	endDate: string;
	depth: number;
	color: string;
	progressPct: number;
	gewerkName?: string | null;
};

export type GanttPdfInput = {
	projectName: string;
	tasks: GanttPdfTask[];
	format: PdfFormat;
	title?: string;
};

function hexToRgb(hex: string) {
	const h = hex.replace('#', '');
	return rgb(
		parseInt(h.slice(0, 2), 16) / 255,
		parseInt(h.slice(2, 4), 16) / 255,
		parseInt(h.slice(4, 6), 16) / 255
	);
}

function daysBetween(a: string, b: string): number {
	return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export async function generateGanttPdf(input: GanttPdfInput): Promise<void> {
	const { w: PAGE_W, h: PAGE_H } = FORMATS[input.format];
	const scale = FONT_SCALE[input.format];
	const MARGIN = 30 * scale;
	const ROW_HEIGHT = 14 * scale;
	const HEADER_HEIGHT = 50 * scale;
	const LIST_WIDTH = Math.min(200 * scale, PAGE_W * 0.25);

	const doc = await PDFDocument.create();
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

	const INK = rgb(0.1, 0.11, 0.12);
	const MUTED = rgb(0.5, 0.5, 0.5);
	const RED = rgb(0.886, 0.086, 0.165);
	const GRID = rgb(0.92, 0.92, 0.92);

	// Calculate time range
	if (input.tasks.length === 0) return;
	let minDate = input.tasks[0].startDate;
	let maxDate = input.tasks[0].endDate;
	for (const t of input.tasks) {
		if (t.startDate < minDate) minDate = t.startDate;
		if (t.endDate > maxDate) maxDate = t.endDate;
	}
	const totalDays = daysBetween(minDate, maxDate) + 1;
	const timelineWidth = PAGE_W - LIST_WIDTH - 2 * MARGIN;

	// Pagination: how many rows fit per page
	const bodyHeight = PAGE_H - HEADER_HEIGHT - MARGIN * 2;
	const rowsPerPage = Math.floor(bodyHeight / ROW_HEIGHT);
	const pages: GanttPdfTask[][] = [];
	for (let i = 0; i < input.tasks.length; i += rowsPerPage) {
		pages.push(input.tasks.slice(i, i + rowsPerPage));
	}

	for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
		const page = doc.addPage([PAGE_W, PAGE_H]);
		const pageTasks = pages[pageIdx];
		const topY = PAGE_H - MARGIN;

		// --- Header ---
		page.drawText(input.title ?? `${input.projectName} — Bauzeitenplan`, {
			x: MARGIN, y: topY - 14 * scale, font: fontBold, size: 12 * scale, color: INK
		});
		page.drawText(`Stand: ${new Date().toLocaleDateString('de-DE')} | Format: ${input.format} | Seite ${pageIdx + 1}/${pages.length}`, {
			x: MARGIN, y: topY - 28 * scale, font, size: 7 * scale, color: MUTED
		});

		// Red accent line
		page.drawRectangle({ x: MARGIN, y: topY - HEADER_HEIGHT + 8 * scale, width: PAGE_W - 2 * MARGIN, height: 2, color: RED });

		const bodyTop = topY - HEADER_HEIGHT;

		// --- Time axis header ---
		const timeX = MARGIN + LIST_WIDTH;
		const monthStart = new Date(minDate);
		monthStart.setDate(1);

		// Draw month labels
		let mCur = new Date(monthStart);
		while (mCur.toISOString().slice(0, 10) <= maxDate) {
			const mStart = mCur.toISOString().slice(0, 10);
			const daysFromMin = daysBetween(minDate, mStart);
			const x = timeX + (daysFromMin / totalDays) * timelineWidth;
			if (x >= timeX && x < timeX + timelineWidth) {
				page.drawText(mCur.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }), {
					x: x + 2, y: bodyTop - 10 * scale, font: fontBold, size: 6 * scale, color: MUTED
				});
				page.drawLine({ start: { x, y: bodyTop - 12 * scale }, end: { x, y: bodyTop - bodyHeight }, thickness: 0.3, color: GRID });
			}
			mCur.setMonth(mCur.getMonth() + 1);
		}

		// --- Task rows ---
		for (let i = 0; i < pageTasks.length; i++) {
			const t = pageTasks[i];
			const y = bodyTop - (i + 1) * ROW_HEIGHT - 14 * scale;

			// Row background (alternating)
			if (i % 2 === 0) {
				page.drawRectangle({ x: MARGIN, y: y - 2, width: PAGE_W - 2 * MARGIN, height: ROW_HEIGHT, color: rgb(0.97, 0.97, 0.98) });
			}

			// Depth indent
			const indent = t.depth * 8 * scale;
			const fontSize = t.depth === 0 ? 7 * scale : 6 * scale;
			const nameFont = t.depth === 0 ? fontBold : font;

			// Num + Name
			page.drawText(t.num, { x: MARGIN + indent, y: y + 3, font, size: 5 * scale, color: MUTED });
			page.drawText(t.name.slice(0, Math.floor(30 / scale * 1.5)), {
				x: MARGIN + indent + 25 * scale, y: y + 3, font: nameFont, size: fontSize, color: INK
			});

			// --- Bar ---
			const dStart = daysBetween(minDate, t.startDate);
			const dEnd = daysBetween(minDate, t.endDate);
			const barX = timeX + (dStart / totalDays) * timelineWidth;
			const barW = Math.max(((dEnd - dStart + 1) / totalDays) * timelineWidth, 3);
			const barH = ROW_HEIGHT * 0.6;
			const barY = y + 1;

			const barColor = t.color ? hexToRgb(t.color) : rgb(0.23, 0.42, 0.77);

			// Summary bar (depth 0) — thin line
			if (t.depth === 0) {
				page.drawRectangle({ x: barX, y: barY + barH * 0.35, width: barW, height: barH * 0.3, color: barColor });
				// Diamond start/end
				page.drawRectangle({ x: barX - 2, y: barY + barH * 0.2, width: 4, height: barH * 0.6, color: barColor });
				page.drawRectangle({ x: barX + barW - 2, y: barY + barH * 0.2, width: 4, height: barH * 0.6, color: barColor });
			} else {
				// Normal bar
				page.drawRectangle({ x: barX, y: barY, width: barW, height: barH, color: barColor });
				// Progress overlay
				if (t.progressPct > 0) {
					page.drawRectangle({
						x: barX, y: barY, width: barW * (t.progressPct / 100), height: barH,
						color: rgb(0, 0, 0), opacity: 0.15
					});
				}
			}
		}

		// --- Today line ---
		const today = new Date().toISOString().slice(0, 10);
		if (today >= minDate && today <= maxDate) {
			const todayX = timeX + (daysBetween(minDate, today) / totalDays) * timelineWidth;
			page.drawLine({
				start: { x: todayX, y: bodyTop - 12 * scale },
				end: { x: todayX, y: bodyTop - bodyHeight },
				thickness: 1.5, color: RED
			});
			page.drawText('HEUTE', { x: todayX + 2, y: bodyTop - 12 * scale, font: fontBold, size: 5 * scale, color: RED });
		}

		// --- Footer ---
		page.drawText(`${input.projectName} · Seite ${pageIdx + 1}/${pages.length}`, {
			x: MARGIN, y: MARGIN / 2, font, size: 5 * scale, color: MUTED
		});
	}

	const bytes = await doc.save();
	const blob = new Blob([bytes as unknown as ArrayBuffer], { type: 'application/pdf' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `Bauzeitenplan_${input.projectName.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_')}_${input.format}.pdf`;
	a.click();
	URL.revokeObjectURL(url);
}
