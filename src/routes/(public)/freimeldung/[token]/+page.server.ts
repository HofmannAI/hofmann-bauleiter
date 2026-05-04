import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { freimeldungTokens, tasks, projects } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	if (!db) return { token: null, task: null, project: null, error: 'DB nicht verfügbar.' };

	const [row] = await db
		.select()
		.from(freimeldungTokens)
		.where(eq(freimeldungTokens.token, params.token))
		.limit(1);

	if (!row) return { token: null, task: null, project: null, error: 'Ungültiger oder abgelaufener Link.' };

	if (row.status === 'completed') {
		return {
			token: row,
			task: null,
			project: null,
			error: `Bereits freigemeldet am ${row.completedAt?.toLocaleDateString('de-DE') ?? '—'} von ${row.completedByName ?? 'unbekannt'}.`
		};
	}

	if (row.expiresAt < new Date()) {
		return { token: row, task: null, project: null, error: 'Link ist abgelaufen.' };
	}

	const [task] = await db.select({ name: tasks.name, startDate: tasks.startDate, endDate: tasks.endDate }).from(tasks).where(eq(tasks.id, row.taskId)).limit(1);
	const [project] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, row.projectId)).limit(1);

	return { token: row, task, project, error: null };
};

export const actions: Actions = {
	submit: async ({ request, params }) => {
		if (!db) return fail(500);
		const fd = Object.fromEntries(await request.formData());
		const name = String(fd.name ?? '').trim();
		const note = String(fd.note ?? '').trim();

		if (!name) return fail(400, { error: 'Bitte Namen eingeben.' });

		const [row] = await db
			.select()
			.from(freimeldungTokens)
			.where(eq(freimeldungTokens.token, params.token))
			.limit(1);

		if (!row || row.status !== 'pending') return fail(400, { error: 'Link ungültig oder bereits verwendet.' });

		await db
			.update(freimeldungTokens)
			.set({
				status: 'completed',
				completedAt: new Date(),
				completedByName: name,
				completedNote: note || null
			})
			.where(eq(freimeldungTokens.id, row.id));

		return { ok: true };
	}
};
