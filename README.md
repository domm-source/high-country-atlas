# High Country Atlas

A detailed, searchable topographic map of Victoria's High Country — peaks, huts, campsites, lookouts, 4WD tracks, walking tracks, rivers and parks — with relief shading, contour lines and optional 3D terrain.

It's a static site (no build step): plain HTML/CSS/JS served as-is.

| File | What it does |
| --- | --- |
| `index.html` | Page layout: search box, options panel, library imports |
| `style.js` | The map style — colours for the **Atlas** and **Topo** themes, and every map layer |
| `app.js` | Map setup, icons, layer toggles, 3D terrain, popups and search |
| `app.css` | Look of the search box, panel and popups |
| `data/places.geojson` | ~3,400 named places from OpenStreetMap (used for search + peak/hut/camp symbols) |
| `scripts/build_places.py` | Re-downloads `places.geojson` from OpenStreetMap |

## Run locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

## Refresh the place data

```bash
python3 scripts/build_places.py
```

Edit `BBOX` in that script to change the area covered.

## Data & credits

- Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, vector tiles by [OpenFreeMap](https://openfreemap.org) / [OpenMapTiles](https://openmaptiles.org)
- Terrain: [Mapzen / AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)
- Rendering: [MapLibre GL JS](https://maplibre.org), contours by [maplibre-contour](https://github.com/onthegomap/maplibre-contour)

Inspired by [Bay Atlas](https://bayatlas.vercel.app).
