(function () {
  'use strict';
  const { h, $, $$, icon, esc } = App;
  const mono = () => App.cssVar('--mono') || 'monospace';
  const sans = () => App.cssVar('--font') || 'sans-serif';

  /* =====================================================================
     Lesson 9: Event log filtering
     ===================================================================== */
  const EVID = {
    4624: 'Logon succeeded', 4625: 'Logon failed', 4634: 'Logoff', 4672: 'Special privileges assigned',
    4688: 'Process created', 4720: 'User account created', 4732: 'Member added to security group',
    7045: 'New service installed', 1102: 'Security log cleared', 4104: 'PowerShell script block'
  };
  const LT = { 2: 'Interactive', 3: 'Network', 10: 'RemoteInteractive (RDP)' };
  function buildLogs() {
    const L = [], base = Date.UTC(2026, 2, 10, 8, 0, 0);
    let id = 1;
    const add = (min, eid, ch, o) => L.push({ i: id++, t: base + min * 60000, eid, ch, ...o });
    // background noise across the morning
    const users = ['dokafor', 'rlangley', 'svc_backup', 'mpatel'];
    for (let m = 0; m < 380; m += 1) {
      if (Math.random() < 0.25) add(m, 4624, 'Security', { user: users[Math.floor(Math.random() * 3)], lt: 3, ip: '10.20.4.' + (10 + Math.floor(Math.random() * 40)), note: 'Routine network logon' });
      if (Math.random() < 0.12) add(m, 4634, 'Security', { user: users[Math.floor(Math.random() * 3)], note: 'Logoff' });
      if (Math.random() < 0.18) add(m, 4688, 'Security', { user: 'dokafor', proc: ['msedge.exe', 'EXCEL.EXE', 'OUTLOOK.EXE', 'Teams.exe'][Math.floor(Math.random() * 4)], note: 'Routine process' });
    }
    // the attack, ~14:20-14:40 (min 380-400) after a bruteforce
    for (let k = 0; k < 40; k++) add(372 + k * 0.05, 4625, 'Security', { user: 'dokafor', lt: 3, ip: '198.51.100.74', note: 'Failed logon: bad password', sus: 1 });
    add(374, 4624, 'Security', { user: 'dokafor', lt: 10, ip: '198.51.100.74', note: 'Logon succeeded from an external address over RDP', sus: 2 });
    add(374.2, 4672, 'Security', { user: 'dokafor', note: 'Administrator-equivalent privileges assigned to the session', sus: 1 });
    add(376, 4688, 'Security', { user: 'dokafor', proc: 'cmd.exe', parent: 'explorer.exe', note: 'Command prompt opened', sus: 1 });
    add(377, 4104, 'PowerShell', { user: 'dokafor', note: 'Script block: downloaded and ran code from the internet, execution policy bypassed', sus: 2 });
    add(378, 7045, 'System', { user: 'SYSTEM', svc: 'WinTelemetrySvc', note: 'New service installed, binary in C:\\Users\\Public', sus: 2 });
    add(379, 4688, 'Security', { user: 'dokafor', proc: 'rv.exe', parent: 'cmd.exe', note: 'Renamed remote-access program run from C:\\Users\\Public', sus: 2 });
    add(381, 4720, 'Security', { user: 'dokafor', note: 'New local account created: "helpdesk_svc"', sus: 2 });
    add(381.5, 4732, 'Security', { user: 'dokafor', note: '"helpdesk_svc" added to the Administrators group', sus: 2 });
    add(383, 4624, 'Security', { user: 'helpdesk_svc', lt: 10, ip: '198.51.100.74', note: 'New account logs in over RDP', sus: 2 });
    add(400, 1102, 'Security', { user: 'dokafor', note: 'The Security event log was cleared', sus: 2 });
    return L.sort((a, b) => a.t - b.t);
  }
  const fmtTime = (ms) => { const d = new Date(ms); return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')}`; };
  App.route('/live/eventlogs', function (view) {
    const el = App.lessonPage(view, 'live', 'eventlogs', {
      lede: 'A workstation generated over a thousand events this morning. One of them is an attacker logging in, and a handful more are what they did next. Filter the noise down to the story. A guided hunt walks you through it.',
      lab: `
        <div class="lab-bar">
          <div class="gl-search evt-search">${icon('search', 18)}<input type="search" placeholder="Search message text" aria-label="Search events"></div>
          <div class="spacer"></div>
          ${App.seg('ch', [['all', 'All logs'], ['Security', 'Security'], ['System', 'System'], ['PowerShell', 'PowerShell']], 'all', 'Channel')}
          ${App.toggle('sus', 'Only flagged', false)}
        </div>
        <div class="evt-ids"></div>
        <div class="hunt"></div>
        <div class="evt-count muted small" aria-live="polite"></div>
        <div class="table-wrap evt-wrap"><table class="spec evt-t"><thead><tr><th scope="col">Time (UTC)</th><th scope="col">ID</th><th scope="col">Channel</th><th scope="col">User</th><th scope="col">Detail</th></tr></thead><tbody></tbody></table></div>`,
      body: `
        <h2>The logs that matter most</h2>
        <p>Windows keeps dozens of logs, but a few carry most of the story. Each event has a numeric <strong>Event ID</strong>:</p>
        <ul>
          <li><strong>4624</strong> logon succeeded, <strong>4625</strong> logon failed, <strong>4634</strong> logoff. The <em>logon type</em> matters: type 3 is a network logon, type 10 is RDP.</li>
          <li><strong>4672</strong> a session was granted administrator-level privileges.</li>
          <li><strong>4688</strong> a process was created, and <strong>4720</strong> / <strong>4732</strong> a new account was created and added to a group.</li>
          <li><strong>7045</strong> a new service was installed, a classic persistence move.</li>
          <li><strong>4104</strong> a PowerShell script block ran, and <strong>1102</strong> the Security log was cleared.</li>
        </ul>
        <h2>A pattern worth knowing</h2>
        <p>Many failed logons (4625) followed by a success (4624) is a password-guessing attack that finally worked. If that success is logon type 10 from an outside address, someone is on the machine over remote desktop. What follows here is a textbook sequence: gain admin, run tooling, install a service and a spare admin account for persistence, then clear the log to cover up.</p>
        <h2>Clearing the log leaves a mark</h2>
        <p>Event <strong>1102</strong> records that the Security log was cleared. The attacker can’t erase the fact that they erased it without more effort, and in a real network the logs are usually already forwarded to a <strong>SIEM</strong>, so a local wipe changes nothing. That’s exactly why central log collection matters.</p>
        <h2>How analysts work</h2>
        <p>Rather than read every line, analysts filter and pivot: start from an alert, filter to the relevant IDs, find a suspicious logon, then pivot on its account and source address to see everything around it. Tools like <strong>EvtxECmd</strong> turn the logs into CSV for <strong>Timeline Explorer</strong>, and a SIEM does the same across every machine at once.</p>`,
      notes: [['4625 → 4624', 'Failed logons then a success: a guessing attack that worked.'], ['Type 10', 'An RDP logon. From an outside address, a red flag.'], ['7045', 'A new service, a common persistence trick.'], ['1102', 'The Security log was cleared.']],
      takeaways: [
        'Learn the key event IDs: 4624/4625 logon, 4672 privileges, 4688 process, 4720/4732 accounts, 7045 service, 1102 log cleared.',
        'A burst of 4625 then a 4624 of type 10 from outside is an intrusion signature.',
        'Filter and pivot on account and source rather than reading every line, and forward logs so a local wipe can’t hide anything.'
      ]
    });
    const LOGS = buildLogs();
    let q = '', ch = 'all', susOnly = false, idFilter = new Set(), step = 0;
    const HUNT = [
      { txt: 'Start where the trouble starts. Turn on “Only flagged” to hide the routine noise.', check: () => susOnly, act: 'Enabled the flagged filter' },
      { txt: 'A password-guessing attack shows as many failed logons. Add event 4625 to see them, and notice they stop the moment one succeeds.', check: () => idFilter.has(4625), act: 'Added 4625' },
      { txt: 'Find the successful logon that followed. Add 4624 and look for logon type 10 (RDP) from the outside address 198.51.100.74.', check: () => idFilter.has(4624), act: 'Added 4624' },
      { txt: 'Now pivot: search for that address to pull together everything from that session.', check: () => q.includes('198.51.100.74'), act: 'Pivoted on the source IP' },
      { txt: 'Finally, clear the search and look for the cover-up. Event 1102 means the log was cleared.', check: () => idFilter.has(1102) || q.includes('cleared'), act: 'Found the log clearing' }
    ];
    function renderHunt() {
      const box = $('.hunt', el);
      if (step >= HUNT.length) { box.innerHTML = `<div class="hunt-done">${icon('check', 16)}<div><b>You reconstructed the intrusion.</b> A brute-force at 14:12, an RDP logon from 198.51.100.74 at 14:14, admin rights, a remote-access program, a new service and a rogue “helpdesk_svc” admin account, then the log cleared at 14:40. That timeline feeds the capstone.</div></div>`; return; }
      const hstep = HUNT[step];
      box.innerHTML = `<div class="hunt-step"><span class="hunt-n mono">Hunt ${step + 1}/${HUNT.length}</span><p>${hstep.txt}</p>${hstep.check() ? `<button type="button" class="btn sm primary" data-hnext>${hstep.act}${icon('next', 14)}</button>` : `<span class="hunt-wait muted small">Waiting for the filter above…</span>`}</div>`;
    }
    function renderIds() {
      const present = [...new Set(LOGS.map((l) => l.eid))].sort((a, b) => a - b);
      $('.evt-ids', el).innerHTML = present.map((e) => `<button type="button" class="idchip ${idFilter.has(e) ? 'on' : ''}" data-id="${e}">${e}<small>${EVID[e]}</small></button>`).join('');
    }
    function render() {
      const rows = LOGS.filter((l) => (ch === 'all' || l.ch === ch) && (!susOnly || l.sus) && (!idFilter.size || idFilter.has(l.eid)) && (!q || (l.note + ' ' + (l.user || '') + ' ' + (l.ip || '') + ' ' + (l.proc || '')).toLowerCase().includes(q)));
      $('.evt-count', el).textContent = `${rows.length} of ${LOGS.length} events shown`;
      $('.evt-t tbody', el).innerHTML = rows.slice(0, 300).map((l) => `<tr class="${l.sus ? 'sus s' + l.sus : ''}"><td class="mono small">${fmtTime(l.t)}</td><td class="mono"><b>${l.eid}</b></td><td class="small">${l.ch}</td><td class="small">${esc(l.user || '')}${l.lt ? ` <span class="lt">t${l.lt}</span>` : ''}</td><td class="small">${esc(l.note)}${l.ip ? ` <code>${l.ip}</code>` : ''}${l.proc ? ` <code>${esc(l.proc)}</code>${l.parent ? ` <span class="muted">← ${esc(l.parent)}</span>` : ''}` : ''}</td></tr>`).join('') || `<tr><td colspan="5" class="muted" style="padding:20px">No events match. Loosen the filters.</td></tr>`;
      renderHunt();
    }
    $('input', $('.evt-search', el)).addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); render(); });
    App.bindSeg(el, 'ch', (v) => { ch = v; render(); });
    $('[data-t=sus]', el).addEventListener('change', (e) => { susOnly = e.target.checked; render(); });
    $('.evt-ids', el).addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (!b) return; const id = +b.dataset.id; idFilter.has(id) ? idFilter.delete(id) : idFilter.add(id); renderIds(); render(); });
    $('.hunt', el).addEventListener('click', (e) => { if (e.target.closest('[data-hnext]')) { step++; render(); } });
    renderIds(); render();
  });

  /* =====================================================================
     Lesson 10: Memory forensics — process tree
     ===================================================================== */
  const PROCS = [
    { pid: 4, ppid: 0, n: 'System', path: '', sus: 0, why: '' },
    { pid: 388, ppid: 4, n: 'smss.exe', path: 'C:\\Windows\\System32\\smss.exe', sus: 0 },
    { pid: 512, ppid: 388, n: 'wininit.exe', path: 'C:\\Windows\\System32\\wininit.exe', sus: 0 },
    { pid: 520, ppid: 388, n: 'csrss.exe', path: 'C:\\Windows\\System32\\csrss.exe', sus: 0 },
    { pid: 604, ppid: 512, n: 'services.exe', path: 'C:\\Windows\\System32\\services.exe', sus: 0 },
    { pid: 668, ppid: 512, n: 'lsass.exe', path: 'C:\\Windows\\System32\\lsass.exe', sus: 0, why: 'The real lsass, correctly parented by wininit via services. One, and only one, should exist.' },
    { pid: 720, ppid: 604, n: 'svchost.exe', path: 'C:\\Windows\\System32\\svchost.exe', sus: 0 },
    { pid: 1180, ppid: 604, n: 'svchost.exe', path: 'C:\\Windows\\System32\\svchost.exe', sus: 0 },
    { pid: 2044, ppid: 604, n: 'spoolsv.exe', path: 'C:\\Windows\\System32\\spoolsv.exe', sus: 0 },
    { pid: 3312, ppid: 6220, n: 'explorer.exe', path: 'C:\\Windows\\explorer.exe', sus: 0, why: 'Explorer’s parent (userinit) exits, so a missing parent here is normal.' },
    { pid: 4820, ppid: 3312, n: 'msedge.exe', path: 'C:\\Program Files (x86)\\Microsoft\\Edge\\msedge.exe', sus: 0 },
    { pid: 5561, ppid: 3312, n: 'cmd.exe', path: 'C:\\Windows\\System32\\cmd.exe', sus: 0 },
    { pid: 6120, ppid: 5561, n: 'lsass.exe', path: 'C:\\Users\\Public\\lsass.exe', sus: 2, why: 'A SECOND lsass, spelled the same but living in C:\\Users\\Public and spawned by cmd.exe. The real one lives in System32 and is never a child of cmd. This is a program hiding behind a trusted name.' },
    { pid: 6260, ppid: 5561, n: 'rv.exe', path: 'C:\\Users\\Public\\rv.exe', sus: 2, why: 'An unsigned program run from a user-writable folder, launched from the command prompt. This is the remote-access program the disk artifacts pointed to.' },
    { pid: 6410, ppid: 6260, n: 'powershell.exe', path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', sus: 1, why: 'PowerShell itself is normal, but its parent is rv.exe. A remote-access program spawning a shell is worth a hard look at its command line.' },
    { pid: 6733, ppid: 668, n: 'conhost.exe', path: 'C:\\Windows\\System32\\conhost.exe', sus: 1, why: 'conhost is normal, but a child of lsass.exe is not. It hangs off the fake lsass, more evidence that PID 6120 is malicious.' }
  ];
  App.route('/live/memory', function (view) {
    const el = App.lessonPage(view, 'live', 'memory', {
      lede: 'Malware that never writes a file to disk still has to run in memory. A RAM capture from the workstation lists every process that was alive. Read the process tree and find the two that don’t belong.',
      lab: `
        <div class="lab-bar">
          <span class="muted small mono">Volatility 3 · windows.pstree</span>
          <div class="spacer"></div>
          <span class="mem-score" aria-live="polite"></span>
          <button type="button" class="btn ghost sm" data-reveal>Reveal answers</button>
        </div>
        <div class="lab-grid mem-grid">
          <div class="lab-stage mem-stage"><div class="ptree" role="tree" aria-label="Process tree"></div></div>
          <div class="lab-panel"><div class="mem-detail"></div></div>
        </div>`,
      body: `
        <h2>Why memory</h2>
        <p>RAM holds what the disk never sees: programs that only ever ran in memory, decrypted data, network connections, command lines and injected code. Capture it with <strong>WinPMEM</strong>, <strong>Magnet RAM Capture</strong> or <strong>DumpIt</strong>, then analyze the dump with <strong>Volatility 3</strong> or <strong>MemProcFS</strong>. Because it captures a live moment, memory is near the top of the order of volatility, so it’s collected early.</p>
        <h2>Read the tree, not the list</h2>
        <p>Every process has a <strong>PID</strong> and a <strong>parent PID</strong>. Windows startup is predictable, so the shape of the tree is itself evidence. Learn the normal parentage and the exceptions jump out:</p>
        <ul>
          <li><code>smss.exe</code> starts <code>wininit.exe</code> and <code>csrss.exe</code>.</li>
          <li><code>wininit.exe</code> → <code>services.exe</code> → <code>lsass.exe</code>. There is exactly <strong>one</strong> <code>lsass.exe</code>, and it lives in <code>System32</code>.</li>
          <li><code>services.exe</code> is the parent of the <code>svchost.exe</code> processes.</li>
          <li><code>explorer.exe</code> is where a user’s own programs hang. A user program spawning <code>cmd.exe</code> or <code>powershell.exe</code> can be fine, or can be the attacker.</li>
        </ul>
        <h2>The tells</h2>
        <ul>
          <li><strong>Wrong path.</strong> <code>lsass.exe</code> in <code>C:\\Users\\Public</code> is not the real one.</li>
          <li><strong>Wrong parent.</strong> <code>lsass.exe</code> as a child of <code>cmd.exe</code>, or <code>conhost.exe</code> hanging off <code>lsass</code>, is wrong.</li>
          <li><strong>Trusted names in odd places</strong>, and programs run from user-writable folders like <code>Public</code> or <code>Temp</code>.</li>
        </ul>
        <p>Deeper checks: <code>malfind</code> finds injected code with no file behind it, <code>netscan</code> lists connections, and comparing the process list against the kernel’s own structures catches processes hidden by a rootkit.</p>`,
      notes: [['1 lsass', 'There should be exactly one, in System32, parented by services.exe.'], ['PPID', 'The parent PID reveals who launched a process.'], ['malfind', 'Volatility plugin that spots injected, file-less code.'], ['netscan', 'Lists network connections found in the memory image.']],
      takeaways: [
        'Memory captures file-less malware, command lines and connections that never hit disk.',
        'Learn the normal Windows process tree; wrong path and wrong parent are the loudest tells.',
        'A second lsass, or one outside System32, is a classic masquerade.'
      ]
    });
    const kids = (pid) => PROCS.filter((p) => p.ppid === pid);
    const roots = PROCS.filter((p) => !PROCS.some((q) => q.pid === p.ppid));
    let picks = new Set(), sel = null, revealed = false;
    function node(p, depth) {
      const k = kids(p.pid);
      const flagged = picks.has(p.pid);
      const show = revealed;
      const cls = show ? (p.sus >= 2 ? 'is-bad' : p.sus === 1 ? 'is-warn' : flagged ? 'is-false' : '') : flagged ? 'picked' : '';
      return `<div class="pnode" style="--d:${depth}">
        <button type="button" class="prow ${cls} ${sel === p.pid ? 'sel' : ''}" data-pid="${p.pid}">
          <span class="ptw" aria-hidden="true">${'│ '.repeat(Math.max(0, depth - 1))}${depth ? '├ ' : ''}</span>
          <span class="pname">${esc(p.n)}</span><span class="ppid mono">${p.pid}</span>
          ${show && p.sus ? icon(p.sus >= 2 ? 'alert' : 'flag', 14) : ''}
        </button>
      </div>` + k.map((c) => node(c, depth + 1)).join('');
    }
    function render() {
      $('.ptree', el).innerHTML = roots.map((r) => node(r, 0)).join('');
      const bad = PROCS.filter((p) => p.sus >= 2), hit = bad.filter((p) => picks.has(p.pid)).length, fp = [...picks].filter((pid) => PROCS.find((p) => p.pid === pid).sus === 0).length;
      $('.mem-score', el).textContent = revealed ? 'Answers shown' : `${hit}/${bad.length} malicious found${fp ? `, ${fp} false` : ''}`;
      renderDetail();
    }
    function renderDetail() {
      const box = $('.mem-detail', el);
      if (sel === null) { box.innerHTML = `<h3>Pick a process</h3><p class="muted small">Click any row to inspect its path and parent. Flag the ones you think are malicious, then reveal the answers.</p>`; return; }
      const p = PROCS.find((x) => x.pid === sel), par = PROCS.find((x) => x.pid === p.ppid);
      box.innerHTML = `<div class="gd-head"><div><h3>${esc(p.n)}</h3><p class="muted small">PID ${p.pid} · parent ${p.ppid}${par ? ` (${esc(par.n)})` : ' (exited)'}</p></div></div>
        <p class="mono small art-loc">${esc(p.path || '(kernel)')}</p>
        <button type="button" class="btn sm ${picks.has(p.pid) ? 'primary' : ''}" data-flag="${p.pid}">${icon('flag', 14)}${picks.has(p.pid) ? 'Flagged as malicious' : 'Flag as malicious'}</button>
        ${revealed ? `<div class="callout ${p.sus >= 2 ? 'bad' : p.sus === 1 ? '' : 'good'}">${p.why || 'A normal system process in its expected place.'}</div>` : ''}`;
    }
    $('.ptree', el).addEventListener('click', (e) => { const b = e.target.closest('[data-pid]'); if (b) { sel = +b.dataset.pid; render(); } });
    el.addEventListener('click', (e) => {
      const f = e.target.closest('[data-flag]'); if (f) { const pid = +f.dataset.flag; picks.has(pid) ? picks.delete(pid) : picks.add(pid); render(); }
      if (e.target.closest('[data-reveal]')) { revealed = !revealed; $('[data-reveal]', el).textContent = revealed ? 'Hide answers' : 'Reveal answers'; render(); }
    });
    render();
  });

  /* =====================================================================
     Lesson 11: Network beaconing
     ===================================================================== */
  App.route('/live/network', function (view) {
    const el = App.lessonPage(view, 'live', 'network', {
      lede: 'Malware phones home on a schedule. Buried in a day of ordinary traffic is one host calling the same address at a steady rhythm. Adjust the jitter and threshold to see how analysts separate a beacon from normal chatter.',
      lab: `
        <div class="lab-grid">
          <div class="lab-stage beacon-stage"><canvas class="beacon" aria-label="Connection timing to each destination"></canvas></div>
          <div class="lab-panel">
            <div class="dest-list"></div>
            ${App.range('jit', 'Beacon jitter (randomness added)', 0, 80, 1, 15)}
            ${App.range('thr', 'Flag if regularity score is above', 50, 99, 1, 80)}
            <div class="readouts">
              <div class="ro"><span>Destinations</span><b data-o="dn"></b></div>
              <div class="ro"><span>Flagged as beacons</span><b data-o="fn"></b></div>
              <div class="ro status" data-o="vr"><span>The C2 beacon</span><b data-o="v"></b></div>
            </div>
          </div>
        </div>`,
      body: `
        <h2>Beaconing</h2>
        <p>Once malware is installed, it usually calls out to a <strong>command-and-control (C2)</strong> server to ask for instructions. It can’t stay silent, and it can’t hold a connection open without being obvious, so it checks in at intervals: every 60 seconds, every 5 minutes, every hour. That regular heartbeat is a <strong>beacon</strong>, and its rhythm is what gives it away.</p>
        <h2>Finding the rhythm</h2>
        <p>People generate irregular traffic: you load a page, read for a while, click again. A beacon connects like a metronome. If you measure the time between each connection to a destination and those gaps are nearly identical, that regularity is suspicious no matter how normal the address looks. Tools like <strong>RITA</strong> and <strong>Zeek</strong> score every destination this way, and <strong>Arkime</strong> or <strong>Wireshark</strong> let you inspect the packets.</p>
        <h2>Jitter and other evasions</h2>
        <p>Attackers know this, so modern frameworks add <strong>jitter</strong>, a random wobble to each interval. Turn the jitter up in the lab and watch the beacon’s regularity score fall toward the noise. Defenders respond by watching over long windows, since even jittered beacons cluster around an average, and by adding other signals: a tiny, constant request size, a newly registered domain, connections at 3 a.m., or far more bytes going out than coming in.</p>
        <h2>Beacons hide in normal-looking traffic</h2>
        <p>C2 rarely looks exotic. It often rides HTTPS to a plausible domain, or hides in DNS queries, precisely because that traffic is allowed out and rarely inspected. That’s why timing analysis matters: it works on the pattern of the connections, not their contents, so it sees through encryption.</p>`,
      notes: [['Beacon', 'A regular check-in from malware to its C2 server.'], ['Jitter', 'Random wobble added to intervals to defeat timing analysis.'], ['RITA / Zeek', 'Tools that score destinations for beacon-like regularity.'], ['Long windows', 'Watching for hours defeats jitter, because the average still shows.']],
      takeaways: [
        'Malware beacons to C2 on a schedule, and the regular rhythm is the tell.',
        'Jitter blurs the interval, so analysts watch over long windows and add other signals.',
        'Timing analysis works on connection patterns, so it sees through encryption.'
      ]
    });
    const DEST = [
      { host: 'edge-cdn.example-updates.com', mean: 3.5, jitterMul: 1, n: 120, kind: 'browsing', ev: 'A CDN behind normal web browsing. Bursty and irregular.' },
      { host: 'teams.microsoft.example', mean: 20, jitterMul: 0.7, n: 40, kind: 'app', ev: 'A chat app polling for messages. Fairly regular, but a known service.' },
      { host: 'mail.northwind.example', mean: 60, jitterMul: 0.9, n: 22, kind: 'app', ev: 'Mail client checking for new messages.' },
      { host: 'cdn77-assets.example.net', mean: 8, jitterMul: 1, n: 70, kind: 'browsing', ev: 'Static assets loading as the user browses.' },
      { host: 'sync.winupdate-telemetry.top', mean: 45, jitterMul: 0.05, n: 30, kind: 'c2', ev: 'The beacon. A newly registered .top domain, contacted like clockwork every 45 seconds, tiny identical requests. This is the C2 channel rv.exe opened.' }
    ];
    let jitter = 15, thr = 80;
    function connections(d) {
      let rng = (() => { let x = d.host.length * 7919; return () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; }; })();
      const out = []; let t = rng() * d.mean;
      const jf = (jitter / 100) * d.jitterMul;
      for (let i = 0; i < d.n; i++) { out.push(t); t += d.mean * (1 + (rng() * 2 - 1) * (d.kind === 'browsing' ? 0.9 : jf)); }
      return out;
    }
    function regularity(times) {
      const gaps = times.slice(1).map((t, i) => t - times[i]);
      if (gaps.length < 3) return 0;
      const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const sd = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length);
      const cv = sd / mean; // low = regular
      return Math.round(Math.max(0, Math.min(99, 100 * (1 - cv))));
    }
    const cv = $('.beacon', el);
    const model = () => DEST.map((d) => { const times = connections(d); return { d, times, score: regularity(times) }; });
    const sc = App.canvas(cv, () => draw());
    function draw() {
      const ctx = sc.ctx; if (!ctx) return;
      const { w, h: H } = sc, c = App.col(), rows = model();
      const padL = 8, padR = 8, top = 8, laneH = (H - top - 8) / rows.length, maxT = 24 * 60;
      ctx.clearRect(0, 0, w, H);
      rows.forEach((r, i) => {
        const y = top + i * laneH + laneH / 2, flag = r.score >= thr;
        ctx.fillStyle = App.alpha(c.text, i % 2 ? 0.02 : 0.05); ctx.fillRect(padL, top + i * laneH, w - padL - padR, laneH - 3);
        ctx.strokeStyle = App.alpha(c.line2, 0.7); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
        r.times.forEach((t) => {
          const x = padL + (t / maxT) * (w - padL - padR);
          ctx.fillStyle = flag ? (r.d.kind === 'c2' ? c.bad : c.accent) : App.alpha(c.text, 0.5);
          ctx.fillRect(x - 1, y - (flag ? 9 : 6), flag ? 2.4 : 1.6, flag ? 18 : 12);
        });
      });
    }
    function render() {
      const rows = model();
      $('#o-jit', el).textContent = jitter + '%'; $('#o-thr', el).textContent = thr;
      $('.dest-list', el).innerHTML = rows.map((r) => `<div class="dest ${r.score >= thr ? (r.d.kind === 'c2' ? 'c2' : 'flag') : ''}"><div class="dest-top"><code>${esc(r.d.host)}</code><b class="mono">${r.score}</b></div><div class="meter"><i style="width:${r.score}%"></i></div></div>`).join('');
      const flagged = rows.filter((r) => r.score >= thr);
      const c2 = rows.find((r) => r.d.kind === 'c2');
      $('[data-o=dn]', el).textContent = DEST.length;
      $('[data-o=fn]', el).textContent = flagged.length;
      const caught = c2.score >= thr, others = flagged.filter((r) => r.d.kind !== 'c2').length;
      $('[data-o=v]', el).textContent = caught ? (others ? `Caught, with ${others} false` : 'Caught, cleanly') : 'Missed';
      $('[data-o=vr]', el).className = 'ro status ' + (caught && !others ? 'good' : caught ? '' : 'bad');
      draw();
    }
    $('[data-r=jit]', el).addEventListener('input', (e) => { jitter = +e.target.value; render(); });
    $('[data-r=thr]', el).addEventListener('input', (e) => { thr = +e.target.value; render(); });
    render();
  });

  /* =====================================================================
     Lesson 12: Capstone timeline
     ===================================================================== */
  const TL = [
    { t: '2026-03-09 22:14', src: 'Email gateway', act: 'Phishing email delivered to dokafor@northwind, subject “Invoice overdue — action required”, link to invoice-verify.example.', tag: 'Initial access', mid: true },
    { t: '2026-03-10 08:03', src: 'Proxy log', act: 'dokafor’s browser visits invoice-verify.example and downloads invoice.iso.', tag: 'Initial access' },
    { t: '2026-03-10 08:05', src: 'Prefetch', act: 'invoice.lnk inside the ISO runs, launching a PowerShell one-liner. (Lesson 8)', tag: 'Execution' },
    { t: '2026-03-10 14:12', src: 'Security 4625 ×40', act: 'Burst of failed logons for dokafor from 198.51.100.74. (Lesson 9)', tag: 'Credential access', mid: true },
    { t: '2026-03-10 14:14', src: 'Security 4624', act: 'Successful RDP logon (type 10) for dokafor from 198.51.100.74. (Lesson 9)', tag: 'Lateral / access', key: true },
    { t: '2026-03-10 14:14', src: 'Security 4672', act: 'Administrator-level privileges assigned to the session.', tag: 'Privilege' },
    { t: '2026-03-10 14:29', src: 'Amcache + Prefetch', act: 'rv.exe (a renamed remote-access program) written to C:\\Users\\Public and run 3 times. (Lesson 8)', tag: 'Execution', key: true },
    { t: '2026-03-10 14:30', src: 'Memory pstree', act: 'A second lsass.exe running from C:\\Users\\Public, and conhost parented by it. (Lesson 10)', tag: 'Defense evasion' },
    { t: '2026-03-10 14:31', src: 'Network / SRUM', act: 'Steady 45-second beacon to sync.winupdate-telemetry.top; ~38 MB uploaded. (Lessons 11, 8)', tag: 'C2 / Exfiltration', key: true, mid: true },
    { t: '2026-03-10 14:33', src: 'Security 7045', act: 'New service “WinTelemetrySvc” installed, binary in C:\\Users\\Public. (Lesson 9)', tag: 'Persistence' },
    { t: '2026-03-10 14:34', src: 'Security 4720 + 4732', act: 'Local account “helpdesk_svc” created and added to Administrators. (Lesson 9)', tag: 'Persistence' },
    { t: '2026-03-10 14:40', src: 'Security 1102', act: 'The Security event log is cleared. (Lesson 9)', tag: 'Defense evasion', key: true }
  ];
  const TAGS = [...new Set(TL.map((e) => e.tag))];
  App.route('/live/timeline', function (view) {
    const el = App.lessonPage(view, 'live', 'timeline', {
      lede: 'This is where every lab comes together. A timeline (“super timeline”) merges evidence from disk, logs, memory and network into one ordered story. Build the case against the finance-workstation intrusion, then answer for it.',
      lab: `
        <div class="lab-bar">
          <span class="muted small">Filter by stage</span>
          <div class="tl-tags">${TAGS.map((t) => `<button type="button" class="idchip on" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>
          <div class="spacer"></div>
          ${App.toggle('key', 'Key events only', false)}
        </div>
        <ol class="timeline"></ol>`,
      body: `
        <h2>What a timeline is</h2>
        <p>Every artifact in this course carries a time. Put them on one axis and the story appears: not “a service was installed” and “a login failed” as separate facts, but a sequence, a phishing email at 22:14, an RDP login at 14:14, a program at 14:29, a beacon at 14:31, persistence at 14:33, the log cleared at 14:40. A <strong>super timeline</strong> merges file-system times, registry keys, event logs, browser history and more into a single sortable file. <strong>Plaso</strong> (<code>log2timeline</code>) builds them and <strong>Timeline Explorer</strong> reviews them.</p>
        <h2>Anchor, then expand</h2>
        <p>You rarely timeline the whole disk at once, because it produces millions of rows. Analysts anchor on a known time, such as the RDP login here, then expand outward, pulling in the minutes before and after from each source. The color tags on the left map each step to a stage of the intrusion, roughly the phases of <strong>MITRE ATT&amp;CK</strong>: initial access, execution, privilege escalation, defense evasion, persistence, command-and-control, exfiltration.</p>
        <h2>Corroboration is the point</h2>
        <p>A single artifact can mislead: a timestamp can be stomped, a log can be cleared. The timeline’s strength is that independent sources agree. The beacon shows in both the network capture and SRUM. The program shows in Prefetch, Amcache and memory. When several artifacts that an attacker would have to tamper with separately all tell the same story, the conclusion holds up, in the report and in court.</p>
        <h2>From timeline to report</h2>
        <p>The finished timeline becomes the backbone of the incident report: an executive summary, this sequence of events, the evidence behind each step, the scope of what was affected, and recommendations. That report, resting on properly acquired and hashed evidence with an unbroken chain of custody, is the whole point of everything in the Foundations track.</p>`,
      notes: [['Super timeline', 'All artifacts from all sources merged onto one time axis.'], ['Plaso', 'The log2timeline engine that builds super timelines.'], ['Anchor', 'Start from a known time and expand outward.'], ['ATT&CK', 'MITRE’s catalog of attacker tactics and techniques.']],
      takeaways: [
        'A timeline merges disk, log, memory and network artifacts into one ordered sequence.',
        'Anchor on a known event, then expand outward rather than timelining everything.',
        'Corroboration across independent sources is what makes the conclusion hold up.'
      ]
    });
    let tags = new Set(TAGS), keyOnly = false, quizStarted = false;
    const tagClass = (t) => 'tg-' + TAGS.indexOf(t);
    function render() {
      const rows = TL.filter((e) => tags.has(e.tag) && (!keyOnly || e.key));
      $('.timeline', el).innerHTML = rows.map((e) => `
        <li class="tl ${e.key ? 'key' : ''} ${tagClass(e.tag)}">
          <span class="tl-time mono">${e.t.slice(5)}</span>
          <span class="tl-dot" aria-hidden="true"></span>
          <div class="tl-body">
            <div class="tl-top"><span class="tl-tag">${esc(e.tag)}</span><span class="tl-src mono small">${esc(e.src)}</span></div>
            <p>${esc(e.act)}</p>
          </div>
        </li>`).join('') + `<li class="tl-final"><button type="button" class="btn primary" data-quiz>${icon('flag', 16)}Answer the case questions</button></li>`;
    }
    $('.tl-tags', el).addEventListener('click', (e) => { const b = e.target.closest('[data-tag]'); if (!b) return; const t = b.dataset.tag; tags.has(t) ? tags.delete(t) : tags.add(t); b.classList.toggle('on'); render(); });
    $('[data-t=key]', el).addEventListener('change', (e) => { keyOnly = e.target.checked; render(); });
    el.addEventListener('click', (e) => { if (e.target.closest('[data-quiz]')) startQuiz(); });
    const CQ = [
      { q: 'How did the attacker first get in?', o: ['A phishing email led to a malicious ISO that ran a script', 'They walked up to the machine', 'A software vulnerability in Windows', 'A malicious USB drive'], a: 0, why: 'The proxy log and Prefetch show invoice.iso downloaded from a phishing link, then a .lnk inside it launching PowerShell.' },
      { q: 'Which single event best anchors the hands-on-keyboard intrusion?', o: ['The log being cleared', 'The RDP logon (4624, type 10) from 198.51.100.74 at 14:14', 'The phishing email', 'The Teams traffic'], a: 1, why: 'The type-10 logon from an external address is the moment the attacker was interactively on the machine. Analysts anchor the timeline there.' },
      { q: 'Two independent sources both prove the data left the network. Which pair?', o: ['UserAssist and ShimCache', 'The network beacon capture and SRUM', 'The phishing email and the proxy log', 'BAM and Amcache'], a: 1, why: 'The network capture shows the 45-second beacon and SRUM independently recorded ~38 MB sent by rv.exe. Two sources agreeing is what makes it hold up.' },
      { q: 'Why does clearing the Security log (1102) not erase the evidence?', o: ['Windows secretly keeps a second copy', 'The event that the log was cleared is itself recorded, and logs were forwarded to the SIEM', 'The attacker lacked permission', 'Logs can’t be cleared'], a: 1, why: 'Event 1102 records the clearing, and in a real network the logs are already forwarded off the host, so a local wipe changes nothing.' }
    ];
    function startQuiz() {
      let i = 0, picked = null;
      const wrap = h('<div class="tl-quiz"></div>');
      $('.timeline', el).replaceWith(wrap);
      function r() {
        if (i >= CQ.length) { wrap.innerHTML = `<div class="hunt-done">${icon('check', 16)}<div><b>Case closed.</b> You’ve carried one intrusion from acquisition through disk, logs, memory and network to a corroborated timeline. That’s the shape of a real DFIR investigation.</div></div><div class="row-btns"><a class="btn" href="#/quiz">Take the full quiz</a><a class="btn ghost" href="#/">Back to start</a></div>`; return; }
        const q = CQ[i];
        wrap.innerHTML = `<div class="q-meter"><div class="meter"><i style="width:${(i / CQ.length) * 100}%"></i></div><span>Case question ${i + 1} of ${CQ.length}</span></div><h3 class="q-text">${q.q}</h3><div class="opts">${q.o.map((o, k) => { let c = ''; if (picked !== null) c = k === q.a ? 'right' : k === picked ? 'wrong' : 'dim'; return `<button type="button" class="opt ${c}" data-k="${k}" ${picked !== null ? 'disabled' : ''}><span class="opt-k">${String.fromCharCode(65 + k)}</span><span>${o}</span></button>`; }).join('')}</div>${picked !== null ? `<div class="callout ${picked === q.a ? 'good' : 'bad'}"><b>${picked === q.a ? 'Correct.' : 'Not quite.'}</b> ${q.why}</div><button type="button" class="btn primary" data-n>${i === CQ.length - 1 ? 'Finish' : 'Next'}${icon('next', 16)}</button>` : ''}`;
      }
      wrap.addEventListener('click', (e) => { const o = e.target.closest('.opt'); if (o && picked === null) { picked = +o.dataset.k; r(); } if (e.target.closest('[data-n]')) { i++; picked = null; r(); } });
      r();
    }
    render();
  });
})();
