// Cowboy Bebop – Scroll-Hommage Nº 03, gebaut wie der Vorspann der Serie.
// „3 · 2 · 1 · Let's jam“ in harten Farbflächen → Farbbalken geben Spike frei (Kling-Clip) →
// Swordfish II taucht ins Gate → Fall durchs Kirchenfenster → „Bang.“ → „See you space cowboy…“.
// Clips liegen als Einzelbilder vor (bilder/seq1–4) und werden per Scrollposition auf Canvas gezeichnet.
(() => {
  const qs = new URLSearchParams(location.search);
  const SHOT = qs.has('t');            // Standbild für Screenshots: ?t=0&sec=ship&p=0.5, dazu &ago= (ms nach „Bang“)

  const W = 2400, H = 1600;
  const CLIPS = { c1: 41, c2: 61, c3: 58, c4: 41 };

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const mix = (a, b, k) => a + (b - a) * k;
  const E = {
    out3: (k) => 1 - Math.pow(1 - k, 3),
    in2: (k) => k * k,
    inOut: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
  };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const set = (el, k, v) => el.style.setProperty(k, typeof v === 'number' ? v.toFixed(4) : v);
  // Scrollposition → Bild über Stützstellen [[p, bild], …]
  const map = (p, stops) => {
    if (p <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) if (p < stops[i][0]) return mix(stops[i - 1][1], stops[i][1], seg(p, stops[i - 1][0], stops[i][0]));
    return stops[stops.length - 1][1];
  };

  const sec = {};
  $$('[data-sec]').forEach((s) => { sec[s.dataset.sec] = s; });
  let vw = innerWidth, vh = innerHeight;
  const start = performance.now();
  let last = start, bangAt = -1e9, wasBang = false;

  /* ---------------- Bildfolgen-Spieler ---------------- */
  function makeSeq(cvs, dir, n) {
    const g = cvs.getContext('2d');
    const imgs = Array.from({ length: n }, (_, i) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = `bilder/${dir}/${String(i).padStart(3, '0')}.webp?v=3`;
      return img;
    });
    const ready = Promise.all(imgs.map((img) => (img.complete ? 0 : new Promise((r) => { img.onload = img.onerror = r; }))));
    let key = '';
    return {
      ready,
      size() { const d = Math.min(devicePixelRatio || 1, 2); cvs.width = Math.round(vw * d); cvs.height = Math.round(vh * d); key = ''; },
      // Bild i, Zoom z, Bildpunkt (fx, fy) ∈ 0..1 auf Bildschirmpunkt (sx, sy), Rand bleibt bedeckt
      draw(i, z, fx, fy, sx = vw / 2, sy = vh / 2, dx = 0, dy = 0) {
        const s = Math.max(vw / W, vh / H) * z, w = W * s, h = H * s;
        const x = clamp(sx - fx * w, vw - w, 0) + dx, y = clamp(sy - fy * h, vh - h, 0) + dy;
        let k = Math.min(n - 1, Math.max(0, Math.round(i)));
        while (k > 0 && !(imgs[k].complete && imgs[k].naturalWidth)) k--;
        const img = imgs[k];
        if (!img.complete || !img.naturalWidth) return;
        const nk = [k, x.toFixed(1), y.toFixed(1), w.toFixed(1), cvs.width].join('|');
        if (nk === key) return;
        key = nk;
        const d = cvs.width / vw;
        g.setTransform(d, 0, 0, d, 0, 0);
        g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
        g.drawImage(img, x, y, w, h);
      },
    };
  }
  const seq = {};
  for (const [id, n] of Object.entries(CLIPS)) seq[id] = makeSeq($('#' + id), 'seq' + id.slice(1), n);

  const prog = (el) => { const r = el.getBoundingClientRect(); const t = r.height - vh; return t > 0 ? clamp(-r.top / t) : 0; };
  const onScreen = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < vh; };
  const lines = (els, k, st = 0.12) => els.forEach((l, i) => set(l, '--r', E.out3(clamp(k * (1 + st * els.length) - i * st))));

  // Schriftzug der Schlusskarte Zeichen für Zeichen
  const seeEl = $('.see');
  const seeText = seeEl.textContent;
  seeEl.textContent = '';
  const seeChars = [...seeText].map((ch) => { const s = document.createElement('span'); s.textContent = ch; s.style.opacity = '0'; seeEl.appendChild(s); return s; });

  const T = {
    t1: { el: $('[data-b="t1"]') }, t2: { el: $('[data-b="t2"]') }, t3: { el: $('[data-b="t3"]') }, t4: { el: $('[data-b="t4"]') },
    spec: { el: $('[data-b="spec"]') },
  };
  for (const k in T) T[k].lines = $$('.ln', T[k].el);
  const panels = $$('.count .panel');
  const count = $('.count');

  function update(now) {
    const intro = SHOT ? 3 : (now - start) / 1000;
    const tall = vh > vw;

    /* ---------- Countdown → Spike ---------- */
    if (onScreen(sec.jam)) {
      const s = sec.jam, p = prog(s);
      const starts = [-1, 0.07, 0.14, 0.21];
      panels.forEach((pn, i) => {
        // „3“ wischt beim Laden herein, die übrigen beim Scrollen – jeweils hart über die vorige Fläche
        const w = i === 0 ? E.out3(clamp((intro - 0.1) / 0.55)) : E.out3(seg(p, starts[i], starts[i] + 0.025));
        set(pn, '--w', w);
        const from = i === 0 ? 0 : starts[i];
        set(pn, '--s', 1.07 - 0.07 * seg(p, from, from + 0.08));
      });
      // nach „Let's jam“ blendet das Schwarz weich in die Szene
      const fade = seg(p, 0.29, 0.38);
      count.style.opacity = (1 - E.inOut(fade)).toFixed(3);
      count.style.visibility = fade < 1 ? 'visible' : 'hidden';
      set(s, '--cue', 1 - seg(p, 0, 0.04));
      seq.c1.draw(map(p, [[0.36, 0], [0.92, CLIPS.c1 - 1]]), 1, tall ? 0.42 : 0.5, 0.08);
      set(T.t1.el, '--o', seg(p, 0.44, 0.47));
      lines(T.t1.lines, seg(p, 0.44, 0.56));
      set(T.t1.el, '--q', seg(p, 0.62, 0.7));
    }

    /* ---------- Swordfish II ---------- */
    if (onScreen(sec.ship)) {
      const s = sec.ship, p = prog(s);
      const f = map(p, [[0.1, 0], [0.42, 28], [0.86, CLIPS.c2 - 1]]);
      seq.c2.draw(f, 1.02, tall ? mix(0.22, 0.6, seg(f, 0, 50)) : 0.5, 0.5);
      set(s, '--flash', 0.85 * Math.max(0, 1 - Math.abs(f - 50.5) / 2.5));
      set(T.t2.el, '--o', seg(p, 0.14, 0.18));
      lines(T.t2.lines, seg(p, 0.14, 0.26));
      set(T.spec.el, '--o', seg(p, 0.2, 0.28));
    }

    /* ---------- Kirche ---------- */
    if (onScreen(sec.church)) {
      const s = sec.church, p = prog(s);
      seq.c3.draw(map(p, [[0.1, 0], [0.88, CLIPS.c3 - 1]]), 1.02, 0.5, 0.45);
      set(T.t3.el, '--o', seg(p, 0.12, 0.16));
      lines(T.t3.lines, seg(p, 0.5, 0.64));
    }

    /* ---------- Bang ---------- */
    if (onScreen(sec.bang)) {
      const s = sec.bang, p = prog(s);
      seq.c4.draw(map(p, [[0.08, 0], [0.55, CLIPS.c4 - 1]]), 1.02, tall ? 0.47 : 0.5, 0.42);
      set(T.t4.el, '--o', seg(p, 0.1, 0.13) * (1 - seg(p, 0.52, 0.55)));
      set(T.t4.el, '--q', seg(p, 0.18, 0.28));
      const isBang = p >= 0.57;
      if (isBang && !wasBang) bangAt = now;
      wasBang = isBang;
      const ago = SHOT ? parseFloat(qs.get('ago') || '2000') : now - bangAt;
      set(s, '--bo', isBang ? 1 : 0);
      set(s, '--slam', isBang ? Math.exp(-ago / 140) : 0);
      set(s, '--end', p >= 0.72 ? 1 : 0);                       // harter Schnitt auf Schwarz
      const n = Math.round(seg(p, 0.75, 0.9) * seeChars.length);
      seeChars.forEach((c, i) => { const o = i < n ? '1' : '0'; if (c.style.opacity !== o) c.style.opacity = o; });
      set(s, '--wt', seg(p, 0.92, 0.97));
    }
  }

  const resize = () => { vw = innerWidth; vh = innerHeight; Object.values(seq).forEach((q) => q.size()); };
  addEventListener('resize', resize);
  resize();

  // Vollbild für Tablet/Handy; als App vom Startbildschirm läuft die Seite ohnehin im Vollbild
  const fsBtn = $('.fs-btn'), root = document.documentElement;
  const canFs = !!(root.requestFullscreen || root.webkitRequestFullscreen);
  const standalone = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
  const syncFs = () => { fsBtn.hidden = !canFs || standalone || SHOT || !!(document.fullscreenElement || document.webkitFullscreenElement); };
  fsBtn.addEventListener('click', async () => {
    try {
      if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' }); else root.webkitRequestFullscreen();
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    } catch (e) { /* abgelehnt */ }
  });
  document.addEventListener('fullscreenchange', syncFs);
  document.addEventListener('webkitfullscreenchange', syncFs);
  syncFs();

  if (SHOT) {
    Promise.all([document.fonts.ready, ...Object.values(seq).map((q) => q.ready)]).then(() => {
      const target = qs.get('sec') && sec[qs.get('sec')];
      window.scrollTo(0, target ? target.offsetTop + parseFloat(qs.get('p') || '0') * (target.offsetHeight - vh) : parseFloat(qs.get('t')) * vh);
      requestAnimationFrame(() => { update(performance.now()); window.__dbg = { vw, vh, y: scrollY }; window.__done = true; });
    });
    return;
  }

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  const lenis = window.Lenis ? new window.Lenis({ lerp: 0.09, smoothWheel: true }) : null;
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const el = id === '#top' ? document.body : $(id);
    if (!el) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(el, { duration: 2 }); else el.scrollIntoView({ behavior: 'smooth' });
  }));
  function frame(now) {
    last = now;
    if (lenis) lenis.raf(now);
    update(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
