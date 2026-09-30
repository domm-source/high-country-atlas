// High Country Atlas — map setup, icons, controls and search.

const HIGH_COUNTRY = { center: [146.95, -36.95], zoom: 8.6, bounds: [[144.3, -38.7], [149.4, -35.3]] };

const demSource = new mlcontour.DemSource({ url: TERRARIUM, encoding: 'terrarium', maxzoom: 13, worker: true });
demSource.setupMaplibre(maplibregl);

const EMPTY = { type: 'FeatureCollection', features: [] };
const state = { theme: 'atlas', visible: {}, terrain: false, closures: EMPTY };

const map = new maplibregl.Map({
  container: 'map',
  style: buildStyle(state.theme, demSource, state.visible, state.closures),
  center: HIGH_COUNTRY.center,
  zoom: HIGH_COUNTRY.zoom,
  maxBounds: HIGH_COUNTRY.bounds,
  minZoom: 6.5,
  maxPitch: 75,
  hash: true,
  attributionControl: { compact: false },
});
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'top-right');
map.addControl(new maplibregl.ScaleControl({ unit: 'metric', maxWidth: 110 }), 'bottom-left');

// ---------- Icons (drawn on canvas, added on demand) ----------
const ICONS = {
  peak(ctx, s, c) { ctx.beginPath(); ctx.moveTo(s / 2, s * 0.18); ctx.lineTo(s * 0.86, s * 0.8); ctx.lineTo(s * 0.14, s * 0.8); ctx.closePath(); fill(ctx, c.peak); },
  hut(ctx, s, c) { ctx.beginPath(); ctx.moveTo(s / 2, s * 0.12); ctx.lineTo(s * 0.9, s * 0.48); ctx.lineTo(s * 0.78, s * 0.48); ctx.lineTo(s * 0.78, s * 0.86);
    ctx.lineTo(s * 0.22, s * 0.86); ctx.lineTo(s * 0.22, s * 0.48); ctx.lineTo(s * 0.1, s * 0.48); ctx.closePath(); fill(ctx, c.hut); },
  campsite(ctx, s, c) { ctx.beginPath(); ctx.moveTo(s / 2, s * 0.15); ctx.lineTo(s * 0.9, s * 0.85); ctx.lineTo(s * 0.1, s * 0.85); ctx.closePath(); fill(ctx, c.camp);
    ctx.beginPath(); ctx.moveTo(s / 2, s * 0.5); ctx.lineTo(s * 0.62, s * 0.85); ctx.lineTo(s * 0.38, s * 0.85); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); },
  lookout(ctx, s, c) { star(ctx, s / 2, s / 2, s * 0.44, s * 0.2); fill(ctx, c.lookout); },
  cave(ctx, s, c) { ctx.beginPath(); ctx.arc(s / 2, s * 0.62, s * 0.34, Math.PI, 0); ctx.lineTo(s * 0.84, s * 0.8); ctx.lineTo(s * 0.16, s * 0.8); ctx.closePath(); fill(ctx, c.textMuted); },
  attraction(ctx, s, c) { ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.26, 0, 2 * Math.PI); fill(ctx, c.textMuted); },
};
function fill(ctx, color) { ctx.fillStyle = color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fill(); }
function star(ctx, cx, cy, R, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r : R; ctx.lineTo(cx + d * Math.cos(a), cy + d * Math.sin(a)); }
  ctx.closePath();
}
map.on('styleimagemissing', (e) => {
  const draw = ICONS[e.id];
  if (!draw || map.hasImage(e.id)) return;
  const size = 32, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size, THEMES[state.theme]);
  map.addImage(e.id, canvas.getContext('2d').getImageData(0, 0, size, size), { pixelRatio: 2 });
});

