// גלריית תוצרי תרגיל 1 (קורס יישום): לוגיקה ללא תלות ב-Netlify. מקבלת store עם
// get / getWithMetadata / set / setJSON / delete, ונבדקת מקומית מול store בזיכרון.
//
// מפתחות באחסון:
//   index        -> [{ id, name, caption, ts, w, h, owner }]   אינדקס אחד לרשימה (קריאה אחת בכל רענון)
//   full/<id>    -> JPEG בגודל מלא
//   thumb/<id>   -> JPEG ממוזער

const ID_RE = /^[a-f0-9]{12}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{16,80}$/;
export const LIMITS = { fullBytes: 4200000, thumbBytes: 500000, pdfBytes: 4000000, pdfSlotBytes: 10000000, chunkBytes: 4000000, maxChunks: 3, maxItems: 400, perToken: 3, maxDim: 12000 };

const json = (status, body) => ({ status, body });

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function sameSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export function cleanText(s, min, max) {
  const t = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length >= min && t.length <= max ? t : null;
}
// JPEG אמיתי: מתחיל ב-FF D8 FF ומסתיים ב-FF D9
export function isJpeg(bytes) {
  return bytes && bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
}
// PDF אמיתי: מתחיל ב-%PDF- ומסתיים ב-%%EOF (בקילובייט האחרון)
export function isPdf(bytes) {
  if (!bytes || bytes.length < 16) return false;
  const head = String.fromCharCode(...bytes.slice(0, 5));
  const tail = new TextDecoder('latin1').decode(bytes.slice(Math.max(0, bytes.length - 1100)));
  return head === '%PDF-' && tail.includes('%%EOF');
}
const newId = () => [...crypto.getRandomValues(new Uint8Array(6))].map((b) => b.toString(16).padStart(2, '0')).join('');

// עדכון אטומי של האינדקס (בדיקת etag, עם ניסיונות חוזרים כששני סטודנטים מעלים יחד)
async function updateIndex(store, fn) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const cur = await store.getWithMetadata('index', { type: 'json' });
    const list = cur && Array.isArray(cur.data) ? cur.data : [];
    const next = fn(list.slice());
    if (next === null) return { ok: false };
    const r = cur
      ? await store.setJSON('index', next, { onlyIfMatch: cur.etag })
      : await store.setJSON('index', next, { onlyIfNew: true });
    if (r.modified) return { ok: true, list: next };
  }
  return { ok: false, conflict: true };
}

const publicItem = (it, hash) => ({ id: it.id, name: it.name, caption: it.caption, ts: it.ts, w: it.w, h: it.h, pdf: !!it.pdf, slot: it.slot || null, mine: !!hash && it.owner === hash });

export async function listItems(store, token) {
  const hash = token && TOKEN_RE.test(token) ? await sha256(token) : null;
  const cur = await store.get('index', { type: 'json' });
  const list = Array.isArray(cur) ? cur : [];
  return json(200, { items: list.map((it) => publicItem(it, hash)).sort((a, b) => b.ts - a.ts) });
}

export async function getImage(store, id, size) {
  if (!ID_RE.test(String(id))) return json(404, { error: 'not-found' });
  const key = (size === 'thumb' ? 'thumb/' : size === 'pdf' ? 'pdf/' : 'full/') + id;
  const data = await store.get(key, { type: 'arrayBuffer' });
  if (!data) return json(404, { error: 'not-found' });
  return { status: 200, body: new Uint8Array(data), contentType: size === 'pdf' ? 'application/pdf' : 'image/jpeg' };
}

// בדיקות משותפות להעלאה ולקטעי קובץ: נעול / אחרי מועד / טוקן / קוד כיתה
function gate(up, env, now) {
  if (up.locked) return json(403, { error: 'notopen' }); // התרגיל עוד לא נפתח להעלאה
  if (up.deadline && now >= up.deadline) return json(403, { error: 'closed' }); // אחרי מועד ההגשה
  if (!up.token || !TOKEN_RE.test(up.token)) return json(400, { error: 'token' });
  if (env.CLASS_CODE && !sameSecret(String(up.code || ''), String(env.CLASS_CODE))) return json(403, { error: 'code' });
  return null;
}

