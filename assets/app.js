(function () {
  'use strict';

  const FILES = ['course', 'sessions', 'exercises', 'presentations', 'tools'];
  const D = {};
  const app = document.getElementById('app');

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
    for (const kid of kids.flat()) {
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

  function nextSession() {
    const t = today();
    return D.sessions.sessions.find((s) => s.kind !== 'noclass' && toDay(s.date) >= t) || null;
  }

  function tags(s) {
    const out = [];
    if (s.kind === 'makeup') out.push(h('span', { class: 'tag' }, 'השלמה'));
    if (s.guest) out.push(h('span', { class: 'tag' }, 'הרצאת אורח'));
    return out;
  }

  /* ---------- pages ---------- */

  function home() {
    const c = D.course;
    const n = nextSession();
    const out = [
      h('h1', {}, c.title),
      h('p', { class: 'muted' }, c.subtitle),
    ];

    if (n) {
      out.push(
        h('section', { class: 'card next' },
          h('div', { class: 'label' }, 'המפגש הבא · ' + fmt(n.date)),
          h('h2', { style: 'margin:.2em 0 .3em' }, n.lecture || n.practice),
          n.practice && n.lecture ? h('p', { class: 'muted', style: 'margin:0' }, 'תרגול: ' + n.practice) : null,
          h('p', { style: 'margin:.6em 0 0' }, link('לפרטי המפגש', '#/schedule/' + n.n))
        )
      );
    } else {
      out.push(h('section', { class: 'card' }, 'הסמסטר הסתיים. בהצלחה!'));
    }

    if ((c.announcements || []).length) {
      out.push(h('h2', {}, 'עדכונים'));
      c.announcements.forEach((a) =>
        out.push(h('div', { class: 'note' }, h('div', { class: 'when' }, a.date || ''), h('div', {}, a.text)))
      );
    }

    out.push(
      h('h2', {}, 'מה יש באתר'),
      h('div', { class: 'grid' },
        ...[
          ['#/schedule', 'מפגשים', 'לוח זמנים, הרצאות ותרגולים'],
          ['#/exercises', 'תרגילים', 'המשימות והדרישות להגשה'],
          ['#/presentations', 'פרזנטציות', 'רשימת הנושאים לבחירה'],
          ['#/tools', 'כלים וקישורים', 'תוכנות חינמיות וחומרי עזר'],
        ].map(([href, t, d]) =>
          h('a', { class: 'card', href }, h('span', { class: 't' }, t), h('span', { class: 'd' }, d))
        )
      )
    );

    if (c.grading && c.grading.length) {
      out.push(h('h2', {}, 'ציון'), h('ul', { class: 'clean' }, c.grading.map((g) => h('li', {}, g))));
    }
    return out;
  }

  function schedule(openN) {
    const t = today();
    const n = nextSession();
    const out = [h('h1', {}, 'מפגשים'), h('p', { class: 'muted' }, 'לחצו על מפגש כדי לראות פרטים.')];
    D.sessions.sessions.forEach((s) => {
      const past = toDay(s.date) < t;
      const isNext = n && n.n === s.n;
      const cls = ['sess', past ? 'past' : '', isNext ? 'next-s' : '', s.kind === 'noclass' ? 'noclass' : ''].join(' ');
      const d = h('details', { class: cls, id: 'm' + s.n, open: openN === String(s.n) });
      d.append(
        h('summary', {},
          h('span', { class: 'num' }, s.kind === 'noclass' ? '–' : s.n),
          h('span', { class: 'dt' }, fmt(s.date)),
          h('span', { class: 'tt' },
            s.kind === 'noclass' ? (s.note || 'אין שיעור') : (s.lecture || s.practice),
            isNext ? h('span', { class: 'tag hot' }, 'הבא') : null,
            tags(s)
          )
        )
      );
      if (s.kind !== 'noclass') {
        const rows = [];
        if (s.lecture) rows.push(['הרצאה', s.lecture]);
        if (s.lectureSummary) rows.push(['תקציר', s.lectureSummary]);
        if (s.practice) rows.push(['תרגול', s.practice]);
        if (s.note) rows.push(['הערה', s.note]);
        const body = h('div', { class: 'sess-body' },
          h('dl', {}, rows.map(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]))
        );
        if ((s.materials || []).length) {
          body.append(
            h('p', { style: 'margin:14px 0 4px' }, h('strong', {}, 'חומרים')),
            h('ul', { class: 'clean', style: 'margin:0' }, s.materials.map((m) => h('li', {}, link(m.title, m.url))))
          );
        }
        d.append(body);
      }
      out.push(d);
    });
    return out;
  }

  const STATUS = { open: ['פתוח', 'ok'], soon: ['יפורסם בקרוב', ''], closed: ['נסגר', ''] };

  function exercises() {
    const out = [h('h1', {}, 'תרגילים'), h('p', { class: 'muted' }, D.exercises.intro || '')];
    D.exercises.items.forEach((e) => {
      const st = STATUS[e.status] || STATUS.soon;
      const open = e.status === 'open' || e.status === 'closed';
      const card = h('article', { class: 'card ex ' + (open ? '' : 'soon'), id: 'e' + e.session },
        h('h3', {}, 'מפגש ' + e.session + ': ' + e.title, h('span', { class: 'tag ' + st[1] }, st[0])),
        h('div', { class: 'meta' }, e.tool ? 'תוכנה: ' + e.tool : '', e.due ? ' · הגשה עד ' + fmt(e.due) : '')
      );
      if (open) {
        if (e.goal) card.append(h('p', { style: 'margin:.6em 0 0' }, e.goal));
        if ((e.tasks || []).length) card.append(h('ul', {}, e.tasks.map((x) => h('li', {}, x))));
        if (e.deliverable) card.append(h('p', { style: 'margin:.4em 0' }, h('strong', {}, 'להגשה: '), e.deliverable));
        const links = [];
        if (e.files) e.files.forEach((f) => links.push(link(f.title, f.url)));
        if (e.submitUrl) links.push(link('הגשה', e.submitUrl));
        if (links.length) card.append(h('p', { class: 'small', style: 'margin:.4em 0 0' }, links.flatMap((l, i) => (i ? [' · ', l] : [l]))));
      }
      out.push(card);
    });
    return out;
  }

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

    [['all', 'הכול'], ...Object.entries(CATS)].forEach(([k, label]) =>
      chips.append(h('button', { class: 'chip', type: 'button', 'data-c': k, onclick: () => { cat = k; draw(); } }, label))
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

  /* ---------- router ---------- */

  const ROUTES = { '': home, schedule, exercises, presentations, tools };

  function render() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    const name = parts[0] in ROUTES ? parts[0] : '';
    document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === name));
    app.replaceChildren(...ROUTES[name](parts[1]).filter(Boolean));
    document.title = (name ? [...document.querySelectorAll('#nav a')].find((a) => a.dataset.r === name).textContent + ' · ' : '') + D.course.title;
    if (name === 'schedule' && parts[1]) {
      const el = document.getElementById('m' + parts[1]);
      if (el) el.scrollIntoView({ block: 'start' });
    } else window.scrollTo(0, 0);
  }

  Promise.all(FILES.map((f) => fetch('data/' + f + '.json', { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error(f);
    return r.json();
  })))
    .then((res) => {
      FILES.forEach((f, i) => (D[f] = res[i]));
      document.getElementById('brand').textContent = D.course.title;
      document.getElementById('foot-text').textContent = D.course.footer || '';
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
