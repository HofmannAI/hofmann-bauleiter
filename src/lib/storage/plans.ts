/**
 * Upload PDF plan to Supabase Storage at plans/<projectId>/<planId>.pdf
 * and report back the public path.
 */
import { getSupabaseBrowser } from '$lib/auth/supabase-browser';

export async function uploadPlanPdf(projectId: string, file: File): Promise<{ path: string; pageCount: number }> {
  const sb = getSupabaseBrowser();
  const planId = crypto.randomUUID();
  const path = `${projectId}/${planId}.pdf`;
  const { error } = await sb.storage.from('plans').upload(path, file, { contentType: 'application/pdf', upsert: false });
  if (error) throw error;

  // Get page count via PDF.js (lazy import — heavy)
  let pageCount = 1;
  try {
    const buf = await file.arrayBuffer();
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url').then((m) => m.default);
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    pageCount = doc.numPages;
  } catch (e) {
    console.warn('[plans] could not read page count:', e);
  }
  return { path, pageCount };
}
