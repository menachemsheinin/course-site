/* כלי גלריה: כיווץ תמונה בדפדפן לפני העלאה, וצפייה בגודל מלא (lightbox). ללא תלות באפליקציה הראשית. */
(function () {
  'use strict';

  const FULL_MAX_DIM = 2400;       // הצלע הארוכה בתמונה המלאה
  const FULL_MAX_BYTES = 3500000;  // יעד גודל, מתחת למגבלת השרת (4.2MB)
  const THUMB_DIM = 640;

  function canvasBlob(bitmap, maxDim, quality) {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; // PNG עם שקיפות הופך ל-JPEG על רקע לבן
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve({ blob: b, w, h }) : reject(new Error('encode'))), 'image/jpeg', quality));
  }

  const PDF_MAX_BYTES = 4000000;     // גודל מקסימלי לקובץ PDF
  const PDF_PAGE_MAX_BYTES = 1000000; // תמונת העמוד הראשון, כדי שהבקשה כולה תישאר מתחת למגבלת השרת
  const isPdfFile = (f) => !!f && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name || ''));

  let pdfLib = null;
  function loadPdfJs() {
    if (window.pdfjsLib) { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdf.worker.min.js'; return Promise.resolve(window.pdfjsLib); }
    if (pdfLib) return pdfLib;
    pdfLib = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'assets/vendor/pdf.min.js';
      s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdf.worker.min.js'; resolve(window.pdfjsLib); };
      s.onerror = () => { pdfLib = null; reject(new Error('pdf-lib')); };
      document.head.append(s);
    });
    return pdfLib;
  }

  // PDF: מציירים את העמוד הראשון כתמונה (לגלריה), והקובץ המקורי נשלח להורדה
  async function preparePdf(file) {
    if (file.size > PDF_MAX_BYTES) throw new Error('pdf-size');
    const lib = await loadPdfJs();
    let canvas;
    try {
      const doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
      const page = await doc.getPage(1);
      const v0 = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: Math.min(4, 2000 / Math.max(v0.width, v0.height)) });
      canvas = document.createElement('canvas');
      canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      // intent: 'print' מצייר בלי requestAnimationFrame, כך שהציור לא נתקע כשהלשונית ברקע
      await page.render({ canvasContext: ctx, viewport: vp, intent: 'print' }).promise;
    } catch (e) { throw new Error('pdf'); }
    let dim = 1800, q = 0.88, full = await canvasBlob(canvas, dim, q);
    while (full.blob.size > PDF_PAGE_MAX_BYTES && (q > 0.6 || dim > 1000)) {
      if (q > 0.6) q -= 0.08; else dim = Math.round(dim * 0.85);
      full = await canvasBlob(canvas, dim, q);
    }
    const thumb = await canvasBlob(canvas, THUMB_DIM, 0.82);
    return { full: full.blob, thumb: thumb.blob, w: full.w, h: full.h, pdf: file };
  }

  // מקבל קובץ תמונה או PDF ומחזיר { full, thumb, w, h, pdf? }: JPEG באיכות טובה וממוזער
  async function prepare(file) {
    if (isPdfFile(file)) return preparePdf(file);
    if (!file || !/^image\//.test(file.type)) throw new Error('not-image');
    let bitmap;
    try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { throw new Error('decode'); }
    let dim = FULL_MAX_DIM, q = 0.9, full = await canvasBlob(bitmap, dim, q);
    while (full.blob.size > FULL_MAX_BYTES && (q > 0.62 || dim > 1200)) {
      if (q > 0.62) q -= 0.08; else dim = Math.round(dim * 0.85);
      full = await canvasBlob(bitmap, dim, q);
    }
    if (full.blob.size > FULL_MAX_BYTES) throw new Error('too-big');
    const thumb = await canvasBlob(bitmap, THUMB_DIM, 0.82);
    if (bitmap.close) bitmap.close();
    return { full: full.blob, thumb: thumb.blob, w: full.w, h: full.h };
  }

  // lightbox: items = [{ src, title, caption, openUrl }], start = מיקום התחלתי
  function openLightbox(items, start) {
    let i = start;
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const root = el('div', 'lb');
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'צפייה בתמונה');
    const img = el('img', 'lb-img');
    const cap = el('div', 'lb-cap');
    const close = el('button', 'lb-btn lb-x', '✕'); close.type = 'button'; close.setAttribute('aria-label', 'סגירה');
    const prev = el('button', 'lb-btn lb-prev', '›'); prev.type = 'button'; prev.setAttribute('aria-label', 'הקודמת');
    const next = el('button', 'lb-btn lb-next', '‹'); next.type = 'button'; next.setAttribute('aria-label', 'הבאה');
    const open = el('a', 'lb-open', 'פתיחה בגודל מקורי'); open.target = '_blank'; open.rel = 'noopener';
    root.append(img, cap, close, prev, next, open);

    function show(n) {
      i = (n + items.length) % items.length;
      const it = items[i];
      img.src = it.src;
      img.alt = it.title || '';
      cap.replaceChildren(el('strong', '', it.title || ''), it.caption ? el('span', '', ' · ' + it.caption) : '', el('span', 'lb-n', '  ' + (i + 1) + '/' + items.length));
      open.href = it.openUrl || it.src;
      open.textContent = it.openLabel || 'פתיחה בגודל מקורי';
      prev.hidden = next.hidden = items.length < 2;
    }
    function shut() {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      root.remove();
    }
    function onKey(e) {
      if (e.key === 'Escape') shut();
      else if (e.key === 'ArrowLeft') show(i + 1);   // בעברית ההתקדמות שמאלה
      else if (e.key === 'ArrowRight') show(i - 1);
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    close.addEventListener('click', shut);
    prev.addEventListener('click', (e) => { e.stopPropagation(); show(i - 1); });
    next.addEventListener('click', (e) => { e.stopPropagation(); show(i + 1); });
    root.addEventListener('click', (e) => { if (e.target === root || e.target === img) shut(); });
    let sx = null;
    root.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', (e) => {
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 60) show(dx < 0 ? i + 1 : i - 1);
    });
    document.addEventListener('keydown', onKey);
    document.body.append(root);
    show(i);
    close.focus();
    return { close: shut };
  }

  window.GalleryTools = { prepare, openLightbox, isPdfFile };
})();
