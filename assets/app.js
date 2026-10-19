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

  function presentations() {
    const P = D.presentations;
    let cat = 'all';
    let q = '';
    const list = h('div', {});
    const count = h('p', { class: 'muted small' });
    const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'סינון לפי קטגוריה' });

    function draw() {
      list.replaceChildren();
      const shown = P.items.filter(
        (i) => (cat === 'all' || i.cat === cat) && (!q || (i.name + ' ' + (i.desc || '')).toLowerCase().includes(q))
      );
      shown.forEach((i) =>
        list.append(
          h('div', { class: 'item ' + (i.takenBy ? 'taken' : '') },
            h('div', {}, h('div', { class: 'n' }, i.name), h('div', { class: 'muted small' }, i.desc || '')),
            h('div', {}, h('span', { class: 'tag' }, CATS[i.cat]), i.takenBy ? h('span', { class: 'tag ok' }, 'נבחר') : null)
          )
        )
      );
      count.textContent = shown.length + ' פריטים · ' + P.items.filter((i) => i.takenBy).length + ' נבחרו';
      [...chips.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.c === cat)));
    }

    [['all', 'הכול'], ...Object.entries(CATS)].forEach(([key, label]) =>
      chips.append(h('button', { class: 'chip', type: 'button', 'data-c': key, onclick: () => { cat = key; draw(); } }, label))
    );
    const search = h('input', {
      class: 'search', type: 'search', placeholder: 'חיפוש…', 'aria-label': 'חיפוש',
      oninput: (e) => { q = e.target.value.trim().toLowerCase(); draw(); },
    });

    const out = [
      h('h1', {}, 'פרזנטציות'),
      h('p', { class: 'muted' }, P.intro || ''),
      h('ul', { class: 'clean' }, (P.rules || []).map((r) => h('li', {}, r))),
    ];
    if (P.signupUrl) out.push(h('p', {}, h('a', { class: 'btn', href: P.signupUrl, target: '_blank', rel: 'noopener' }, 'רישום לנושא')));
    out.push(h('h2', {}, 'הנושאים'), chips, search, count, list);
    draw();
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

  const PAGES = {
    bg: { '': courseHome, schedule, presentations },
    app: { '': courseHome, schedule, tools },
  };

  function render() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (parts[0] in LEGACY) { location.replace(LEGACY[parts[0]]); return; }

    const k = KEYS.includes(parts[0]) ? parts[0] : null;
    let page = k ? parts[1] || '' : '';
    if (k && !(page in PAGES[k])) page = '';

    document.body.dataset.course = k || '';
    header(k, page);
    const view = k ? PAGES[k][page] : home;
    app.replaceChildren(...view(k).filter(Boolean));

    const tab = k && TABS[k].find(([p]) => p === page);
    document.title = (k ? LABEL[k] + (page ? ' · ' + tab[1] : '') + ' · ' : '') + D.course.title;
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