// ---------- Style & layer controls ----------
function applyStyle() {
  map.setStyle(buildStyle(state.theme, demSource, state.visible, state.closures), { diff: false });
  map.once('styledata', () => applyTerrain());
}
function applyTerrain() {
  if (state.terrain) {
    map.setTerrain({ source: 'terrain', exaggeration: 1.3 });
    map.setSky({ 'sky-color': '#bcd6ea', 'horizon-color': '#f3efe4', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-color': '#e8e4da' });
  } else {
    map.setTerrain(null);
  }
}

document.querySelectorAll('#theme button').forEach((btn) => btn.addEventListener('click', () => {
  if (btn.dataset.theme === state.theme) return;
  state.theme = btn.dataset.theme;
  document.querySelectorAll('#theme button').forEach((b) => b.classList.toggle('on', b === btn));
  applyStyle();
}));

document.querySelectorAll('input[data-group]').forEach((box) => box.addEventListener('change', () => {
  const group = box.dataset.group;
  state.visible[group] = box.checked;
  for (const layer of map.getStyle().layers) {
    if (layer.metadata?.group === group) map.setLayoutProperty(layer.id, 'visibility', box.checked ? 'visible' : 'none');
  }
}));

document.getElementById('terrain3d').addEventListener('change', (e) => {
  state.terrain = e.target.checked;
  applyTerrain();
  map.easeTo({ pitch: state.terrain ? 60 : 0, duration: 900 });
});

const panel = document.getElementById('panel');
document.getElementById('panel-toggle').addEventListener('click', (e) => {
  const collapsed = panel.classList.toggle('collapsed');
  e.target.setAttribute('aria-expanded', String(!collapsed));
});
if (window.matchMedia('(max-width: 600px)').matches) panel.classList.add('collapsed');

// ---------- Popups ----------
const KIND_LABEL = {
  city: 'City', town: 'Town', village: 'Village', locality: 'Locality', peak: 'Peak', saddle: 'Saddle / gap',
  hut: 'Hut', campsite: 'Campsite', lookout: 'Lookout', cave: 'Cave', park: 'Park / reserve', lake: 'Lake',
  river: 'River', resort: 'Alpine resort', attraction: 'Point of interest',
};
const popup = new maplibregl.Popup({ closeButton: false, offset: 12, maxWidth: '260px' });
function showPopup(lngLat, props) {
  const el = document.createElement('div');
  const name = el.appendChild(document.createElement('div')); name.className = 'pop-name'; name.textContent = props.n;
  const meta = el.appendChild(document.createElement('div')); meta.className = 'pop-meta';
  meta.textContent = [KIND_LABEL[props.k] || '', props.e ? `${props.e.toLocaleString()} m` : ''].filter(Boolean).join(' · ');
  popup.setLngLat(lngLat).setDOMContent(el).addTo(map);
}
for (const id of ['peak-major', 'peak-mid', 'peak-all', 'poi-outdoor', 'saddle']) {
  map.on('click', id, (e) => showPopup(e.features[0].geometry.coordinates, e.features[0].properties));
  map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
}

// ---------- Live road & track closures (Vicmap, via the DataVic open data service) ----------
const CLOSURES_WFS = 'https://opendata.maps.vic.gov.au/geoserver/wfs';
const REASON_LABEL = { SeasonClosureUpd: 'Seasonal closure', 'Seasonal Closure': 'Seasonal closure' };
const closureStatus = document.getElementById('closure-status');
const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Australia/Melbourne' });

async function loadClosures() {
  // Only closures in effect today, within the High Country, fetched fresh on each visit.
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' }); // YYYY-MM-DD
  const params = new URLSearchParams({
    service: 'WFS', version: '2.0.0', request: 'GetFeature', outputFormat: 'application/json', srsName: 'EPSG:4326',
    typeNames: 'open-data-platform:paim_vm_tr_road_closures',
    propertyName: 'ezi_road_name_label,status,reason,statusnote,closure_date,reopen_date,comments,geom',
    CQL_FILTER: `BBOX(geom,145.5,-37.9,148.3,-36.1,'EPSG:4326') AND status <> 'Open' AND closure_date <= '${today}'`
              + ` AND (reopen_date >= '${today}' OR reopen_date IS NULL)`,
  });
  try {
    const res = await fetch(`${CLOSURES_WFS}?${params}`);
    if (!res.ok) throw new Error(res.status);
    state.closures = await res.json();
    // The fetch can beat the map's first style load; if so, apply the data once the source exists.
    if (map.getSource('closures')) map.getSource('closures').setData(state.closures);
    else map.once('load', () => map.getSource('closures').setData(state.closures));
    const n = state.closures.features.length;
    closureStatus.textContent = `${n} active · live from Vicmap`;
  } catch (err) {
    console.warn('Could not load closures', err);
    closureStatus.textContent = 'Closures unavailable right now';
  }
}
loadClosures();

function showClosurePopup(lngLat, p) {
  const el = document.createElement('div');
  const add = (cls, text) => { const d = el.appendChild(document.createElement('div')); d.className = cls; d.textContent = text; return d; };
  add('pop-name', p.ezi_road_name_label || 'Unnamed track');
  add('pop-closed', `${p.status || 'Closed'} · ${REASON_LABEL[p.reason] || p.reason || 'Reason not given'}`);
  add('pop-meta', [p.closure_date && `Since ${fmtDate(p.closure_date)}`,
                   p.reopen_date ? `reopens ${fmtDate(p.reopen_date)}` : 'no reopen date set'].filter(Boolean).join(' · '));
  const note = [p.statusnote, p.comments].map((x) => (x || '').trim()).filter((x, i, a) => x && a.indexOf(x) === i).join(' — ');
  if (note) add('pop-note', note.length > 220 ? `${note.slice(0, 220)}…` : note);
  add('pop-meta pop-caveat', 'Always check with Parks Victoria or DEECA before you travel.');
  popup.setLngLat(lngLat).setDOMContent(el).addTo(map);
}
map.on('click', 'closure-hit', (e) => showClosurePopup(e.lngLat, e.features[0].properties));
map.on('mouseenter', 'closure-hit', () => { map.getCanvas().style.cursor = 'pointer'; });
map.on('mouseleave', 'closure-hit', () => { map.getCanvas().style.cursor = ''; });

// ---------- Search ----------
const WEIGHT = { city: 10, town: 10, resort: 9, village: 8, peak: 7, hut: 6, park: 5, lake: 5, river: 5,
                 campsite: 4, lookout: 4, locality: 3, saddle: 3, cave: 3, attraction: 3 };
const ZOOM_FOR = { city: 11, town: 12, village: 13, resort: 13, park: 11, river: 12, lake: 13 };
// "Mt Bogong" should find "Mount Bogong" and vice versa.
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\bmount\b/g, 'mt').replace(/\bsaint\b/g, 'st').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

let places = [];
fetch('data/places.geojson').then((r) => r.json()).then((fc) => {
  places = fc.features.map((f) => ({ ...f.properties, c: f.geometry.coordinates, key: norm(f.properties.n) }));
  document.getElementById('q').placeholder = `Search ${places.length.toLocaleString()} peaks, huts, towns…`;
});

function search(query) {
  const q = norm(query);
  if (!q) return [];
  const hits = [];
  for (const p of places) {
    const i = p.key.indexOf(q);
    if (i < 0) continue;
    const rank = p.key === q ? 0 : i === 0 ? 1 : p.key[i - 1] === ' ' ? 2 : 3;
    hits.push({ p, rank });
  }
  hits.sort((a, b) => a.rank - b.rank || (WEIGHT[b.p.k] || 0) - (WEIGHT[a.p.k] || 0) || (b.p.e || 0) - (a.p.e || 0) || a.p.n.length - b.p.n.length);
  return hits.slice(0, 12).map((h) => h.p);
}

const input = document.getElementById('q');
const list = document.getElementById('results');
let current = [], active = -1;

function render() {
  list.replaceChildren();
  if (!input.value.trim()) { list.hidden = true; return; }
  if (!current.length) {
    const li = list.appendChild(document.createElement('li'));
    li.className = 'empty'; li.textContent = 'No matching places';
  }
  current.forEach((p, i) => {
    const li = list.appendChild(document.createElement('li'));
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(i === active));
    const n = li.appendChild(document.createElement('span')); n.className = 'n'; n.textContent = p.n;
    const k = li.appendChild(document.createElement('span')); k.className = 'k';
    k.textContent = (KIND_LABEL[p.k] || '') + (p.e ? ` · ${p.e} m` : '');
    li.addEventListener('mousedown', (e) => { e.preventDefault(); choose(p); });
  });
  list.hidden = false;
}
function choose(p) {
  input.value = p.n;
  list.hidden = true;
  input.blur();
  map.flyTo({ center: p.c, zoom: Math.max(map.getZoom(), ZOOM_FOR[p.k] || 14), speed: 1.4 });
  map.once('moveend', () => showPopup(p.c, p));
}
input.addEventListener('input', () => { current = search(input.value); active = current.length ? 0 : -1; render(); });
input.addEventListener('focus', () => { if (input.value) render(); });
input.addEventListener('blur', () => { list.hidden = true; });
input.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!current.length) return;
    active = (active + (e.key === 'ArrowDown' ? 1 : -1) + current.length) % current.length;
    render();
  } else if (e.key === 'Enter' && current[active]) {
    choose(current[active]);
  } else if (e.key === 'Escape') {
    input.value = ''; list.hidden = true; input.blur();
  }
});