// קובץ גדול (עד 10MB) מועלה בקטעים של עד 4MB, כי בקשה אחת מוגבלת ל-6MB. הקטעים נשמרים זמנית.
const UID_RE = /^[a-f0-9]{16}$/;
const chunkKey = async (token, uid, i) => 'tmp/' + (await sha256(token)).slice(0, 16) + '/' + uid + '/' + i;
export async function putChunk(store, up, env = {}, now = Date.now()) {
  const bad = gate(up, env, now);
  if (bad) return bad;
  const i = Number(up.idx);
  if (!UID_RE.test(String(up.uid)) || !Number.isInteger(i) || i < 0 || i >= LIMITS.maxChunks) return json(400, { error: 'chunk' });
  if (!up.data || !up.data.length || up.data.length > LIMITS.chunkBytes) return json(413, { error: 'size' });
  await store.set(await chunkKey(up.token, up.uid, i), up.data.buffer.slice(up.data.byteOffset, up.data.byteOffset + up.data.byteLength));
  return json(200, { ok: true });
}
async function takeChunks(store, token, uid, total) {
  const n = Number(total);
  if (!UID_RE.test(String(uid)) || !Number.isInteger(n) || n < 1 || n > LIMITS.maxChunks) return null;
  const parts = [];
  for (let i = 0; i < n; i++) {
    const d = await store.get(await chunkKey(token, uid, i), { type: 'arrayBuffer' });
    if (!d) return null;
    parts.push(new Uint8Array(d));
  }
  const out = new Uint8Array(parts.reduce((a, b) => a + b.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  for (let i = 0; i < n; i++) await store.delete(await chunkKey(token, uid, i));
  return out;
}

// upload: { token, name, caption, w, h, code, full, thumb, pdf?, pdfUid?, pdfParts?, slot?, slots?, deadline?: ms }
// slots: רשימת מזהי סעיפים של התרגיל (למשל ['plan','scheme']). אם קיימת, כל סטודנט מעלה סעיף אחד מכל סוג, וההעלאה מחליפה את הקודמת.
export async function upload(store, up, env = {}, now = Date.now()) {
  const bad = gate(up, env, now);
  if (bad) return bad;
  const slots = Array.isArray(up.slots) && up.slots.length ? up.slots : null;
  const slot = slots ? String(up.slot || '') : null;
  if (slots && !slots.includes(slot)) return json(400, { error: 'slot' });
  if (slots && !up.pdf && up.pdfUid) {
    up.pdf = await takeChunks(store, up.token, up.pdfUid, up.pdfParts);
    if (!up.pdf) return json(400, { error: 'chunk' });
  }
  const name = cleanText(up.name, 2, 80);
  if (!name) return json(400, { error: 'name' });
  const caption = up.caption ? cleanText(up.caption, 0, 120) : '';
  if (caption === null) return json(400, { error: 'caption' });
  if (!isJpeg(up.full) || !isJpeg(up.thumb)) return json(400, { error: 'type' });
  if (up.full.length > LIMITS.fullBytes || up.thumb.length > LIMITS.thumbBytes) return json(413, { error: 'size' });
  // קובץ PDF מקורי (לא חובה): התמונה היא העמוד הראשון שלו, והוא נשמר להורדה
  const hasPdf = !!(up.pdf && up.pdf.length);
  if (hasPdf && !isPdf(up.pdf)) return json(400, { error: 'pdf' });
  if (hasPdf && up.pdf.length > (slots ? LIMITS.pdfSlotBytes : LIMITS.pdfBytes)) return json(413, { error: 'pdf-size' });
  const w = Math.round(Number(up.w)), h = Math.round(Number(up.h));
  if (!(w > 0 && h > 0 && w <= LIMITS.maxDim && h <= LIMITS.maxDim)) return json(400, { error: 'dimensions' });

  const hash = await sha256(up.token);
  const id = newId();
  // קודם הקבצים, ורק אחר כך האינדקס: תמונה שלא נכנסה לאינדקס לא תוצג, ותנוקה
  await store.set('full/' + id, up.full.buffer.slice(up.full.byteOffset, up.full.byteOffset + up.full.byteLength));
  await store.set('thumb/' + id, up.thumb.buffer.slice(up.thumb.byteOffset, up.thumb.byteOffset + up.thumb.byteLength));
  if (hasPdf) await store.set('pdf/' + id, up.pdf.buffer.slice(up.pdf.byteOffset, up.pdf.byteOffset + up.pdf.byteLength));
  let reason = null, replaced = [];
  const r = await updateIndex(store, (list) => {
    reason = null; replaced = [];
    if (slots) { // החלפה: הסעיף הקודם של אותו סטודנט יוצא מהאינדקס
      replaced = list.filter((x) => x.owner === hash && x.slot === slot);
      list = list.filter((x) => !(x.owner === hash && x.slot === slot));
    }
    if (list.length >= LIMITS.maxItems) { reason = 'full'; return null; }
    if (!slots && list.filter((x) => x.owner === hash).length >= LIMITS.perToken) { reason = 'limit'; return null; }
    list.push({ id, name, caption, ts: now, w, h, owner: hash, pdf: hasPdf, ...(slots ? { slot } : {}) });
    return list;
  });
  if (!r.ok) {
    await store.delete('full/' + id); await store.delete('thumb/' + id); await store.delete('pdf/' + id);
    if (reason === 'full') return json(429, { error: 'full' });
    if (reason === 'limit') return json(429, { error: 'limit' });
    return json(503, { error: 'busy' });
  }
  for (const o of replaced) { await store.delete('full/' + o.id); await store.delete('thumb/' + o.id); await store.delete('pdf/' + o.id); }
  return json(200, { ok: true, id });
}

async function removeItem(store, id, allowed) {
  if (!ID_RE.test(String(id))) return json(400, { error: 'id' });
  let found = false, denied = false;
  const r = await updateIndex(store, (list) => {
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return null;
    found = true;
    if (!allowed(list[i])) { denied = true; return null; }
    list.splice(i, 1);
    return list;
  });
  if (denied) return json(403, { error: 'not-owner' });
  if (!found) return json(200, { ok: true }); // כבר נמחק
  if (!r.ok) return json(503, { error: 'busy' });
  await store.delete('full/' + id); await store.delete('thumb/' + id); await store.delete('pdf/' + id);
  return json(200, { ok: true });
}

export async function deleteOwn(store, id, token) {
  if (!token || !TOKEN_RE.test(token)) return json(400, { error: 'token' });
  const hash = await sha256(token);
  return removeItem(store, id, (it) => it.owner === hash);
}

export async function deleteAdmin(store, id, adminKey, env = {}) {
  if (!env.ADMIN_KEY || !sameSecret(String(adminKey || ''), env.ADMIN_KEY)) return json(403, { error: 'admin' });
  return removeItem(store, id, () => true);
}
