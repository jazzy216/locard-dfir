(function () {
  'use strict';
  const { h, $, $$, icon, esc } = App;

  /* =====================================================================
     Lesson 1: IR lifecycle deck sorter
     ===================================================================== */
  const PHASES = [
    { n: 'Preparation', csf: 'Govern, Identify, Protect' },
    { n: 'Detection and analysis', csf: 'Detect (and Identify)' },
    { n: 'Containment, eradication and recovery', csf: 'Respond, Recover' },
    { n: 'Post-incident activity', csf: 'Identify: improvement' }
  ];
  const CARDS = [
    { t: 'Stock a jump kit: write blockers, a forensic laptop, cables and blank evidence drives.', p: 0, why: 'You can’t buy a write blocker in the middle of an incident. Tools, contacts and playbooks are all Preparation.' },
    { t: 'EDR alerts on thousands of files renamed to .lockd on the finance file server.', p: 1, why: 'An alert is a precursor or indicator. Deciding whether it’s a real incident, and how bad, is Detection and analysis.' },
    { t: 'Agree in advance who is allowed to take a production server offline.', p: 0, why: 'Decision rights and escalation paths are settled before anything happens, so no one waits on a phone tree mid-incident.' },
    { t: 'Check proxy logs to see which other hosts contacted the same command-and-control address.', p: 1, why: 'Scoping how far the attacker reached is analysis. It decides what you contain next.' },
    { t: 'Move the infected hosts to an isolated VLAN, leaving them powered on.', p: 2, why: 'Containment limits damage. Keeping them powered on preserves memory for the investigation.' },
    { t: 'Capture RAM from the file server and image its disk before anyone rebuilds it.', p: 2, why: 'NIST covers evidence gathering and handling inside the containment phase, because it has to happen before eradication destroys it.' },
    { t: 'Disable the VPN account the attacker logged in with and reset its password.', p: 2, why: 'Cutting off the attacker’s access is containment.' },
    { t: 'Delete the malicious scheduled task and reimage every affected workstation.', p: 2, why: 'Removing the attacker’s foothold is eradication.' },
    { t: 'Restore the file shares from offline backups and watch them closely for a week.', p: 2, why: 'Returning to normal operations, with extra monitoring, is recovery.' },
    { t: 'Hold a blameless lessons-learned meeting within two weeks.', p: 3, why: 'Reviewing what worked and what didn’t is the core of post-incident activity.' },
    { t: 'Update the email filter to block macro-enabled attachments from outside senders.', p: 3, why: 'Turning lessons into lasting changes closes the loop, and it feeds straight back into Preparation.' }
  ];
  App.route('/foundations/lifecycle', function (view) {
    const el = App.lessonPage(view, 'foundations', 'lifecycle', {
      lede: 'A ransomware alert fires on a Monday morning. Every action that follows belongs to a phase, and doing them out of order destroys evidence or tips off the attacker. Sort the response team’s to-do list.',
      lab: `
        <div class="deck">
          <div class="deck-top">
            <div class="deck-card" aria-live="polite"></div>
            <div class="deck-choose"><p class="muted small">Which phase does this belong to?</p><div class="phase-btns">${PHASES.map((p, i) => `<button type="button" class="btn" data-p="${i}"><span class="pn">${i + 1}</span>${p.n}</button>`).join('')}</div></div>
          </div>
          <div class="lanes">${PHASES.map((p, i) => `<div class="lane" data-lane="${i}"><h3><span class="pn">${i + 1}</span>${p.n}</h3><p class="lane-csf">CSF 2.0: ${p.csf}</p><ul></ul></div>`).join('')}</div>
        </div>`,
      body: `
        <h2>The classic four phases</h2>
        <p>NIST’s <strong>SP 800-61</strong> gave incident response its best-known shape: <strong>Preparation</strong>, <strong>Detection and analysis</strong>, <strong>Containment, eradication and recovery</strong>, and <strong>Post-incident activity</strong>. It’s drawn as a loop, because what you learn from one incident becomes the preparation for the next. The SANS model (PICERL) splits the same work into six steps: preparation, identification, containment, eradication, recovery and lessons learned.</p>
        <h2>Revision 3 and CSF 2.0</h2>
        <p>In April 2025 NIST replaced that guide with <strong>SP 800-61 Revision 3</strong>, which maps incident response onto the six functions of the <strong>Cybersecurity Framework 2.0</strong>. <em>Govern</em>, <em>Identify</em> and <em>Protect</em> cover the preparation that happens before an incident; <em>Detect</em>, <em>Respond</em> and <em>Recover</em> cover the response itself; and improvement feeds back through <em>Identify</em>. The labels under each lane show the rough mapping. The four-phase loop is still the easiest way to learn the flow, and you’ll still hear it everywhere.</p>
        <h2>Where forensics fits</h2>
        <p>Forensics runs through the middle of the response. Analysis needs evidence, and evidence has to be collected <strong>before</strong> eradication wipes it away. That’s the most common mistake in real incidents: someone reimages the machine to “fix it” and the only record of how the attacker got in is gone.</p>
        <h2>Containment is a trade-off</h2>
        <p>Pulling the network cable stops the damage, but it also tells the attacker you’ve seen them and can trigger destructive fallback behavior. Watching quietly for a while can reveal every host they’ve touched, at the risk of more damage. There’s no universal right answer, which is exactly why the decision rights belong in Preparation.</p>`,
      notes: [['4 phases', 'The SP 800-61 Rev. 2 lifecycle, still the standard teaching model.'], ['Rev. 3', 'Published April 2025, organized around the six CSF 2.0 functions.'], ['PICERL', 'The SANS six-step version of the same cycle.']],
      takeaways: [
        'Preparation, detection and analysis, containment/eradication/recovery, and post-incident activity form a loop.',
        'Collect evidence during containment, before eradication destroys it.',
        'SP 800-61 Rev. 3 maps the same work onto CSF 2.0’s Govern, Identify, Protect, Detect, Respond and Recover.'
      ]
    });
    const order = [3, 0, 7, 1, 4, 9, 2, 5, 10, 6, 8];
    let k = 0, right = 0, answered = null;
    const card = $('.deck-card', el), btns = $$('.phase-btns .btn', el);
    function render() {
      if (k >= order.length) {
        card.innerHTML = `<div class="deck-done"><span class="big-read">${right}<span class="muted">/${order.length}</span></span><div><b>Every task sorted.</b><p class="muted">Notice how evidence capture sits before eradication. Want another go?</p></div><button type="button" class="btn" data-again>${icon('reset', 16)}Shuffle again</button></div>`;
        btns.forEach((b) => (b.disabled = true));
        $('[data-again]', card).addEventListener('click', () => { k = 0; right = 0; answered = null; $$('.lane ul', el).forEach((u) => (u.innerHTML = '')); order.sort(() => Math.random() - 0.5); render(); });
        return;
      }
      const c = CARDS[order[k]];
      card.innerHTML = `<p class="deck-count">Task ${k + 1} of ${order.length}</p><p class="deck-text">${c.t}</p>${answered !== null ? `<div class="callout ${answered === c.p ? 'good' : 'bad'}"><b>${answered === c.p ? 'Right.' : `That’s ${PHASES[c.p].n.toLowerCase()}.`}</b> ${c.why}</div><button type="button" class="btn primary" data-next>Next task${icon('next', 16)}</button>` : ''}`;
      btns.forEach((b) => { b.disabled = answered !== null; b.classList.toggle('picked', answered !== null && +b.dataset.p === answered); });
      const nb = $('[data-next]', card); if (nb) { nb.addEventListener('click', () => { k++; answered = null; render(); }); nb.focus(); }
    }
    btns.forEach((b) => b.addEventListener('click', () => {
      if (answered !== null) return;
      const c = CARDS[order[k]]; answered = +b.dataset.p;
      if (answered === c.p) right++;
      const li = document.createElement('li'); li.className = answered === c.p ? 'ok' : 'miss';
      li.innerHTML = `${icon(answered === c.p ? 'check' : 'close', 13)}<span>${c.t}</span>`;
      $(`.lane[data-lane="${c.p}"] ul`, el).appendChild(li);
      render();
    }));
    render();
  });

  /* =====================================================================
     Lesson 2: Order of volatility race
     ===================================================================== */
  const VOL = [
    { id: 'reg', n: 'CPU registers and cache', rank: 1, half: 0.02, dur: 0.1, val: 1, plug: 0 },
    { id: 'net', n: 'Network connections and ARP cache', rank: 2, half: 6, dur: 1, val: 3, plug: 0 },
    { id: 'proc', n: 'Running processes', rank: 2, half: 20, dur: 1, val: 3, plug: 0 },
    { id: 'ram', n: 'Full RAM contents', rank: 2, half: 45, dur: 12, val: 5, plug: 0 },
    { id: 'tmp', n: 'Temporary files and swap', rank: 3, half: 90, dur: 5, val: 2, plug: 0.6 },
    { id: 'disk', n: 'Disk contents', rank: 4, half: 20000, dur: 90, val: 5, plug: 1 },
    { id: 'logs', n: 'Remote logs in the SIEM', rank: 5, half: 1440, dur: 5, val: 3, plug: 1 },
    { id: 'phys', n: 'Physical setup and network topology', rank: 6, half: 5000, dur: 8, val: 1, plug: 1 },
    { id: 'arch', n: 'Backups and archival media', rank: 7, half: 1e9, dur: 30, val: 1, plug: 1 }
  ];
  App.route('/foundations/volatility', function (view) {
    const el = App.lessonPage(view, 'foundations', 'volatility', {
      lede: 'Some evidence lasts for years. Some is gone in seconds. You can only collect one thing at a time, so the order matters. Arrange the collection plan, then run it and see what survived.',
      lab: `
        <div class="lab-bar">
          ${App.toggle('plug', 'Pull the power cord before collecting', false)}
          <div class="spacer"></div>
          <span class="clock mono" aria-live="off">0 min elapsed</span>
          <button type="button" class="btn ghost" data-shuffle>${icon('reset', 16)}Shuffle</button>
          <button type="button" class="btn primary" data-run>${icon('play', 16)}Run the collection</button>
        </div>
        <ol class="vol-list" aria-label="Collection order, first to last"></ol>
        <div class="lab-foot vol-foot" aria-live="polite"></div>`,
      body: `
        <h2>RFC 3227</h2>
        <p>The standard reference is <strong>RFC 3227</strong>, “Guidelines for Evidence Collection and Archiving” (2002). Its advice is simple: collect from the <strong>most volatile to the least volatile</strong>, because the fragile evidence disappears while you’re busy with the durable kind. Its list, from most to least volatile:</p>
        <ol>
          <li>Registers and cache</li>
          <li>Routing table, ARP cache, process table, kernel statistics and memory</li>
          <li>Temporary file systems</li>
          <li>Disk</li>
          <li>Remote logging and monitoring data</li>
          <li>Physical configuration and network topology</li>
          <li>Archival media</li>
        </ol>
        <p>Items in the same group can be collected in either order. In practice CPU registers are almost never captured, and a memory acquisition tool picks up much of the process and network state along with RAM.</p>
        <h2>Why pulling the plug hurts</h2>
        <p>The old advice was to pull the power cord so nothing on the disk could change. Today that usually destroys the most useful evidence: running malware that exists only in memory, open network connections, and, critically, <strong>disk encryption keys</strong>. With BitLocker or FileVault on, the unlocked key lives in RAM. Pull the plug and you may be left with an encrypted disk you can never read.</p>
        <h2>Collecting changes things</h2>
        <p>Running a tool on a live system changes it: the tool loads into memory and writes its own traces. That’s acceptable, as long as you use trusted tools from external media, keep the footprint small, and document exactly what you ran and when.</p>`,
      notes: [['RFC 3227', 'The 2002 IETF guideline behind the order of volatility.'], ['Seconds', 'How long a closed network connection may stay visible.'], ['Keys in RAM', 'Why powering off an encrypted machine can end an investigation.']],
      takeaways: [
        'Collect from most volatile to least volatile: memory and network state before disk, disk before backups.',
        'Pulling the plug protects the disk but destroys memory, connections and encryption keys.',
        'Live collection always leaves a footprint, so use trusted tools and document every step.'
      ]
    });
    let order = [3, 6, 0, 5, 2, 8, 1, 4, 7].map((i) => VOL[i]), running = false, plug = false, results = null;
    const list = $('.vol-list', el), foot = $('.vol-foot', el), clock = $('.clock', el);
    function render() {
      list.innerHTML = order.map((v, i) => {
        const r = results && results[v.id];
        return `<li class="vol" draggable="${!running}" data-i="${i}">
          <span class="vol-n">${i + 1}</span>
          <span class="vol-name">${v.n}</span>
          <span class="vol-bar" aria-hidden="true"><i style="width:${r ? Math.round(r.kept * 100) : 100}%" class="${r ? (r.kept > 0.8 ? 'hi' : r.kept > 0.3 ? 'mid' : 'lo') : ''}"></i></span>
          <span class="vol-pct mono">${r ? (r.done ? Math.round(r.kept * 100) + '%' : '…') : ''}</span>
          <span class="vol-move"><button type="button" class="icon-btn sm" data-up="${i}" aria-label="Move ${v.n} earlier" ${i === 0 || running ? 'disabled' : ''}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 15l6-6 6 6"/></svg></button><button type="button" class="icon-btn sm" data-down="${i}" aria-label="Move ${v.n} later" ${i === order.length - 1 || running ? 'disabled' : ''}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button></span>
        </li>`;
      }).join('');
      if (!results) foot.innerHTML = `<span>Put the most fragile evidence first. Drag the rows, or use the arrows.</span>`;
    }
    const move = (i, j) => { if (j < 0 || j >= order.length) return; const [x] = order.splice(i, 1); order.splice(j, 0, x); results = null; render(); };
    list.addEventListener('click', (e) => {
      const u = e.target.closest('[data-up]'), d = e.target.closest('[data-down]');
      if (u) { move(+u.dataset.up, +u.dataset.up - 1); $(`[data-up="${+u.dataset.up - 1}"]`, list)?.focus(); }
      if (d) { move(+d.dataset.down, +d.dataset.down + 1); $(`[data-down="${+d.dataset.down + 1}"]`, list)?.focus(); }
    });
    let dragI = null;
    list.addEventListener('dragstart', (e) => { const li = e.target.closest('.vol'); if (!li) return; dragI = +li.dataset.i; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
    list.addEventListener('dragover', (e) => { e.preventDefault(); const li = e.target.closest('.vol'); $$('.vol', list).forEach((x) => x.classList.toggle('over', x === li)); });
    list.addEventListener('drop', (e) => { e.preventDefault(); const li = e.target.closest('.vol'); if (li && dragI !== null) move(dragI, +li.dataset.i); dragI = null; });
    list.addEventListener('dragend', () => { dragI = null; $$('.vol', list).forEach((x) => x.classList.remove('dragging', 'over')); });
    $('[data-t=plug]', el).addEventListener('change', (e) => { plug = e.target.checked; results = null; render(); });
    $('[data-shuffle]', el).addEventListener('click', () => { order.sort(() => Math.random() - 0.5); results = null; clock.textContent = '0 min elapsed'; render(); });
    $('[data-run]', el).addEventListener('click', () => {
      if (running) return;
      running = true; results = {};
      let t = 0;
      const plan = order.map((v) => { const start = t; t += v.dur; return { v, start }; });
      const total = t, dur = App.reduced ? 1 : 3200;
      let t0 = null;
      render();
      App.loop((dt, now) => {
        if (!running) return;
        if (t0 === null) t0 = now;
        const sim = Math.min(total, ((now - t0) / dur) * total);
        clock.textContent = `${sim < 10 ? sim.toFixed(1) : Math.round(sim)} min elapsed`;
        plan.forEach(({ v, start }) => {
          const base = plug ? v.plug : 1, at = Math.min(sim, start);
          results[v.id] = { kept: base * Math.pow(2, -at / v.half), done: sim >= start };
        });
        render();
        if (sim >= total) { running = false; finish(plan); }
      });
    });
    function finish(plan) {
      render();
      const score = plan.reduce((s, { v }) => s + v.val * results[v.id].kept, 0) / VOL.reduce((s, v) => s + v.val, 0);
      const inOrder = order.every((v, i) => i === 0 || order[i - 1].rank <= v.rank);
      const worst = plan.filter(({ v }) => v.val >= 3).sort((a, b) => results[a.v.id].kept - results[b.v.id].kept)[0];
      foot.innerHTML = `<div class="vol-result"><span class="big-read">${Math.round(score * 100)}<span class="muted">%</span></span><div><b>${inOrder ? 'That’s the RFC 3227 order.' : 'Some fragile evidence waited behind durable evidence.'}</b><p>${plug ? 'Pulling the plug wiped everything in memory before you started. ' : ''}${results[worst.v.id].kept < 0.6 ? `The biggest loss was ${worst.v.n.toLowerCase()}, which kept only ${Math.round(results[worst.v.id].kept * 100)}%.` : 'Almost all the valuable evidence made it.'}</p></div></div>`;
    }
    render();
  });

  /* =====================================================================
     Lesson 3: Hashing + chain of custody
     ===================================================================== */
  const CUSTODY = [
    { when: '2026-03-10 11:42', from: 'Seized from FIN-WS-22 by K. Adeyemi', to: 'K. Adeyemi', why: 'Acquisition in the field, sealed in bag #A-0331', hash: 'a3f1…9c07', bad: null },
    { when: '2026-03-10 14:15', from: 'K. Adeyemi', to: 'Evidence locker 2, logged by R. Patel', why: 'Storage, seal intact', hash: 'a3f1…9c07', bad: null },
    { when: '2026-03-11 09:03', from: 'Evidence locker 2', to: 'M. Chen, forensic examiner', why: 'Working copy made, original resealed', hash: 'a3f1…9c07', bad: null },
    { when: '2026-03-11 16:50', from: 'M. Chen', to: 'Evidence locker 2', why: 'Returned after imaging', hash: 'a3f1…9c07', bad: null },
    { when: '2026-03-14 10:20', from: 'Evidence locker 2', to: 'J. Ortiz, outside counsel’s expert', why: 'Sent by interoffice mail', hash: 'a3f1…9c07', bad: 'Interoffice mail isn’t a controlled transfer. Nobody signed for it between the locker and the recipient, so anyone could have handled the drive.' },
    { when: '2026-03-17 13:05', from: 'J. Ortiz', to: 'Evidence locker 2, logged by R. Patel', why: 'Returned after review', hash: 'a3f1…9c0e', bad: 'The hash recorded on return ends in 9c0e, not 9c07. Either the drive changed or someone recorded the hash wrong. Both have to be explained before this evidence is trusted.' },
    { when: '2026-03-21 08:30', from: 'Evidence locker 2', to: 'Court clerk, Davidson County', why: 'Filed as exhibit 14', hash: 'Not recorded', bad: 'No hash was verified at the final handoff. The last link in the chain can’t show the exhibit is the same drive that was seized.' }
  ];
  App.route('/foundations/hashing', function (view) {
    const el = App.lessonPage(view, 'foundations', 'hashing', {
      lede: 'A hash is a fingerprint for data. Change one bit anywhere and the fingerprint changes completely. Investigators hash evidence the moment they collect it, then again at every step, to prove nothing was altered.',
      lab: `
        <div class="lab-bar">
          ${App.seg('src', [['text', 'Type some text'], ['file', 'Hash a real file']], 'text', 'Input')}
          <div class="spacer"></div>
          <button type="button" class="btn" data-pin>${icon('seal', 16)}Record as acquisition hash</button>
        </div>
        <div class="lab-grid">
          <div class="lab-stage hash-stage">
            <div class="src-text"><label class="sr-only" for="h-in">Text to hash</label><textarea id="h-in" rows="7" spellcheck="false">The quick brown fox jumps over the lazy dog</textarea></div>
            <div class="src-file" hidden>
              <label class="drop" for="h-file"><input type="file" id="h-file"><b>Choose a file, or drop one here</b><span class="muted small">It’s hashed right here in your browser and never uploaded. Files up to 50 MB.</span></label>
              <p class="file-info muted small"></p>
            </div>
          </div>
          <div class="lab-panel">
            <div class="hash-out"></div>
            <div class="pin-state" aria-live="polite"></div>
          </div>
        </div>
        <div class="custody">
          <div class="custody-head"><div><h3>Review a chain of custody</h3><p class="muted small">This drive went to court. Flag every entry that would get the evidence challenged.</p></div><button type="button" class="btn primary" data-check>Check my review</button></div>
          <div class="table-wrap"><table class="spec custody-t"><thead><tr><th scope="col">When</th><th scope="col">From</th><th scope="col">To</th><th scope="col">Purpose</th><th scope="col">SHA-256</th><th scope="col"><span class="sr-only">Flag</span></th></tr></thead><tbody></tbody></table></div>
          <div class="custody-out" aria-live="polite"></div>
        </div>`,
      body: `
        <h2>What a hash function does</h2>
        <p>A cryptographic hash takes any amount of data and produces a short, fixed-length value. <strong>MD5</strong> gives 128 bits, <strong>SHA-1</strong> 160 and <strong>SHA-256</strong> 256. The same input always gives the same hash. Change a single bit and about half the output bits flip, which is called the <strong>avalanche effect</strong>. Try deleting one letter above and watch the whole hash change.</p>
        <h2>Why investigators hash everything</h2>
        <p>When a drive is imaged, its hash is recorded in the case notes and the image file. Anyone can recompute it later: at the lab, at the opposing side’s expert, in court. If the numbers match, the data is identical to what was collected. That’s what lets a copy stand in for the original.</p>
        <h2>MD5 and SHA-1 are broken, sort of</h2>
        <p>Researchers can deliberately craft two different files with the same MD5 or SHA-1 hash, called a <strong>collision</strong>. That matters for digital signatures. It matters much less for evidence integrity, because an attacker would need to have created the collision before you ever seized the drive. Many labs still record MD5 alongside SHA-256 for compatibility with older tools, but <strong>SHA-256</strong> should be the hash you rely on.</p>
        <h2>Chain of custody</h2>
        <p>A hash proves the data didn’t change. The <strong>chain of custody</strong> proves who had the evidence at every moment: each transfer records the date and time, who handed it over, who received it, why, and the condition of the seal. A gap, an unsigned transfer or a hash that doesn’t match gives the other side a reason to argue the evidence can’t be trusted.</p>`,
      notes: [['256 bits', 'The size of a SHA-256 hash, written as 64 hex characters.'], ['~50%', 'Share of output bits that flip when one input bit changes.'], ['2^128', 'Rough work needed to find a SHA-256 collision by brute force. Far beyond reach.']],
      takeaways: [
        'A hash is a fixed-length fingerprint. Any change to the data changes it completely.',
        'Record hashes at acquisition and verify them at every transfer.',
        'Use SHA-256. MD5 and SHA-1 have known collision attacks, even though accidental change is still detected.',
        'Chain of custody documents who held the evidence, when, and why, with no gaps.'
      ]
    });
    let src = 'text', bytes = App.hash.utf8($('#h-in', el).value), pin = null, fileName = '';
    const out = $('.hash-out', el), ps = $('.pin-state', el);
    function paint() {
      const hs = App.hash.all(bytes);
      out.innerHTML = [['md5', 'MD5', 128], ['sha1', 'SHA-1', 160], ['sha256', 'SHA-256', 256]].map(([k, n, bits]) => {
        const d = pin ? App.hash.bitsDiff(hs[k], pin[k]) : null;
        return `<div class="hrow"><div class="hrow-top"><b>${n}</b><span class="muted small">${bits} bits${d !== null ? ` · <span class="${d ? 'bad-t' : 'ok-t'}">${d ? d + ' bits differ' : 'matches'}</span>` : ''}</span></div><code class="hx">${App.hash.diffHtml(hs[k], pin && pin[k])}</code>${d !== null ? `<span class="aval" aria-hidden="true"><i style="width:${(d / bits) * 100}%"></i></span>` : ''}</div>`;
      }).join('');
      if (!pin) ps.innerHTML = `<p class="muted small">Record the current hashes as if you just acquired this evidence. Then change the input and see what happens.</p>`;
      else {
        const same = hs.sha256 === pin.sha256;
        ps.innerHTML = `<div class="callout ${same ? 'good' : 'bad'}"><b>${same ? 'Integrity verified.' : 'Integrity check failed.'}</b> ${same ? 'The data is identical to what was recorded.' : 'The data no longer matches what was recorded. Changed characters in each hash are highlighted.'}</div>`;
      }
    }
    $('#h-in', el).addEventListener('input', (e) => { bytes = App.hash.utf8(e.target.value); paint(); });
    $('[data-pin]', el).addEventListener('click', () => { pin = App.hash.all(bytes); paint(); });
    App.bindSeg(el, 'src', (v) => { src = v; $('.src-text', el).hidden = v !== 'text'; $('.src-file', el).hidden = v !== 'file'; pin = null; if (v === 'text') bytes = App.hash.utf8($('#h-in', el).value); paint(); });
    function loadFile(f) {
      const info = $('.file-info', el);
      if (!f) return;
      if (f.size > 50 * 1024 * 1024) { info.innerHTML = `<span class="bad-t">That file is ${(f.size / 1048576).toFixed(1)} MB. Pick one under 50 MB.</span>`; return; }
      info.textContent = `Reading ${f.name}…`;
      f.arrayBuffer().then((buf) => {
        bytes = new Uint8Array(buf); fileName = f.name;
        info.textContent = `${f.name}, ${bytes.length.toLocaleString()} bytes`;
        paint();
      }).catch(() => { info.innerHTML = '<span class="bad-t">That file couldn’t be read. Try another one.</span>'; });
    }
    $('#h-file', el).addEventListener('change', (e) => loadFile(e.target.files[0]));
    const drop = $('.drop', el);
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); loadFile(e.dataTransfer.files[0]); });
    paint();

    // custody review
    const flags = new Set(); let checked = false;
    const tb = $('.custody-t tbody', el), co = $('.custody-out', el);
    function renderCustody() {
      tb.innerHTML = CUSTODY.map((c, i) => {
        const f = flags.has(i), cls = checked ? (c.bad && f ? 'hit' : c.bad && !f ? 'missed' : !c.bad && f ? 'false' : '') : '';
        return `<tr class="${cls}"><td class="mono small">${c.when}</td><td>${c.from}</td><td>${c.to}</td><td>${c.why}</td><td class="mono small">${c.hash}</td><td><button type="button" class="flag-btn" aria-pressed="${f}" data-f="${i}" ${checked ? 'disabled' : ''}>${icon('flag', 15)}<span>${f ? 'Flagged' : 'Flag'}</span></button></td></tr>
          ${checked && (c.bad || f) ? `<tr class="explain ${cls}"><td colspan="6">${c.bad ? (f ? 'Caught. ' : 'Missed. ') + c.bad : 'This entry is fine: sealed storage with a matching hash and a named person on both sides.'}</td></tr>` : ''}`;
      }).join('');
    }
    tb.addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; const i = +b.dataset.f; flags.has(i) ? flags.delete(i) : flags.add(i); renderCustody(); });
    $('[data-check]', el).addEventListener('click', (e) => {
      if (checked) { checked = false; flags.clear(); e.currentTarget.textContent = 'Check my review'; co.innerHTML = ''; renderCustody(); return; }
      checked = true; e.currentTarget.innerHTML = `${icon('reset', 16)}Try again`;
      const bad = CUSTODY.map((c, i) => c.bad ? i : -1).filter((i) => i >= 0), hit = bad.filter((i) => flags.has(i)).length, fp = [...flags].filter((i) => !CUSTODY[i].bad).length;
      co.innerHTML = `<div class="callout ${hit === bad.length && !fp ? 'good' : ''}"><b>You caught ${hit} of ${bad.length} problems${fp ? ` and flagged ${fp} entr${fp === 1 ? 'y' : 'ies'} that were fine` : ''}.</b> Any one of these gives opposing counsel a reason to challenge the drive.</div>`;
      renderCustody();
    });
    renderCustody();
  });

  /* =====================================================================
     Lesson 4: Imaging with and without a write blocker
     ===================================================================== */
  const OS_WRITES = [
    [3, 'Windows mounted the volume and wrote to the NTFS $LogFile'],
    [11, 'Updated the volume’s last-mounted information'],
    [19, 'Created System Volume Information\\IndexerVolumeGuid'],
    [27, 'Windows Search began indexing and updated $UsnJrnl'],
    [40, 'Created a $RECYCLE.BIN folder for the current user'],
    [52, 'Antivirus scan updated last-access times on 1,204 files']
  ];
  const FORMATS = {
    raw: { n: 'Raw (dd)', size: '512 GB', f: ['Exact bit-for-bit copy, readable by any tool', 'No compression: empty space takes full size', 'No built-in metadata; the hash is stored in a separate file'] },
    e01: { n: 'E01 (EnCase/EWF)', size: '~188 GB', f: ['Compressed: unused space shrinks to almost nothing', 'Stores case number, examiner and notes inside the image', 'Embeds MD5/SHA-1 plus a checksum on every chunk'] },
    aff4: { n: 'AFF4', size: '~181 GB', f: ['Open format with compression', 'Can hold several streams, like a disk and its memory image', 'Handles very large and sparse images well'] }
  };
  App.route('/foundations/imaging', function (view) {
    const el = App.lessonPage(view, 'foundations', 'imaging', {
      lede: 'Investigators almost never examine the original drive. They make a forensic image, an exact copy of every sector, and work on that. The catch is that plugging a drive into a computer can change it. Try it with and without a write blocker.',
      lab: `
        <div class="lab-grid">
          <div class="lab-stage img-stage">
            <div class="sectors" role="img" aria-label="Map of the suspect drive’s sectors"></div>
            <div class="sect-legend"><span><i class="k-u"></i>Untouched</span><span><i class="k-r"></i>Read into the image</span><span><i class="k-w"></i>Changed by the workstation</span></div>
            <ol class="img-log" aria-live="polite"></ol>
          </div>
          <div class="lab-panel">
            ${App.toggle('wb', 'Hardware write blocker in line', true)}
            <div class="ctl"><div class="ctl-top"><span class="muted">Image format</span></div>${App.seg('fmt', [['raw', 'Raw'], ['e01', 'E01'], ['aff4', 'AFF4']], 'e01', 'Image format')}</div>
            <ul class="fmt-f"></ul>
            <div class="img-steps">
              <button type="button" class="btn" data-step="connect"><span class="pn">1</span>Connect the drive</button>
              <button type="button" class="btn" data-step="acquire" disabled><span class="pn">2</span>Acquire the image</button>
              <button type="button" class="btn" data-step="verify" disabled><span class="pn">3</span>Verify the image</button>
            </div>
            <div class="readouts">
              <div class="ro"><span>Drive as seized</span><b data-o="seized"></b></div>
              <div class="ro"><span>Acquisition hash</span><b data-o="acq">–</b></div>
              <div class="ro"><span>Image re-hashed</span><b data-o="ver">–</b></div>
              <div class="ro status" data-o="srow"><span>Result</span><b data-o="res">Not started</b></div>
            </div>
            <button type="button" class="btn ghost" data-reset>${icon('reset', 16)}Start over</button>
          </div>
        </div>`,
      body: `
        <h2>What a forensic image is</h2>
        <p>A forensic image copies <strong>every sector</strong> of a drive, not just the files you can see. That includes deleted files, unallocated space, slack space and hidden partitions. Copying files through Explorer would miss all of that, and would change the files’ timestamps too.</p>
        <h2>Why the write blocker matters</h2>
        <p>Operating systems are not polite. The moment Windows sees a drive, it mounts it, updates journals, may create folders and can start indexing or scanning it. Every one of those writes alters the evidence. A <strong>write blocker</strong> sits between the suspect drive and your workstation and passes read commands through while blocking every write. Hardware blockers are standard in labs; software write blocking exists but is harder to prove in court.</p>
        <p>Notice what happens without one: the acquisition hash and the verification hash <em>still match each other</em>. The image is a perfect copy of an already-altered drive. In real life there is no “drive as seized” readout to compare against, so nothing warns you. The change is just silently baked into your evidence.</p>
        <h2>Verification</h2>
        <p>The imaging tool hashes the source as it reads it. Afterwards you hash the image file separately. Matching values prove the image is a faithful copy. Tools like <strong>FTK Imager</strong>, <strong>Guymager</strong> and <strong>dc3dd</strong> do both steps and write a report you keep with the case.</p>
        <h2>When you can’t image</h2>
        <p>Cloud servers, huge RAID arrays and machines that can’t go offline often can’t be fully imaged. Responders then do <strong>targeted collection</strong>: tools like <strong>KAPE</strong> or <strong>Velociraptor</strong> copy just the high-value artifacts, such as registry hives, event logs and the master file table, in minutes instead of hours.</p>`,
      notes: [['Every sector', 'A physical image includes unallocated and slack space, not just files.'], ['E01', 'The most common forensic image format, with compression and built-in hashes.'], ['Triage', 'Targeted artifact collection when a full image isn’t practical.']],
      takeaways: [
        'Work on a verified image, never the original.',
        'A write blocker lets reads through and stops every write to the suspect drive.',
        'Matching acquisition and verification hashes prove a faithful copy, not that the source was untouched before you started.'
      ]
    });
    const N = 64;
    const seed = (i) => { let x = (i + 1) * 2654435761 >>> 0; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) & 255; }; };
    const pristine = Array.from({ length: N }, (_, i) => { const r = seed(i); return Uint8Array.from({ length: 64 }, r); });
    let disk, state, wb = true, fmt = 'e01', acqHash = null, busy = false;
    const concat = (arr) => { const out = new Uint8Array(arr.length * 64); arr.forEach((s, i) => out.set(s, i * 64)); return out; };
    const seizedHash = App.hash.sha256(concat(pristine));
    const short = (x) => x.slice(0, 8) + '…' + x.slice(-6);
    const grid = $('.sectors', el), logEl = $('.img-log', el);
    const log = (t, bad) => { const li = document.createElement('li'); li.className = bad ? 'bad' : ''; li.textContent = t; logEl.appendChild(li); logEl.scrollTop = logEl.scrollHeight; };
    function reset() {
      disk = pristine.map((s) => s.slice()); state = new Array(N).fill('u'); acqHash = null; busy = false;
      logEl.innerHTML = '';
      $('[data-o=seized]', el).textContent = short(seizedHash);
      $('[data-o=acq]', el).textContent = '–'; $('[data-o=ver]', el).textContent = '–';
      $('[data-o=res]', el).textContent = 'Not started'; $('[data-o=srow]', el).className = 'ro status';
      step('connect'); paintGrid();
    }
    function step(s) {
      ['connect', 'acquire', 'verify'].forEach((k) => ($(`[data-step=${k}]`, el).disabled = k !== s || busy));
      $('[data-t=wb]', el).disabled = s !== 'connect' || busy;
    }
    function paintGrid() { grid.innerHTML = state.map((s, i) => `<span class="sec s-${s}" title="Sector ${i}"></span>`).join(''); }
    function paintFmt() { const f = FORMATS[fmt]; $('.fmt-f', el).innerHTML = `<li class="fmt-size"><b>${f.size}</b><span class="muted small">for a 512 GB drive with 170 GB in use</span></li>` + f.f.map((x) => `<li>${x}</li>`).join(''); }
    $('[data-t=wb]', el).addEventListener('change', (e) => { wb = e.target.checked; });
    App.bindSeg(el, 'fmt', (v) => { fmt = v; paintFmt(); });
    $('[data-reset]', el).addEventListener('click', reset);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-step]'); if (!b || b.disabled) return;
      const s = b.dataset.step;
      if (s === 'connect') {
        busy = true; step('');
        log(wb ? 'Drive connected through a Tableau write blocker. Read-only.' : 'Drive connected directly by USB to the Windows workstation.');
        if (wb) { App.later(500, () => { log('Blocker reports: 0 write commands passed through.'); busy = false; step('acquire'); }); return; }
        OS_WRITES.forEach(([sec, msg], k) => App.later(450 + k * 380, () => {
          disk[sec][k % 64] ^= 0x5a; disk[sec][(k * 7) % 64] ^= 0x33; state[sec] = 'w'; paintGrid(); log(msg, true);
          if (k === OS_WRITES.length - 1) { busy = false; step('acquire'); }
        }));
      }
      if (s === 'acquire') {
        busy = true; step('');
        log(`Acquiring to ${FORMATS[fmt].n}, hashing as it reads…`);
        let i = 0; const every = App.reduced ? 1 : 32;
        const tick = () => {
          if (i < N) { if (state[i] === 'u') state[i] = 'r'; else state[i] = 'wr'; paintGrid(); i++; App.later(every, tick); return; }
          acqHash = App.hash.sha256(concat(disk));
          $('[data-o=acq]', el).textContent = short(acqHash);
          log(`Acquisition complete. SHA-256 ${short(acqHash)}`);
          busy = false; step('verify');
        };
        tick();
      }
      if (s === 'verify') {
        const ver = App.hash.sha256(concat(disk));
        $('[data-o=ver]', el).textContent = short(ver);
        log(`Image file re-hashed: ${short(ver)}. ${ver === acqHash ? 'Matches the acquisition hash.' : 'Does not match.'}`);
        const clean = acqHash === seizedHash;
        $('[data-o=res]', el).textContent = clean ? 'Faithful to the seized drive' : 'Copy matches, evidence altered';
        $('[data-o=srow]', el).className = 'ro status ' + (clean ? 'good' : 'bad');
        log(clean ? 'The image is identical to the drive as it was seized.' : 'The image matches itself, but not the drive as it was seized: six sectors were changed before imaging.', !clean);
        step('');
      }
    });
    paintFmt(); reset();
  });
})();
