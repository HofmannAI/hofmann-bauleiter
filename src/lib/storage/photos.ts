/**
 * Browser-side photo helpers: compress + upload to Supabase Storage.
 * Compression: max 1600px (long edge), JPEG quality 0.78 — same as prototype.
 */
import { getSupabaseBrowser } from '$lib/auth/supabase-browser';

const MAX_DIM = 1600;
const QUALITY = 0.78;

export async function compressImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', QUALITY);
  });
  return { blob, width: w, height: h };
}

export async function uploadChecklistPhoto(
  projectId: string,
  progressId: string,
  file: File
): Promise<{ path: string; width: number; height: number }> {
  const { blob, width, height } = await compressImage(file);
  const sb = getSupabaseBrowser();
  const photoId = crypto.randomUUID();
  const path = `${projectId}/${progressId}/${photoId}.jpg`;

  const { error } = await sb.storage.from('checklist-photos').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false
  });
  if (error) throw error;
  return { path, width, height };
}

export async function uploadDefectPhoto(projectId: string, defectId: string, file: File) {
  const { blob, width, height } = await compressImage(file);
  const sb = getSupabaseBrowser();
  const photoId = crypto.randomUUID();
  const path = `${projectId}/${defectId}/${photoId}.jpg`;
  const { error } = await sb.storage.from('defect-photos').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false
  });
  if (error) throw error;
  return { path, width, height };
}

export async function getSignedUrl(bucket: string, path: string, expiresIn = 300): Promise<string | null> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}
