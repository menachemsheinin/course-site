// שיבוץ חי לנושאי הפרזנטציות. כתובת: /api/claims
import { getStore } from '@netlify/blobs';
import { handle } from '../lib/claims-core.mjs';

const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers });

export default async (req) => {
  const env = { CLASS_CODE: process.env.CLASS_CODE || '', ADMIN_KEY: process.env.ADMIN_KEY || '' };
  const store = getStore({ name: 'presentation-claims', consistency: 'strong' });

  // רשימת הנושאים התקפים נלקחת מהאתר עצמו
  let topicIds = null;
  const getTopicIds = async () => {
    if (topicIds) return topicIds;
    try {
      const r = await fetch(new URL('/data/presentations.json', req.url));
      const d = await r.json();
      topicIds = new Set((d.items || []).map((i) => i.id).filter(Boolean));
      if (!topicIds.size) topicIds = null;
    } catch (e) { topicIds = null; }
    return topicIds;
  };

  // תאריכי הפרזנטציות וכמות המקומות בכל תאריך: מתוך לוח המפגשים של האתר (bg.presentations)
  let slots = null;
  const getSlots = async () => {
    if (slots) return slots;
    try {
      const r = await fetch(new URL('/data/sessions.json', req.url));
      const d = await r.json();
      const m = new Map();
      for (const s of d.sessions || []) {
        const cap = s.bg && Number(s.bg.presentations);
        if (s.kind !== 'noclass' && cap > 0) m.set(Number(s.n), { date: s.date, cap });
      }
      slots = m.size ? m : null;
    } catch (e) { slots = null; }
    return slots;
  };

  try {
    let body;
    if (req.method === 'POST') {
      if (!(req.headers.get('content-type') || '').includes('application/json')) return reply(415, { error: 'content-type' });
      const text = await req.text();
      if (text.length > 4000) return reply(413, { error: 'too-large' });
      body = JSON.parse(text);
    }
    const out = await handle({ method: req.method, body, token: req.headers.get('x-token') || '' }, { store, env, getTopicIds, getSlots });
    return reply(out.status, out.body);
  } catch (e) {
    return reply(500, { error: 'server' });
  }
};

export const config = { path: '/api/claims' };
