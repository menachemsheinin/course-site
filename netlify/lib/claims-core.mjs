// לוגיקת השיבוץ לנושאי הפרזנטציות (נושא + תאריך). ללא תלות ב-Netlify:
// מקבלת "store" עם get / setJSON / delete / list, ופונקציות getTopicIds / getSlots.
// נבדקת מקומית מול store בזיכרון, ובפרודקשן מקבלת את Netlify Blobs.
//
// מפתחות באחסון:
//   claims/<topicId>   -> { team, owner, ts, slot, seat }
//   seats/<slot>/<k>   -> { topicId, ts }       מקום k בתאריך slot (נוצר אטומית, מבטיח מקסימום לכל תאריך)
//   owners/<hash>      -> { topicId }           מה כל דפדפן תפס (שלשה אחת, נושא אחד)

const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{16,80}$/;
const MAX_CLAIMS = 300;
const STALE_MS = 30000;
const CLAIM = (id) => 'claims/' + id;
const OWNER = (hash) => 'owners/' + hash;
const SEAT = (slot, k) => 'seats/' + slot + '/' + k;

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

export function cleanNames(s) {
  const t = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length >= 2 && t.length <= 80 ? t : null;
}

// התאריך של "היום" בישראל, בפורמט YYYY-MM-DD
export const todayIL = (now) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date(now));

async function allClaims(store) {
  const { blobs } = await store.list({ prefix: 'claims/' });
  const entries = await Promise.all(blobs.map(async (b) => [b.key.slice('claims/'.length), await store.get(b.key, { type: 'json' })]));
  return entries.filter(([, v]) => v && typeof v === 'object');
}

// מקום שנשאר תפוס בלי שיבוץ אמיתי (נפילה באמצע פעולה) מתפנה אחרי חצי דקה
async function seatIsLive(store, slot, k, cur, now) {
  if (now - (cur.ts || 0) < STALE_MS) return true;
  const c = await store.get(CLAIM(cur.topicId), { type: 'json' });
  return !!c && c.slot === slot && c.seat === k;
}

// תופס מקום אחד מתוך cap בתאריך. קריאה אטומית: שני סטודנטים לא יקבלו אותו מקום
async function reserveSeat(store, slot, cap, topicId, now) {
  for (let k = 1; k <= cap; k++) {
    const key = SEAT(slot, k);
    let r = await store.setJSON(key, { topicId, ts: now }, { onlyIfNew: true });
    if (r.modified) return k;
    const cur = await store.get(key, { type: 'json' });
    if (cur && !(await seatIsLive(store, slot, k, cur, now))) {
      await store.delete(key);
      r = await store.setJSON(key, { topicId, ts: now }, { onlyIfNew: true });
      if (r.modified) return k;
    }
  }
  return 0;
}

async function freeSeat(store, slot, seat, topicId) {
  if (!slot || !seat) return;
  const cur = await store.get(SEAT(slot, seat), { type: 'json' });
  if (cur && cur.topicId === topicId) await store.delete(SEAT(slot, seat));
}

async function dropClaim(store, topicId, claim) {
  await store.delete(CLAIM(topicId));
  await freeSeat(store, claim.slot, claim.seat, topicId);
  if (claim.owner && claim.owner !== 'admin') {
    const idx = await store.get(OWNER(claim.owner), { type: 'json' });
    if (idx && idx.topicId === topicId) await store.delete(OWNER(claim.owner));
  }
}

