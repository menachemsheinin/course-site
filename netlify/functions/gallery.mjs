// גלריית תוצרי התרגילים 1-5. כתובות: /api/gallery?ex=N (רשימה, העלאה, מחיקה) ו-/api/gallery/img/<id>/<full|thumb>?ex=N
import { getStore } from '@netlify/blobs';
import { listItems, getImage, upload, deleteOwn, deleteAdmin } from '../lib/gallery-core.mjs';

const EXERCISES = 5;
const MAX_REQUEST = 5500000; // מגבלת פונקציה סינכרונית של Netlify: 6MB לבקשה
const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: jsonHeaders });

// כל תרגיל שומר בנפרד: אותו אחסון, מפתחות עם קידומת ex1/, ex2/ ...
function scoped(store, prefix) {
  return {
    get: (k, o) => store.get(prefix + k, o),
    getWithMetadata: (k, o) => store.getWithMetadata(prefix + k, o),
    set: (k, d, o) => store.set(prefix + k, d, o),
    setJSON: (k, d, o) => store.setJSON(prefix + k, d, o),
    delete: (k) => store.delete(prefix + k),
  };
}
const exOf = (v) => { const n = Number(v == null || v === '' ? 1 : v); return Number.isInteger(n) && n >= 1 && n <= EXERCISES ? n : null; };

export default async (req) => {
  const env = { CLASS_CODE: process.env.CLASS_CODE || '', ADMIN_KEY: process.env.ADMIN_KEY || '' };
  const base = getStore({ name: 'exercise-gallery', consistency: 'strong' });
  const token = req.headers.get('x-token') || '';
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean); // ['api','gallery', ...]

  try {
    if (req.method === 'GET') {
      const ex = exOf(url.searchParams.get('ex'));
      if (!ex) return reply(400, { error: 'exercise' });
      const store = scoped(base, 'ex' + ex + '/');
      if (parts[2] === 'img') {
        const r = await getImage(store, parts[3], parts[4]);
        if (r.status !== 200) return reply(r.status, r.body);
        const isPdf = r.contentType === 'application/pdf';
        return new Response(r.body, {
          status: 200,
          headers: {
            'Content-Type': r.contentType, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff',
            'Content-Disposition': isPdf ? 'inline; filename="exercise.pdf"' : 'inline',
          },
        });
      }
      const r = await listItems(store, token);
      return reply(r.status, r.body);
    }

    if (req.method === 'POST') {
      if (Number(req.headers.get('content-length') || 0) > MAX_REQUEST) return reply(413, { error: 'size' });
      const type = req.headers.get('content-type') || '';

      if (type.includes('multipart/form-data')) {
        const fd = await req.formData();
        const ex = exOf(fd.get('ex'));
        if (!ex) return reply(400, { error: 'exercise' });
        const full = fd.get('full'), thumb = fd.get('thumb'), pdf = fd.get('pdf');
        if (!full || !thumb || typeof full === 'string' || typeof thumb === 'string') return reply(400, { error: 'type' });
        const r = await upload(scoped(base, 'ex' + ex + '/'), {
          token,
          name: fd.get('name'), caption: fd.get('caption'), w: fd.get('w'), h: fd.get('h'), code: fd.get('code'),
          full: new Uint8Array(await full.arrayBuffer()), thumb: new Uint8Array(await thumb.arrayBuffer()),
          pdf: pdf && typeof pdf !== 'string' ? new Uint8Array(await pdf.arrayBuffer()) : null,
        }, env);
        return reply(r.status, r.body);
      }

      if (type.includes('application/json')) {
        const text = await req.text();
        if (text.length > 2000) return reply(413, { error: 'size' });
        const b = JSON.parse(text);
        const ex = exOf(b.ex);
        if (!ex) return reply(400, { error: 'exercise' });
        const store = scoped(base, 'ex' + ex + '/');
        if (b.action === 'delete') { const r = await deleteOwn(store, b.id, token); return reply(r.status, r.body); }
        if (b.action === 'admin-delete') { const r = await deleteAdmin(store, b.id, b.adminKey, env); return reply(r.status, r.body); }
        return reply(400, { error: 'action' });
      }
      return reply(415, { error: 'content-type' });
    }
    return reply(405, { error: 'method' });
  } catch (e) {
    return reply(500, { error: 'server' });
  }
};

export const config = { path: ['/api/gallery', '/api/gallery/*'] };
