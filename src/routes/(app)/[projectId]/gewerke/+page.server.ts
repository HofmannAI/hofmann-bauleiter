import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import {
	gewerke, tasks, defects, houses, apartments,
	gewerkChecklistTemplates, gewerkChecklistProgress, activity,
	contacts
} from '$lib/db/schema';
import { eq, and, asc, sql, inArray, not } from 'drizzle-orm';

/**
 * Gewerke-Hub: Shows current gewerke (from "Next" window) with their
 * schedule tasks, open defects, and checklist progress.
 */
export const load: PageServerLoad = async ({ params }) => {
	if (!db) return { gewerkeData: [], allGewerke: [], allContacts: [] };

	const today = new Date().toISOString().slice(0, 10);
	const windowStart = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
	const windowEnd = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);

	// 1) Load all tasks in the "Next" window
	const allTasks = await db
		.select()
		.from(tasks)
		.where(eq(tasks.projectId, params.projectId))
		.orderBy(asc(tasks.sortOrder));

	const nextTasks = allTasks.filter(
		(t) => t.startDate <= windowEnd && t.endDate >= windowStart && t.gewerkId
	);

	// 2) Unique gewerk IDs in the window
	const nextGewerkIds = [...new Set(nextTasks.map((t) => t.gewerkId!))];

	// 3) Load gewerke metadata
	const allGewerke = await db.select().from(gewerke).orderBy(asc(gewerke.sortOrder));
	const nextGewerke = allGewerke.filter((g) => nextGewerkIds.includes(g.id));

	// 4) Load open defects per gewerk
	const openDefects = await db
		.select({
			id: defects.id,
			shortId: defects.shortId,
			title: defects.title,
			status: defects.status,
			priority: defects.priority,
			deadline: defects.deadline,
			gewerkId: defects.gewerkId,
			taskId: defects.taskId,
			apartmentId: defects.apartmentId
		})
		.from(defects)
		.where(
			and(
				eq(defects.projectId, params.projectId),
				not(inArray(defects.status, ['resolved', 'accepted', 'rejected']))
			)
		)
		.orderBy(asc(defects.priority));

	// 5) Load gewerk-checklisten templates + progress
	const [allTemplates, allProgress] = await Promise.all([
		db.select().from(gewerkChecklistTemplates).orderBy(asc(gewerkChecklistTemplates.sortOrder)),
		db.select().from(gewerkChecklistProgress).where(eq(gewerkChecklistProgress.projectId, params.projectId))
	]);

	// 6) Load structure (houses + apartments) for labels
	const houseRows = await db.select().from(houses).where(eq(houses.projectId, params.projectId)).orderBy(asc(houses.sortOrder));
	const aptList: { id: string; name: string; houseName: string; houseId: string }[] = [];
	for (const h of houseRows) {
		const apts = await db.select().from(apartments).where(eq(apartments.houseId, h.id)).orderBy(asc(apartments.sortOrder));
		apts.forEach((a) => aptList.push({ id: a.id, name: a.name, houseName: h.name, houseId: h.id }));
	}

	// 7) Load contacts for gewerk-matching
	const allContacts = await db
		.select({ id: contacts.id, company: contacts.company, contactName: contacts.contactName, gewerkId: contacts.gewerkId })
		.from(contacts)
		.where(sql`${contacts.projectId} = ${params.projectId} OR ${contacts.projectId} IS NULL`);

	// 8) Build per-gewerk data
	const progressMap = new Map<string, boolean>();
	for (const p of allProgress) {
		progressMap.set(`${p.gewerkId}|${p.apartmentId}|${p.templateId}`, p.done);
	}

	const gewerkeData = nextGewerke.map((g) => {
		const gTasks = nextTasks
			.filter((t) => t.gewerkId === g.id)
			.map((t) => ({
				id: t.id,
				name: t.name,
				num: t.num,
				startDate: t.startDate,
				endDate: t.endDate,
				progressPct: t.progressPct ?? 0,
				actualStartDate: t.actualStartDate,
				actualEndDate: t.actualEndDate,
				depth: t.depth ?? 0
			}));

		const gDefects = openDefects
			.filter((d) => d.gewerkId === g.id)
			.map((d) => ({
				id: d.id,
				shortId: d.shortId,
				title: d.title,
				status: d.status,
				priority: d.priority,
				deadline: d.deadline,
				apartmentId: d.apartmentId
			}));

		const gTemplates = allTemplates.filter((t) => t.gewerkId === g.id);
		const gContact = allContacts.find((c) => c.gewerkId === g.id);

		// Checklist summary per apartment
		const checklistSummary = aptList.map((apt) => {
			const total = gTemplates.length;
			let done = 0;
			for (const tpl of gTemplates) {
				if (progressMap.get(`${g.id}|${apt.id}|${tpl.id}`)) done++;
			}
			return { aptId: apt.id, aptName: apt.name, houseName: apt.houseName, total, done };
		}).filter((s) => s.total > 0);

		return {
			id: g.id,
			name: g.name,
			color: g.color,
			sortOrder: g.sortOrder,
			contact: gContact ? { company: gContact.company, name: gContact.contactName } : null,
			tasks: gTasks,
			defects: gDefects,
			defectTotal: openDefects.filter((d) => d.gewerkId === g.id).length,
			templates: gTemplates.map((t) => ({ id: t.id, item: t.item, requiresPhoto: t.requiresPhoto })),
			checklistSummary,
			checklistTotalDone: checklistSummary.reduce((s, a) => s + a.done, 0),
			checklistTotalItems: checklistSummary.reduce((s, a) => s + a.total, 0)
		};
	});

	return { gewerkeData, allGewerke, apartments: aptList, allContacts, today };
};

