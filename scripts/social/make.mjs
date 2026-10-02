// Instagram (and share-image) generator — same bold look as the website.
//
//   npm run social                      this week's set: hut, favourite, closures, peak of the month
//   npm run social -- favourite <slug>  one favourite, e.g. mystic-bike-park
//   npm run social -- hut <name>        one hut, e.g. "Federation Hut"
//   npm run social -- og                regenerate public/og/default.png (link-preview image)
//
// Each post is written as a feed image (1080×1350), a Story (1080×1920) and a caption.txt,
// into social/out/<date>/. Backgrounds are contour lines drawn from real terrain around the place.
// Needs Google Chrome installed (set CHROME=/path/to/chrome to use another Chromium browser).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { contours } from 'd3-contour';
import { geoPath, geoIdentity } from 'd3-geo';
import { PNG } from 'pngjs';
import { getPlaces, getCategory, whereText, fmtKm } from '../../src/lib/places.js';

const SITE = 'explorehighcountry.com';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const today = new Date();
const stamp = today.toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' });
const OUT = path.join('social', 'out', stamp);
const COLOURS = { huts: '#ff5b2e', favourites: '#ff7ab6', peaks: '#c9b6ff', closures: '#ff9ec4', yellow: '#ffcf3d' };
const HASHTAGS = '#victorianhighcountry #highcountry #victoria #victorianalps #visitvictoria #alpinenationalpark #exploreaustralia #hikingaustralia';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const weekIndex = (d) => Math.floor((d.getTime() / 86400000 + 3) / 7); // same as the homepage's hut of the week

