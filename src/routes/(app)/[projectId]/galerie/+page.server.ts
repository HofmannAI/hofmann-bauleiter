import type { PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import {
	defectPhotos, defects, taskPhotos, tasks, checklistPhotos, checklistProgress,
	gewerke, houses, apartments
} from '$lib/db/schema';
import { eq, asc, desc, sql } from 'drizzle-orm';

export type GalleryPhoto = {
	id: string;
	storagePath: string;
	source: 'defect' | 'task' | 'checklist';
	sourceId: string;
	sourceLabel: string;
	gewerkName: string | null;
	gewerkColor: string | null;
	houseName: string | null;
	apartmentName: string | null;
	createdAt: Date;
};

export const load: PageServerLoad = async ({ params }) => {
	if (!db) return { photos: [] as GalleryPhoto[] };

	// Load all three photo types in parallel
	const [dPhotos, tPhotos, cPhotos] = await Promise.all([
		db
			.select({
				id: defectPhotos.id,
				storagePath: defectPhotos.storagePath,
				createdAt: defectPhotos.createdAt,
				defectId: defects.id,
				defectShortId: defects.shortId,
				defectTitle: defects.title,
				gewerkName: gewerke.name,
				gewerkColor: gewerke.color,
				apartmentId: defects.apartmentId
			})
			.from(defectPhotos)
			.innerJoin(defects, eq(defects.id, defectPhotos.defectId))
			.leftJoin(gewerke, eq(gewerke.id, defects.gewerkId))
			.where(eq(defects.projectId, params.projectId))
			.orderBy(desc(defectPhotos.createdAt)),
		db
			.select({
				id: taskPhotos.id,
				storagePath: taskPhotos.storagePath,
				createdAt: taskPhotos.createdAt,
				taskId: tasks.id,
				taskName: tasks.name,
				gewerkName: gewerke.name,
				gewerkColor: gewerke.color
			})
			.from(taskPhotos)
			.innerJoin(tasks, eq(tasks.id, taskPhotos.taskId))
			.leftJoin(gewerke, eq(gewerke.id, tasks.gewerkId))
			.where(eq(tasks.projectId, params.projectId))
			.orderBy(desc(taskPhotos.createdAt)),
		db
			.select({
				id: checklistPhotos.id,
				storagePath: checklistPhotos.storagePath,
				createdAt: checklistPhotos.createdAt,
				progressId: checklistProgress.id,
				scopeKey: checklistProgress.scopeKey
			})
			.from(checklistPhotos)
			.innerJoin(checklistProgress, eq(checklistProgress.id, checklistPhotos.progressId))
			.where(eq(checklistProgress.projectId, params.projectId))
			.orderBy(desc(checklistPhotos.createdAt))
	]);

	// Load structure for apartment labels
	const houseRows = await db.select().from(houses).where(eq(houses.projectId, params.projectId));
	const aptMap = new Map<string, { name: string; houseName: string }>();
	for (const h of houseRows) {
		const apts = await db.select().from(apartments).where(eq(apartments.houseId, h.id));
		for (const a of apts) aptMap.set(a.id, { name: a.name, houseName: h.name });
	}

	const photos: GalleryPhoto[] = [];

	for (const p of dPhotos) {
		const apt = p.apartmentId ? aptMap.get(p.apartmentId) : null;
		photos.push({
			id: p.id,
			storagePath: p.storagePath,
			source: 'defect',
			sourceId: p.defectId,
			sourceLabel: `${p.defectShortId ?? ''} ${p.defectTitle ?? ''}`.trim(),
			gewerkName: p.gewerkName,
			gewerkColor: p.gewerkColor,
			houseName: apt?.houseName ?? null,
			apartmentName: apt?.name ?? null,
			createdAt: p.createdAt
		});
	}

	for (const p of tPhotos) {
		photos.push({
			id: p.id,
			storagePath: p.storagePath,
			source: 'task',
			sourceId: p.taskId,
			sourceLabel: p.taskName ?? '',
			gewerkName: p.gewerkName,
			gewerkColor: p.gewerkColor,
			houseName: null,
			apartmentName: null,
			createdAt: p.createdAt
		});
	}

	for (const p of cPhotos) {
		photos.push({
			id: p.id,
			storagePath: p.storagePath,
			source: 'checklist',
			sourceId: p.progressId,
			sourceLabel: `Checkliste`,
			gewerkName: null,
			gewerkColor: null,
			houseName: null,
			apartmentName: null,
			createdAt: p.createdAt
		});
	}

	// Sort by date descending
	photos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

	return { photos };
};
