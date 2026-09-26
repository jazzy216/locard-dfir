(function () {
  'use strict';
  const { h, $, $$, icon, esc } = App;

  /* =====================================================================
     Lesson 5: Deleted files
     ===================================================================== */
  const SEED_FILES = [
    { name: 'budget_2026.xlsx', n: 6, kind: 'bin' },
    { name: 'vacation.jpg', n: 8, kind: 'bin' },
    { name: 'client_list.csv', n: 4, kind: 'text', lines: ['name,phone,balance', 'Harbor Dental,615-555-0142,$18,400', 'Ridgeway Farms,931-555-0178,$6,215', 'Keel Logistics,629-555-0133,$41,020'] },
    { name: 'plan.txt', n: 2, kind: 'text', lines: ['Move the money Friday after close.', 'Delete this file when done.'] }
  ];
  const NEW_FILES = [{ name: 'setup_v2.zip', n: 5 }, { name: 'IMG_4471.png', n: 3 }, { name: 'minutes.docx', n: 4 }, { name: 'backup.7z', n: 9 }, { name: 'song.mp3', n: 6 }];
  App.route('/disk/deleted', function (view) {
    const el = App.lessonPage(view, 'disk', 'deleted', {
      lede: 'When you delete a file, the file system doesn’t erase it. It crosses the file off the index and marks its space as free. The data sits there until something else needs the room. Delete a file, then see how much you can get back.',
      lab: `
        <div class="lab-bar">
          ${App.toggle('trim', 'Drive is an SSD with TRIM', false)}
          <div class="spacer"></div>
          <button type="button" class="btn" data-new>${icon('file', 16)}Save a new file</button>
          <button type="button" class="btn" data-wipe>Wipe free space</button>
          <button type="button" class="btn ghost" data-reset>${icon('reset', 16)}Reset</button>
        </div>
        <div class="lab-grid">
          <div class="lab-stage del-stage">
            <div class="clusters" role="img" aria-label="Map of the drive’s clusters"></div>
            <div class="sect-legend clu-legend"></div>
            <ol class="img-log del-log" aria-live="polite"></ol>
          </div>
          <div class="lab-panel">
            <div><h3>Master file table</h3><p class="muted small">One record per file. Deleting only clears the in-use flag.</p></div>
            <div class="mft"></div>
            <div class="recover" aria-live="polite"></div>
          </div>
        </div>`,
      body: `
        <h2>Two parts to every file</h2>
        <p>A file system keeps <strong>metadata</strong> (the file’s name, size, timestamps and where its data lives) separately from the <strong>content</strong> itself. On NTFS, the metadata is a record in the <strong>Master File Table</strong> (MFT), and the content sits in <strong>clusters</strong>, typically 4 KB each. FAT, ext4 and APFS use different structures but follow the same idea.</p>
        <h2>What delete really does</h2>
        <p>Deleting clears a flag in the MFT record to say “not in use” and marks the file’s clusters as free in the allocation bitmap. That’s all. The record, including the file name, timestamps and cluster list, stays until a new file reuses that record. The data stays until new data lands on those clusters. That’s why recovery tools can often bring back a deleted file whole, with its original name.</p>
        <h2>The Recycle Bin comes first</h2>
        <p>On Windows, pressing Delete usually just moves the file into <code>$Recycle.Bin</code>, where it’s renamed to <code>$R</code> plus random characters, and a small <code>$I</code> file records the original path, size and deletion time. Emptying the bin is when the real deletion above happens.</p>
        <h2>What really destroys data</h2>
        <ul>
          <li><strong>Overwriting:</strong> new files are written into free clusters. Every save chips away at deleted data. That’s why you stop using a drive the moment you need to recover from it.</li>
          <li><strong>Record reuse:</strong> when a new file takes over a deleted MFT record, the old name and cluster list are gone. Surviving clusters can then only be found by carving, the next lesson.</li>
          <li><strong>TRIM:</strong> an SSD is told which blocks are free, and its controller erases them in the background, often within seconds or minutes. Deleted-file recovery on modern SSDs is frequently impossible.</li>
          <li><strong>Wiping:</strong> tools like <code>cipher /w</code> deliberately overwrite all free space.</li>
        </ul>`,
      notes: [['1 flag', 'Deleting a file on NTFS clears one bit in its MFT record.'], ['4 KB', 'Typical NTFS cluster size.'], ['$I / $R', 'The metadata and content pair for each item in the Recycle Bin.'], ['TRIM', 'The SSD feature that makes deleted data vanish on its own.']],
      takeaways: [
        'Deleting removes the index entry, not the data. The clusters stay intact until reused.',
        'New writes, MFT record reuse, TRIM and wiping are what actually destroy deleted data.',
        'Stop writing to a drive as soon as you need to recover from it.'
      ]
    });
    const NCL = 48, NREC = 6;
    let cl, recs, trim = false, newQ = 0, sel = null;
    const logEl = $('.del-log', el);
    const log = (t, bad) => { const li = document.createElement('li'); li.className = bad ? 'bad' : ''; li.textContent = t; logEl.appendChild(li); logEl.scrollTop = logEl.scrollHeight; };
    function reset() {
      cl = Array.from({ length: NCL }, () => ({ own: null, chunk: 0, alloc: false }));
      recs = Array.from({ length: NREC }, (_, i) => ({ no: 36 + i, file: null, inUse: false, clusters: [] }));
      let c = 0;
      SEED_FILES.forEach((f, i) => {
        const r = recs[i]; r.file = { ...f, id: 'f' + i, hue: i }; r.inUse = true;
        for (let k = 0; k < f.n; k++) { cl[c] = { own: r.file.id, chunk: k, alloc: true }; r.clusters.push(c); c++; }
      });
      newQ = 0; sel = null; logEl.innerHTML = '';
      log('Four files on the volume. Two MFT records are unused.');
      render();
    }
    const fileById = (id) => recs.map((r) => r.file).concat(ghosts).find((f) => f && f.id === id);
    let ghosts = [];
    function survival(rec) {
      const ok = rec.clusters.filter((c, k) => cl[c].own === rec.file.id && cl[c].chunk === k).length;
      return ok / rec.clusters.length;
    }
    function render() {
      $('.clusters', el).innerHTML = cl.map((c, i) => {
        const f = c.own && c.own !== 'zero' ? fileById(c.own) : null;
        const live = f && recs.some((r) => r.inUse && r.file && r.file.id === c.own);
        const cls = c.own === 'zero' ? 'z' : !f ? 'e' : live ? 'a' : 'd';
        const hi = sel !== null && recs[sel].file && recs[sel].clusters.includes(i) ? ' hl' : '';
        return `<span class="clu c-${cls} hue-${f ? f.hue % 6 : 0}${hi}" title="Cluster ${i}${f ? ': ' + f.name + ' part ' + (c.chunk + 1) : c.own === 'zero' ? ': zeroed' : ': never used'}"></span>`;
      }).join('');
      $('.clu-legend', el).innerHTML = `<span><i class="k-a"></i>In use</span><span><i class="k-d"></i>Deleted, data still there</span><span><i class="k-z"></i>Zeroed</span><span><i class="k-e"></i>Never used</span>`;
      $('.mft', el).innerHTML = recs.map((r, i) => {
        if (!r.file) return `<div class="rec empty"><span class="rec-no mono">#${r.no}</span><span class="muted">Unused record</span></div>`;
        const s = survival(r);
        return `<div class="rec ${r.inUse ? '' : 'del'} ${sel === i ? 'sel' : ''}">
          <span class="rec-no mono">#${r.no}</span>
          <span class="rec-name"><b>${r.file.name}</b><small class="mono">${r.inUse ? 'In use' : 'Deleted'} · flag 0x000${r.inUse ? 1 : 0} · ${r.clusters.length} clusters</small></span>
          ${r.inUse ? `<button type="button" class="btn sm" data-del="${i}">${icon('trash', 14)}Delete</button>` : `<button type="button" class="btn sm primary" data-rec="${i}">Recover<span class="rec-pct">${Math.round(s * 100)}%</span></button>`}
        </div>`;
      }).join('');
      if (sel !== null) renderRecover();
      else $('.recover', el).innerHTML = recs.some((r) => r.file && !r.inUse) ? '' : `<p class="muted small">Delete a file to begin. Try plan.txt first, then save a few new files.</p>`;
    }
    function renderRecover() {
      const r = recs[sel]; if (!r || !r.file || r.inUse) { sel = null; $('.recover', el).innerHTML = ''; return; }
      const s = survival(r), f = r.file;
      let prev = '';
      if (f.kind === 'text') prev = `<pre class="rec-prev">${f.lines.map((ln, k) => {
        const c = cl[r.clusters[k]]; const intact = c.own === f.id && c.chunk === k;
        return intact ? esc(ln) : `<span class="lost">${c.own === 'zero' ? '0000 0000 0000 0000 0000' : '▒▒▒▒ overwritten by ' + esc((fileById(c.own) || {}).name || 'another file') + ' ▒▒▒▒'}</span>`;
      }).join('\n')}</pre>`;
      $('.recover', el).innerHTML = `<div class="callout ${s === 1 ? 'good' : s === 0 ? 'bad' : ''}"><b>${s === 1 ? 'Fully recoverable.' : s === 0 ? 'Nothing left to recover.' : `Partly recoverable: ${Math.round(s * 100)}% of clusters intact.`}</b> ${s === 1 ? 'Every cluster still holds the original data, and the MFT record still has the name and cluster list.' : s === 0 ? 'Every cluster has been overwritten or zeroed. The record survives, but it points at someone else’s data.' : 'Some clusters have been reused. The file will open corrupted, or not at all.'}</div>${prev}`;
    }
    function allocRecord() { let i = recs.findIndex((r) => !r.file); if (i < 0) i = recs.findIndex((r) => !r.inUse); return i; }
    function freeClusters() { return cl.map((c, i) => (!c.alloc ? i : -1)).filter((i) => i >= 0); }
    el.addEventListener('click', (e) => {
      const d = e.target.closest('[data-del]'), rc = e.target.closest('[data-rec]');
      if (d) {
        const i = +d.dataset.del, r = recs[i]; r.inUse = false; r.clusters.forEach((c) => (cl[c].alloc = false));
        log(`${r.file.name} deleted. Record #${r.no} marked unused, ${r.clusters.length} clusters marked free.`);
        sel = i;
        if (trim) App.later(900, () => { r.clusters.forEach((c) => { if (!cl[c].alloc && cl[c].own === r.file.id) cl[c] = { own: 'zero', chunk: 0, alloc: false }; }); log(`TRIM: the SSD erased ${r.file.name}’s blocks in the background.`, true); render(); });
        render();
      }
      if (rc) { sel = +rc.dataset.rec; render(); $('.recover', el).scrollIntoView({ block: 'nearest', behavior: App.reduced ? 'auto' : 'smooth' }); }
      if (e.target.closest('[data-new]')) {
        const nf = NEW_FILES[newQ % NEW_FILES.length]; newQ++;
        const free = freeClusters();
        if (free.length < nf.n) { log(`No room for ${nf.name}: the volume is full.`, true); return; }
        const ri = allocRecord();
        if (ri < 0) { log(`No free MFT records for ${nf.name}.`, true); return; }
        const r = recs[ri];
        if (r.file) { ghosts.push(r.file); log(`${nf.name} reused record #${r.no}. The entry for ${r.file.name} is gone; its surviving clusters can only be found by carving now.`, true); if (sel === ri) sel = null; }
        const file = { name: nf.name, n: nf.n, kind: 'bin', id: 'n' + newQ, hue: 3 + newQ };
        r.file = file; r.inUse = true; r.clusters = free.slice(0, nf.n);
        const hit = new Set();
        r.clusters.forEach((c, k) => { const prev = cl[c].own; if (prev && prev !== 'zero') hit.add((fileById(prev) || {}).name); cl[c] = { own: file.id, chunk: k, alloc: true }; });
        log(`Saved ${nf.name} into the first free clusters${hit.size ? `, overwriting part of ${[...hit].join(' and ')}` : ''}.`, hit.size > 0);
        render();
      }
      if (e.target.closest('[data-wipe]')) {
        cl.forEach((c, i) => { if (!c.alloc) cl[i] = { own: 'zero', chunk: 0, alloc: false }; });
        log('Free space wiped. Every unallocated cluster is now zeros.', true); render();
      }
      if (e.target.closest('[data-reset]')) { ghosts = []; reset(); }
    });
    $('[data-t=trim]', el).addEventListener('change', (e) => { trim = e.target.checked; log(trim ? 'This volume is now an SSD with TRIM enabled.' : 'This volume is a spinning hard drive: no TRIM.'); });
    reset();
  });

  /* =====================================================================
     Lesson 6: File carving
     ===================================================================== */
  const SIGS = {
    jpg: { n: 'JPEG', head: [0xff, 0xd8, 0xff], foot: [0xff, 0xd9], tail: 0, mime: 'image/jpeg' },
    png: { n: 'PNG', head: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], foot: [0x49, 0x45, 0x4e, 0x44], tail: 4, mime: 'image/png' },
    pdf: { n: 'PDF', head: [0x25, 0x50, 0x44, 0x46], foot: [0x25, 0x25, 0x45, 0x4f, 0x46], tail: 0, mime: 'application/pdf' },
    zip: { n: 'ZIP', head: [0x50, 0x4b, 0x03, 0x04], foot: [0x50, 0x4b, 0x05, 0x06], tail: 18, mime: 'application/zip' }
  };
  const MISNAMED = [
    { name: 'holiday_photo.jpg', bytes: '4D 5A 90 00 03 00 00 00 04 00 00 00 FF FF 00 00', ans: 'exe', why: '4D 5A is “MZ”, the start of every Windows executable. A program disguised as a photo is a classic trick.' },
    { name: 'Q3_minutes.txt', bytes: '50 4B 03 04 14 00 06 00 08 00 00 00 21 00 62 EE', ans: 'zip', why: '50 4B 03 04 is “PK”, a ZIP archive. Word, Excel and PowerPoint files are ZIP archives inside, so this is probably an Office document.' },
    { name: 'logo.png', bytes: '89 50 4E 47 0D 0A 1A 0A 00 00 00 0D 49 48 44 52', ans: 'png', why: 'The name tells the truth this time. 89 then “PNG” is the PNG signature.' },
    { name: 'invoice.docx', bytes: '25 50 44 46 2D 31 2E 37 0A 25 E2 E3 CF D3 0A 31', ans: 'pdf', why: '25 50 44 46 is “%PDF”. It’s a PDF with a Word extension, which may have been renamed to slip past an email filter.' },
    { name: 'budget.xlsx', bytes: 'FF D8 FF E1 1C 45 45 78 69 66 00 00 4D 4D 00 2A', ans: 'jpg', why: 'FF D8 FF starts a JPEG, and “Exif” follows: a photo straight from a camera or phone.' }
  ];
  App.route('/disk/carving', function (view) {
    const el = App.lessonPage(view, 'disk', 'carving', {
      lede: 'When the file system’s records are gone, you can still find files by looking for the bytes every file of a given type starts and ends with. This is 2.7 KB of unallocated space from a suspect drive. Search it, carve what you find, and open it.',
      lab: `
        <div class="lab-bar">
          <span class="muted small">Search for</span>
          <div class="sig-btns">${Object.entries(SIGS).map(([k, s]) => `<button type="button" class="btn sm" data-sig="${k}" aria-pressed="false">${s.n} <code>${s.head.slice(0, 4).map((b) => App.hex(b)).join(' ')}</code></button>`).join('')}</div>
        </div>
        <div class="carve-grid">
          <div class="hexview" tabindex="0" aria-label="Hex view of unallocated space"></div>
          <div class="lab-panel carve-panel"><div class="hits"></div><div class="carved" aria-live="polite"></div></div>
        </div>
        <div class="misnamed">
          <div class="custody-head"><div><h3>Don’t trust the extension</h3><p class="muted small">Each file’s first 16 bytes are shown. Identify what it really is.</p></div></div>
          <ol class="mis-list"></ol>
        </div>`,
      body: `
        <h2>Magic numbers</h2>
        <p>Most file formats begin with a fixed sequence of bytes called a <strong>signature</strong> or <strong>magic number</strong>, and many also end with one. JPEGs start with <code>FF D8 FF</code> and end with <code>FF D9</code>. PNGs start with <code>89 50 4E 47</code> (the last three are the letters PNG) and end with an <code>IEND</code> chunk. PDFs start with <code>%PDF</code> and end with <code>%%EOF</code>. ZIP files, including every modern Office document, start with <code>PK</code>.</p>
        <h2>Carving</h2>
        <p><strong>File carving</strong> scans raw data such as unallocated space, a memory dump or a damaged disk for those signatures and cuts out everything from a header to its matching footer. It needs no file system at all, which is why it can recover files after a format, or after the MFT record has been reused. Tools such as <strong>PhotoRec</strong>, <strong>Foremost</strong>, <strong>Scalpel</strong> and <strong>bulk_extractor</strong> do this at scale, and Autopsy runs carving automatically.</p>
        <h2>Where carving breaks</h2>
        <ul>
          <li><strong>Fragmentation:</strong> carving assumes the file’s clusters are contiguous. If the file was split across the disk, you get a header joined to someone else’s data.</li>
          <li><strong>No footer:</strong> many formats have no end marker, so the carver has to guess a size or parse the structure.</li>
          <li><strong>No names or dates:</strong> carved files come out as <code>carved_0001.jpg</code>. Their original name, path and timestamps lived in the metadata that’s gone.</li>
          <li><strong>False positives:</strong> short signatures turn up by chance inside other data.</li>
        </ul>
        <h2>Signature analysis</h2>
        <p>The same idea exposes disguised files. Forensic suites compare each file’s extension with its actual signature and flag mismatches, because renaming <code>tool.exe</code> to <code>photo.jpg</code> is one of the oldest hiding tricks there is.</p>`,
      notes: [['FF D8 FF', 'Every JPEG starts with these bytes.'], ['PK', 'ZIP, and therefore .docx, .xlsx and .pptx, start with 50 4B.'], ['MZ', '4D 5A starts every Windows executable.']],
      takeaways: [
        'File types have signature bytes at the start and often at the end.',
        'Carving recovers files from raw data with no file system, but loses names, paths and dates.',
        'Fragmented files carve badly, and extensions can lie: always check the signature.'
      ]
    });
    const raw = atob(App.CARVE.b64), data = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    let active = null, hits = [], carvedRange = null;
    const hexEl = $('.hexview', el);
    const find = (pat, from = 0) => { outer: for (let i = from; i <= data.length - pat.length; i++) { for (let j = 0; j < pat.length; j++) if (data[i + j] !== pat[j]) continue outer; return i; } return -1; };
    function carveEnd(k, start) {
      const s = SIGS[k];
      const f = find(s.foot, start + s.head.length); if (f < 0) return -1;
      let end = f + s.foot.length + s.tail;
      if (k === 'zip') end += data[f + 20] | (data[f + 21] << 8);
      if (k === 'pdf' && data[end] === 0x0a) end++;
      return end;
    }
    App.carveTest = { data, carveEnd, find, SIGS };
    function renderHex() {
      const rows = [];
      const mark = new Map();
      hits.forEach((hh) => { for (let i = 0; i < SIGS[hh.k].head.length; i++) mark.set(hh.start + i, 'hd'); if (hh.foot >= 0) for (let i = hh.foot; i < hh.end; i++) if (!mark.has(i)) mark.set(i, 'ft'); });
      for (let r = 0; r < data.length; r += 16) {
        let hx = '', asc = '';
        for (let i = r; i < r + 16; i++) {
          const b = data[i], m = mark.get(i) || '', inCarve = carvedRange && i >= carvedRange[0] && i < carvedRange[1] ? ' cv' : '';
          hx += `<span class="${m}${inCarve}">${App.hex(b)}</span>`;
          asc += `<span class="${m}${inCarve}">${b >= 32 && b < 127 ? esc(String.fromCharCode(b)) : '.'}</span>`;
        }
        rows.push(`<div class="hr" data-off="${r}"><span class="off">${App.hex(r, 8)}</span><span class="hb">${hx}</span><span class="ha">${asc}</span></div>`);
      }
      hexEl.innerHTML = rows.join('');
    }
    function renderHits() {
      const hl = $('.hits', el);
      if (!active) { hl.innerHTML = `<h3>Pick a signature to search for</h3><p class="muted small">The hex view shows offset, bytes and their text form. Headers light up once you search.</p>`; return; }
      hl.innerHTML = `<h3>${SIGS[active].n} headers found: ${hits.length}</h3>` + (hits.length ? hits.map((hh, i) => `<div class="hit"><button type="button" class="linkish mono" data-jump="${hh.start}">0x${App.hex(hh.start, 4)}</button><span class="muted small">${hh.end > 0 ? `footer at 0x${App.hex(hh.foot, 4)}, ${(hh.end - hh.start).toLocaleString()} bytes` : 'no footer found'}</span><button type="button" class="btn sm primary" data-carve="${i}" ${hh.end < 0 ? 'disabled' : ''}>Carve</button></div>`).join('') : `<p class="muted small">No ${SIGS[active].n} header anywhere in this data.</p>`);
    }
    function search(k) {
      active = k; carvedRange = null;
      $$('[data-sig]', el).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sig === k)));
      hits = []; let i = -1;
      while ((i = find(SIGS[k].head, i + 1)) >= 0) { const end = carveEnd(k, i); hits.push({ k, start: i, end, foot: end > 0 ? find(SIGS[k].foot, i + SIGS[k].head.length) : -1 }); }
      renderHex(); renderHits(); $('.carved', el).innerHTML = '';
      if (hits[0]) jump(hits[0].start);
    }
    const jump = (off) => { const row = $(`.hr[data-off="${off - (off % 16)}"]`, hexEl); if (row) hexEl.scrollTo({ top: row.offsetTop - hexEl.offsetTop - 40, behavior: App.reduced ? 'auto' : 'smooth' }); };
    let url = null, curCarve = null; App.own(() => url && URL.revokeObjectURL(url));
    function carve(hh) {
      carvedRange = [hh.start, hh.end]; renderHex();
      const bytes = data.slice(hh.start, hh.end), s = SIGS[hh.k];
      if (url) URL.revokeObjectURL(url);
      const blob = new Blob([bytes], { type: s.mime });
      url = URL.createObjectURL(blob);
      const n = App.CARVE.files.findIndex((f) => f.start === hh.start) + 1 || 9;
      const name = `carved_${String(n).padStart(4, '0')}.${hh.k}`;
      curCarve = { name, blob, url };
      let prev = '';
      const txt = new TextDecoder('latin1').decode(bytes);
      if (hh.k === 'jpg' || hh.k === 'png') prev = `<img src="${url}" alt="The carved ${s.n} image" class="carved-img">`;
      if (hh.k === 'pdf') { const m = txt.match(/\(([^)]*)\)\s*Tj/); prev = `<div class="carved-doc"><small class="muted">Text inside the page</small><p>${m ? esc(m[1]) : 'No readable text.'}</p></div>`; }
      if (hh.k === 'zip') {
        const names = []; let p = 0;
        while ((p = txt.indexOf('PK\x03\x04', p)) >= 0) { const ln = bytes[p + 26] | (bytes[p + 27] << 8); names.push(txt.substr(p + 30, ln)); p += 30 + ln; }
        prev = `<div class="carved-doc"><small class="muted">Files inside the archive</small><p class="mono">${names.map(esc).join('<br>') || 'none'}</p></div>`;
      }
      $('.carved', el).innerHTML = `<div class="carved-card"><div class="carved-top"><b class="mono">${name}</b><span class="muted small">${bytes.length.toLocaleString()} bytes · no name, path or dates survive</span></div>${prev}<div class="row-btns"><button type="button" class="btn sm" data-download>Download the carved file</button></div><p class="small muted">SHA-256 <code>${App.hash.sha256(bytes).slice(0, 16)}…</code></p></div>`;
    }
    async function download() {
      if (!curCarve) return;
      const btn = $('[data-download]', el);
      try {
        const dl = window.claude && (await window.claude.use('downloads'));
        if (dl) { await dl.save({ filename: curCarve.name, data: curCarve.blob }); return; }
      } catch (err) { if (err && err.code === 'declined') return; }
      // fallback for self-hosted use (works on any normal static host)
      const a = document.createElement('a'); a.href = curCarve.url; a.download = curCarve.name;
      document.body.appendChild(a); a.click(); a.remove();
      if (btn) { const t = btn.textContent; btn.textContent = 'Saved'; App.later(1400, () => (btn.textContent = t)); }
    }
    el.addEventListener('click', (e) => {
      const s = e.target.closest('[data-sig]'), j = e.target.closest('[data-jump]'), c = e.target.closest('[data-carve]');
      if (s) search(s.dataset.sig);
      if (j) jump(+j.dataset.jump);
      if (c) carve(hits[+c.dataset.carve]);
      if (e.target.closest('[data-download]')) download();
    });
    // misnamed quiz
    const ans = {};
    const TYPES = [['', 'Choose a type'], ['jpg', 'JPEG image'], ['png', 'PNG image'], ['pdf', 'PDF document'], ['zip', 'ZIP or Office document'], ['exe', 'Windows executable']];
    function renderMis() {
      $('.mis-list', el).innerHTML = MISNAMED.map((m, i) => {
        const a = ans[i];
        return `<li class="mis ${a ? (a === m.ans ? 'is-right' : 'is-wrong') : ''}"><div class="mis-top"><b class="mono">${m.name}</b><code class="mis-bytes"><span class="sigb">${m.bytes.slice(0, 11)}</span>${m.bytes.slice(11)}</code></div>
          <div class="mis-a"><label class="sr-only" for="mis-${i}">Real type of ${m.name}</label><select id="mis-${i}" data-m="${i}" ${a ? 'disabled' : ''}>${TYPES.map(([v, l]) => `<option value="${v}" ${a === v ? 'selected' : ''}>${l}</option>`).join('')}</select>${a ? `<p><b class="${a === m.ans ? 'ok-t' : 'bad-t'}">${a === m.ans ? 'Right.' : 'Not quite.'}</b> ${m.why}</p>` : ''}</div></li>`;
      }).join('');
    }
    $('.mis-list', el).addEventListener('change', (e) => { const s = e.target.closest('[data-m]'); if (s && s.value) { ans[s.dataset.m] = s.value; renderMis(); } });
    renderHex(); renderHits(); renderMis();
  });

  /* =====================================================================
     Lesson 7: NTFS timestamps and timestomping
     ===================================================================== */
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const fmtT = (t) => { const d = new Date(t.ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${String(t.frac).padStart(7, '0')}`; };
  const STOMPED = [
    { name: 'invoice_template.docx', si: '2026-03-02 10:14:22.5813442', sim: '2025-11-19 16:02:07.1180021', fn: '2026-03-02 10:14:22.5813442', bad: false, why: 'Modified is earlier than Created, which looks odd, but that’s what a copy does: the copy is created now and keeps the original’s modified time. The sub-seconds are normal and $SI matches $FN.' },
    { name: 'updsvc.exe', si: '2019-06-14 08:00:00.0000000', sim: '2019-06-14 08:00:00.0000000', fn: '2026-03-10 14:05:09.3316520', bad: true, why: '$SI says 2019, $FN says March 2026, and the $SI times have zero sub-seconds. Timestomping tools set $SI through a normal Windows API; $FN is much harder to reach.' },
    { name: 'report_final.pdf', si: '2026-03-09 17:40:51.0942210', sim: '2026-03-09 18:02:13.7730915', fn: '2026-03-09 17:40:51.0942210', bad: false, why: 'Created and modified the same evening, with ordinary sub-seconds, and $SI agrees with $FN. Nothing unusual.' },
    { name: 'wlbsctrl.dll', si: '2021-02-03 11:22:33.0000000', sim: '2021-02-03 11:22:33.0000000', fn: '2021-02-03 11:22:33.0000000', bad: true, why: '$SI and $FN agree, but every value has zero sub-seconds, which almost never happens naturally. This looks like a timestomp followed by a rename or move, which copies $SI into $FN. Check the $UsnJrnl or $LogFile to confirm.' }
  ];
  App.route('/disk/timestamps', function (view) {
    const el = App.lessonPage(view, 'disk', 'timestamps', {
      lede: 'Timestamps are how investigators put events in order, and attackers know it. NTFS actually keeps two sets of timestamps for every file. Perform some ordinary actions on a file, then try to cover your tracks, and see what gives you away.',
      lab: `
        <div class="lab-bar">
          <div class="ts-actions">${[['create', 'Create'], ['edit', 'Edit and save'], ['open', 'Open to read'], ['rename', 'Rename'], ['move', 'Move to another folder'], ['copy', 'Copy'], ['stomp', 'Timestomp to 2019']].map(([k, l]) => `<button type="button" class="btn sm ${k === 'stomp' ? 'danger' : ''}" data-act="${k}">${l}</button>`).join('')}</div>
          <div class="spacer"></div>
          ${App.toggle('la', 'Last-access updates on', true)}
          <button type="button" class="btn ghost sm" data-reset>${icon('reset', 16)}Reset</button>
        </div>
        <div class="lab-grid">
          <div class="lab-stage ts-stage">
            <p class="ts-path mono"></p>
            <div class="table-wrap"><table class="spec ts-t"><thead><tr><th scope="col">Timestamp</th><th scope="col">$STANDARD_INFORMATION</th><th scope="col">$FILE_NAME</th></tr></thead><tbody></tbody></table></div>
            <p class="ts-clock muted small mono"></p>
          </div>
          <div class="lab-panel">
            <h3>What changed</h3>
            <p class="ts-what" aria-live="polite"></p>
            <h3>Red flags</h3>
            <ul class="tells"></ul>
          </div>
        </div>
        <div class="misnamed">
          <div class="custody-head"><div><h3>Which of these were timestomped?</h3><p class="muted small">Created timestamps from four files in C:\\Windows\\System32 and C:\\Users\\Public. Flag the suspicious ones.</p></div><button type="button" class="btn primary" data-check>Check</button></div>
          <div class="table-wrap"><table class="spec stomp-t"><thead><tr><th scope="col">File</th><th scope="col">$SI created</th><th scope="col">$SI modified</th><th scope="col">$FN created</th><th scope="col"><span class="sr-only">Flag</span></th></tr></thead><tbody></tbody></table></div>
        </div>`,
      body: `
        <h2>MACB</h2>
        <p>NTFS records four timestamps, usually abbreviated <strong>MACB</strong>: <strong>M</strong>odified (content changed), <strong>A</strong>ccessed (last read), <strong>C</strong>hanged (the MFT record itself changed, such as a rename or permissions change) and <strong>B</strong>orn (created). They’re stored to 100-nanosecond precision, which is why they have seven digits after the decimal point.</p>
        <h2>Two copies, two behaviors</h2>
        <p>Every MFT record holds MACB twice. <strong>$STANDARD_INFORMATION</strong> ($SI) is what Explorer shows you and what normal programs update. <strong>$FILE_NAME</strong> ($FN) is stored with the file’s name and is set by the Windows kernel when a file is created, copied or moved to another volume. Rename and move within the same volume copy $SI’s values into $FN. Ordinary edits and reads leave $FN alone.</p>
        <p>Exact behavior varies between Windows versions and even between applications, which save files in different ways. The rules in this lab follow the widely used SANS Windows time rules, so treat them as a model, and always test on the Windows version you’re investigating.</p>
        <h2>Timestomping</h2>
        <p>Attackers backdate their malware so it blends in with system files from years ago. This is <strong>timestomping</strong>, MITRE ATT&amp;CK technique T1070.006. Most tools use the <code>SetFileTime</code> API, which only reaches $SI. That leaves tells:</p>
        <ul>
          <li><strong>$SI created earlier than $FN created.</strong> A file can’t exist before its name was written.</li>
          <li><strong>Zero sub-seconds</strong>, like <code>08:00:00.0000000</code>. Real timestamps almost never land on an exact second.</li>
          <li><strong>Disagreement with other sources.</strong> The $UsnJrnl change journal, $LogFile, Prefetch and event logs all record their own times.</li>
        </ul>
        <p>A careful attacker can timestomp and then rename or move the file, which copies the fake values into $FN too. That’s why the other sources matter.</p>`,
      notes: [['MACB', 'Modified, Accessed, Changed (record), Born.'], ['100 ns', 'NTFS timestamp resolution: seven decimal places.'], ['T1070.006', 'The MITRE ATT&CK ID for timestomping.']],
      takeaways: [
        'NTFS keeps MACB times in both $STANDARD_INFORMATION and $FILE_NAME.',
        'Timestomping usually changes only $SI, so compare it with $FN.',
        'Zero sub-seconds and $SI earlier than $FN are classic tells. Confirm against $UsnJrnl, Prefetch and logs.'
      ]
    });
    let now, si, fn, path, name, lastAccess = true, changed = new Set(), stomped = false;
    const T = (ms) => ({ ms, frac: Math.floor(Math.random() * 1e7) });
    const bump = (min) => { now += Math.round(min * 60000 + Math.random() * 90000); };
    function reset() {
      now = Date.UTC(2026, 2, 9, 15, 12, 4); si = null; fn = null; name = 'Q3_forecast.xlsx'; path = 'C:\\Users\\dokafor\\Documents\\'; changed = new Set(); stomped = false;
      $('.ts-what', el).textContent = 'The file doesn’t exist yet. Start by creating it.';
      render();
    }
    const set = (obj, keys, t, tag) => [...keys].forEach((k) => { obj[k] = { ...t }; changed.add(tag + k); });
    function act(a) {
      changed = new Set();
      if (!si && a !== 'create') { $('.ts-what', el).textContent = 'Create the file first.'; return; }
      if (a === 'create') { if (si) { $('.ts-what', el).textContent = 'The file already exists. Reset to start again.'; return; } const t = T(now); si = {}; fn = {}; set(si, 'MACB', t, 's'); set(fn, 'MACB', t, 'f'); msg('Created: all eight timestamps set to the same moment.'); }
      if (a === 'edit') { bump(95); const t = T(now); set(si, lastAccess ? 'MAC' : 'MC', t, 's'); msg('Edited and saved: $SI Modified and Changed updated. $FN didn’t move.'); }
      if (a === 'open') { bump(1440); if (lastAccess) { set(si, 'A', T(now), 's'); msg('Opened: only $SI Accessed changed. Nothing else is touched by reading.'); } else msg('Opened with last-access updates off: nothing changed at all. That’s why Accessed is the least reliable timestamp.'); }
      if (a === 'rename') { bump(20); const t = T(now); set(si, 'C', t, 's'); name = name.startsWith('Q3') ? 'Q3_forecast_FINAL.xlsx' : 'Q3_forecast.xlsx'; 'MACB'.split('').forEach((k) => { fn[k] = { ...si[k] }; changed.add('f' + k); }); msg('Renamed: $SI Changed updated, and $FN was rewritten with a copy of $SI’s values.'); }
      if (a === 'move') { bump(12); const t = T(now); set(si, 'C', t, 's'); path = path.includes('Documents') ? 'C:\\Users\\dokafor\\Desktop\\Old\\' : 'C:\\Users\\dokafor\\Documents\\'; 'MACB'.split('').forEach((k) => { fn[k] = { ...si[k] }; changed.add('f' + k); }); msg('Moved within the same volume: same as a rename. $FN inherits $SI.'); }
      if (a === 'copy') { bump(6); const t = T(now); const keepM = si.M; si = { M: { ...keepM }, A: t, C: { ...t }, B: { ...t } }; fn = { M: { ...t }, A: { ...t }, C: { ...t }, B: { ...t } }; ['sA', 'sC', 'sB', 'fM', 'fA', 'fC', 'fB'].forEach((k) => changed.add(k)); path = 'E:\\Backup\\'; msg('You’re now looking at the copy. It’s born now, but keeps the original’s Modified time, so Modified is earlier than Created. That’s normal for copies, not tampering.'); stomped = false; }
      if (a === 'stomp') { const t = { ms: Date.UTC(2019, 5, 14, 8, 0, 0), frac: 0 }; set(si, 'MACB', t, 's'); stomped = true; msg('Timestomped with SetFileTime: all four $SI values now say June 2019. $FN still has the truth. Now try renaming it, and watch the evidence get laundered.'); }
      render();
    }
    const msg = (t) => ($('.ts-what', el).textContent = t);
    const NAMES = { M: 'Modified', A: 'Accessed', C: 'Changed (MFT record)', B: 'Born (created)' };
    function render() {
      $('.ts-path', el).textContent = si ? path + name : path + '(no file yet)';
      $('.ts-t tbody', el).innerHTML = 'MACB'.split('').map((k) => `<tr><th scope="row"><b>${k}</b> <span class="muted small">${NAMES[k]}</span></th><td class="mono small ${changed.has('s' + k) ? 'chg' : ''}">${si ? fmtT(si[k]) : '–'}</td><td class="mono small ${changed.has('f' + k) ? 'chg' : ''}">${fn ? fmtT(fn[k]) : '–'}</td></tr>`).join('');
      $('.ts-clock', el).textContent = `Clock now: ${fmtT({ ms: now, frac: 0 }).slice(0, 19)} UTC`;
      const tells = [];
      if (si) {
        if (si.B.ms < fn.B.ms) tells.push(['bad', '$SI Born is earlier than $FN Born. The file claims to exist before its name was written.']);
        if ('MACB'.split('').some((k) => si[k].frac === 0)) tells.push(['bad', '$SI values have exactly zero sub-seconds.']);
        if ('MACB'.split('').every((k) => fn[k].frac === 0)) tells.push(['bad', '$FN also has zero sub-seconds, so the timestomp was probably laundered with a rename or move. Only outside sources like $UsnJrnl can prove it now.']);
        if (si.M.ms < si.B.ms && !tells.length) tells.push(['info', 'Modified is earlier than Born. On its own that usually means the file was copied, not tampered with.']);
      }
      $('.tells', el).innerHTML = tells.length ? tells.map(([c, t]) => `<li class="tell ${c}">${icon(c === 'bad' ? 'alert' : 'check', 15)}<span>${t}</span></li>`).join('') : `<li class="tell none">None yet. Try the timestomp.</li>`;
    }
    $('.ts-actions', el).addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b) act(b.dataset.act); });
    $('[data-t=la]', el).addEventListener('change', (e) => { lastAccess = e.target.checked; });
    $('[data-reset]', el).addEventListener('click', reset);
    // challenge
    const flags = new Set(); let checked = false;
    function renderStomp() {
      $('.stomp-t tbody', el).innerHTML = STOMPED.map((f, i) => {
        const fl = flags.has(i), cls = checked ? (f.bad === fl ? (f.bad ? 'hit' : '') : f.bad ? 'missed' : 'false') : '';
        return `<tr class="${cls}"><td class="mono small">${f.name}</td><td class="mono small">${f.si}</td><td class="mono small">${f.sim}</td><td class="mono small">${f.fn}</td><td><button type="button" class="flag-btn" aria-pressed="${fl}" data-f="${i}" ${checked ? 'disabled' : ''}>${icon('flag', 15)}<span>${fl ? 'Flagged' : 'Flag'}</span></button></td></tr>${checked ? `<tr class="explain ${cls}"><td colspan="5"><b>${f.bad ? 'Suspicious.' : 'Looks legitimate.'}</b> ${f.why}</td></tr>` : ''}`;
      }).join('');
    }
    $('.stomp-t', el).addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; const i = +b.dataset.f; flags.has(i) ? flags.delete(i) : flags.add(i); renderStomp(); });
    $('[data-check]', el).addEventListener('click', (e) => { checked = !checked; if (!checked) flags.clear(); e.currentTarget.textContent = checked ? 'Try again' : 'Check'; renderStomp(); });
    renderStomp(); reset();
  });

  /* =====================================================================
     Lesson 8: Evidence of execution
     ===================================================================== */
  const ARTS = [
    { id: 'pf', n: 'Prefetch', tool: 'PECmd', loc: 'C:\\Windows\\Prefetch\\RV.EXE-3F9A1C2B.pf', proves: 'The program ran, how many times, and the last eight run times. Also lists files it loaded in its first seconds.', not: 'Which user ran it. Prefetch is often disabled on servers, and Windows keeps only about 1,024 files.',
      out: 'Executable name: RV.EXE\nHash: 3F9A1C2B\nRun count: 3\nLast run: 2026-03-10 14:31:08\nOther run times: 2026-03-10 14:29:51, 2026-03-10 14:29:40\n\nFiles referenced: 38\n  \\VOLUME{...}\\USERS\\PUBLIC\\RV.EXE\n  \\VOLUME{...}\\USERS\\PUBLIC\\RV_CONFIG.INI\n  \\VOLUME{...}\\WINDOWS\\SYSTEM32\\WS2_32.DLL' },
    { id: 'am', n: 'Amcache.hve', tool: 'AmcacheParser', loc: 'C:\\Windows\\AppCompat\\Programs\\Amcache.hve', proves: 'That the file was present, with its full path, SHA-1 hash, size, and the product name and publisher from its version info. Useful for spotting renamed programs.', not: 'On its own, that the program actually ran. Entries can be created just by the file being scanned.',
      out: 'FullPath:        c:\\users\\public\\rv.exe\nSHA1:            d2f1a9b8e43c0e7f5a6b91c2d3e4f5a6b7c8d9e0\nSize:            4,812,288\nProductName:     RemoteView Pro\nFileDescription: RemoteView Pro remote desktop client\nCompanyName:     Northgate Software (fictional)\nLinkDate:        2025-09-19 20:44:28\nFileKeyLastWrite:2026-03-10 14:29:39' },
    { id: 'sc', n: 'ShimCache', tool: 'AppCompatCacheParser', loc: 'SYSTEM hive: ControlSet001\\Control\\Session Manager\\AppCompatCache', proves: 'That Windows saw the file at this path, and the file’s own last-modified time.', not: 'Execution, on Windows 10 and 11. It’s also only written to the registry at shutdown.',
      out: 'Position  Path                          LastModifiedTime\n12        C:\\Users\\Public\\rv.exe         2025-09-19 20:44:30\n13        C:\\Windows\\System32\\cmd.exe    2025-11-04 03:12:07' },
    { id: 'ua', n: 'UserAssist', tool: 'RECmd / Registry Explorer', loc: 'NTUSER.DAT: Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist', proves: 'Programs a specific user launched through the Windows interface: Start menu, desktop or Explorer double-clicks. Includes run count and last run time.', not: 'Anything run from a command prompt or script. That’s why rv.exe isn’t here.',
      out: 'User: dokafor\nProgramName                                   RunCount  LastExecuted\n{System32}\\cmd.exe                             4         2026-03-10 14:27:55\n{ProgramFilesX86}\\Microsoft\\Edge\\msedge.exe    212       2026-03-10 13:58:10\nMicrosoft.Office.EXCEL.EXE.15                  87        2026-03-10 09:14:02\n\n(no entry for rv.exe)' },
    { id: 'bam', n: 'BAM', tool: 'RECmd / Registry Explorer', loc: 'SYSTEM hive: Services\\bam\\State\\UserSettings\\<SID>', proves: 'The last time each program ran, filed under the security ID (SID) of the account that ran it.', not: 'Run counts or history. Only the latest run is kept, and entries age out after about a week.',
      out: 'SID: S-1-5-21-3623811015-3361044348-30300820-1107  (dokafor)\n  \\Device\\HarddiskVolume3\\Users\\Public\\rv.exe      2026-03-10 14:31:09\n  \\Device\\HarddiskVolume3\\Windows\\System32\\cmd.exe  2026-03-10 14:33:40' },
    { id: 'srum', n: 'SRUM', tool: 'SrumECmd', loc: 'C:\\Windows\\System32\\sru\\SRUDB.dat', proves: 'Hourly resource use per application and user: CPU time, disk bytes, and bytes sent and received on the network.', not: 'Exact times. Data is rolled up into one-hour buckets.',
      out: 'Timestamp            App                           User     BytesSent    BytesRecvd\n2026-03-10 14:00:00  \\users\\public\\rv.exe          dokafor  38,412,907   2,118,443\n2026-03-10 15:00:00  \\program files\\...\\msedge.exe  dokafor  1,882,110    22,114,009' },
    { id: 'evt', n: 'Event 4688', tool: 'EvtxECmd', loc: 'Security.evtx', proves: 'Every process created, with the user, parent process and, if enabled, the command line.', not: 'Anything, if process-creation auditing wasn’t turned on before the incident. It’s off by default.',
      out: 'Query: EventID = 4688 AND NewProcessName LIKE "%rv.exe"\n\n0 records found.\n\nAudit policy on FIN-WS-22:\n  Audit Process Creation: No Auditing' }
  ];
  const XQ = [
    { q: 'Prove rv.exe actually ran, and say how many times.', a: 'pf', why: 'Prefetch shows a run count of 3 and the last run at 14:31:08.' },
    { q: 'rv.exe was renamed. Find out what it really is, with a hash you could look up.', a: 'am', why: 'Amcache kept the version info (RemoteView Pro) and a SHA-1 hash, even though the file was renamed.' },
    { q: 'Tie the execution to a specific user account.', a: 'bam', why: 'BAM stores the last run time under the SID of the account that ran it: dokafor.' },
    { q: 'Find the artifact that shows rv.exe was on disk but can’t prove it ran on Windows 11.', a: 'sc', why: 'ShimCache lists the path, but on Windows 10 and 11 it no longer records whether the program executed.' },
    { q: 'Did rv.exe send data over the network?', a: 'srum', why: 'SRUM shows about 38 MB sent by rv.exe in the 14:00 hour. That’s worth following up in the network logs.' }
  ];
  App.route('/disk/execution', function (view) {
    const el = App.lessonPage(view, 'disk', 'execution', {
      lede: 'An alert says an unapproved remote-access program may have run on a finance workstation. The file is called rv.exe, and process auditing was off. Windows still kept a surprising number of records. Open each artifact and use them to answer the investigation’s questions.',
      lab: `
        <div class="xq" aria-live="polite"></div>
        <div class="art-grid">
          <nav class="art-list" aria-label="Artifacts">${ARTS.map((a) => `<button type="button" class="art-btn" data-a="${a.id}"><b>${a.n}</b><small>${a.tool}</small></button>`).join('')}</nav>
          <div class="art-view"></div>
        </div>`,
      body: `
        <h2>No single artifact tells the whole story</h2>
        <p>Windows records program activity in several places, each for its own reasons: making programs start faster, keeping old software compatible, tracking battery and data use. None of them was designed for investigators. Each one captures a slightly different fact, so analysts <strong>corroborate</strong>: when Prefetch, BAM and Amcache all agree, the conclusion is strong.</p>
        <h2>Execution versus presence</h2>
        <p>The most common mistake is treating “the file was there” as “the file ran.” Amcache and ShimCache can record a file just because Windows scanned it, and on Windows 10 and later ShimCache no longer carries an execution flag at all. Prefetch, BAM, UserAssist, SRUM and event 4688 are much stronger evidence of execution.</p>
        <h2>Attribution</h2>
        <p>Proving that a program ran isn’t the same as proving <em>who</em> ran it. Artifacts stored in a user’s own registry hive (<code>NTUSER.DAT</code>, like UserAssist) or keyed by SID (like BAM) tie activity to an account. Remember that an account isn’t a person: someone else may have been using those credentials.</p>
        <h2>The tools</h2>
        <p>Eric Zimmerman’s free tools parse all of these: <strong>PECmd</strong> for Prefetch, <strong>AmcacheParser</strong>, <strong>AppCompatCacheParser</strong>, <strong>RECmd</strong> and <strong>Registry Explorer</strong> for the registry, <strong>SrumECmd</strong> and <strong>EvtxECmd</strong>. Output goes to CSV, which you review in <strong>Timeline Explorer</strong>. <strong>KAPE</strong> can collect and parse the lot in one pass.</p>`,
      notes: [['1,024', 'Roughly how many Prefetch files Windows 8 and later keep.'], ['SHA-1', 'Amcache stores each file’s SHA-1, useful for threat intel lookups.'], ['Off', 'Process-creation auditing (4688) is disabled by default.']],
      takeaways: [
        'Prefetch, BAM, UserAssist and SRUM point to execution. Amcache and ShimCache mainly prove presence.',
        'Amcache keeps version info and a hash, which exposes renamed programs.',
        'Corroborate across artifacts, and tie activity to an account through NTUSER.DAT or SIDs.'
      ]
    });
    let open = 'pf', qi = 0, got = null;
    function renderArt() {
      const a = ARTS.find((x) => x.id === open);
      $$('.art-btn', el).forEach((b) => b.setAttribute('aria-current', String(b.dataset.a === open)));
      $('.art-view', el).innerHTML = `
        <div class="art-head"><h3>${a.n}</h3><span class="chip">${a.tool}</span></div>
        <p class="mono small art-loc">${esc(a.loc)}</p>
        <pre class="art-out">${esc(a.out)}</pre>
        <div class="art-pn"><div><b class="ok-t">Proves</b><p>${a.proves}</p></div><div><b class="bad-t">Doesn’t prove</b><p>${a.not}</p></div></div>`;
    }
    function renderQ() {
      const box = $('.xq', el);
      if (qi >= XQ.length) { box.innerHTML = `<div class="xq-in"><b>Case questions answered.</b><span class="muted">A remote-access program, renamed to rv.exe, ran three times under dokafor’s account between 14:29 and 14:31 on March 10, then sent about 38 MB out.</span><button type="button" class="btn sm" data-restart>${icon('reset', 14)}Start over</button></div>`; return; }
      const q = XQ[qi];
      box.innerHTML = `<div class="xq-in"><span class="xq-n mono">Question ${qi + 1} of ${XQ.length}</span><b>${q.q}</b>${got === null ? `<button type="button" class="btn sm primary" data-answer>Answer with the open artifact</button>` : `<div class="callout ${got ? 'good' : 'bad'}"><b>${got ? 'Yes.' : `Not quite. Look at ${ARTS.find((x) => x.id === q.a).n}.`}</b> ${got ? q.why : ''}</div>${got ? `<button type="button" class="btn sm primary" data-nextq>Next question${icon('next', 14)}</button>` : `<button type="button" class="btn sm" data-retry>Try again</button>`}`}</div>`;
    }
    el.addEventListener('click', (e) => {
      const b = e.target.closest('.art-btn'); if (b) { open = b.dataset.a; renderArt(); }
      if (e.target.closest('[data-answer]')) { got = open === XQ[qi].a; renderQ(); }
      if (e.target.closest('[data-retry]')) { got = null; renderQ(); }
      if (e.target.closest('[data-nextq]')) { qi++; got = null; renderQ(); }
      if (e.target.closest('[data-restart]')) { qi = 0; got = null; renderQ(); }
    });
    renderArt(); renderQ();
  });
})();
