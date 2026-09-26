(function () {
  'use strict';
  const App = (window.App = { cleanups: [], listeners: {}, routes: [] });

  /* ---------- tiny DOM helpers ---------- */
  App.$ = (s, r = document) => r.querySelector(s);
  App.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  App.h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  App.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  App.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  App.hex = (n, w = 2) => n.toString(16).toUpperCase().padStart(w, '0');
  App.reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- events + lifecycle ---------- */
  App.on = (ev, fn) => { (App.listeners[ev] = App.listeners[ev] || []).push(fn); return () => { App.listeners[ev] = (App.listeners[ev] || []).filter((f) => f !== fn); }; };
  App.emit = (ev, d) => (App.listeners[ev] || []).slice().forEach((f) => f(d));
  App.own = (fn) => { App.cleanups.push(fn); return fn; };
  App.onScoped = (ev, fn) => App.own(App.on(ev, fn));
  App.loop = function (fn) {
    let alive = true, last = performance.now(), id;
    const tick = (t) => { if (!alive) return; const dt = Math.min(64, t - last); last = t; fn(dt, t); id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    const stop = () => { alive = false; cancelAnimationFrame(id); };
    App.own(stop);
    return stop;
  };
  App.every = (ms, fn) => { const id = setInterval(fn, ms); const stop = () => clearInterval(id); App.own(stop); return stop; };
  App.later = (ms, fn) => { const id = setTimeout(fn, ms); App.own(() => clearTimeout(id)); return id; };

  /* ---------- theme-aware colors ---------- */
  App.cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  let colorCache = null;
  App.on('theme', () => { colorCache = null; });
  App.col = () => colorCache || (colorCache = ['bg', 'surface', 'surface-2', 'line', 'line-2', 'text', 'muted', 'faint', 'accent', 'accent-2', 'bad']
    .reduce((o, k) => { o[k.replace(/-(\w)/g, (m, c) => c.toUpperCase())] = App.cssVar('--' + k) || '#888888'; return o; }, {}));
  App.alpha = (hex, a) => {
    const m = /^#?([0-9a-f]{6})/i.exec(hex || '');
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  if (window.matchMedia) {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', () => App.emit('theme'));
  }
  try { new MutationObserver(() => App.emit('theme')).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); } catch (e) { /* noop */ }

  /* ---------- canvas with DPR scaling ---------- */
  App.canvas = function (cv, draw) {
    const ctx = cv.getContext('2d');
    const st = { ctx, w: 0, h: 0 };
    let ready = false;
    st.fit = () => {
      const r = cv.getBoundingClientRect();
      const d = Math.min(2, window.devicePixelRatio || 1);
      st.w = Math.max(1, r.width); st.h = Math.max(1, r.height);
      cv.width = Math.round(st.w * d); cv.height = Math.round(st.h * d);
      if (ctx) ctx.setTransform(d, 0, 0, d, 0, 0);
      if (draw && ctx && ready) draw(st);
    };
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => st.fit()); ro.observe(cv); App.own(() => ro.disconnect()); }
    st.fit();
    queueMicrotask(() => { ready = true; if (draw && ctx) draw(st); });
    if (draw) App.onScoped('theme', () => requestAnimationFrame(() => ctx && draw(st)));
    return st;
  };

  /* ---------- progress store (per-viewer, browser only) ---------- */
  const KEY = 'locard:v1';
  App.store = {
    d: { done: {}, quiz: {} },
    load() { try { const r = localStorage.getItem(KEY); if (r) { const p = JSON.parse(r); this.d.done = p.done || {}; this.d.quiz = p.quiz || {}; } } catch (e) { /* storage unavailable */ } },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.d)); } catch (e) { /* storage unavailable */ } },
    done(id) { return !!this.d.done[id]; },
    setDone(id, v) { if (v) this.d.done[id] = Date.now(); else delete this.d.done[id]; this.save(); App.emit('progress'); },
    quizBest(set) { return this.d.quiz[set]; },
    setQuiz(set, score, total) { const cur = this.d.quiz[set]; if (!cur || score > cur.score) this.d.quiz[set] = { score, total }; this.save(); },
    reset() { this.d = { done: {}, quiz: {} }; this.save(); App.emit('progress'); }
  };
  App.store.load();

  /* ---------- course map ---------- */
  App.course = [
    {
      id: 'foundations', name: 'Foundations', icon: 'seal', full: 'Process, integrity and acquisition',
      lede: 'Before any artifact matters, the evidence has to be collected in the right order, copied without changing it, and provably untouched from seizure to court.',
      lessons: [
        { id: 'lifecycle', title: 'How an incident response unfolds', short: 'Response lifecycle', min: 7 },
        { id: 'volatility', title: 'Collect the most fragile evidence first', short: 'Order of volatility', min: 6 },
        { id: 'hashing', title: 'Proving evidence has not changed', short: 'Hashing and custody', min: 7 },
        { id: 'imaging', title: 'Copying a disk without touching it', short: 'Imaging', min: 7 }
      ]
    },
    {
      id: 'disk', name: 'Disk and files', icon: 'disk', full: 'File systems, carving, timestamps and Windows artifacts',
      lede: 'Deleting a file rarely destroys it, and Windows keeps quiet records of nearly everything a user runs. This track teaches you where to look and how to read it.',
      lessons: [
        { id: 'deleted', title: 'Why deleted files come back', short: 'Deleted files', min: 8 },
        { id: 'carving', title: 'Finding files by their fingerprints', short: 'File carving', min: 8 },
        { id: 'timestamps', title: 'Reading and doubting timestamps', short: 'Timestamps', min: 8 },
        { id: 'execution', title: 'Proving a program ran', short: 'Execution artifacts', min: 8 }
      ]
    },
    {
      id: 'live', name: 'Logs, memory and network', icon: 'pulse', full: 'Event logs, memory, network traffic and the timeline',
      lede: 'Attackers try to leave no files behind. Logs, RAM and packets still tell the story, and a timeline stitches every source into one sequence of events.',
      lessons: [
        { id: 'eventlogs', title: 'Hunting through Windows event logs', short: 'Event logs', min: 9 },
        { id: 'memory', title: 'Spotting the process that does not belong', short: 'Memory forensics', min: 8 },
        { id: 'network', title: 'Finding a beacon in the noise', short: 'Network forensics', min: 8 },
        { id: 'timeline', title: 'Building the case timeline', short: 'Timeline case', min: 12 }
      ]
    }
  ];
  App.track = (id) => App.course.find((t) => t.id === id);
  App.allLessons = () => App.course.flatMap((t) => t.lessons.map((l) => ({ ...l, track: t.id, key: `${t.id}/${l.id}` })));

  /* ---------- icons (hand-drawn SVG primitives) ---------- */
  const P = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    play: '<path d="M8 5.5v13l10-6.5z"/>',
    pause: '<path d="M9 5v14M15 5v14"/>',
    reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    ext: '<path d="M14 5h5v5"/><path d="M19 5l-8 8"/><path d="M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>',
    next: '<path d="M9 6l6 6-6 6"/>',
    prev: '<path d="M15 6l-6 6 6 6"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    wave: '<path d="M3 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0"/>',
    seal: '<path d="M12 3l7 3v5.5c0 4.2-2.9 7.8-7 9.5-4.1-1.7-7-5.3-7-9.5V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
    disk: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6" fill="currentColor"/><path d="M16.5 17.5h1"/>',
    pulse: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
    flag: '<path d="M6 21V4"/><path d="M6 4h11l-2 4 2 4H6"/>',
    file: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/>',
    trash: '<path d="M4.5 7h15"/><path d="M9 7V4.5h6V7"/><path d="M6.5 7l1 13h9l1-13"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4"/><path d="M12 17v.5"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>'
  };
  App.icon = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

  /* ---------- form controls ---------- */
  App.range = (name, label, min, max, step, val) => `
    <div class="ctl">
      <div class="ctl-top"><label for="r-${name}">${label}</label><output id="o-${name}" for="r-${name}"></output></div>
      <input type="range" id="r-${name}" data-r="${name}" min="${min}" max="${max}" step="${step}" value="${val}">
    </div>`;
  App.fillRange = (inp) => { const p = ((inp.value - inp.min) / (inp.max - inp.min)) * 100; inp.style.setProperty('--p', p + '%'); };
  document.addEventListener('input', (e) => { if (e.target.matches && e.target.matches('input[type=range]')) App.fillRange(e.target); });

  App.seg = (name, options, value, label) => `<div class="seg" role="radiogroup" aria-label="${label || name}" data-seg="${name}">${options.map(([v, l]) => `<button type="button" role="radio" aria-checked="${v === value}" data-v="${v}">${l}</button>`).join('')}</div>`;
  App.bindSeg = (root, name, fn) => {
    const g = root.querySelector(`[data-seg="${name}"]`);
    if (!g) return;
    const set = (b) => { g.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', String(x === b))); fn(b.dataset.v); };
    g.addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) set(b); });
    g.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const bs = Array.from(g.querySelectorAll('button')); const i = bs.findIndex((b) => b.getAttribute('aria-checked') === 'true');
      const n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length]; n.focus(); set(n); e.preventDefault();
    });
  };
  App.toggle = (name, label, on) => `<label class="switch"><input type="checkbox" data-t="${name}" ${on ? 'checked' : ''}><span class="knob" aria-hidden="true"><i></i></span><span>${label}</span></label>`;

  /* ---------- sequence diagram player (used by several labs) ---------- */
  App.seq = function (host, opts) {
    let steps = opts.steps, i = 0, timer = null;
    const actors = opts.actors;
    host.innerHTML = `
      <div class="seq">
        <div class="seq-stage"><svg class="seq-svg" role="img" aria-label="${App.esc(opts.label || 'Message sequence')}"></svg></div>
        <div class="seq-side">
          <div class="seq-count" aria-live="polite"></div>
          <h3 class="seq-title"></h3>
          <p class="seq-note"></p>
          <div class="seq-extra"></div>
          <div class="seq-ctl">
            <button type="button" class="btn" data-a="back">${App.icon('prev', 16)}Back</button>
            <button type="button" class="btn primary" data-a="next">Next step${App.icon('next', 16)}</button>
            <button type="button" class="btn ghost" data-a="play">${App.icon('play', 16)}Play</button>
            <button type="button" class="btn ghost" data-a="reset">${App.icon('reset', 16)}Restart</button>
          </div>
        </div>
      </div>`;
    const svg = host.querySelector('.seq-svg'), stage = host.querySelector('.seq-stage');
    const W = 640, top = 66, rowH = 46;
    const ax = (id) => { const k = actors.findIndex((a) => a.id === id); const n = actors.length; return n === 1 ? W / 2 : 82 + k * ((W - 164) / (n - 1)); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } host.querySelector('[data-a=play]').innerHTML = App.icon('play', 16) + 'Play'; };
    App.own(stop);

    function draw() {
      const n = steps.length, H = top + n * rowH + 20;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      let s = '';
      actors.forEach((a) => {
        const x = ax(a.id);
        s += `<g class="seq-actor ${a.cls || ''}"><line class="life" x1="${x}" y1="44" x2="${x}" y2="${H - 6}"/><rect x="${x - 66}" y="8" width="132" height="36" rx="9"/><text x="${x}" y="31" text-anchor="middle">${App.esc(a.label)}</text></g>`;
      });
      steps.forEach((st, k) => {
        if (k > i) return;
        const y = top + k * rowH + 20, state = k < i ? 'past' : 'cur';
        if (st.banner) {
          s += `<g class="seq-banner ${state} ${st.tone || ''}"><rect x="18" y="${y - 15}" width="${W - 36}" height="28" rx="7"/><text x="${W / 2}" y="${y + 4}" text-anchor="middle">${App.esc(st.short || st.msg)}</text></g>`;
        } else if (st.self) {
          [].concat(st.self).forEach((id) => {
            const x = ax(id);
            s += `<g class="seq-self ${state} ${st.tone || ''}"><rect x="${x - 62}" y="${y - 15}" width="124" height="28" rx="7"/><text x="${x}" y="${y + 4}" text-anchor="middle">${App.esc(st.short || st.msg)}</text></g>`;
          });
        } else {
          const x1 = ax(st.from), x2 = ax(st.to), dir = x2 > x1 ? 1 : -1;
          s += `<g class="seq-msg ${state} ${st.tone || ''}"><line class="${state === 'cur' && !App.reduced ? 'draw' : ''}" x1="${x1 + dir * 4}" y1="${y}" x2="${x2 - dir * 10}" y2="${y}"/><path d="M${x2 - dir * 11} ${y - 5}L${x2 - dir * 2} ${y}L${x2 - dir * 11} ${y + 5}z"/><text x="${(x1 + x2) / 2}" y="${y - 8}" text-anchor="middle">${App.esc(st.msg)}</text></g>`;
        }
      });
      svg.innerHTML = s;
      const st = steps[i];
      host.querySelector('.seq-count').textContent = `Step ${i + 1} of ${n}`;
      host.querySelector('.seq-title').textContent = st.title || st.msg;
      host.querySelector('.seq-note').innerHTML = st.note || '';
      const extra = host.querySelector('.seq-extra');
      extra.innerHTML = '';
      if (opts.onStep) opts.onStep(i, st, extra, steps);
      host.querySelector('[data-a=back]').disabled = i === 0;
      const blocked = st.gate && !st.resolved;
      host.querySelector('[data-a=next]').disabled = i >= n - 1 || blocked;
      if (i >= n - 1 || blocked) stop();
      const yCur = ((top + i * rowH) / H) * svg.getBoundingClientRect().height;
      if (stage.scrollHeight > stage.clientHeight) stage.scrollTo({ top: Math.max(0, yCur - stage.clientHeight / 2), behavior: App.reduced ? 'auto' : 'smooth' });
    }
    const api = {
      go(k) { i = App.clamp(k, 0, steps.length - 1); draw(); },
      next() { api.go(i + 1); },
      get index() { return i; },
      set(newSteps, keep) { steps = newSteps; i = keep ? Math.min(i, steps.length - 1) : 0; draw(); },
      steps: () => steps,
      redraw: draw,
      stop
    };
    host.querySelector('.seq-ctl').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'next') { stop(); api.next(); }
      if (a === 'back') { stop(); api.go(i - 1); }
      if (a === 'reset') { stop(); if (opts.onReset) opts.onReset(); else api.go(0); }
      if (a === 'play') {
        if (timer) { stop(); return; }
        if (i >= steps.length - 1) api.go(0);
        b.innerHTML = App.icon('pause', 16) + 'Pause';
        timer = setInterval(() => { const st = steps[i]; if (i >= steps.length - 1 || (st.gate && !st.resolved)) { stop(); return; } api.next(); }, 1500);
      }
    });
    draw();
    return api;
  };

  /* ---------- video panel ---------- */
  App.videoCard = (url, title, blurb) => `
    <a class="video" href="${url}" target="_blank" rel="noopener noreferrer">
      <span class="video-art" aria-hidden="true">
        <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice"><defs><pattern id="vp${title.length}" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="currentColor" stroke-opacity=".12"/></pattern></defs><rect width="160" height="90" fill="url(#vp${title.length})"/><path d="M0 60 C 20 20, 40 20, 60 60 S 100 100, 120 60 S 150 30, 160 45" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="1.5"/></svg>
        <span class="video-play">${App.icon('play', 22)}</span>
      </span>
      <span class="video-meta"><b>${title}</b><span>${blurb}</span><span class="video-link">Watch on YouTube ${App.icon('ext', 14)}</span></span>
    </a>`;

  /* ---------- sidebar ---------- */
  const brandMark = `<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M9 26c-2.6-2.6-4-6.1-4-10a11 11 0 0 1 17.6-8.8"/><path d="M26 11.5c.7 1.4 1 2.9 1 4.5 0 3-1 5.8-2.8 8"/><path d="M12.5 26.5c-2-2.8-3-6-3-10.5a6.5 6.5 0 0 1 13 0c0 3.3-.6 6-1.8 8.3"/><path d="M16 16c0 4 .9 7.6 2.6 10.5"/></svg>`;
  App.brandMark = brandMark;
  App.renderSide = function () {
    const side = App.$('#side'); if (!side) return;
    const all = App.allLessons(), done = all.filter((l) => App.store.done(l.key)).length;
    const cur = location.hash || '#/';
    side.innerHTML = `
      <a class="brand" href="#/"><span class="brand-mark">${brandMark}</span><span class="brand-txt"><b>Locard</b><small>Learn digital forensics and IR</small></span></a>
      <div class="side-progress" title="${done} of ${all.length} lessons complete"><div class="meter"><i style="width:${(done / all.length) * 100}%"></i></div><span>${done} of ${all.length} lessons done</span></div>
      <nav aria-label="Course">
        ${App.course.map((t) => {
          const d = t.lessons.filter((l) => App.store.done(`${t.id}/${l.id}`)).length;
          return `<div class="nav-track">
            <a class="nav-head" href="#/${t.id}">${App.icon(t.icon, 17)}<span>${t.name}</span><em>${d}/${t.lessons.length}</em></a>
            <ol>${t.lessons.map((l, k) => {
              const ok = App.store.done(`${t.id}/${l.id}`);
              return `<li><a href="#/${t.id}/${l.id}" class="${ok ? 'is-done' : ''}"><span class="nav-dot">${ok ? App.icon('check', 12) : k + 1}</span>${l.short}</a></li>`;
            }).join('')}</ol></div>`;
        }).join('')}
        <div class="nav-more">
          <a href="#/toolkit">Toolkit map</a>
          <a href="#/watch">Watch and read</a>
          <a href="#/quiz">Quiz</a>
          <a href="#/glossary">Glossary</a>
        </div>
      </nav>`;
    App.$$('a', side).forEach((a) => { if (a.getAttribute('href') === cur) a.setAttribute('aria-current', 'page'); });
  };
  App.on('progress', () => App.renderSide());

  /* ---------- lesson page frame ---------- */
  App.lessonPage = function (view, trackId, lessonId, spec) {
    const t = App.track(trackId), idx = t.lessons.findIndex((l) => l.id === lessonId), l = t.lessons[idx];
    const key = `${trackId}/${lessonId}`, prev = t.lessons[idx - 1], next = t.lessons[idx + 1];
    const el = App.h(`
      <article class="page lesson">
        <header class="lesson-head">
          <nav class="crumb" aria-label="Breadcrumb"><a href="#/${t.id}">${t.name}</a><span>Lesson ${idx + 1} of ${t.lessons.length}</span><span>${l.min} min</span></nav>
          <h1>${l.title}</h1>
          <p class="lede">${spec.lede}</p>
        </header>
        <section class="lab" aria-label="Interactive lab">${spec.lab}</section>
        <div class="read">
          <div class="prose">${spec.body}</div>
          <aside class="notes" aria-label="Quick facts">${(spec.notes || []).map((n) => `<div class="note"><b>${n[0]}</b><p>${n[1]}</p></div>`).join('')}</aside>
        </div>
        ${spec.takeaways ? `<section class="takeaways"><h2>Remember this</h2><ul>${spec.takeaways.map((x) => `<li>${x}</li>`).join('')}</ul></section>` : ''}
        <footer class="lesson-foot">
          <button type="button" class="btn done-btn" aria-pressed="false"></button>
          <div class="pager">
            ${prev ? `<a class="pager-link" href="#/${t.id}/${prev.id}"><small>Previous</small><span>${prev.title}</span></a>` : `<a class="pager-link" href="#/${t.id}"><small>Back to</small><span>${t.name} overview</span></a>`}
            ${next ? `<a class="pager-link to-next" href="#/${t.id}/${next.id}"><small>Next lesson</small><span>${next.title}</span></a>` : `<a class="pager-link to-next" href="#/quiz/${t.id}"><small>Check yourself</small><span>Take the ${t.name.toLowerCase()} quiz</span></a>`}
          </div>
        </footer>
      </article>`);
    view.appendChild(el);
    const btn = el.querySelector('.done-btn');
    const paint = () => { const d = App.store.done(key); btn.setAttribute('aria-pressed', String(d)); btn.innerHTML = d ? `${App.icon('check', 16)}Lesson complete` : 'Mark lesson complete'; };
    btn.addEventListener('click', () => { App.store.setDone(key, !App.store.done(key)); paint(); });
    paint();
    App.$$('input[type=range]', el).forEach(App.fillRange);
    return el;
  };

  /* ---------- router ---------- */
  App.route = (pattern, fn, title) => App.routes.push({ re: new RegExp('^' + pattern.replace(/:(\w+)/g, '([^/]+)') + '/?$'), keys: (pattern.match(/:(\w+)/g) || []).map((k) => k.slice(1)), fn, title });
  App.navigate = function () {
    App.cleanups.splice(0).forEach((f) => { try { f(); } catch (e) { /* ignore */ } });
    const path = location.hash.replace(/^#/, '') || '/';
    const view = App.$('#view');
    view.innerHTML = '';
    let hit = null;
    for (const r of App.routes) { const m = path.match(r.re); if (m) { hit = { r, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) }; break; } }
    try {
      if (hit) hit.r.fn(view, hit.params);
      else App.notFound(view);
    } catch (err) {
      console.error(err);
      view.innerHTML = `<div class="page empty"><h1>This page failed to load</h1><p>Something in the lab code broke. Head back to the start and try another page.</p><a class="btn primary" href="#/">Go to the start</a></div>`;
    }
    const h1 = view.querySelector('h1');
    document.title = (h1 && path !== '/' ? h1.textContent + ' | ' : '') + 'Locard: learn digital forensics and incident response';
    App.renderSide();
    document.body.classList.remove('nav-open');
    window.scrollTo(0, 0);
    view.focus({ preventScroll: true });
  };
  App.notFound = (view) => {
    view.innerHTML = `<div class="page empty"><h1>No page lives here</h1><p>The link may be old or mistyped. Pick a track from the menu, or start at the beginning.</p><a class="btn primary" href="#/">Go to the start</a></div>`;
  };
  App.start = function () {
    window.addEventListener('hashchange', App.navigate);
    const tb = App.$('.topbar');
    if (tb) tb.innerHTML = `<a class="brand" href="#/"><span class="brand-mark">${brandMark}</span><span class="brand-txt"><b>Locard</b></span></a><button type="button" class="icon-btn" id="menu-btn" aria-label="Open course menu" aria-controls="side">${App.icon('menu', 22)}</button>`;
    document.addEventListener('click', (e) => {
      if (e.target.closest('#menu-btn')) document.body.classList.toggle('nav-open');
      else if (e.target.closest('#scrim')) document.body.classList.remove('nav-open');
      else if (e.target.closest('.skip')) { e.preventDefault(); App.$('#view').focus(); }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.body.classList.remove('nav-open'); });
    App.navigate();
  };
})();
