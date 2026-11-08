/* Lese-Ansicht der Bücher von Tomas Hecker: blättern, Seitenzahl, Inhalt, vergrößern, Vollbild.
   Ohne dieses Skript lassen sich die Seiten trotzdem wischen und scrollen. Es speichert nichts. */
(() => {
  'use strict';
  const L = document.getElementById('leser');
  if (!L) return;
  const $ = id => document.getElementById(id);
  const track = $('track'), slider = $('slider'), count = $('zaehler'), toc = $('inhaltWrap');
  const textLink = $('alsText'), zoom = $('zoom'), zoomScroll = $('zoomScroll'), zoomImg = $('zoomImg');
  const hint = $('hint'), fsBtn = $('vollbild');
  const total = +L.dataset.seiten, zoomMin = +L.dataset.zoom || 0;
  const reduceQ = matchMedia('(prefers-reduced-motion: reduce)');
  let targets = [], cur = 0, curPage = 1, pending = null, raf = 0, hashT = 0, settleT = 0, hintT = 0;
  let lastW = 0, lastH = 0;

  L.classList.add('js');
  $('steuerung').hidden = false;

  const shown = el => el.offsetWidth > 0;
  const isTarget = el => shown(el) && !/none/.test(getComputedStyle(el).scrollSnapAlign || 'none');
  function measure() {
    targets = [...track.children].filter(isTarget);
    slider.max = targets.length;
  }
  function pagesOf(k) {
    const out = [], end = targets[k + 1];
    for (let el = targets[k]; el && el !== end; el = el.nextElementSibling) {
      if (el.dataset.n && shown(el)) out.push(el);
    }
    return out;
  }
  function range(k) {
    const ps = pagesOf(k);
    if (!ps.length) return [1, 1];
    const last = ps[ps.length - 1];
    return [+ps[0].dataset.n, +(last.dataset.n2 || last.dataset.n)];
  }
  function sheetOfPage(n) {
    // erste Ansicht, die Seite n zeigt; ist n verborgen (leere Seite), die nächste danach
    for (let k = 0; k < targets.length; k++) if (n <= range(k)[1]) return k;
    return targets.length - 1;
  }
  function nearest() {
    const x = track.scrollLeft;
    let best = 0, d = Infinity;
    targets.forEach((el, k) => {
      const e = Math.abs(el.offsetLeft - x);
      if (e < d) { d = e; best = k; }
    });
    return best;
  }
  function load(k) {
    for (let j = Math.max(0, k - 1); j <= Math.min(targets.length - 1, k + 2); j++) {
      for (const p of pagesOf(j)) for (const img of p.querySelectorAll('img')) {
        if (img.loading !== 'eager') img.loading = 'eager';
      }
    }
  }
  function setHash(h) {
    if (location.hash.slice(1) === h) return;
    try { history.replaceState(null, '', '#' + h); } catch (e) { /* z. B. in einer Vorschau */ }
  }
  function markToc(last) {
    let best = null;
    for (const a of toc.querySelectorAll('a[data-n]')) {
      a.removeAttribute('aria-current');
      if (+a.dataset.n <= last) best = a;
    }
    if (best) best.setAttribute('aria-current', 'true');
  }
  function update() {
    if (!targets.length) return;
    const [f, l] = range(cur);
    curPage = f;
    count.textContent = f === l ? `Seite ${f} von ${total}` : `Seiten ${f}–${l} von ${total}`;
    slider.value = cur + 1;
    $('zurueck').disabled = $('seitlichZurueck').disabled = cur === 0;
    $('weiter').disabled = $('seitlichWeiter').disabled = cur === targets.length - 1;
    load(cur);
    const first = pagesOf(cur)[0];
    if (first && first.dataset.text && textLink) textLink.href = first.dataset.text;
    clearTimeout(hashT);
    hashT = setTimeout(() => setHash('seite-' + f), 250);
    markToc(l);
  }
  function goTo(k, smooth) {
    k = Math.max(0, Math.min(targets.length - 1, k));
    if (!targets[k]) return;
    const anim = smooth && !reduceQ.matches;
    track.scrollTo({ left: targets[k].offsetLeft, behavior: anim ? 'smooth' : 'auto' });
    if (anim) {
      pending = k;
      clearTimeout(settleT);
      settleT = setTimeout(() => { pending = null; }, 700);
    } else { pending = null; cur = k; update(); }
  }
  const step = d => goTo((pending ?? cur) + d, true);

  track.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      // Während sich die Größe ändert, ordnet der ResizeObserver neu; bis dahin gelten die alten Seiten.
      if (track.clientWidth !== lastW || track.clientHeight !== lastH) return;
      const k = nearest();
      if (k !== cur) { cur = k; update(); hideHint(); }
    });
  }, { passive: true });
  track.addEventListener('scrollend', () => { pending = null; });

  /* Inhaltsverzeichnis */
  toc.addEventListener('toggle', () => {
    if (!toc.open) return;
    const c = toc.querySelector('a[aria-current="true"]') || toc.querySelector('nav a');
    if (c) { c.scrollIntoView({ block: 'center' }); c.focus({ preventScroll: true }); }
  });
  toc.addEventListener('click', e => {
    const a = e.target.closest('a[data-n]');
    if (a) {
      e.preventDefault();
      toc.open = false;
      goTo(sheetOfPage(+a.dataset.n), false);
      track.focus({ preventScroll: true });
    } else if (e.target.classList.contains('r-scrim')) {
      toc.open = false;
    }
  });

  /* Vergrößern */
  function openZoom(img, fx, fy) {
    if (!img) return;
    const link = img.closest('a');
    const ratio = img.getAttribute('height') / img.getAttribute('width');
    const big = +(link.href.match(/-(\d+)\.webp/) || [0, 1600])[1];
    const w = Math.round(Math.max(zoomMin, Math.min(big, L.clientWidth)));
    const h = Math.round(w * ratio);
    zoomImg.width = w; zoomImg.height = h;
    zoomImg.style.width = w + 'px'; zoomImg.style.height = h + 'px';
    zoomImg.src = link.href;
    zoomImg.alt = img.alt + ', vergrößert';
    zoom.hidden = false;
    requestAnimationFrame(() => {
      zoomScroll.scrollLeft = Math.max(0, fx * w - zoomScroll.clientWidth / 2);
      zoomScroll.scrollTop = Math.max(0, fy * h - zoomScroll.clientHeight / 2);
      $('zoomClose').focus({ preventScroll: true });
    });
    hideHint();
  }
  function closeZoom() {
    if (zoom.hidden) return;
    zoom.hidden = true;
    zoomImg.removeAttribute('src');
    track.focus({ preventScroll: true });
  }
  function fraction(img, e) {
    const r = img.getBoundingClientRect();
    const iw = +img.getAttribute('width'), ih = +img.getAttribute('height');
    const s = Math.min(r.width / iw, r.height / ih);
    const cw = iw * s, ch = ih * s;
    const pos = getComputedStyle(img).objectPosition.split(' ')[0];
    const ox = pos === '100%' ? r.width - cw : pos === '0%' ? 0 : (r.width - cw) / 2;
    const oy = (r.height - ch) / 2;
    const fx = (e.clientX - r.left - ox) / cw, fy = (e.clientY - r.top - oy) / ch;
    return [Math.min(1, Math.max(0, fx)), Math.min(1, Math.max(0, fy))];
  }
  track.addEventListener('click', e => {
    const a = e.target.closest('a.r-zoomlink');
    if (!a) return;
    e.preventDefault();
    const img = a.querySelector('img');
    const [fx, fy] = fraction(img, e);
    openZoom(img, fx, fy);
  });
  $('zoomBtn').addEventListener('click', () => {
    const p = pagesOf(cur)[0];
    if (p) openZoom(p.querySelector('img'), .5, .3);
  });
  zoomImg.addEventListener('click', closeZoom);
  $('zoomClose').addEventListener('click', closeZoom);

  /* Knöpfe und Regler */
  $('zurueck').addEventListener('click', () => step(-1));
  $('weiter').addEventListener('click', () => step(1));
  $('seitlichZurueck').addEventListener('click', () => step(-1));
  $('seitlichWeiter').addEventListener('click', () => step(1));
  slider.addEventListener('input', () => goTo(+slider.value - 1, false));

  if (document.fullscreenEnabled && L.requestFullscreen) {
    fsBtn.hidden = false;
    fsBtn.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else L.requestFullscreen().catch(() => {});
    });
    document.addEventListener('fullscreenchange', () => {
      $('vollbildLbl').textContent = document.fullscreenElement ? 'Vollbild beenden' : 'Vollbild';
    });
  }

  /* Hinweis für das Querformat-Buch am Handy */
  function showHint() {
    if (!L.dataset.quer || !matchMedia('(orientation: portrait) and (max-width: 600px)').matches) return;
    hint.hidden = false;
    hintT = setTimeout(hideHint, 7000);
  }
  function hideHint() { hint.hidden = true; clearTimeout(hintT); }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!zoom.hidden) { e.preventDefault(); closeZoom(); }
      else if (toc.open) { e.preventDefault(); toc.open = false; toc.querySelector('summary').focus(); }
      return;
    }
    if (!zoom.hidden || toc.open || e.target === slider || e.altKey || e.ctrlKey || e.metaKey) return;
    if ((e.key === ' ' || e.key === 'Enter') && e.target.closest('button, a, summary')) return;
    switch (e.key) {
      case 'ArrowRight': case 'PageDown': step(1); break;
      case 'ArrowLeft': case 'PageUp': step(-1); break;
      case ' ': step(e.shiftKey ? -1 : 1); break;
      case 'Home': goTo(0, false); break;
      case 'End': goTo(targets.length - 1, false); break;
      default: return;
    }
    e.preventDefault();
  });

  function fromHash() {
    const m = /^#seite-(\d+)$/.exec(location.hash);
    return m ? Math.min(total, Math.max(1, +m[1])) : 1;
  }
  addEventListener('hashchange', () => goTo(sheetOfPage(fromHash()), false));

  new ResizeObserver(() => {
    if (track.clientWidth === lastW && track.clientHeight === lastH) return;
    lastW = track.clientWidth; lastH = track.clientHeight;
    measure();
    goTo(sheetOfPage(curPage), false);
  }).observe(track);

  measure();
  lastW = track.clientWidth; lastH = track.clientHeight;
  goTo(sheetOfPage(fromHash()), false);
  track.focus({ preventScroll: true });
  showHint();
})();
