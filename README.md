# High Country

A website for exploring Victoria's High Country: a detailed topographic atlas, plus a page for every hut, campground, walk, drive, peak, lookout, lake, attraction and town on it, with live road & track closures.

Built with [Astro](https://astro.build) as a static site. Every place page is generated at build time from the same data the atlas uses.

## Structure

| Path | What it is |
| --- | --- |
| `src/pages/index.astro` | Homepage: drifting 3D map hero, live conditions, hut of the week, categories |
| `src/pages/[category]/index.astro` | Listing pages (`/huts/`, `/walks/`, `/peaks/`…) |
| `src/pages/[category]/[slug].astro` | One page per place (`/huts/federation-hut/`…) |
| `src/pages/search.json.js` | Search index for the header search box |
| `src/lib/places.js` | Turns the map data and favourites into places: categories, URLs, nearest town, what's nearby |
| `src/data/favourites.json` | Hand-picked local favourites (edit this to add your own) |
| `src/pages/data/favourites.geojson.js` | Favourites for the atlas, built from the JSON above |
| `src/components/` | Header search, embedded mini-map, live nearby closures |
| `src/layouts/Base.astro`, `src/styles/global.css` | Shared page frame and the bold look (Bricolage Grotesque + Archivo, ink outlines, colour blocks) |
| `public/map/` | The full atlas (plain HTML/JS), served at `/map/`, with map-label fonts in `public/map/fonts/` (Archivo and Bricolage Grotesque, OFL) |
| `public/data/` | Map data: `places.geojson` (OpenStreetMap), `pv_sites.geojson` and `pv_routes.geojson` (Parks Victoria) |
| `scripts/` | Python scripts that refresh `public/data/` |

The atlas also runs embedded: `/map/?embed&marker&theme=topo#zoom/lat/lng` (mini-maps on place pages) and `/map/?embed&fly&theme=topo#…` (the homepage background).

## Local favourites

Hand-picked favourites live in `src/data/favourites.json`. Each entry becomes a page at `/favourites/<slug>/`, a pink heart on the atlas and a card on the homepage. Add `"draft": true` to hide one, and `"approx": true` when its pin is only roughly placed (the page says so). Coordinates are `[longitude, latitude]` — right-click a spot in Google Maps to copy them (they come out latitude first, so swap them).

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:4321. `npm run build` writes the finished site to `dist/`.

## Automatic weekly refresh

A GitHub Action (`.github/workflows/refresh-data.yml`) runs every Monday night (11:00 UTC). It re-downloads the OpenStreetMap places and Parks Victoria sites and routes, then commits them only if they changed, nothing important went missing (`scripts/check_data.py` rejects any file that lost more than 20% of its features), and the site still builds. That commit makes Vercel publish the update. If a download fails, last week's data is kept and the job tries again next week.

To run it straight away: GitHub → **Actions** → **Weekly data refresh** → **Run workflow**.

Road & track closures don't need this — they're fetched live from Vicmap in the browser on every visit.

## Refresh the data by hand

Run both, in this order (the second removes OpenStreetMap campsites that duplicate Parks Victoria ones), then rebuild:

```bash
python3 scripts/build_places.py
python3 scripts/build_parks.py
```

Edit `BBOX` in both scripts to change the area covered.

## Data & credits

- Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL), vector tiles by [OpenFreeMap](https://openfreemap.org) / [OpenMapTiles](https://openmaptiles.org)
- Parks Victoria campgrounds, picnic areas, walks and drives (`recweb_site`, `recweb_tracks`) and live road & track closures (`paim_vm_tr_road_closures`): [Vicmap / DataVic open data service](https://discover.data.vic.gov.au/), © State of Victoria (DEECA), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Closures are fetched in the browser on each visit; always confirm with Parks Victoria / DEECA before travelling.
- Terrain: [Mapzen / AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)
- Rendering: [MapLibre GL JS](https://maplibre.org), contours by [maplibre-contour](https://github.com/onthegomap/maplibre-contour)
- Fonts: Bricolage Grotesque and Archivo from Google Fonts

Inspired by [Bay Atlas](https://bayatlas.vercel.app).