// ---------- Terrain: contour lines and elevation from Mapzen/AWS Terrarium tiles ----------
async function terrain([lng, lat], z = 12) {
  const n = 2 ** z;
  const fx = ((lng + 180) / 360) * n;
  const fy = ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n;
  const tx = Math.floor(fx), ty = Math.floor(fy);
  const W = 768, grid = new Float32Array(W * W);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const res = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${tx + dx}/${ty + dy}.png`);
    const png = PNG.sync.read(Buffer.from(await res.arrayBuffer()));
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4, d = png.data;
      grid[((dy + 1) * 256 + y) * W + (dx + 1) * 256 + x] = d[i] * 256 + d[i + 1] + d[i + 2] / 256 - 32768;
    }
  }
  // A 512×512 window centred on the place.
  const px = Math.round((fx - tx + 1) * 256), py = Math.round((fy - ty + 1) * 256), S = 512;
  const win = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) win[y * S + x] = grid[(py - 256 + y) * W + (px - 256 + x)];
  const ele = Math.round(win[256 * S + 256]);
  let min = Infinity, max = -Infinity;
  for (const v of win) { if (v < min) min = v; if (v > max) max = v; }
  const step = max - min > 900 ? 50 : 25;
  const levels = [];
  for (let v = Math.ceil(min / step) * step; v < max; v += step) levels.push(v);
  const draw = geoPath(geoIdentity());
  const paths = contours().size([S, S]).thresholds(levels)(Array.from(win))
    .map((c) => `<path d="${draw(c)}" class="${c.value % (step * 5) === 0 ? 'idx' : ''}"/>`).join('');
  return { ele, svg: `<svg class="topo" viewBox="0 0 512 512" preserveAspectRatio="xMidYMid slice">${paths}</svg>` };
}

// ---------- Rendering ----------
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=Bricolage+Grotesque:opsz,wght@12..96,600..800&display=block" rel="stylesheet">';
const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; }
  body { width: var(--w); height: var(--h); overflow: hidden; background: var(--bg); color: #141210; font-family: 'Archivo', sans-serif; position: relative; }
  .topo { position: absolute; inset: 0; width: 100%; height: 100%; fill: none; stroke: #141210; stroke-width: .7; opacity: .16; }
  .topo .idx { stroke-width: 1.5; }
  .pin { position: absolute; left: 50%; top: 50%; width: 44px; height: 44px; margin: -22px; border-radius: 50%; background: #ffcf3d; border: 5px solid #141210; box-shadow: 0 0 0 10px rgba(255,255,255,.55); }
  .frame { position: absolute; inset: 64px; display: flex; flex-direction: column; }
  .top { display: flex; align-items: center; justify-content: space-between; }
  .brand { display: flex; align-items: center; gap: 14px; font: 800 44px 'Bricolage Grotesque'; letter-spacing: -.04em; background: #fbf8f1; border: 4px solid #141210; border-radius: 99px; padding: 10px 26px 10px 12px; box-shadow: 6px 6px 0 #141210; }
  .brand i { width: 52px; height: 52px; border-radius: 50%; border: 4px solid #141210; background: #ffcf3d url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M3 18l6-10 3.5 5 2.5-3.5L21 18z' fill='%23141210'/%3E%3C/svg%3E") center / 34px no-repeat; }
  .kicker { font: 800 30px 'Archivo'; font-stretch: 75%; font-variation-settings: 'wdth' 75; text-transform: uppercase; letter-spacing: .04em; background: #141210; color: var(--bg); border-radius: 99px; padding: 12px 24px; }
  .spacer { flex: 1; }
  h1 { font: 800 var(--title, 128px)/.88 'Bricolage Grotesque'; letter-spacing: -.055em; }
  .card { background: #fbf8f1; border: 5px solid #141210; border-radius: 30px; box-shadow: 10px 10px 0 #141210; padding: 28px 34px; font: 500 36px/1.32 'Archivo'; margin-top: 34px; }
  .chips { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 30px; }
  .chip { font: 800 30px 'Archivo'; font-stretch: 80%; font-variation-settings: 'wdth' 80; text-transform: uppercase; background: #fbf8f1; border: 4px solid #141210; border-radius: 99px; padding: 10px 22px; }
  .url { margin-top: 38px; align-self: flex-start; font: 800 34px 'Archivo'; font-stretch: 110%; font-variation-settings: 'wdth' 110; background: #ffcf3d; border: 4px solid #141210; border-radius: 99px; padding: 14px 30px; box-shadow: 6px 6px 0 #141210; }
  .story .frame { inset: 150px 64px 210px; }
`;
const SIZES = { feed: [1080, 1350], story: [1080, 1920], og: [1200, 630] };

async function render(file, size, bg, inner, extraCss = '') {
  const [w, h] = SIZES[size];
  const html = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>:root{--w:${w}px;--h:${h}px;--bg:${bg}}${BASE_CSS}${extraCss}</style></head>
    <body class="${size}">${inner}</body></html>`;
  const tmp = path.join(os.tmpdir(), `hc-social-${process.pid}.html`);
  fs.writeFileSync(tmp, html);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'hc-chrome-'));
  // A fixed wait (--timeout) gives the web fonts time to load. Headless Chrome writes the screenshot but
  // doesn't always quit afterwards, so watch for the file and close Chrome ourselves once it's written.
  const out = path.resolve(file);
  fs.rmSync(out, { force: true });
  const chrome = spawn(CHROME, ['--headless=new', '--hide-scrollbars', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    `--user-data-dir=${profile}`, `--window-size=${w},${h}`, '--timeout=6000', `--screenshot=${out}`, `file://${tmp}`], { stdio: 'ignore' });
  let lastSize = -1;
  for (let waited = 0; ; waited += 500) {
    await new Promise((r) => setTimeout(r, 500));
    const size = fs.existsSync(out) ? fs.statSync(out).size : 0;
    if (size > 0 && size === lastSize) break; // written and no longer growing
    lastSize = size;
    if (waited > 60000) { chrome.kill('SIGKILL'); throw new Error(`Chrome didn't produce ${file}`); }
  }
  chrome.kill('SIGKILL');
  fs.rmSync(profile, { recursive: true, force: true });
  console.log('  wrote', file);
}

async function post(name, bg, innerFor, caption) {
  const dir = path.join(OUT, name);
  fs.mkdirSync(dir, { recursive: true });
  for (const size of ['feed', 'story']) await render(path.join(dir, `${size}.png`), size, bg, innerFor(size));
  fs.writeFileSync(path.join(dir, 'caption.txt'), caption.trim() + '\n');
}

const brand = (kicker) => `<div class="top"><div class="brand"><i></i>High Country</div><div class="kicker">${esc(kicker)}</div></div>`;
const titleSize = (name, base) => (name.length > 22 ? base * 0.7 : name.length > 14 ? base * 0.85 : base);

// ---------- Post types ----------
const places = getPlaces();
const link = (p) => `${SITE}${p.url}`;

async function hutPost(hut) {
  const t = await terrain(hut.coords, 13);
  const facts = [whereText(hut), t.ele > 0 && `${t.ele.toLocaleString()} m`].filter(Boolean);
  await post(`hut-${hut.slug}`, COLOURS.huts, () => `${t.svg}<div class="pin"></div>
    <div class="frame">${brand('Hut of the week')}<div class="spacer"></div>
      <h1 style="--title:${titleSize(hut.name, 130)}px">${esc(hut.name)}</h1>
      <div class="chips">${facts.map((f) => `<span class="chip">${esc(f)}</span>`).join('')}</div>
      <div class="url">${SITE}</div></div>`, `
Hut of the week: ${hut.name} 🛖

${hut.name} sits ${whereText(hut)}${t.ele > 0 ? `, about ${t.ele.toLocaleString()} m above sea level` : ''}. Find it on the map, plus what’s nearby and any track closures in the area — link in bio.

Always check conditions with Parks Victoria before you head out.

${HASHTAGS} #mountainhuts`);
}

async function favouritePost(f) {
  const t = await terrain(f.coords, 14);
  await post(`favourite-${f.slug}`, COLOURS.favourites, (size) => `${t.svg}<div class="pin"></div>
    <div class="frame">${brand('Local favourite')}<div class="spacer"></div>
      <span class="chip" style="align-self:flex-start;margin-bottom:22px">${esc(f.town)}</span>
      <h1 style="--title:${titleSize(f.name, 124)}px">${esc(f.name)}</h1>
      <div class="card">${esc(f.blurb)}</div>
      ${size === 'story' ? `<div class="chips">${f.tags.map((x) => `<span class="chip">#${esc(x)}</span>`).join('')}</div>` : ''}
      <div class="url">${SITE}</div></div>`, `
Local favourite: ${f.name}, ${f.town} 💛

${f.blurb}

${f.body[0]}

${f.tip ? `Good to know: ${f.tip}\n\n` : ''}More on this and other hand-picked High Country favourites — link in bio (${link(f)}).

${HASHTAGS} ${f.tags.map((x) => `#${x.toLowerCase().replace(/[^a-z0-9]/g, '')}`).join(' ')}`);
}

async function peakPost(peak) {
  const t = await terrain(peak.coords, 12);
  const month = today.toLocaleDateString('en-AU', { month: 'long', timeZone: 'Australia/Melbourne' });
  await post(`peak-${peak.slug}`, COLOURS.peaks, () => `${t.svg}<div class="pin"></div>
    <div class="frame">${brand(`Peak of the month · ${month}`)}<div class="spacer"></div>
      <div style="font:800 190px/.8 'Bricolage Grotesque';letter-spacing:-.06em">${peak.ele.toLocaleString()}<span style="font-size:90px"> m</span></div>
      <h1 style="--title:${titleSize(peak.name, 110)}px;margin-top:26px">${esc(peak.name)}</h1>
      <div class="chips"><span class="chip">${esc(whereText(peak))}</span></div>
      <div class="url">${SITE}</div></div>`, `
Peak of the month: ${peak.name} — ${peak.ele.toLocaleString()} m ⛰️

One of the high points of Victoria’s High Country, ${whereText(peak)}. See it in 3D on the atlas and find the huts, walks and campgrounds nearby — link in bio.

${HASHTAGS} #peakbagging #summit`);
}

async function closuresPost() {
  const day = stamp;
  const params = new URLSearchParams({
    service: 'WFS', version: '2.0.0', request: 'GetFeature', outputFormat: 'application/json',
    typeNames: 'open-data-platform:paim_vm_tr_road_closures', propertyName: 'ezi_road_name_label,reason,reopen_date',
    CQL_FILTER: `BBOX(geom,145.5,-37.9,148.3,-36.1,'EPSG:4326') AND status <> 'Open' AND closure_date <= '${day}' AND (reopen_date >= '${day}' OR reopen_date IS NULL)`,
  });
  const fc = await (await fetch(`https://opendata.maps.vic.gov.au/geoserver/wfs?${params}`)).json();
  const roads = new Map();
  for (const f of fc.features) if (f.properties.ezi_road_name_label) roads.set(f.properties.ezi_road_name_label, f.properties);
  const fmt = (iso) => new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  const reason = (r) => (/season/i.test(r) ? 'Seasonal' : r || 'Closed');
  const next = [...roads].filter(([, p]) => p.reopen_date).sort((a, b) => a[1].reopen_date.localeCompare(b[1].reopen_date));
  const css = `.list { margin-top: 30px; background:#fbf8f1; border:5px solid #141210; border-radius:30px; box-shadow:10px 10px 0 #141210; padding: 12px 34px; }
    .row { display:flex; justify-content:space-between; gap:20px; padding:16px 0; font:700 34px 'Archivo'; }
    .row + .row { border-top: 3px solid #141210; } .row span { font-weight:500; white-space:nowrap; }`;
  const inner = (size) => {
    const rows = next.slice(0, size === 'story' ? 7 : 4);
    return `<style>${css}</style><div class="frame">${brand('Conditions')}<div class="spacer"></div>
      <div style="font:800 300px/.8 'Bricolage Grotesque';letter-spacing:-.06em">${roads.size}</div>
      <h1 style="--title:100px;margin-top:18px">tracks closed this week</h1>
      <div class="list">${rows.map(([n, p]) => `<div class="row">${esc(n)}<span>${esc(reason(p.reason))} · ${fmt(p.reopen_date)}</span></div>`).join('')}</div>
      <div class="url">Live map · ${SITE}</div></div>`;
  };
  const dir = path.join(OUT, 'closures');
  fs.mkdirSync(dir, { recursive: true });
  for (const size of ['feed', 'story']) await render(path.join(dir, `${size}.png`), size, COLOURS.closures, inner(size));
  fs.writeFileSync(path.join(dir, 'caption.txt'), `
${roads.size} tracks are closed across the High Country this week 🚧

Next to reopen:
${next.slice(0, 5).map(([n, p]) => `• ${n} — ${reason(p.reason).toLowerCase()}, reopens ${fmt(p.reopen_date)}`).join('\n')}

Every closure is on our live map, updated straight from Vicmap — link in bio. Plans change fast up here, so always check Parks Victoria before you go.

${HASHTAGS} #4wdaustralia #trackclosures
`.trim() + '\n');
}

async function ogImage() {
  const t = await terrain([147.13, -36.93], 12);
  const css = `.og .frame { inset: 52px 60px; } .og h1 { font-size: 168px; }`;
  await render(path.join('public', 'og', 'default.png'), 'og', COLOURS.yellow, `${t.svg}
    <div class="frame"><div class="top"><div class="brand"><i></i>Victorian Alps</div></div><div class="spacer"></div>
      <h1>High Country</h1><div class="url" style="margin-top:26px">${SITE}</div></div>`, css);
}

// ---------- Main ----------
const [cmd, arg] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join('public', 'og'), { recursive: true });
const huts = places.filter((p) => p.category === 'huts');
const favs = places.filter((p) => p.category === 'favourites');
const bigPeaks = places.filter((p) => p.category === 'peaks' && p.ele >= 1700).sort((a, b) => b.ele - a.ele);

if (cmd === 'og') {
  await ogImage();
} else if (cmd === 'favourite') {
  const f = favs.find((x) => x.slug === arg) || process.exit(console.error(`No favourite "${arg}". Options: ${favs.map((x) => x.slug).join(', ')}`) || 1);
  await favouritePost(f);
} else if (cmd === 'hut') {
  const h = huts.find((x) => x.name.toLowerCase() === String(arg).toLowerCase()) || process.exit(console.error(`No hut named "${arg}"`) || 1);
  await hutPost(h);
} else {
  const w = weekIndex(today);
  console.log(`Week of ${stamp} → ${OUT}`);
  await hutPost(huts[w % huts.length]);
  await favouritePost(favs[w % favs.length]);
  await closuresPost();
  await peakPost(bigPeaks[(today.getFullYear() * 12 + today.getMonth()) % bigPeaks.length]);
}
