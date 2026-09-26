(function () {
  'use strict';
  const { h, $, $$, icon, esc } = App;

  /* ---------- evidence tag: live integrity check ---------- */
  const ORIGINAL = 'Payment approved for Northwind Supply.\nAmount: $4,820.00\nVendor ID: NW-2231\nApproved by: D. Okafor';
  App.evidenceTag = function (host, opts = {}) {
    const acq = App.hash.sha256(App.hash.utf8(ORIGINAL));
    host.innerHTML = `
      <div class="etag">
        <div class="tape" aria-hidden="true"><span>EVIDENCE</span><span>DO NOT ALTER</span><span>EVIDENCE</span><span>DO NOT ALTER</span><span>EVIDENCE</span><span>DO NOT ALTER</span></div>
        <div class="etag-body">
          <dl class="etag-meta">
            <div><dt>Case</dt><dd>2026-0417</dd></div>
            <div><dt>Item</dt><dd>003</dd></div>
            <div><dt>Source</dt><dd>FIN-WS-22, C:\\Users\\dokafor\\Desktop</dd></div>
            <div><dt>File</dt><dd>approval_note.txt</dd></div>
          </dl>
          <label class="etag-label" for="etag-text">File contents. Try changing one character.</label>
          <textarea id="etag-text" class="etag-text" rows="5" spellcheck="false">${esc(ORIGINAL)}</textarea>
          <div class="etag-hashes">
            <div><small>SHA-256 recorded at acquisition</small><code class="hx">${acq}</code></div>
            <div><small>SHA-256 of the file right now</small><code class="hx now"></code></div>
          </div>
          <div class="etag-status" aria-live="polite"></div>
          <div class="etag-actions"><button type="button" class="btn ghost" data-restore>${icon('reset', 16)}Restore original</button></div>
        </div>
      </div>`;
    const ta = $('.etag-text', host), now = $('.hx.now', host), st = $('.etag-status', host);
    function update() {
      const cur = App.hash.sha256(App.hash.utf8(ta.value));
      now.innerHTML = App.hash.diffHtml(cur, acq);
      const same = cur === acq, bits = App.hash.bitsDiff(cur, acq);
      let chars = 0; for (let i = 0; i < Math.max(ta.value.length, ORIGINAL.length); i++) if (ta.value[i] !== ORIGINAL[i]) chars++;
      host.querySelector('.etag').classList.toggle('broken', !same);
      st.innerHTML = same
        ? `<span class="verdict ok">${icon('seal', 18)}Verified</span><span>The file matches its acquisition hash, bit for bit.</span>`
        : `<span class="verdict bad">${icon('alert', 18)}Integrity failed</span><span>${chars === 1 ? 'One character changed' : `${chars} characters changed`}, and ${bits} of the hash’s 256 bits flipped.</span>`;
      if (opts.onChange) opts.onChange(same);
    }
    ta.addEventListener('input', update);
    $('[data-restore]', host).addEventListener('click', () => { ta.value = ORIGINAL; update(); });
    // one orchestrated moment: a single character is altered, then restored
    if (opts.intro && !App.reduced) {
      App.later(1400, () => { if (ta.value === ORIGINAL && document.activeElement !== ta) { ta.value = ORIGINAL.replace('4,820', '4,829'); update(); } });
      App.later(3600, () => { if (ta.value === ORIGINAL.replace('4,820', '4,829') && document.activeElement !== ta) { ta.value = ORIGINAL; update(); } });
    }
    update();
  };

  /* ---------- home ---------- */
  App.route('/', function (view) {
    const all = App.allLessons(), next = all.find((l) => !App.store.done(l.key));
    const any = all.some((l) => App.store.done(l.key));
    view.appendChild(h(`
      <div class="page home">
        <section class="hero">
          <div>
            <h1>Every contact leaves a trace.</h1>
            <p class="lede">That’s Locard’s exchange principle, and it holds for computers too. Twelve hands-on labs teach you how investigators preserve evidence, recover what was deleted, and rebuild what an attacker did, minute by minute.</p>
            <div class="hero-cta">
              ${any && next ? `<a class="btn primary lg" href="#/${next.track}/${next.id}">Continue: ${esc(next.short)}</a>` : `<a class="btn primary lg" href="#/foundations/lifecycle">Start the first lab</a>`}
              <a class="btn lg" href="#/live/timeline">Jump to the case</a>
            </div>
          </div>
          <div class="hero-tag"></div>
        </section>

        <section class="section">
          <div class="section-head"><h2>Three tracks, twelve labs</h2><p>They build on each other, from handling evidence properly to reconstructing a full intrusion. Each lab is something you sort, recover, filter or break.</p></div>
          <div class="tracks three">
            ${App.course.map((t) => {
              const d = t.lessons.filter((l) => App.store.done(`${t.id}/${l.id}`)).length;
              return `<div class="track-col">
                <header>${icon(t.icon, 22)}<h3>${t.name}</h3><em>${d}/${t.lessons.length}</em></header>
                <p>${t.lede}</p>
                <ol class="lesson-list">${t.lessons.map((l) => {
                  const n = App.allLessons().findIndex((x) => x.key === `${t.id}/${l.id}`) + 1;
                  return `<li><a href="#/${t.id}/${l.id}"><span class="ll-num">${String(n).padStart(2, '0')}</span><span class="ll-title">${l.title}</span><span class="ll-meta">${App.store.done(`${t.id}/${l.id}`) ? icon('check', 15) : l.min + 'm'}</span></a></li>`;
                }).join('')}</ol>
              </div>`;
            }).join('')}
          </div>
        </section>

        <section class="section">
          <div class="tools-row">
            <a href="#/toolkit"><b>Toolkit map</b><span>FTK Imager, KAPE, Velociraptor, Volatility, Zimmerman’s tools and more, each tied to the lab where you’d use it.</span></a>
            <a href="#/watch"><b>Watch and read</b><span>Walkthrough videos from 13Cubed and SANS, plus the standards investigators work from.</span></a>
            <a href="#/quiz"><b>Quiz</b><span>Twenty-four questions with explanations. Your best score is saved in this browser.</span></a>
          </div>
        </section>

        <footer class="site-foot"><span>Everything here is simulated, and the hosts, people and addresses are made up. Progress is saved only in this browser.</span><button type="button" data-reset>Reset my progress</button></footer>
      </div>`));
    App.evidenceTag($('.hero-tag', view), { intro: true });
    $('[data-reset]', view).addEventListener('click', () => { if (confirm('Clear all lesson progress and quiz scores?')) { App.store.reset(); App.navigate(); } });
  });

  /* ---------- track overview ---------- */
  function trackPage(view, id) {
    const t = App.track(id);
    const next = t.lessons.find((l) => !App.store.done(`${t.id}/${l.id}`)) || t.lessons[0];
    const started = t.lessons.some((l) => App.store.done(`${t.id}/${l.id}`));
    const ti = App.course.indexOf(t);
    view.appendChild(h(`
      <div class="page">
        <section class="track-hero">
          <div>
            <p class="full">Track ${ti + 1} of ${App.course.length}</p>
            <h1>${t.name}</h1>
            <p class="lede" style="margin-top:18px">${t.lede}</p>
            <div class="hero-cta"><a class="btn primary lg" href="#/${t.id}/${next.id}">${started ? 'Continue' : 'Start'}: ${next.short}</a><a class="btn lg" href="#/quiz/${t.id}">Take the quiz</a></div>
          </div>
          <div class="track-covers"><p class="muted small">This track covers</p><p>${t.full}</p></div>
        </section>
        <ol class="lesson-list">${t.lessons.map((l, i) => `<li><a href="#/${t.id}/${l.id}"><span class="ll-num">${String(i + 1).padStart(2, '0')}</span><span class="ll-title">${l.title}</span><span class="ll-meta">${App.store.done(`${t.id}/${l.id}`) ? icon('check', 15) + 'Done' : l.min + ' min'}</span></a></li>`).join('')}</ol>
      </div>`));
  }
  App.course.forEach((t) => App.route('/' + t.id, (v) => trackPage(v, t.id)));
})();
