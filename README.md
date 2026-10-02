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
| `src/lib/places.js` | Turns the map data into places: categories, URLs, nearest town, what's nearby |
| `src/components/` | Header search, embedded mini-map, live nearby closures |
| `src/layouts/Base.astro`, `src/styles/global.css` | Shared page frame and the rustic "goldfields" look |
| `public/map/` | The full atlas (plain HTML/JS), served at `/map/` |
| `public/data/` | Map data: `places.geojson` (OpenStreetMap), `pv_sites.geojson` and `pv_routes.geojson` (Parks Victoria) |
| `scripts/` | Python scripts that refresh `public/data/` |

The atlas also runs embedded: `/map/?embed&marker&theme=goldfields#zoom/lat/lng` (mini-maps on place pages) and `/map/?embed&fly&theme=goldfields#…` (the homepage background).

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:4321. `npm run build` writes the finished site to `dist/`.

## Refresh the data

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
- Fonts: Rye, Zilla Slab and Source Serif 4 from Google Fonts

Inspired by [Bay Atlas](https://bayatlas.vercel.app).
