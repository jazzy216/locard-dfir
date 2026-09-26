# Locard — learn digital forensics and incident response

An interactive learning site with 12 hands-on labs across three tracks
(Foundations, Disk & files, Logs/memory/network), a toolkit map, a quiz,
a glossary and a watch/read page. Everything is simulated; hosts, people
and addresses are fictional.

## Structure
- `index.html` — page shell
- `css/styles.css` — design tokens (IBM Plex, slate + evidence-amber palette), layout, shared components, light/dark themes
- `css/labs.css` — lab-specific styles
- `js/core.js` — hash router, progress store (localStorage), sequence player, shared controls, course map
- `js/hash.js` — pure-JS MD5 / SHA-1 / SHA-256 (verified against Node crypto), used live in the hashing and imaging labs
- `js/carvedata.js` — a real embedded blob of "unallocated space" holding genuine JPEG/PNG/PDF/ZIP files for the carving lab
- `js/home.js` — home page + the live evidence-integrity tag
- `js/foundations.js` — IR lifecycle, order of volatility, hashing + chain of custody, imaging
- `js/disk.js` — deleted files, file carving, NTFS timestamps + timestomping, evidence of execution
- `js/live.js` — event logs, memory forensics, network beaconing, the capstone timeline
- `js/pages.js` — toolkit, quiz, glossary, watch/read

## Build
`python3 build.py` bundles everything into `dist/index.html`, one
self-contained file you can host on any static server (GitHub Pages, Netlify).

To add a lesson: add it to `App.course` in `core.js`, then register a route
with `App.route('/track/id', fn)` using `App.lessonPage(...)`.
