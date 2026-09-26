(function () {
  'use strict';
  const { h, $, $$, icon, esc } = App;

  /* =====================================================================
     Toolkit map
     ===================================================================== */
  const TOOLS = [
    { n: 'FTK Imager', cat: 'Acquisition', free: true, d: 'Image a disk, preview files and capture memory. The standard first tool for making a verified image.', lab: 'foundations/imaging' },
    { n: 'Guymager', cat: 'Acquisition', free: true, d: 'Fast open-source disk imager for Linux, writes E01 and raw with hashing built in.', lab: 'foundations/imaging' },
    { n: 'dc3dd / dcfldd', cat: 'Acquisition', free: true, d: 'Command-line imagers that hash as they copy. Forensic cousins of dd.', lab: 'foundations/imaging' },
    { n: 'Write blockers (Tableau, WiebeTech)', cat: 'Acquisition', free: false, d: 'Hardware that passes reads and blocks every write to the evidence drive.', lab: 'foundations/imaging' },
    { n: 'KAPE', cat: 'Triage', free: true, d: 'Collects and parses high-value artifacts in minutes when a full image isn’t practical.', lab: 'foundations/imaging' },
    { n: 'Velociraptor', cat: 'Triage', free: true, d: 'Fleet-wide hunting and collection across many endpoints at once.', lab: 'disk/execution' },
    { n: 'Autopsy / The Sleuth Kit', cat: 'Disk analysis', free: true, d: 'Full graphical examination: file systems, deleted files, carving, timelines and keyword search.', lab: 'disk/deleted' },
    { n: 'PhotoRec / Foremost / Scalpel', cat: 'Disk analysis', free: true, d: 'Carve files from unallocated space or damaged media by their signatures.', lab: 'disk/carving' },
    { n: 'bulk_extractor', cat: 'Disk analysis', free: true, d: 'Sweeps raw data for emails, card numbers, URLs and other patterns without a file system.', lab: 'disk/carving' },
    { n: 'Eric Zimmerman’s tools', cat: 'Windows artifacts', free: true, d: 'PECmd, AmcacheParser, AppCompatCacheParser, RECmd, MFTECmd, EvtxECmd, SrumECmd and more, all free.', lab: 'disk/execution' },
    { n: 'Registry Explorer', cat: 'Windows artifacts', free: true, d: 'Browse and parse registry hives with bookmarks for the forensically useful keys.', lab: 'disk/execution' },
    { n: 'Timeline Explorer', cat: 'Windows artifacts', free: true, d: 'Review the CSV output of the Zimmerman tools: sort, filter and pivot.', lab: 'disk/timestamps' },
    { n: 'Volatility 3', cat: 'Memory', free: true, d: 'The standard memory analysis framework: process trees, network connections, injected code.', lab: 'live/memory' },
    { n: 'MemProcFS', cat: 'Memory', free: true, d: 'Mounts a memory image as a browsable file system for fast triage.', lab: 'live/memory' },
    { n: 'WinPMEM / DumpIt / Magnet RAM Capture', cat: 'Memory', free: true, d: 'Capture RAM from a live Windows machine.', lab: 'live/memory' },
    { n: 'Wireshark', cat: 'Network', free: true, d: 'Inspect captured packets in depth, follow streams, decode protocols.', lab: 'live/network' },
    { n: 'Zeek + RITA', cat: 'Network', free: true, d: 'Turn traffic into connection logs and score destinations for beacon-like regularity.', lab: 'live/network' },
    { n: 'Arkime', cat: 'Network', free: true, d: 'Full-packet capture with indexed search across large volumes of traffic.', lab: 'live/network' },
    { n: 'Plaso (log2timeline)', cat: 'Timeline', free: true, d: 'Build a super timeline from every timestamped artifact on an image.', lab: 'live/timeline' },
    { n: 'Autopsy timeline', cat: 'Timeline', free: true, d: 'Visual timeline of file activity, built into Autopsy.', lab: 'live/timeline' }
  ];
  const CATS = [...new Set(TOOLS.map((t) => t.cat))];
  App.route('/toolkit', function (view) {
    view.appendChild(h(`
      <div class="page">
        <header class="lesson-head"><h1>The toolkit</h1><p class="lede">The programs real investigators use, grouped by job and tied to the lab where you’d reach for them. Nearly all of these are free and open source.</p></header>
        <div class="gl-bar"><div class="gl-search">${icon('search', 18)}<input type="search" placeholder="Search tools" aria-label="Search tools"></div>${App.seg('free', [['all', 'All'], ['free', 'Free only']], 'all', 'Filter by cost')}</div>
        <div class="toolkit"></div>
      </div>`));
    let q = '', freeOnly = false;
    function render() {
      const box = $('.toolkit', view);
      box.innerHTML = CATS.map((cat) => {
        const items = TOOLS.filter((t) => t.cat === cat && (!freeOnly || t.free) && (t.n + ' ' + t.d).toLowerCase().includes(q));
        if (!items.length) return '';
        return `<section class="tk-cat"><h2>${cat}</h2><div class="tk-grid">${items.map((t) => {
          const [tk, id] = t.lab.split('/'); const les = App.track(tk).lessons.find((x) => x.id === id);
          return `<div class="tk"><div class="tk-top"><b>${esc(t.n)}</b>${t.free ? '<span class="chip on">Free</span>' : '<span class="chip">Commercial</span>'}</div><p>${esc(t.d)}</p><a href="#/${t.lab}" class="tk-lab">${icon(App.track(tk).icon, 14)}${les.short}</a></div>`;
        }).join('')}</div></section>`;
      }).join('') || `<div class="callout">No tools match “${esc(q)}”.</div>`;
    }
    $('input', view).addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); render(); });
    App.bindSeg(view, 'free', (v) => { freeOnly = v === 'free'; render(); });
    render();
  });

  /* =====================================================================
     Quiz
     ===================================================================== */
  const Q = {
    foundations: [
      { q: 'In the incident response lifecycle, when should you capture memory and disk images?', o: ['Before detection', 'During containment, before eradication', 'After recovery', 'Only if the case goes to court'], a: 1, why: 'Evidence has to be collected before eradication wipes it away. NIST places it inside the containment phase.', l: 'foundations/lifecycle' },
      { q: 'What does SP 800-61 Revision 3 (2025) organize incident response around?', o: ['The four-phase lifecycle', 'The six functions of CSF 2.0', 'The MITRE ATT&CK matrix', 'ISO 27001 controls'], a: 1, why: 'Rev. 3 maps incident response onto Govern, Identify, Protect, Detect, Respond and Recover.', l: 'foundations/lifecycle' },
      { q: 'Which evidence is the most volatile and should be collected first?', o: ['Archival backups', 'Disk contents', 'Memory and network connections', 'Remote SIEM logs'], a: 2, why: 'RFC 3227 orders collection most-volatile first: memory and connection state vanish in seconds.', l: 'foundations/volatility' },
      { q: 'Why is pulling the power cord on a running machine often a mistake today?', o: ['It damages the disk', 'It destroys memory, connections and disk-encryption keys', 'It voids the warranty', 'It alerts the attacker'], a: 1, why: 'On an encrypted machine the key lives in RAM; power off and you may face a disk you can never read.', l: 'foundations/volatility' },
      { q: 'Changing one bit of a file changes roughly how much of its SHA-256 hash?', o: ['One character', 'About half the bits', 'Nothing, if the size is the same', 'The last few bytes'], a: 1, why: 'The avalanche effect: a one-bit change flips about half the output bits.', l: 'foundations/hashing' },
      { q: 'Which hash should you rely on for evidence integrity today?', o: ['MD5', 'SHA-1', 'SHA-256', 'CRC32'], a: 2, why: 'MD5 and SHA-1 have practical collision attacks. SHA-256 is the current standard.', l: 'foundations/hashing' },
      { q: 'What does a write blocker do?', o: ['Encrypts the evidence drive', 'Passes reads to the drive but blocks all writes', 'Compresses the image', 'Wipes free space'], a: 1, why: 'It sits inline and stops the workstation from altering the suspect drive while you image it.', l: 'foundations/imaging' },
      { q: 'You imaged a drive without a write blocker. The acquisition and verification hashes match. What does that prove?', o: ['The drive was never altered', 'The image faithfully copies a drive that may already have been altered', 'The evidence is inadmissible', 'The image is corrupt'], a: 1, why: 'Matching hashes prove the copy is faithful, not that the source was untouched before imaging began.', l: 'foundations/imaging' }
    ],
    disk: [
      { q: 'What actually happens when you delete a file and empty the Recycle Bin on NTFS?', o: ['Every cluster is overwritten with zeros', 'The MFT record is marked unused and the clusters marked free', 'The file is encrypted', 'Nothing until you defragment'], a: 1, why: 'Delete just flips flags. The data stays until something reuses the record or the clusters.', l: 'disk/deleted' },
      { q: 'On a modern SSD, why is deleted-file recovery often impossible?', o: ['SSDs encrypt everything', 'TRIM tells the drive to erase freed blocks in the background', 'SSDs have no file system', 'Files are stored in the cloud'], a: 1, why: 'TRIM lets the controller wipe freed blocks within seconds, so the data is gone before you image it.', l: 'disk/deleted' },
      { q: 'A file is named report.jpg but starts with the bytes 50 4B 03 04. What is it really?', o: ['A JPEG image', 'A ZIP archive, possibly an Office document', 'A PDF', 'A Windows executable'], a: 1, why: '50 4B is “PK”, the ZIP signature. Word, Excel and PowerPoint files are ZIPs inside.', l: 'disk/carving' },
      { q: 'What does file carving lose that normal file recovery keeps?', o: ['The file’s contents', 'The original name, path and timestamps', 'The file signature', 'The ability to open the file'], a: 1, why: 'Carving works from raw bytes with no metadata, so carved files come out as carved_0001.jpg with no name or dates.', l: 'disk/carving' },
      { q: 'Which NTFS attribute do most timestomping tools fail to change?', o: ['$STANDARD_INFORMATION', '$FILE_NAME', 'The file size', 'The file name'], a: 1, why: 'Common tools reach $SI through a normal API. $FN is set by the kernel and much harder to alter.', l: 'disk/timestamps' },
      { q: 'A file’s timestamps all end in .0000000. What does that suggest?', o: ['It was just created', 'Possible timestomping: real times almost never land on an exact second', 'The clock was wrong', 'It is a system file, which is normal'], a: 1, why: 'Zero sub-seconds are a classic timestomping tell, since genuine 100-ns timestamps are effectively never round.', l: 'disk/timestamps' },
      { q: 'Which artifact best proves a program actually executed, with a run count?', o: ['ShimCache', 'Amcache', 'Prefetch', 'The file’s existence on disk'], a: 2, why: 'Prefetch records run counts and the last run times. Amcache and ShimCache mainly prove presence.', l: 'disk/execution' },
      { q: 'A program was renamed to hide it. Which artifact keeps a hash and the original product name?', o: ['Prefetch', 'Amcache', 'UserAssist', 'BAM'], a: 1, why: 'Amcache stores each file’s SHA-1 and version info, which exposes a renamed program.', l: 'disk/execution' }
    ],
    live: [
      { q: 'Which Windows event ID means the Security log was cleared?', o: ['4624', '4688', '1102', '7045'], a: 2, why: '1102 records log clearing, and the clearing itself can’t be hidden without more effort.', l: 'live/eventlogs' },
      { q: 'A burst of 4625 events followed by a 4624 of logon type 10 from an external IP means what?', o: ['A user forgot their password', 'A password-guessing attack succeeded and the attacker is now on RDP', 'Routine network logons', 'A software update'], a: 1, why: 'Failed logons then a success, as a type-10 (RDP) logon from outside, is an intrusion signature.', l: 'live/eventlogs' },
      { q: 'Why capture memory rather than rely only on the disk?', o: ['Memory is easier to image', 'It holds file-less malware, command lines and connections that never touch disk', 'Disks can’t be imaged', 'Memory never changes'], a: 1, why: 'RAM captures things that exist only while running, which is exactly what file-less malware relies on.', l: 'live/memory' },
      { q: 'You find two lsass.exe processes, one running from C:\\Users\\Public. What does that indicate?', o: ['Normal Windows behavior', 'A program masquerading as lsass; there should be exactly one, in System32', 'A Windows update in progress', 'A hardware fault'], a: 1, why: 'There is exactly one real lsass, in System32, parented by services.exe. A second one elsewhere is malicious.', l: 'live/memory' },
      { q: 'What is a beacon in network forensics?', o: ['A firewall alert', 'Malware checking in with its C2 server at regular intervals', 'A DNS server', 'A type of encryption'], a: 1, why: 'A beacon is the regular heartbeat malware sends to command-and-control. Its rhythm gives it away.', l: 'live/network' },
      { q: 'How do attackers try to defeat beacon timing analysis?', o: ['By sending more data', 'By adding jitter, a random wobble to each interval', 'By using a faster server', 'By encrypting the payload'], a: 1, why: 'Jitter blurs the interval. Defenders respond by watching over long windows, where the average still shows.', l: 'live/network' },
      { q: 'What is the main strength of a forensic timeline?', o: ['It is quick to build', 'Independent sources corroborate the same sequence of events', 'It replaces the need for evidence', 'It hides the attacker’s tools'], a: 1, why: 'When separate artifacts an attacker would have to tamper with individually all agree, the conclusion holds up.', l: 'live/timeline' },
      { q: 'When building a super timeline, what do analysts usually do first?', o: ['Timeline the entire disk at once', 'Anchor on a known event and expand outward', 'Delete irrelevant files', 'Start from the oldest file'], a: 1, why: 'A full disk yields millions of rows, so you anchor on a known time, like the RDP logon, and expand from there.', l: 'live/timeline' }
    ]
  };
  Q.all = [...Q.foundations, ...Q.disk, ...Q.live];
  const SETS = [['foundations', 'Foundations'], ['disk', 'Disk & files'], ['live', 'Logs, memory & network'], ['all', 'Everything']];
  function quizPage(view, set) {
    if (!Q[set]) set = 'all';
    view.appendChild(h(`
      <div class="page quiz-page">
        <header class="lesson-head"><h1>Test yourself</h1><p class="lede">One question at a time, with an explanation after each. Your best score for each set is saved in this browser.</p></header>
        <div class="quiz-tabs"><nav class="seg" aria-label="Question set">${SETS.map(([k, l]) => `<a href="#/quiz/${k}" class="${k === set ? 'on' : ''}" ${k === set ? 'aria-current="page"' : ''}>${l}<small>${Q[k].length}</small></a>`).join('')}</nav><span class="muted best"></span></div>
        <div class="quiz"></div>
      </div>`));
    const qs = Q[set], box = $('.quiz', view);
    let i = 0, score = 0, picked = null, missed = [];
    const best = () => { const b = App.store.quizBest(set); $('.best', view).textContent = b ? `Best: ${b.score} of ${b.total}` : 'No score saved yet'; };
    function render() {
      if (i >= qs.length) {
        App.store.setQuiz(set, score, qs.length); best();
        const pct = score / qs.length;
        box.innerHTML = `<div class="quiz-end"><div class="big-read">${score}<span class="muted">/${qs.length}</span></div><h2>${pct === 1 ? 'Perfect. Every one.' : pct >= 0.7 ? 'Strong work.' : 'Worth another run through the labs.'}</h2>${missed.length ? `<p class="muted">Revisit these:</p><ul class="missed">${[...new Set(missed)].map((l) => { const [t, id] = l.split('/'); const les = App.track(t).lessons.find((x) => x.id === id); return `<li><a href="#/${l}">${App.track(t).name}: ${les.title}</a></li>`; }).join('')}</ul>` : ''}<button type="button" class="btn primary" data-retry>${icon('reset', 16)}Try again</button></div>`;
        $('[data-retry]', box).addEventListener('click', () => { i = 0; score = 0; picked = null; missed = []; render(); });
        return;
      }
      const q = qs[i];
      box.innerHTML = `<div class="q-meter"><div class="meter"><i style="width:${(i / qs.length) * 100}%"></i></div><span>Question ${i + 1} of ${qs.length}</span></div><h2 class="q-text">${q.q}</h2><div class="opts" role="group" aria-label="Answers">${q.o.map((o, k) => { let cls = ''; if (picked !== null) cls = k === q.a ? 'right' : k === picked ? 'wrong' : 'dim'; return `<button type="button" class="opt ${cls}" data-k="${k}" ${picked !== null ? 'disabled' : ''}><span class="opt-k">${String.fromCharCode(65 + k)}</span><span>${o}</span></button>`; }).join('')}</div>${picked !== null ? `<div class="callout ${picked === q.a ? 'good' : 'bad'}" aria-live="polite"><b>${picked === q.a ? 'Correct.' : 'Not quite.'}</b> ${q.why} <a href="#/${q.l}">Review the lesson</a></div><div class="row-btns"><button type="button" class="btn primary" data-next>${i === qs.length - 1 ? 'See my score' : 'Next question'}${icon('next', 16)}</button></div>` : ''}`;
      const nb = $('[data-next]', box); if (nb) nb.focus();
    }
    box.addEventListener('click', (e) => {
      const o = e.target.closest('.opt'); if (o && picked === null) { picked = +o.dataset.k; if (picked === qs[i].a) score++; else missed.push(qs[i].l); render(); return; }
      if (e.target.closest('[data-next]')) { i++; picked = null; render(); }
    });
    function onKey(e) { if (e.target.matches('input,textarea')) return; const k = 'abcd'.indexOf(e.key.toLowerCase()); if (k >= 0 && picked === null && i < qs.length && k < qs[i].o.length) { picked = k; if (k === qs[i].a) score++; else missed.push(qs[i].l); render(); } }
    document.addEventListener('keydown', onKey); App.own(() => document.removeEventListener('keydown', onKey));
    best(); render();
  }
  App.route('/quiz', (v) => quizPage(v, 'all'));
  App.route('/quiz/:set', (v, p) => quizPage(v, p.set));

  /* =====================================================================
     Glossary
     ===================================================================== */
  const G = [
    ['Acquisition', 'Making a forensic copy of evidence, such as imaging a disk or capturing memory.', 'foundations/imaging'],
    ['Amcache', 'A registry hive recording programs seen on a system, with paths, SHA-1 hashes and version info.', 'disk/execution'],
    ['Avalanche effect', 'The property that changing one bit of input flips about half the bits of a hash.', 'foundations/hashing'],
    ['BAM', 'Background Activity Moderator. Registry data recording the last run time of programs, keyed by user SID.', 'disk/execution'],
    ['Beacon', 'A regular check-in from malware to its command-and-control server.', 'live/network'],
    ['Carving', 'Recovering files from raw data by their signature bytes, with no file system.', 'disk/carving'],
    ['Chain of custody', 'The documented record of who held evidence, when and why, from seizure onward.', 'foundations/hashing'],
    ['Command and control (C2)', 'The server malware contacts for instructions and to send stolen data.', 'live/network'],
    ['Cluster', 'The smallest unit of disk space a file system allocates, often 4 KB on NTFS.', 'disk/deleted'],
    ['Collision', 'Two different inputs producing the same hash. Practical for MD5 and SHA-1.', 'foundations/hashing'],
    ['E01', 'The EnCase Evidence File format: a compressed forensic image with embedded hashes and case metadata.', 'foundations/imaging'],
    ['Event ID', 'A number identifying a type of Windows log event, such as 4624 for a successful logon.', 'live/eventlogs'],
    ['$FILE_NAME ($FN)', 'The NTFS attribute holding a file’s name and a set of MACB timestamps set by the kernel.', 'disk/timestamps'],
    ['Forensic image', 'A bit-for-bit copy of every sector of a drive, including deleted and unallocated space.', 'foundations/imaging'],
    ['Hash', 'A fixed-length fingerprint of data. Any change to the data changes it.', 'foundations/hashing'],
    ['Jitter', 'Random variation added to beacon intervals to defeat timing analysis.', 'live/network'],
    ['MACB', 'The four NTFS timestamps: Modified, Accessed, Changed (record) and Born (created).', 'disk/timestamps'],
    ['Master File Table (MFT)', 'The NTFS index with one record per file, holding its name, timestamps and cluster list.', 'disk/deleted'],
    ['Magic number', 'The fixed signature bytes at the start of a file that identify its type.', 'disk/carving'],
    ['Order of volatility', 'Collecting evidence from most fragile to least, per RFC 3227.', 'foundations/volatility'],
    ['PID / PPID', 'A process’s ID and its parent’s ID, used to read the process tree.', 'live/memory'],
    ['Prefetch', 'Windows files that speed up program launches and record run counts and times.', 'disk/execution'],
    ['Recycle Bin', 'Where deleted files first go on Windows, as paired $I metadata and $R content files.', 'disk/deleted'],
    ['RFC 3227', 'The IETF guideline on evidence collection and the order of volatility.', 'foundations/volatility'],
    ['ShimCache', 'Registry data (AppCompatCache) recording files Windows saw. Proves presence, not execution on Win10+.', 'disk/execution'],
    ['SIEM', 'Security Information and Event Management: central collection and analysis of logs from many systems.', 'live/eventlogs'],
    ['SRUM', 'System Resource Usage Monitor. Hourly per-app records of CPU, disk and network use.', 'disk/execution'],
    ['$STANDARD_INFORMATION ($SI)', 'The NTFS attribute holding the MACB timestamps that Explorer shows and most tools update.', 'disk/timestamps'],
    ['Super timeline', 'A merged timeline of every timestamped artifact from all sources, built by Plaso.', 'live/timeline'],
    ['Timestomping', 'Altering a file’s timestamps to hide activity. MITRE ATT&CK T1070.006.', 'disk/timestamps'],
    ['TRIM', 'An SSD command that erases freed blocks, often making deleted data unrecoverable.', 'disk/deleted'],
    ['UserAssist', 'Registry data recording programs a user launched through the Windows interface, with counts.', 'disk/execution'],
    ['Volatility', 'The standard open-source framework for analyzing memory images.', 'live/memory'],
    ['Write blocker', 'Hardware that allows reads but blocks writes to a suspect drive during acquisition.', 'foundations/imaging']
  ];
  App.route('/glossary', function (view) {
    view.appendChild(h(`
      <div class="page">
        <header class="lesson-head"><h1>Glossary</h1><p class="lede">Every term used in the labs, in plain words, with a link to the lesson that teaches it.</p></header>
        <div class="gl-bar"><div class="gl-search">${icon('search', 18)}<input type="search" placeholder="Search terms" aria-label="Search the glossary"></div>${App.seg('gtrack', [['all', 'All'], ['foundations', 'Foundations'], ['disk', 'Disk'], ['live', 'Live']], 'all', 'Filter by track')}</div>
        <dl class="gloss"></dl>
      </div>`));
    let q = '', tr = 'all';
    const dl = $('.gloss', view);
    function render() {
      const items = G.filter(([t, d, l]) => (tr === 'all' || l.startsWith(tr)) && (t + ' ' + d).toLowerCase().includes(q));
      dl.innerHTML = items.length ? items.map(([t, d, l]) => { const [tk, id] = l.split('/'); const les = App.track(tk).lessons.find((x) => x.id === id); return `<div class="gl"><dt>${t}</dt><dd><p>${d}</p><a href="#/${l}">${App.track(tk).name}: ${les.short}</a></dd></div>`; }).join('') : `<div class="callout">No terms match “${esc(q)}”.</div>`;
    }
    $('input', view).addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); render(); });
    App.bindSeg(view, 'gtrack', (v) => { tr = v; render(); });
    render();
  });

  /* =====================================================================
     Watch and read
     ===================================================================== */
  const VIDEOS = [
    { url: 'https://www.youtube.com/watch?v=VYROU-ZwZX8', ch: '13Cubed', t: 'Introduction to Windows Forensics', d: 'A clear, hands-on walkthrough of the core Windows artifacts. Pairs with the whole Disk and files track.' },
    { url: 'https://www.youtube.com/@13Cubed', ch: '13Cubed', t: '13Cubed channel', d: 'Short, focused episodes on Prefetch, memory, event logs and more. The best free DFIR series to work through.' },
    { url: 'https://www.youtube.com/@SANSForensics', ch: 'SANS DFIR', t: 'SANS Digital Forensics and Incident Response', d: 'Conference talks and webcasts across the whole field, from memory forensics to timeline analysis.' },
    { url: 'https://www.youtube.com/watch?v=3xAEsDT-4NA', ch: 'SANS DFIR', t: 'Memory Forensics for Incident Response', d: 'A deeper session on RAM analysis. Watch after the memory lab.' }
  ];
  const READS = [
    { url: 'https://csrc.nist.gov/pubs/sp/800/61/r3/final', t: 'NIST SP 800-61 Rev. 3', d: 'The 2025 incident response guidance, mapped to CSF 2.0. Free PDF.', lab: 'foundations/lifecycle' },
    { url: 'https://www.rfc-editor.org/rfc/rfc3227', t: 'RFC 3227', d: 'Guidelines for Evidence Collection and Archiving, the source of the order of volatility.', lab: 'foundations/volatility' },
    { url: 'https://www.sans.org/posters/windows-forensic-analysis/', t: 'SANS Windows Forensic Analysis poster', d: 'The one-page reference for Windows artifacts and time rules that many analysts keep on the wall.', lab: 'disk/timestamps' },
    { url: 'https://attack.mitre.org/', t: 'MITRE ATT&CK', d: 'The catalog of attacker tactics and techniques the timeline stages map onto.', lab: 'live/timeline' },
    { url: 'https://ericzimmerman.github.io/', t: 'Eric Zimmerman’s tools', d: 'Free download page for PECmd, Registry Explorer, Timeline Explorer and the rest.', lab: 'disk/execution' },
    { url: 'https://dfirdiva.com/', t: 'DFIR Diva', d: 'A curated hub of free training, from someone who catalogs it for newcomers.', lab: 'foundations/lifecycle' }
  ];
  App.route('/watch', function (view) {
    view.appendChild(h(`
      <div class="page">
        <header class="lesson-head"><h1>Watch and read</h1><p class="lede">The best free places to go deeper. Videos to watch alongside the labs, and the standards and references investigators actually work from. Everything opens in a new tab.</p></header>
        <section class="section" style="margin-top:8px"><div class="section-head"><h2>Watch</h2></div>
          <div class="videos">${VIDEOS.map((v) => App.videoCard(v.url, v.t, `${v.ch} — ${v.d}`)).join('')}</div>
        </section>
        <section class="section"><div class="section-head"><h2>Read</h2><p>Primary sources. Prefer these to summaries when you want the exact wording.</p></div>
          <div class="reads">${READS.map((r) => { const [tk, id] = r.lab.split('/'); const les = App.track(tk).lessons.find((x) => x.id === id); return `<a class="read-card" href="${r.url}" target="_blank" rel="noopener noreferrer"><div class="read-top"><b>${esc(r.t)}</b>${icon('ext', 15)}</div><p>${esc(r.d)}</p><span class="read-lab">${les.short}</span></a>`; }).join('')}</div>
        </section>
        <p class="muted small" style="margin-top:32px">Links to third-party sites. They may have changed since this was built.</p>
      </div>`));
  });
})();
