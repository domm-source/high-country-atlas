# High Country Atlas

A detailed, searchable topographic map of Victoria's High Country — peaks, huts, campsites, lookouts, 4WD tracks, walking tracks, rivers and parks — with relief shading, contour lines, optional 3D terrain and **live road & track closures**.

It's a static site (no build step): plain HTML/CSS/JS served as-is.

| File | What it does |
| --- | --- |
| `index.html` | Page layout: search box, options panel, library imports |
| `style.js` | The map style — colours for the **Atlas** and **Topo** themes, and every map layer |
| `app.js` | Map setup, icons, layer toggles, 3D terrain, popups and search |
| `app.css` | Look of the search box, panel and popups |
| `data/places.geojson` | ~3,200 named places from OpenStreetMap (used for search + peak/hut/camp symbols) |
| `data/pv_sites.geojson` | 355 Parks Victoria campgrounds & picnic areas, with facilities and directions |
| `data/pv_routes.geojson` | 211 official Parks Victoria walks, 4WD tours and rides |
| `scripts/build_places.py` | Re-downloads `places.geojson` from OpenStreetMap |
| `scripts/build_parks.py` | Re-downloads the Parks Victoria files (and removes OSM campsites they duplicate) |

## Run locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

## Refresh the place data

Run both, in this order (the second one removes OpenStreetMap campsites that duplicate Parks Victoria ones):

```bash
python3 scripts/build_places.py
python3 scripts/build_parks.py
```

Edit `BBOX` in both scripts to change the area covered.

## Data & credits

- Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, vector tiles by [OpenFreeMap](https://openfreemap.org) / [OpenMapTiles](https://openmaptiles.org)
- Parks Victoria campgrounds, picnic areas, walks and drives: [Vicmap / DataVic open data service](https://discover.data.vic.gov.au/) (layers `recweb_site`, `recweb_tracks`), © State of Victoria (DEECA), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Road & track closures: live from the [Vicmap / DataVic open data service](https://discover.data.vic.gov.au/) (layer `paim_vm_tr_road_closures`), © State of Victoria (DEECA), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Fetched in the browser on each visit; always confirm with Parks Victoria / DEECA before travelling.
- Terrain: [Mapzen / AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)
- Rendering: [MapLibre GL JS](https://maplibre.org), contours by [maplibre-contour](https://github.com/onthegomap/maplibre-contour)

Inspired by [Bay Atlas](https://bayatlas.vercel.app).