// --- Actions ---

const updateTaskDatesSchema = z.object({
	taskId: z.string().uuid(),
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

const quickDefectSchema = z.object({
	title: z.string().min(1).max(160),
	gewerkId: z.string().uuid(),
	priority: z.coerce.number().int().min(1).max(3).default(2)
});

const checklistSetSchema = z.object({
	gewerkId: z.string().uuid(),
	apartmentId: z.string().uuid(),
	templateId: z.string().uuid(),
	done: z.enum(['true', 'false']).transform((v) => v === 'true')
});

/**
 * Map task names to gewerk names. Case-insensitive substring match.
 * More specific matches first (longer patterns take priority).
 */
const TASK_GEWERK_MAP: [RegExp, string][] = [
	// Specific matches first
	[/abdichtung/i, 'Abdichtung'],
	[/flaschner|falschner|fallroh/i, 'Flaschner'],
	[/innenputz|außenputz|putz.*treppe|treppenwangen.*putz/i, 'Putzer'],
	[/fußbodenheizung|heizschleifen/i, 'Fußbodenheizung'],
	[/bauendreinigung|reinigung/i, 'Reinigung'],
	[/steigleitung/i, 'Steigleitungen'],
	[/toreinbau/i, 'Toreinbau'],
	[/haustür/i, 'Haustüren'],
	[/treppengeländer|treppenstufe|treppenhaus.*belag|podest/i, 'Treppenhaus'],
	[/maler|anstrich|lackier/i, 'Maler'],
	[/elektro|steckdose|schalter|lüfter.*einbau|elektrodose/i, 'Elektro'],
	[/sanitär|heizung.*fertig|heizung.*sanitär/i, 'Sanitär/Heizung'],
	[/inbetriebnahme.*heizung/i, 'Sanitär/Heizung'],
	[/trockenbau|beplank|spachtel|ständer/i, 'Trockenbau'],
	[/fliesen/i, 'Fliesenleger'],
	[/estrich/i, 'Estrich'],
	[/parkett/i, 'Parkett'],
	[/türzarg|türblät|türen/i, 'Türen'],
	[/stahltür/i, 'Türen'],
	[/aufzug/i, 'Aufzug'],
	[/fenster/i, 'Fenster'],
	[/flachdach|dachbegrünung|abschweißen.*dach/i, 'Flachdach'],
	[/dämmung|fußbodendämmung/i, 'Dämmung'],
	[/gerüst/i, 'Gerüstbau'],
	[/rohbau|beton|schal|verzug.*rohbau/i, 'Rohbau'],
	[/tiefbau|aushub|drainage|schotter|tragschicht/i, 'Tiefbau'],
	[/pflaster/i, 'Pflasterarbeiten'],
	[/grünanlagen|garten/i, 'Gärtner'],
	[/außenanlagen|briefkasten|traufstreifen/i, 'Außenanlagen'],
	[/lüfterabdeckung|balkongeländer|balkonbelag/i, 'Schlosser'],
	[/wanddurchdringung|deckendurchbruch|UG.*beschicht|abstellräume|rinnenkörper|badewanne|rinnen/i, 'Rohbau'],
];

function matchTaskToGewerk(taskName: string): string | null {
	for (const [pattern, gewerk] of TASK_GEWERK_MAP) {
		if (pattern.test(taskName)) return gewerk;
	}
	return null;
}

export const actions: Actions = {
	reassignGewerke: async ({ params, locals }) => {
		if (!locals.user || !db) return fail(401);

		const allGewerke = await db.select().from(gewerke);
		const gewerkByName = new Map(allGewerke.map((g) => [g.name.toLowerCase(), g.id]));

		const allTasks = await db
			.select({ id: tasks.id, name: tasks.name, depth: tasks.depth })
			.from(tasks)
			.where(eq(tasks.projectId, params.projectId));

		let updated = 0;
		for (const t of allTasks) {
			if (t.depth === 0) continue; // Skip parent/summary tasks
			const gewerkName = matchTaskToGewerk(t.name);
			if (!gewerkName) continue;
			const gewerkId = gewerkByName.get(gewerkName.toLowerCase());
			if (!gewerkId) continue;

			await db.update(tasks)
				.set({ gewerkId, updatedAt: new Date() })
				.where(eq(tasks.id, t.id));
			updated++;
		}

		return { ok: true, updated };
	},

	updateTaskDates: async ({ request, params, locals }) => {
		if (!locals.user || !db) return fail(401);
		const fd = Object.fromEntries(await request.formData());
		const parsed = updateTaskDatesSchema.safeParse(fd);
		if (!parsed.success) return fail(400);

		await db
			.update(tasks)
			.set({
				startDate: parsed.data.startDate,
				endDate: parsed.data.endDate,
				updatedAt: new Date()
			})
			.where(and(eq(tasks.id, parsed.data.taskId), eq(tasks.projectId, params.projectId)));

		return { ok: true };
	},

	quickDefect: async ({ request, params, locals }) => {
		if (!locals.user || !db) return fail(401);
		const fd = Object.fromEntries(await request.formData());
		const parsed = quickDefectSchema.safeParse(fd);
		if (!parsed.success) return fail(400, { error: 'Titel fehlt.' });

		const { createDefect } = await import('$lib/db/defectQueries');
		await createDefect({
			projectId: params.projectId,
			title: parsed.data.title,
			gewerkId: parsed.data.gewerkId,
			priority: parsed.data.priority,
			createdBy: locals.user.id
		});

		return { ok: true };
	},

	checklistSet: async ({ request, params, locals }) => {
		if (!locals.user || !db) return fail(401);
		const fd = Object.fromEntries(await request.formData());
		const parsed = checklistSetSchema.safeParse(fd);
		if (!parsed.success) return fail(400);

		const existing = await db
			.select()
			.from(gewerkChecklistProgress)
			.where(
				and(
					eq(gewerkChecklistProgress.projectId, params.projectId),
					eq(gewerkChecklistProgress.gewerkId, parsed.data.gewerkId),
					eq(gewerkChecklistProgress.apartmentId, parsed.data.apartmentId),
					eq(gewerkChecklistProgress.templateId, parsed.data.templateId)
				)
			)
			.limit(1);

		const today = new Date().toISOString().slice(0, 10);
		if (existing.length === 0) {
			await db.insert(gewerkChecklistProgress).values({
				projectId: params.projectId,
				gewerkId: parsed.data.gewerkId,
				apartmentId: parsed.data.apartmentId,
				templateId: parsed.data.templateId,
				done: parsed.data.done,
				doneDate: parsed.data.done ? today : null,
				doneBy: parsed.data.done ? locals.user.id : null
			});
		} else {
			await db
				.update(gewerkChecklistProgress)
				.set({
					done: parsed.data.done,
					doneDate: parsed.data.done ? today : null,
					doneBy: parsed.data.done ? locals.user.id : null,
					updatedAt: new Date()
				})
				.where(eq(gewerkChecklistProgress.id, existing[0].id));
		}

		return { ok: true };
	}
};
