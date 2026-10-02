// Builds the list of places that get their own page, from the same GeoJSON the atlas uses.
// Runs at build time only (Node), so it can read public/data straight off disk.
import fs from 'node:fs';
import path from 'node:path';

// Builds run from the project root (locally and on Vercel), so resolve data from there, not from the bundled file.
const read = (file) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/data', file), 'utf8')).features;

// URL segment → labels, and which source kinds belong to it. Order = order shown on the homepage.
export const CATEGORIES = [
  { id: 'huts', one: 'Hut', many: 'Huts', blurb: 'Cattlemen’s, forestry and club huts scattered across the high plains.', osm: ['hut'] },
  { id: 'campgrounds', one: 'Campground', many: 'Campgrounds', blurb: 'From riverside flats to remote bush camps.', osm: ['campsite'], pv: ['pvcamp'] },
  { id: 'walks', one: 'Walk', many: 'Walks', blurb: 'Official Parks Victoria walks, from short strolls to multi-day treks.', routes: ['walk'] },
  { id: 'drives', one: 'Drive', many: '4WD & drives', blurb: 'Touring routes and 4WD tracks across the ranges.', routes: ['drive'] },
  { id: 'rides', one: 'Ride', many: 'Rides', blurb: 'Mountain bike, trail bike and horse riding routes.', routes: ['ride'] },
  { id: 'peaks', one: 'Peak', many: 'Peaks', blurb: 'Summits, knobs and ranges — Victoria’s highest country.', osm: ['peak'] },
  { id: 'lookouts', one: 'Lookout', many: 'Lookouts', blurb: 'Viewpoints over the valleys and main range.', osm: ['lookout'] },
  { id: 'picnic-areas', one: 'Picnic area', many: 'Picnic areas', blurb: 'Day-use spots for a billy and a break.', pv: ['pvpicnic'] },
  { id: 'attractions', one: 'Attraction', many: 'Attractions', blurb: 'Caves, relics and other points of interest.', osm: ['attraction', 'cave'], pv: ['pvsite'] },
  { id: 'lakes', one: 'Lake', many: 'Lakes', blurb: 'Reservoirs, tarns and alpine lakes.', osm: ['lake'] },
  { id: 'towns', one: 'Town', many: 'Towns', blurb: 'Gold-rush towns, valley villages and alpine resorts.', osm: ['city', 'town', 'village', 'resort'] },
];
const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const categoryFor = (source, kind) => CATEGORIES.find((c) => (c[source] || []).includes(kind));

export const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'place';

// Distance (km) and compass direction between [lng, lat] points.
function distanceKm([lng1, lat1], [lng2, lat2]) {
  const r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}
function compass([lng1, lat1], [lng2, lat2]) {
  const r = Math.PI / 180, y = Math.sin((lng2 - lng1) * r) * Math.cos(lat2 * r);
  const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lng2 - lng1) * r);
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((Math.atan2(y, x) / r + 360) % 360) / 45) % 8];
}
export const fmtKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`);

function load() {
  const places = [];
  for (const f of read('places.geojson')) {
    const cat = categoryFor('osm', f.properties.k);
    if (cat) places.push({ name: f.properties.n, kind: f.properties.k, category: cat.id, coords: f.geometry.coordinates, ele: f.properties.e, source: 'osm' });
  }
  for (const f of read('pv_sites.geojson')) {
    const p = f.properties, cat = categoryFor('pv', p.k);
    if (cat) places.push({ name: p.n, kind: p.k, category: cat.id, coords: f.geometry.coordinates, source: 'pv',
      facilities: p.f || [], description: p.d, access: p.a, closure: p.cl });
  }
  for (const f of read('pv_routes.geojson')) {
    const p = f.properties, cat = categoryFor('routes', p.k);
    if (cat) places.push({ name: p.n, kind: p.k, category: cat.id, coords: f.geometry.coordinates[0][0], bbox: p.b, source: 'pv',
      grades: p.g || [], experience: p.x, track: p.t, description: p.d, access: p.a, closure: p.cl });
  }

  // Towns (not localities) anchor the "12 km SE of Bright" descriptions.
  const towns = places.filter((p) => ['city', 'town', 'village'].includes(p.kind));
  for (const p of places) {
    let best = null;
    for (const t of towns) {
      if (t === p) continue;
      const km = distanceKm(p.coords, t.coords);
      if (!best || km < best.km) best = { name: t.name, km, dir: compass(t.coords, p.coords), town: t };
    }
    p.nearestTown = best;
  }

  // Unique slugs within each category: name, then name + nearest town, then a number.
  const used = new Set();
  for (const p of places.sort((a, b) => a.name.localeCompare(b.name))) {
    let slug = slugify(p.name);
    if (used.has(`${p.category}/${slug}`) && p.nearestTown) slug = `${slug}-${slugify(p.nearestTown.name)}`;
    for (let i = 2; used.has(`${p.category}/${slug}`); i++) slug = `${slugify(p.name)}-${i}`;
    used.add(`${p.category}/${slug}`);
    p.slug = slug;
    p.url = `/${p.category}/${slug}/`;
  }
  for (const p of places) if (p.nearestTown) p.nearestTown.url = p.nearestTown.town.url;

  // What's nearby: the closest few places within 10 km, skipping minor peaks so huts and camps aren't crowded out.
  const notable = places.filter((p) => p.category !== 'peaks' || (p.ele || 0) >= 1300);
  for (const p of places) {
    p.nearby = notable
      .filter((q) => q !== p)
      .map((q) => ({ q, km: distanceKm(p.coords, q.coords) }))
      .filter(({ km }) => km <= 10)
      .sort((a, b) => a.km - b.km)
      .slice(0, 8)
      .map(({ q, km }) => ({ name: q.name, url: q.url, category: CATEGORY_BY_ID[q.category].one, km, dir: compass(p.coords, q.coords) }));
  }
  return places;
}

let cache;
export const getPlaces = () => (cache ??= load());
export const getCategory = (id) => CATEGORY_BY_ID[id];

// One-line description used in page subtitles and listings, e.g. "7.2 km SE of Harrietville".
export const whereText = (p) => (p.nearestTown && p.nearestTown.km >= 0.5
  ? `${fmtKm(p.nearestTown.km)} ${p.nearestTown.dir} of ${p.nearestTown.name}`
  : p.nearestTown ? `in ${p.nearestTown.name}` : 'Victorian High Country');
