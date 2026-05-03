import * as XLSX from 'xlsx';

export type DefectExportRow = {
	shortId: string | null;
	externalId?: string | null;
	title: string;
	description?: string | null;
	status: string;
	priority: number;
	gewerkName?: string | null;
	contactCompany?: string | null;
	contactName?: string | null;
	deadline?: string | null;
	cost?: string | number | null;
	apartmentLabel?: string | null;
	createdAt: Date | string;
};

const HEADER_MAP: Record<string, string> = {
	shortId: 'Mangel-Nr.',
	externalId: 'Ext. Nr.',
	title: 'Titel',
	description: 'Beschreibung',
	status: 'Status',
	priority: 'Priorität',
	gewerkName: 'Gewerk',
	contactCompany: 'Firma',
	contactName: 'Ansprechpartner',
	deadline: 'Frist',
	cost: 'Kosten (EUR)',
	apartmentLabel: 'Wohnung/Haus',
	createdAt: 'Erstellt am'
};

const PRIO_LABELS: Record<number, string> = { 1: 'Hoch', 2: 'Normal', 3: 'Niedrig' };
const STATUS_LABELS: Record<string, string> = {
	open: 'Offen',
	sent: 'Gesendet',
	acknowledged: 'Bestätigt',
	resolved: 'Erledigt',
	accepted: 'Akzeptiert',
	rejected: 'Abgelehnt',
	reopened: 'Wiedereröffnet'
};

export function exportDefectsToExcel(rows: DefectExportRow[], projectName: string): void {
	const data = rows.map((r) => ({
		[HEADER_MAP.shortId]: r.shortId ?? '',
		[HEADER_MAP.externalId]: r.externalId ?? '',
		[HEADER_MAP.title]: r.title,
		[HEADER_MAP.description]: r.description ?? '',
		[HEADER_MAP.status]: STATUS_LABELS[r.status] ?? r.status,
		[HEADER_MAP.priority]: PRIO_LABELS[r.priority] ?? r.priority,
		[HEADER_MAP.gewerkName]: r.gewerkName ?? '',
		[HEADER_MAP.contactCompany]: r.contactCompany ?? '',
		[HEADER_MAP.contactName]: r.contactName ?? '',
		[HEADER_MAP.deadline]: r.deadline ?? '',
		[HEADER_MAP.cost]: r.cost != null ? Number(r.cost) : '',
		[HEADER_MAP.apartmentLabel]: r.apartmentLabel ?? '',
		[HEADER_MAP.createdAt]: r.createdAt instanceof Date
			? r.createdAt.toLocaleDateString('de-DE')
			: new Date(r.createdAt).toLocaleDateString('de-DE')
	}));

	const ws = XLSX.utils.json_to_sheet(data);

	// Auto-width columns
	const colWidths = Object.values(HEADER_MAP).map((h) => {
		const maxLen = Math.max(
			h.length,
			...data.map((row) => String(row[h as keyof typeof row] ?? '').length)
		);
		return { wch: Math.min(maxLen + 2, 50) };
	});
	ws['!cols'] = colWidths;

	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Mängel');
	XLSX.writeFile(wb, `${projectName.replace(/[^a-zA-Z0-9äöüÄÖÜß _-]/g, '')}_Maengel.xlsx`);
}

export function generateImportTemplate(): void {
	const headers = ['Titel', 'Beschreibung', 'Gewerk', 'Firma', 'Frist (JJJJ-MM-TT)', 'Priorität (Hoch/Normal/Niedrig)', 'Kosten (EUR)', 'Ext. Nr.'];
	const example = ['Riss in Wand EG', 'Riss ca. 50cm am Fenster links', 'Trockenbau', 'Müller GmbH', '2026-06-30', 'Hoch', '500', 'EXT-001'];

	const ws = XLSX.utils.aoa_to_sheet([headers, example]);
	ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 20) }));

	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Mangel-Import');
	XLSX.writeFile(wb, 'Mangel_Import_Vorlage.xlsx');
}

const PRIO_REVERSE: Record<string, number> = { hoch: 1, normal: 2, niedrig: 3 };

export type ParsedImportRow = {
	title: string;
	description?: string;
	gewerkName?: string;
	company?: string;
	deadline?: string;
	priority: number;
	cost?: number;
	externalId?: string;
};

export function parseImportExcel(file: ArrayBuffer): ParsedImportRow[] {
	const wb = XLSX.read(file, { type: 'array' });
	const ws = wb.Sheets[wb.SheetNames[0]];
	if (!ws) throw new Error('Keine Tabelle gefunden.');

	const raw = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
	const rows: ParsedImportRow[] = [];

	for (const r of raw) {
		const title = (r['Titel'] ?? '').trim();
		if (!title) continue;

		const prioStr = (r['Priorität (Hoch/Normal/Niedrig)'] ?? r['Priorität'] ?? 'Normal').toLowerCase().trim();
		const costStr = r['Kosten (EUR)'] ?? r['Kosten'] ?? '';
		const deadlineStr = r['Frist (JJJJ-MM-TT)'] ?? r['Frist'] ?? '';

		rows.push({
			title: title.slice(0, 160),
			description: (r['Beschreibung'] ?? '').trim() || undefined,
			gewerkName: (r['Gewerk'] ?? '').trim() || undefined,
			company: (r['Firma'] ?? '').trim() || undefined,
			deadline: /^\d{4}-\d{2}-\d{2}$/.test(deadlineStr) ? deadlineStr : undefined,
			priority: PRIO_REVERSE[prioStr] ?? 2,
			cost: costStr ? parseFloat(costStr) || undefined : undefined,
			externalId: (r['Ext. Nr.'] ?? r['Ext. Nummer'] ?? '').trim() || undefined
		});
	}

	return rows;
}
