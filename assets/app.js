(function () {
  'use strict';

  const FILES = ['course', 'sessions', 'presentations', 'tools'];
  const D = {};
  const app = document.getElementById('app');
  const top = document.getElementById('top');

  // שני הקורסים שמאחורי הכותרת ״כלים דיגיטליים א׳״. לכל אחד אתר-משנה משלו.
  const KEYS = ['bg', 'app'];
  const LABEL = { bg: 'רקע', app: 'יישום' };
  const LETTER = { bg: 'א׳', app: 'ב׳' };
  const TABS = {
    bg: [['', 'סילבוס'], ['schedule', 'מפגשים'], ['presentations', 'פרזנטציות']],
    app: [['', 'סילבוס'], ['schedule', 'מפגשים'], ['tools', 'כלים']],
  };
  // כתובות ישנות
  const LEGACY = {
    background: '#/bg', practice: '#/app', presentations: '#/bg/presentations',
    exercises: '#/app', schedule: '#/', tools: '#/app/tools',
  };

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const link = (text, url) =>
    h('a', { href: url, target: url.startsWith('#') ? null : '_blank', rel: url.startsWith('#') ? null : 'noopener' }, text);

  const toDay = (iso) => new Date(iso + 'T00:00:00');
  const fmt = (iso) =>
    toDay(iso).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' });
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

  // המפגש הבא של קורס מסוים
  function nextFor(k) {
    const t = today();
    return D.sessions.sessions.find((s) => s.kind !== 'noclass' && s[k] && toDay(s.date) >= t) || null;
  }

  const exLabel = (a) => 'תרגיל ' + a.exercise + (a.exNote ? ' (' + a.exNote + ')' : '');

  /* ---------- כותרת ---------- */

  // הלוגו: צבע הטקסט של הכותרת (לבן על כהה/צבעוני), מצויר כווקטור
  const LOGO_SVG = '<svg viewBox="73 73 301 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="currentColor" d="M73 73 H152 L374 373 H296 Z M286 73 H374 V190 Z"/></svg>';
  function logo() {
    const el = h('span', { class: 'logo', 'aria-hidden': 'true' });
    el.innerHTML = LOGO_SVG;
    return el;
  }

  function header(k, page) {
    const bar = h('div', { class: 'bar' },
      h('a', { class: 'brand', href: '#/' }, logo(), D.course.title),
      k ? h('a', { class: 'all', href: '#/' }, 'כל הקורסים') : null
    );
    const kids = [bar];
    if (k) {
      kids.push(
        h('div', { class: 'ctitle' },
          h('span', { class: 'letter' }, 'קורס ' + LETTER[k]),
          h('span', { class: 'name' }, LABEL[k])
        ),
        h('nav', { class: 'tabs', 'aria-label': 'ניווט בקורס' },
          TABS[k].map(([p, label]) => h('a', { href: '#/' + k + (p ? '/' + p : ''), class: p === page ? 'on' : '' }, label))
        )
      );
    }
    top.replaceChildren(h('div', { class: 'wrap' }, kids));
  }

  /* ---------- דף הבית ---------- */

  function home() {
    const c = D.course;
    const out = [h('div', { class: 'hero' }, h('h1', {}, c.title), h('p', { class: 'muted', style: 'margin:0' }, c.subtitle))];

    (c.announcements || []).forEach((a) =>
      out.push(h('div', { class: 'note' }, h('div', { class: 'when' }, a.date || ''), h('div', {}, a.text)))
    );

    out.push(
      h('div', { class: 'doors' },
        KEYS.map((k) => {
          const nx = nextFor(k);
          return h('a', { class: 'door k-' + k, href: '#/' + k },
            h('span', { class: 'big', 'aria-hidden': 'true' }, LETTER[k]),
            h('span', { class: 'kicker' }, 'קורס ' + LETTER[k]),
            h('span', { class: 'dname' }, LABEL[k]),
            h('span', { class: 'dsub' }, c.courses[k].short),
            nx ? h('span', { class: 'dnext' }, h('b', {}, 'הבא · ' + fmt(nx.date)), h('span', {}, nx[k].topic)) : null,
            h('span', { class: 'go' }, 'כניסה ←')
          );
        })
      )
    );
    return out;
  }

  /* ---------- דף קורס (סילבוס) ---------- */

  function courseHome(k) {
    const C = D.course.courses[k];
    const nx = nextFor(k);
    const more = (title, body) => h('details', { class: 'more' }, h('summary', {}, title), h('div', {}, body));

    const tiles = (C.grading || []).map((g) => {
      const m = g.match(/^(\d+%)\s*(.*)$/);
      return h('div', { class: 'tile' }, h('div', { class: 'pct' }, m ? m[1] : ''), h('div', { class: 'lbl' }, m ? m[2] : g));
    });

    const out = [];
    if (nx) {
      out.push(
        h('div', { class: 'nextbox' },
          h('b', {}, 'המפגש הבא · ' + fmt(nx.date)), ' · ', nx[k].topic, ' ',
          link('לכל המפגשים', '#/' + k + '/schedule')
        )
      );
    }
    out.push(
      h('h2', {}, 'ציון'), h('div', { class: 'tiles' }, tiles),
      h('h2', {}, 'דרישות'),
      h('ul', { class: 'clean' }, [C.prerequisites ? 'דרישת סף: ' + C.prerequisites : null, ...(C.requirements || [])].filter(Boolean).map((x) => h('li', {}, x)))
    );
    if ((C.equipment || []).length) {
      out.push(h('h2', {}, 'ציוד'), h('ul', { class: 'clean' }, C.equipment.map((x) => h('li', {}, x))));
    }
    out.push(
      h('h2', {}, 'על הקורס'),
      more('תקציר ומבנה', [...C.summary.map((p) => h('p', {}, p)), C.structure ? h('p', {}, h('strong', {}, 'מבנה: '), C.structure) : null])
    );
    if ((C.bibliography || []).length) {
      out.push(more('ביבליוגרפיה', h('ul', { class: 'biblio' }, C.bibliography.map((b) => h('li', {}, b)))));
    }
    if ((C.links || []).length) {
      out.push(h('h2', {}, 'קישורים'), h('div', { class: 'linkrow' }, C.links.map((l) => h('a', { class: 'tag', href: l.url, target: '_blank', rel: 'noopener' }, l.title))));
    }
    out.push(h('p', { class: 'muted small', style: 'margin-top:2em' }, 'יתכנו שינויים בתוכנית הלימודים, על פי התקדמות הכיתה ו/או אילוצי המערכת.'));
    return out;
  }

  /* ---------- מפגשים (של קורס אחד) ---------- */

  function schedule(k) {
    const t = today();
    const nx = nextFor(k);
    const rows = D.sessions.sessions.map((s) => {
      const past = toDay(s.date) < t;
      const isNext = nx && nx.n === s.n;
      const cls = ['row', past ? 'past' : '', isNext ? 'next-s' : '', s.kind === 'noclass' ? 'noclass' : ''].join(' ');
      if (s.kind === 'noclass') {
        return h('div', { class: cls }, h('span', { class: 'rn' }, '–'), h('span', { class: 'rd' }, fmt(s.date)), h('span', { class: 'rt' }, s.note || 'אין שיעור'));
      }
      const x = s[k];
      if (!x) return null;
      return h('div', { class: cls, id: 'm' + s.n },
        h('span', { class: 'rn' }, s.n),
        h('span', { class: 'rd' }, fmt(s.date)),
        h('span', { class: 'rt' },
          x.topic,
          isNext ? h('span', { class: 'tag hot' }, 'הבא') : null,
          s.kind === 'makeup' ? h('span', { class: 'tag' }, 'השלמה') : null,
          s.guest ? h('span', { class: 'tag' }, 'הרצאת אורח') : null,
          x.presentations ? h('span', { class: 'tag' }, x.presentations + ' פרזנטציות') : null,
          x.exercise ? h('span', { class: 'tag' }, exLabel(x)) : null,
          x.summary ? h('span', { class: 'sub' }, x.summary) : null,
          x.note ? h('span', { class: 'sub' }, x.note) : null
        )
      );
    });
    return [h('h1', {}, 'מפגשים'), h('div', { class: 'rows' }, rows)];
  }

  /* ---------- פרזנטציות (קורס רקע) ---------- */

  const CATS = { figure: 'דמויות', topic: 'נושאים', tool: 'כלים' };

  /* ---- שיבוץ חי: הנתונים נשמרים בשרת (Netlify Function + Blobs). הדף מתעדכן אוטומטית ---- */
  const CLAIMS_API = '/api/claims';
  let pollTimer = null;
  let memToken = null;
  const stopPolling = () => { clearInterval(pollTimer); pollTimer = null; };

  // מזהה אנונימי של הדפדפן: מאפשר לשלשה לשחרר או להחליף את הבחירה שלה, ורק לה
  function myToken() {
    try {
      let t = localStorage.getItem('presToken');
      if (!t) { t = makeToken(); localStorage.setItem('presToken', t); }
      return t;
    } catch (e) { return memToken || (memToken = makeToken()); }
  }
  function makeToken() {
    const raw = (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
    return (raw.replace(/[^A-Za-z0-9_-]/g, '') + 'abcdef0123456789').slice(0, 40);
  }
  const mem = {
    get: (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ללא אחסון */ } },
  };
  async function claimsApi(method, body) {
    const r = await fetch(CLAIMS_API, {
      method, cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Token': myToken() },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await r.json(); } catch (e) { /* תשובה ריקה */ }
    return { ok: r.ok, status: r.status, data };
  }
  const CLAIM_ERRORS = {
    taken: 'הנושא כבר נתפס. בחרו נושא אחר.',
    code: 'קוד הכיתה שגוי.',
    team: 'נא לרשום את שמות חברי השלשה (2 עד 80 תווים).',
    slot: 'נא לבחור תאריך.',
    'slot-full': 'התאריך כבר מלא. בחרו תאריך אחר.',
    'slot-past': 'התאריך כבר עבר. בחרו תאריך אחר.',
    full: 'הרשימה מלאה, פנו למרצה.',
    config: 'הלוח לא זמין כרגע. נסו שוב עוד מעט.',
    'unknown-topic': 'הנושא הזה לא קיים ברשימה. רעננו את הדף.',
  };

  // תאריכי הפרזנטציות של הקורס: מפגשים שבהם יש פרזנטציות (bg.presentations), ומספר המקומות בכל אחד
  const presentationSlots = () =>
    D.sessions.sessions
      .filter((s) => s.kind !== 'noclass' && s.bg && s.bg.presentations > 0)
      .map((s) => ({ n: s.n, date: s.date, cap: s.bg.presentations }));

  function presentations() {
    const P = D.presentations;
    const SLOTS = presentationSlots();
    const slotInfo = (n) => SLOTS.find((s) => s.n === n);
    const slotName = (n) => { const s = slotInfo(n); return s ? fmt(s.date) : ''; };
    let cat = 'all';
    let status = 'all';
    let q = '';
    let claims = {};
    let live = null; // null: טוען · true: זמין · false: השיבוץ החי לא זמין
    let codeRequired = false;
    let openForm = null;
    let formError = '';
    let busy = false;
    const list = h('div', {});
    const count = h('p', { class: 'muted small' });
    const note = h('p', { class: 'muted small', style: 'margin:.2em 0 0' });
    const mine = h('div', {});
    const board = h('div', {});
    const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'סינון לפי קטגוריה' });
    const statusChips = h('div', { class: 'chips', role: 'group', 'aria-label': 'סינון לפי מצב' });

    const takenBy = (i) => (i.id && claims[i.id] ? claims[i.id].team : i.takenBy || '');
    const isTaken = (i) => !!takenBy(i);
    const usage = (n) => Object.values(claims).filter((c) => c.slot === n).length;
    const past = (s) => toDay(s.date) < today();

    // לוח התאריכים: מי מציג מתי, וכמה מקומות פנויים
    function drawBoard() {
      if (!live) { board.replaceChildren(); return; }
      board.replaceChildren(
        h('div', { class: 'slots' },
          SLOTS.map((s) => {
            const taken = P.items.filter((i) => i.id && claims[i.id] && claims[i.id].slot === s.n).sort((a, b) => claims[a.id].ts - claims[b.id].ts);
            const free = Math.max(0, s.cap - taken.length);
            return h('div', { class: 'slotcard' + (free === 0 ? ' full' : '') + (past(s) ? ' past' : '') },
              h('div', { class: 'sh' }, h('strong', {}, fmt(s.date)), h('span', { class: 'tag ' + (free ? 'ok' : '') }, free ? 'פנוי: ' + free + ' מתוך ' + s.cap : 'מלא')),
              taken.map((i) => h('div', { class: 'ss' }, h('b', {}, i.name), ' · ', claims[i.id].team)));
          })));
    }

    function draw() {
      list.replaceChildren();
      const shown = P.items.filter(
        (i) => (cat === 'all' || i.cat === cat)
          && (status === 'all' || (status === 'free') === !isTaken(i))
          && (!q || (i.name + ' ' + (i.desc || '')).toLowerCase().includes(q))
      );
      shown.forEach((i) => list.append(row(i)));
      if (!shown.length) list.append(h('p', { class: 'muted' }, 'אין פריטים שמתאימים לסינון.'));
      const taken = P.items.filter(isTaken).length;
      count.textContent = shown.length + ' פריטים · ' + taken + ' נתפסו · ' + (P.items.length - taken) + ' פנויים';
      note.textContent = live ? 'בבחירת נושא בוחרים גם תאריך להצגה (עד ' + (SLOTS[0] ? SLOTS[0].cap : 3) + ' פרזנטציות בכל תאריך). העמוד מתעדכן אוטומטית.' : '';
      [...chips.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.c === cat)));
      [...statusChips.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.c === status)));
      const m = P.items.find((i) => i.id && claims[i.id] && claims[i.id].mine);
      mine.replaceChildren(...(m
        ? [h('div', { class: 'note' }, 'השלשה שלכם בחרה: ', h('strong', {}, m.name), ' (' + claims[m.id].team + ')' + (claims[m.id].slot ? ', הצגה ב' + slotName(claims[m.id].slot) : '') + '. אפשר לשנות תאריך או שמות, לשחרר, או לבחור נושא אחר והוא יחליף את הקודם.')]
        : []));
      drawBoard();
    }

    function row(i) {
      const c = i.id && claims[i.id];
      const taken = isTaken(i);
      const side = [h('span', { class: 'tag' }, CATS[i.cat]), taken ? h('span', { class: 'tag ok' }, 'נבחר') : null];
      if (live && i.id) {
        if (c && c.mine) {
          side.push(
            h('button', { class: 'mini', type: 'button', onclick: () => { openForm = openForm === i.id ? null : i.id; formError = ''; draw(); } }, 'שינוי'),
            h('button', { class: 'mini', type: 'button', onclick: () => release(i) }, 'שחרור'));
        } else if (!taken) {
          side.push(h('button', { class: 'mini pick', type: 'button', onclick: () => { openForm = openForm === i.id ? null : i.id; formError = ''; draw(); } }, 'בחירה'));
        }
      }
      const el = h('div', { class: 'item ' + (taken ? 'taken' : '') },
        h('div', { class: 'ibody' },
          h('div', { class: 'n' }, i.name),
          h('div', { class: 'muted small' }, i.desc || ''),
          taken ? h('div', { class: 'by' }, 'נבחר על ידי: ', takenBy(i), c && c.slot ? ' · ' + slotName(c.slot) : '') : null),
        h('div', { class: 'iside' }, side));
      if (openForm === i.id && (!taken || (c && c.mine))) el.append(form(i, c));
      return el;
    }

    function form(i, current) {
      const team = h('input', { type: 'text', maxlength: 80, placeholder: 'שמות חברי השלשה', 'aria-label': 'שמות חברי השלשה', value: current ? current.team : mem.get('presTeam') });
      const code = codeRequired ? h('input', { type: 'text', inputmode: 'numeric', maxlength: 20, placeholder: 'קוד הכיתה', 'aria-label': 'קוד הכיתה', value: mem.get('presCode'), style: 'max-width:9em' }) : null;
      const dateSel = h('select', { 'aria-label': 'תאריך הפרזנטציה' },
        h('option', { value: '' }, 'בחרו תאריך'),
        SLOTS.map((s) => {
          const mineHere = current && current.slot === s.n;
          const left = s.cap - usage(s.n) + (mineHere ? 1 : 0);
          const off = !mineHere && (left <= 0 || past(s));
          return h('option', { value: String(s.n), disabled: off }, fmt(s.date) + ' · ' + (past(s) && !mineHere ? 'עבר' : left > 0 ? 'נותרו ' + left : 'מלא'));
        }));
      if (current && current.slot) dateSel.value = String(current.slot);
      const err = h('div', { class: 'ferr' }, formError);
      const go = h('button', { class: 'mini pick', type: 'button' }, current ? 'עדכון' : 'אישור');
      const submit = async () => {
        if (busy) return;
        const t = team.value.trim();
        if (t.length < 2) { err.textContent = CLAIM_ERRORS.team; return; }
        if (!dateSel.value) { err.textContent = CLAIM_ERRORS.slot; return; }
        busy = true; go.disabled = true; err.textContent = '';
        mem.set('presTeam', t); if (code) mem.set('presCode', code.value.trim());
        try {
          const r = await claimsApi('POST', { action: 'claim', topicId: i.id, team: t, slot: Number(dateSel.value), code: code ? code.value.trim() : '' });
          if (r.ok) { openForm = null; formError = ''; }
          else { formError = CLAIM_ERRORS[(r.data || {}).error] || 'משהו השתבש. נסו שוב.'; if ((r.data || {}).error === 'taken') openForm = null; }
        } catch (e) { formError = 'אין חיבור לשרת. נסו שוב.'; }
        busy = false;
        await refresh(true);
        if (openForm) draw();
      };
      go.addEventListener('click', submit);
      [team, code].filter(Boolean).forEach((inp) => inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); }));
      setTimeout(() => team.focus(), 0);
      return h('div', { class: 'claimform' },
        h('div', { class: 'frow' }, team, dateSel, code, go, h('button', { class: 'mini', type: 'button', onclick: () => { openForm = null; formError = ''; draw(); } }, 'ביטול')),
        err);
    }

    async function release(i) {
      if (!confirm('לשחרר את ״' + i.name + '״?')) return;
      try { await claimsApi('POST', { action: 'release', topicId: i.id }); } catch (e) { /* ייטען מחדש */ }
      await refresh(true);
    }

    async function refresh(force) {
      try {
        const r = await claimsApi('GET');
        if (r.ok && r.data && r.data.claims) { claims = r.data.claims; codeRequired = !!r.data.codeRequired; live = true; }
        else live = false;
      } catch (e) { if (live === null) live = false; }
      // לא מציירים מחדש בזמן שהסטודנט מקליד בטופס, כדי לא לאבד את מה שהקליד
      if (force || openForm == null) draw(); else drawBoard();
    }

    [['all', 'הכול'], ...Object.entries(CATS)].forEach(([key, label]) =>
      chips.append(h('button', { class: 'chip', type: 'button', 'data-c': key, onclick: () => { cat = key; draw(); } }, label))
    );
    [['all', 'כל המצבים'], ['free', 'פנויים'], ['taken', 'נתפסו']].forEach(([key, label]) =>
      statusChips.append(h('button', { class: 'chip', type: 'button', 'data-c': key, onclick: () => { status = key; draw(); } }, label))
    );
    const search = h('input', {
      class: 'search', type: 'search', placeholder: 'חיפוש…', 'aria-label': 'חיפוש',
      oninput: (e) => { q = e.target.value.trim().toLowerCase(); draw(); },
    });

    const out = [
      h('h1', {}, 'פרזנטציות'),
      P.guide ? h('p', {}, h('a', { class: 'btn btn-lg', href: '#/bg/guide' }, 'הנחיות מפורטות לתרגיל הפרזנטציה ←')) : null,
    ];
    if (P.signupUrl) out.push(h('p', {}, h('a', { class: 'btn', href: P.signupUrl, target: '_blank', rel: 'noopener' }, 'רישום לנושא')));
    const gear = h('a', { class: 'adm-link', href: 'admin.html', title: 'ניהול השיבוץ (למרצה)', 'aria-label': 'ניהול השיבוץ (למרצה)' });
    gear.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
    out.push(h('h2', { class: 'withicon' }, 'הנושאים', gear), mine, board, chips, statusChips, search, count, note, list);
    draw();

    // טעינה ראשונה ועדכון אוטומטי כל כמה שניות כל עוד הדף פתוח ונראה
    stopPolling();
    refresh().then(() => {
      if (live) pollTimer = setInterval(() => { if (!document.hidden) refresh(); }, 6000);
    });
    return out;
  }

  /* ---------- כלים (קורס יישום) ---------- */

  function tools() {
    const T = D.tools;
    const out = [h('h1', {}, 'כלים וקישורים'), h('p', { class: 'muted' }, T.intro || '')];
    (T.groups || []).forEach((g) => {
      out.push(
        h('h2', {}, g.title),
        h('div', { class: 'grid' },
          g.items.map((i) =>
            h('a', { class: 'card', href: i.url, target: '_blank', rel: 'noopener' },
              h('span', { class: 't' }, i.name), h('span', { class: 'd' }, i.desc || '')
            )
          )
        )
      );
    });
    return out;
  }

  /* ---------- ניתוב ---------- */

  /* ---------- הנחיות לתרגיל הפרזנטציה (קורס רקע) ---------- */

  function guide() {
    const G = D.presentations.guide || {};
    const out = [
      h('p', { class: 'crumb' }, link('→ חזרה לרשימת הנושאים והשיבוץ', '#/bg/presentations')),
      h('h1', {}, G.title || 'הנחיות'),
    ];
    if (G.intro) out.push(h('p', { class: 'lead-line' }, G.intro));
    if ((G.facts || []).length) {
      out.push(h('div', { class: 'tiles' }, G.facts.map((f) => h('div', { class: 'tile' }, h('div', { class: 'pct' }, f.big), h('div', { class: 'lbl' }, f.label)))));
    }
    (G.sections || []).forEach((s) =>
      out.push(
        h('section', { class: 'gsec' + (s.kind === 'warn' ? ' warn' : '') },
          h('h2', {}, s.title),
          h('ul', { class: 'clean' }, (s.points || []).map((p) => h('li', {}, p)))))
    );
    out.push(h('p', { style: 'margin-top:1.6em' }, h('a', { class: 'btn', href: '#/bg/presentations' }, 'לבחירת נושא ושיבוץ')));
    return out;
  }

  const PAGES = {
    bg: { '': courseHome, schedule, presentations, guide },
    app: { '': courseHome, schedule, tools },
  };

  function render() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (parts[0] in LEGACY) { location.replace(LEGACY[parts[0]]); return; }

    stopPolling();
    const k = KEYS.includes(parts[0]) ? parts[0] : null;
    let page = k ? parts[1] || '' : '';
    if (k && !(page in PAGES[k])) page = '';

    document.body.dataset.course = k || '';
    // דף ההנחיות שייך ללשונית "פרזנטציות"
    const tabPage = page === 'guide' ? 'presentations' : page;
    header(k, tabPage);
    const view = k ? PAGES[k][page] : home;
    app.replaceChildren(...view(k).filter(Boolean));

    const tab = k && TABS[k].find(([p]) => p === tabPage);
    document.title = (k ? LABEL[k] + (page ? ' · ' + (page === 'guide' ? 'הנחיות' : tab[1]) : '') + ' · ' : '') + D.course.title;
    window.scrollTo(0, 0);
  }

  Promise.all(FILES.map((f) => fetch('data/' + f + '.json', { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error(f);
    return r.json();
  })))
    .then((res) => {
      FILES.forEach((f, i) => (D[f] = res[i]));
      document.getElementById('foot-text').textContent = D.course.footer || '';
      const mail = (D.course.lecturer || {}).email;
      if (mail) document.getElementById('foot-contact').append('ליצירת קשר: ', h('a', { href: 'mailto:' + mail }, mail));
      window.addEventListener('hashchange', render);
      render();
    })
    .catch((err) => {
      app.replaceChildren(
        h('div', { class: 'note' },
          h('p', {}, 'לא הצלחנו לטעון את תוכן האתר (' + err.message + ').'),
          h('p', { class: 'small' }, 'אם פתחתם את הקובץ ישירות מהמחשב, יש לפתוח אותו דרך כתובת האתר או דרך שרת מקומי.')
        )
      );
    });
})();
