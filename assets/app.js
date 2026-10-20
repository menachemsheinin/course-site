(function () {
  'use strict';

  const FILES = ['course', 'sessions', 'presentations', 'tools', 'exercises', 'materials', 'autocad'];
  const D = {};
  const app = document.getElementById('app');
  const top = document.getElementById('top');

  // שני הקורסים שמאחורי הכותרת ״כלים דיגיטליים א׳״. לכל אחד אתר-משנה משלו.
  const KEYS = ['bg', 'app'];
  const LABEL = { bg: 'רקע', app: 'יישום' };
  const LETTER = { bg: 'א׳', app: 'ב׳' };
  const TABS = {
    bg: [['', 'סילבוס'], ['schedule', 'מפגשים'], ['presentations', 'פרזנטציות']],
    app: [['', 'סילבוס'], ['schedule', 'מפגשים'], ['exercises', 'תרגילים'], ['tools', 'כלים'], ['materials', 'חומרי למידה']],
  };
  // כתובות ישנות
  const LEGACY = {
    background: '#/bg', practice: '#/app', presentations: '#/bg/presentations',
    exercises: '#/app/exercises', schedule: '#/', tools: '#/app/tools',
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

  // תחילת "היום הפעיל": אחרי 13:00 (סיום השיעור) נחשב כאילו כבר מחר
  function cutoff() { const t = today(); if (new Date().getHours() >= 13) t.setDate(t.getDate() + 1); return t; }

  // המפגש הבא של קורס מסוים
  function nextFor(k) {
    // המפגש של היום נחשב "הבא" עד סיום השיעור (13:00), ואז עוברים למפגש שאחריו
    const t = cutoff();
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

  // שרטוטי הרקע של דף הפתיחה: כל מחרוזת היא קו אחד שמצטייר בהדרגה
  const DRAW = {
    // רקע: חזית קלאסית, סימטרית סביב x=200
    bg: [
      'M10 240 H390',
      'M50 230 H350',
      'M62 220 H338',
      'M72 210 H328',
      'M68 205 H92 M72 205 V108 M88 205 V108',
      'M128 205 H152 M132 205 V108 M148 205 V108',
      'M188 205 H212 M192 205 V108 M208 205 V108',
      'M248 205 H272 M252 205 V108 M268 205 V108',
      'M308 205 H332 M312 205 V108 M328 205 V108',
      'M67 108 H93 M127 108 H153 M187 108 H213 M247 108 H273 M307 108 H333',
      'M60 100 H340 V82 H60 Z',
      'M60 91 H340',
      'M50 82 H350 L200 22 Z',
      'M70 78 H330 L200 26 Z',
      'M200 46 m-11 0 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0',
    ],
    // יישום: נפחים מודרניים, חלונות ומידה
    app: [
      'M10 240 H390',
      'M60 240 V120 H220 V240',
      'M220 240 V165 H345 V240',
      'M30 112 H250 V120 H30 Z',
      'M95 150 H185 V205 H95 Z',
      'M140 150 V205 M95 178 H185',
      'M255 190 H320 V240 M255 190 V240',
      'M330 95 m-30 0 a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0',
      'M60 258 H220 M60 252 V264 M220 252 V264',
      'M345 258 H220 M345 252 V264',
    ],
  };
  function drawing(k) {
    const el = h('span', { class: 'sketch', 'aria-hidden': 'true' });
    el.innerHTML = '<svg viewBox="0 0 400 270" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
      + DRAW[k].map((d, n) => '<path pathLength="1" style="--i:' + n + '" d="' + d + '"/>').join('') + '</svg>';
    return el;
  }

  function home() {
    const c = D.course;
    const out = [];
    const stage = h('div', { class: 'stage' },
      h('div', { class: 'stage-head' },
        logo(),
        h('h1', {}, c.title),
        h('p', { class: 'dim' }, h('span', {}, c.subtitle || ''))
      ),
      h('div', { class: 'halves' },
        KEYS.map((k) => {
          const nx = nextFor(k);
          return h('a', { class: 'half k-' + k, href: '#/' + k },
            h('span', { class: 'kicker' }, 'קורס ' + LETTER[k]),
            h('span', { class: 'dname' }, LABEL[k]),
            h('span', { class: 'dsub' }, c.courses[k].short),
            drawing(k),
            nx ? h('span', { class: 'dnext' }, h('b', {}, 'הבא · ' + fmt(nx.date)), h('span', {}, nx[k].topic)) : null,
            h('span', { class: 'go' }, 'כניסה ←')
          );
        })
      )
    );
    out.push(stage);

    (c.announcements || []).forEach((a) =>
      out.push(h('div', { class: 'note' }, h('div', { class: 'when' }, a.date || ''), h('div', {}, a.text)))
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
    const t = cutoff();
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
    const past = (s) => toDay(s.date) < cutoff();

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

  function materials(k, sub) {
    if (sub === 'autocad') return autocad();
    const items = (D.materials && D.materials.items) || [];
    return [
      h('h1', {}, 'חומרי למידה'),
      h('div', { class: 'grid' },
        items.map((i) =>
          h('a', { class: 'card', href: i.url, target: i.url.startsWith('#') ? null : '_blank', rel: 'noopener' },
            h('span', { class: 't' }, i.title), h('span', { class: 'd' }, i.desc || '')
          )
        )
      ),
    ];
  }

  function autocad() {
    const A = D.autocad;
    const cards = [];
    const secs = A.sections.map((s, n) => {
      const grid = h('div', { class: 'vgrid' }, s.videos.map((v) => {
        const c = h('a', { class: 'vcard', href: 'https://www.youtube.com/watch?v=' + v.id, target: '_blank', rel: 'noopener' },
          h('img', { src: 'https://img.youtube.com/vi/' + v.id + '/hqdefault.jpg', alt: '', loading: 'lazy' }),
          h('span', { class: 'vt' }, v.title),
          h('span', { class: 'vm' }, v.dur + ' · ' + v.level + (v.desc ? ' · ' + v.desc : ''))
        );
        c._q = (v.title + ' ' + v.desc).toLowerCase();
        cards.push(c);
        return c;
      }));
      const sec = h('section', { id: 'ac-' + n }, h('h2', {}, s.emoji + ' ' + s.title), grid);
      return sec;
    });
    const search = h('input', { type: 'search', class: 'vsearch', placeholder: 'חיפוש סרטון…', 'aria-label': 'חיפוש סרטון' });
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      cards.forEach((c) => { c.hidden = !!q && !c._q.includes(q); });
      secs.forEach((sec) => { sec.hidden = !sec.querySelector('.vcard:not([hidden])'); });
    });
    const nav = h('div', { class: 'vnav' }, A.sections.map((s, n) =>
      h('a', { href: '#/app/materials/autocad', onclick: (e) => { e.preventDefault(); secs[n].scrollIntoView({ behavior: 'smooth' }); } }, s.emoji + ' ' + s.title)));
    return [
      h('p', {}, h('a', { href: '#/app/materials' }, '← חומרי למידה')),
      h('h1', {}, A.title),
      h('p', { class: 'muted' }, A.intro + ' · ' + cards.length + ' סרטונים'),
      search, nav, ...secs,
    ];
  }

  /* ---------- ניתוב ---------- */

  /* ---------- גלריית תוצרי תרגיל 1 (קורס יישום): העלאה, רשת תמונות והגדלה ---------- */

  const GALLERY_API = '/api/gallery';
  const GALLERY_ERRORS = {
    name: 'נא לרשום שם או שמות (2 עד 80 תווים).',
    caption: 'הכיתוב ארוך מדי (עד 120 תווים).',
    type: 'הקובץ אינו תמונה תקינה.',
    size: 'התמונה גדולה מדי.',
    dimensions: 'מידות התמונה אינן תקינות.',
    full: 'הגלריה מלאה. פנו למרצה.',
    limit: 'אפשר להעלות עד 3 תמונות. מחקו אחת כדי להחליף.',
    code: 'הקוד שגוי.',
    busy: 'השרת עמוס. נסו שוב בעוד רגע.',
    'not-image': 'נא לבחור קובץ תמונה.',
    decode: 'לא הצלחנו לקרוא את התמונה. נסו לשמור אותה כ-JPG או PNG.',
    'too-big': 'התמונה כבדה מדי גם אחרי כיווץ. נסו תמונה קטנה יותר.',
    'pdf-size': 'קובץ ה-PDF גדול מ-4MB. כווצו אותו ונסו שוב.',
    pdf: 'לא הצלחנו לקרוא את קובץ ה-PDF. בדקו שהוא תקין.',
    'pdf-lib': 'טעינת קורא ה-PDF נכשלה. נסו שוב.',
  };
  const EXERCISE_COUNT = 5;
  async function galleryApi(method, body, ex) {
    const opts = { method, cache: 'no-store', headers: { 'X-Token': myToken() } };
    if (body instanceof FormData) { body.append('ex', ex); opts.body = body; }
    else if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify({ ...body, ex }); }
    const r = await fetch(GALLERY_API + (method === 'GET' ? '?ex=' + ex : ''), opts);
    let data = null;
    try { data = await r.json(); } catch (e) { /* תשובה ריקה */ }
    return { ok: r.ok, status: r.status, data };
  }

  // חלון "דרישות התרגיל": התוכן מגיע מ-data/exercises.json
  function openRequirements(n) {
    const item = ((D.exercises || {}).items || []).find((x) => x.n === n) || {};
    const reqs = item.requirements || [];
    const hasDetails = !!(item.goal || item.deliverable || (item.steps || []).length || reqs.length || item.example);
    const root = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'דרישות תרגיל ' + n });
    const shut = () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; root.remove(); };
    const onKey = (e) => { if (e.key === 'Escape' && !document.querySelector('.lb')) shut(); }; // Esc סוגר קודם את ההגדלה
    const prev = document.body.style.overflow;
    root.append(h('div', { class: 'modal-card' },
      h('button', { class: 'modal-x', type: 'button', 'aria-label': 'סגירה', onclick: shut }, '✕'),
      h('h2', {}, 'דרישות תרגיל ' + n),
      item.title ? h('p', { class: 'req-title' }, item.title) : null,
      item.goal ? h('div', { class: 'req-block' }, h('h3', {}, 'מטרת התרגיל'), h('p', {}, item.goal)) : null,
      item.deliverable ? h('div', { class: 'req-block' }, h('h3', {}, 'תוצר סופי'), h('p', {}, item.deliverable)) : null,
      (item.steps || []).length
        ? h('div', { class: 'req-block' }, h('h3', {}, 'מהלך התרגיל'),
          h('ol', { class: 'req-steps' }, item.steps.map((s) => h('li', {}, h('strong', {}, s.title), h('span', {}, s.text)))))
        : null,
      item.total ? h('p', { class: 'req-total' }, item.total) : null,
      item.example
        ? h('div', { class: 'req-block' }, h('h3', {}, 'דוגמה'),
          h('button', { class: 'req-example', type: 'button', 'aria-label': 'הגדלת הדוגמה', onclick: () => GalleryTools.openLightbox([{ src: item.example.src, title: 'דוגמה לתרגיל ' + n, caption: item.example.caption }], 0) },
            h('img', { src: item.example.src, alt: item.example.caption || 'דוגמה' })),
          item.example.caption ? h('p', { class: 'small muted', style: 'margin-top:.4em' }, item.example.caption + ' · לחצו להגדלה') : null)
        : null,
      reqs.length ? h('ul', { class: 'clean' }, reqs.map((r) => h('li', {}, r))) : null,
      !hasDetails ? h('p', { class: 'muted' }, 'דרישות התרגיל יימסרו בהמשך.') : null,
      ...(item.links || []).map((l) => h('p', {}, link(l.title, l.url)))));
    root.addEventListener('click', (e) => { if (e.target === root) shut(); });
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    document.body.append(root);
  }

  const REQ_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z"/><path d="M8 6H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2"/><path d="M9 12h6M9 16h4"/></svg>';

  // עמוד "תרגילים": לשונית לכל תרגיל (1-5) עם דרישות, העלאה וגלריה
  function exercises(k, sub) {
    const ex = Math.min(EXERCISE_COUNT, Math.max(1, parseInt(sub, 10) || 1));
    let items = [];
    let live = null; // null: טוען · true: זמין · false: לא זמין
    let busy = false;
    const grid = h('div', { class: 'gal' });
    const info = h('p', { class: 'muted small' });
    const imgUrl = (id, size) => GALLERY_API + '/img/' + id + '/' + size + '?ex=' + ex;

    const subtabs = h('nav', { class: 'subtabs', 'aria-label': 'תרגילים' },
      Array.from({ length: EXERCISE_COUNT }, (_, i) => h('a', { href: '#/app/exercises/' + (i + 1), class: i + 1 === ex ? 'on' : '' }, 'תרגיל ' + (i + 1))));
    const reqIco = h('span', { class: 'req-ico' });
    reqIco.innerHTML = REQ_ICON;
    const reqBtn = h('button', { class: 'req-btn', type: 'button', onclick: () => openRequirements(ex) }, reqIco, 'דרישות התרגיל');

    // ---- טופס העלאה ----
    const file = h('input', { type: 'file', accept: 'image/*,application/pdf,.pdf', 'aria-label': 'בחירת קובץ' });
    const names = h('input', { type: 'text', maxlength: 80, placeholder: 'שם או שמות', 'aria-label': 'שם או שמות', value: mem.get('galName') });
    const caption = h('input', { type: 'text', maxlength: 120, placeholder: 'כיתוב קצר (לא חובה)', 'aria-label': 'כיתוב' });
    const code = h('input', { type: 'text', maxlength: 20, placeholder: 'קוד כיתה', 'aria-label': 'קוד כיתה', style: 'max-width:9em', hidden: true });
    const preview = h('img', { class: 'upl-prev', alt: '', hidden: true });
    const msg = h('div', { class: 'upl-msg', role: 'status' });
    const send = h('button', { class: 'btn', type: 'button' }, 'העלאה');
    // סרגל נפתח: סגור כברירת מחדל כדי שהגלריה תהיה במרכז, ונפתח בלחיצה
    const form = h('details', { class: 'upl' },
      h('summary', {}, h('span', { class: 'upl-plus', 'aria-hidden': 'true' }, '+'), 'העלאת התרגיל'),
      h('p', { class: 'muted small', style: 'margin-top:0' }, 'הגיליון להגשה: PDF (עד 4MB) או תמונה JPG/PNG, ושם. בגלריה יוצג העמוד הראשון.'),
      h('div', { class: 'upl-row' }, file, preview),
      h('div', { class: 'upl-row' }, names, caption, code, send),
      msg);
    form.hidden = true;

    let previewUrl = '';
    file.addEventListener('change', () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const f = file.files[0];
      const pdf = GalleryTools.isPdfFile(f);
      previewUrl = f && !pdf ? URL.createObjectURL(f) : '';
      preview.src = previewUrl;
      preview.hidden = !f || pdf;
      msg.className = 'upl-msg';
      msg.textContent = pdf ? 'קובץ PDF: העמוד הראשון יוצג בגלריה, והקובץ המלא יהיה זמין להורדה.' : '';
      if (pdf) msg.className = 'upl-msg info';
    });

    async function submit() {
      if (busy) return;
      const f = file.files[0];
      const nm = names.value.trim();
      msg.className = 'upl-msg';
      if (!f) { msg.textContent = GALLERY_ERRORS['not-image']; return; }
      if (nm.length < 2) { msg.textContent = GALLERY_ERRORS.name; return; }
      busy = true; send.disabled = true; msg.textContent = 'מכווץ ומעלה…';
      try {
        const p = await GalleryTools.prepare(f);
        const fd = new FormData();
        fd.append('name', nm); fd.append('caption', caption.value.trim());
        fd.append('w', p.w); fd.append('h', p.h);
        if (code.value.trim()) fd.append('code', code.value.trim());
        fd.append('full', p.full, 'full.jpg'); fd.append('thumb', p.thumb, 'thumb.jpg');
        if (p.pdf) fd.append('pdf', p.pdf, 'exercise.pdf');
        const r = await galleryApi('POST', fd, ex);
        if (r.ok) {
          mem.set('galName', nm);
          file.value = ''; caption.value = ''; preview.hidden = true;
          msg.className = 'upl-msg ok'; msg.textContent = 'התמונה הועלתה ומוצגת בגלריה.';
          form.open = false; // הסרגל נסגר והגלריה נראית; ההודעה מוצגת מעליו
          await refresh();
          info.textContent = 'התמונה הועלתה ומוצגת בגלריה.'; info.className = 'small upl-ok';
          setTimeout(() => { info.className = 'muted small'; draw(); }, 5000);
        } else {
          const e = (r.data || {}).error;
          if (e === 'code') code.hidden = false;
          msg.textContent = GALLERY_ERRORS[e] || (r.status === 413 ? GALLERY_ERRORS.size : 'ההעלאה נכשלה. נסו שוב.');
        }
      } catch (e) {
        msg.textContent = GALLERY_ERRORS[e.message] || 'ההעלאה נכשלה. נסו שוב.';
      }
      busy = false; send.disabled = false;
    }
    send.addEventListener('click', submit);

    // ---- גלריה ----
    function draw() {
      form.hidden = !live;
      info.textContent = live === false ? 'הגלריה לא זמינה כרגע.' : live && items.length ? items.length + ' תוצרים · לחצו על תמונה להגדלה' : '';
      const lb = items.map((it) => (it.pdf
        ? { src: imgUrl(it.id, 'full'), title: it.name, caption: it.caption, openUrl: imgUrl(it.id, 'pdf'), openLabel: 'פתיחת ה-PDF המלא' }
        : { src: imgUrl(it.id, 'full'), title: it.name, caption: it.caption, openUrl: imgUrl(it.id, 'full') }));
      grid.replaceChildren(...(live && !items.length
        ? [h('p', { class: 'muted' }, 'עדיין לא הועלו תוצרים. לחצו על ״העלאת התרגיל״ כדי להיות הראשונים.')]
        : items.map((it, i) =>
          h('figure', { class: 'gal-item' },
            h('button', { class: 'gal-btn', type: 'button', 'aria-label': 'הגדלה: ' + it.name, onclick: () => GalleryTools.openLightbox(lb, i) },
              h('img', { src: imgUrl(it.id, 'thumb'), alt: it.name + (it.caption ? ': ' + it.caption : ''), loading: 'lazy', width: it.w, height: it.h }),
              it.pdf ? h('span', { class: 'pdf-badge' }, 'PDF') : null),
            h('figcaption', {}, h('strong', {}, it.name), it.caption ? h('span', {}, it.caption) : null,
              it.mine ? h('button', { class: 'mini', type: 'button', onclick: () => remove(it) }, 'מחיקה') : null)))));
    }
    async function remove(it) {
      if (!confirm('למחוק את התוצר של ״' + it.name + '״?')) return;
      try { await galleryApi('POST', { action: 'delete', id: it.id }, ex); } catch (e) { /* ייטען מחדש */ }
      await refresh();
    }
    async function refresh() {
      try {
        const r = await galleryApi('GET', null, ex);
        if (r.ok && r.data && Array.isArray(r.data.items)) { items = r.data.items; live = true; } else live = false;
      } catch (e) { if (live === null) live = false; }
      draw();
    }

    stopPolling();
    refresh().then(() => { if (live) pollTimer = setInterval(() => { if (!document.hidden) refresh(); }, 30000); });
    const exTitle = (((D.exercises || {}).items || []).find((x) => x.n === ex) || {}).title;
    return [subtabs, h('div', { class: 'ex-head' }, h('h1', {}, 'תרגיל ' + ex), reqBtn), exTitle ? h('p', { class: 'ex-title' }, exTitle) : null, info, form, grid];
  }

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
    app: { '': courseHome, schedule, exercises, tools, materials },
  };

  function render() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (parts[0] in LEGACY) { location.replace(LEGACY[parts[0]]); return; }

    stopPolling();
    const k = KEYS.includes(parts[0]) ? parts[0] : null;
    if (k === 'app' && parts[1] === 'gallery') { location.replace('#/app/exercises/1'); return; }
    let page = k ? parts[1] || '' : '';
    if (k && !(page in PAGES[k])) page = '';

    document.body.dataset.course = k || '';
    // דף ההנחיות שייך ללשונית "פרזנטציות"
    const tabPage = page === 'guide' ? 'presentations' : page;
    header(k, tabPage);
    const view = k ? PAGES[k][page] : home;
    app.replaceChildren(...view(k, parts[2]).filter(Boolean));

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