// req: { method, body, token }  |  deps: { store, env, getTopicIds, getSlots, now }
export async function handle(req, deps) {
  const { store, env = {}, getTopicIds, getSlots, now = Date.now() } = deps;
  const hash = req.token && TOKEN_RE.test(req.token) ? await sha256(req.token) : null;

  if (req.method === 'GET') {
    const claims = {};
    for (const [id, c] of await allClaims(store)) {
      claims[id] = { team: c.team, ts: c.ts, slot: c.slot || null, mine: !!hash && c.owner === hash };
    }
    return json(200, { claims, codeRequired: !!env.CLASS_CODE, serverTime: now });
  }
  if (req.method !== 'POST') return json(405, { error: 'method' });

  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const action = b.action;
  const topicId = b.topicId;
  const isAdmin = () => !!env.ADMIN_KEY && sameSecret(String(b.adminKey || ''), env.ADMIN_KEY);

  if (action === 'admin-check') return isAdmin() ? json(200, { ok: true }) : json(403, { error: 'admin' });

  if (typeof topicId !== 'string' || !ID_RE.test(topicId)) return json(400, { error: 'topic' });

  if (action === 'claim' || action === 'admin-claim') {
    const admin = action === 'admin-claim';
    if (admin) { if (!isAdmin()) return json(403, { error: 'admin' }); }
    else {
      if (!hash) return json(400, { error: 'token' });
      if (env.CLASS_CODE && !sameSecret(String(b.code || ''), String(env.CLASS_CODE))) return json(403, { error: 'code' });
    }
    const team = cleanNames(b.team);
    if (!team) return json(400, { error: 'team' });

    const ids = getTopicIds ? await getTopicIds() : null;
    if (ids && !ids.has(topicId)) return json(404, { error: 'unknown-topic' });

    const slots = getSlots ? await getSlots() : null;
    if (!slots) return json(503, { error: 'config' });
    const slotNum = Number(b.slot);
    const info = slots.get(slotNum);
    if (!info) return json(400, { error: 'slot' });
    if (!admin && info.date < todayIL(now)) return json(400, { error: 'slot-past' });

    const existing = await store.get(CLAIM(topicId), { type: 'json' });
    if (existing) {
      // אותו בעלים (או מנהל): עדכון שמות ו/או תאריך
      if (!(admin || existing.owner === hash)) return json(409, { error: 'taken' });
      if (existing.slot === slotNum) {
        await store.setJSON(CLAIM(topicId), { ...existing, team });
      } else {
        const seat = await reserveSeat(store, slotNum, info.cap, topicId, now);
        if (!seat) return json(409, { error: 'slot-full' });
        await store.setJSON(CLAIM(topicId), { ...existing, team, slot: slotNum, seat, ts: now });
        await freeSeat(store, existing.slot, existing.seat, topicId);
      }
      return json(200, { ok: true });
    }

    const { blobs } = await store.list({ prefix: 'claims/' });
    if (blobs.length >= MAX_CLAIMS) return json(429, { error: 'full' });

    const seat = await reserveSeat(store, slotNum, info.cap, topicId, now);
    if (!seat) return json(409, { error: 'slot-full' });
    const created = await store.setJSON(CLAIM(topicId), { team, owner: admin ? 'admin' : hash, ts: now, slot: slotNum, seat }, { onlyIfNew: true });
    if (!created.modified) { await freeSeat(store, slotNum, seat, topicId); return json(409, { error: 'taken' }); }

    if (!admin) {
      // שלשה אחת, נושא אחד: מעבר לנושא חדש משחרר את הקודם (כולל המקום שלו בתאריך)
      const prev = await store.get(OWNER(hash), { type: 'json' });
      if (prev && prev.topicId && prev.topicId !== topicId) {
        const old = await store.get(CLAIM(prev.topicId), { type: 'json' });
        if (old && old.owner === hash) await dropClaim(store, prev.topicId, old);
      }
      await store.setJSON(OWNER(hash), { topicId });
    }
    return json(200, { ok: true });
  }

  if (action === 'release') {
    if (!hash) return json(400, { error: 'token' });
    const c = await store.get(CLAIM(topicId), { type: 'json' });
    if (!c) return json(200, { ok: true });
    if (c.owner !== hash) return json(403, { error: 'not-owner' });
    await dropClaim(store, topicId, c);
    return json(200, { ok: true });
  }

  if (action === 'admin-release') {
    if (!isAdmin()) return json(403, { error: 'admin' });
    const c = await store.get(CLAIM(topicId), { type: 'json' });
    if (c) await dropClaim(store, topicId, c);
    return json(200, { ok: true });
  }

  return json(400, { error: 'action' });
}
