// Map style builder. Two palettes ("atlas" and "topo") share one layer stack.
// Vector data: OpenFreeMap (OpenMapTiles schema). Terrain: AWS/Mapzen Terrarium tiles.

const THEMES = {
  atlas: {
    bg: '#f3efe4', wood: '#d5e0bb', scrub: '#e0e4c4', grass: '#ebe9cf', farm: '#f1ecd9',
    rock: '#e4ded2', ice: '#ffffff', wetland: '#dbe6d5', urban: '#eadfd0',
    water: '#a9cce3', waterLine: '#7fb0d3', waterLabel: '#3f6f98',
    park: '#b7d3a0', parkLine: '#5f8f4e', parkLabel: '#3f6b35',
    shadow: '#6e5a3c', highlight: '#fffbe8', accentShade: '#8a7350', reliefOpacity: 0.55,
    contour: '#b0875a', contourIndex: '#98703f', contourLabel: '#8a6238',
    casing: '#a79b87', motorway: '#c23b2f', primary: '#d2553f', secondary: '#e38b4e',
    tertiary: '#fff7e6', minor: '#ffffff', track: '#7a4a24', path: '#b3322a',
    boundary: '#9b7fa6', closed: '#d11f1f', text: '#2b2620', textMuted: '#5a5144', halo: '#f7f4ec',
    peak: '#5a3d24', hut: '#8c2f22', camp: '#2f6b3b', lookout: '#6a4a8a', picnic: '#3a6f86',
    walk: '#8e3aa8', drive: '#d9720b', ride: '#0e8a8a',
  },
  topo: {
    bg: '#fbfbf8', wood: '#d6e8c9', scrub: '#e2ecd4', grass: '#f0f3e4', farm: '#f7f7ef',
    rock: '#e7e5e1', ice: '#ffffff', wetland: '#d9e9e4', urban: '#e6e4e0',
    water: '#b8d8ee', waterLine: '#5e9fd0', waterLabel: '#2a6aa8',
    park: '#9cc38a', parkLine: '#4c8a45', parkLabel: '#356b31',
    shadow: '#4a5566', highlight: '#ffffff', accentShade: '#5f6e84', reliefOpacity: 0.7,
    contour: '#c2986a', contourIndex: '#a8784a', contourLabel: '#95683c',
    casing: '#8e8e8e', motorway: '#f0b43c', primary: '#f6cf62', secondary: '#fbe39a',
    tertiary: '#ffffff', minor: '#ffffff', track: '#6b5b4b', path: '#b0413e',
    boundary: '#a37cb5', closed: '#e0161b', text: '#1f2328', textMuted: '#4f5660', halo: '#ffffff',
    peak: '#3b3129', hut: '#b03a2e', camp: '#2f7a3b', lookout: '#7a4fa0', picnic: '#2f7394',
    walk: '#9b2fb5', drive: '#e27a00', ride: '#0f9494',
  },
  // Aged survey-map look: sepia paper, iron-oxide roads, faded ink.
  goldfields: {
    bg: '#efe2c4', wood: '#dcd3a6', scrub: '#e4dab4', grass: '#ebdfbf', farm: '#efe3c6',
    rock: '#e2d3b4', ice: '#f6efdf', wetland: '#dad5b3', urban: '#e3cfab',
    water: '#b4c4bb', waterLine: '#6a8c94', waterLabel: '#43616b',
    park: '#cbbf8b', parkLine: '#7d6b3a', parkLabel: '#5d4a25',
    shadow: '#5a3b1e', highlight: '#fff3d6', accentShade: '#7a5a32', reliefOpacity: 0.6,
    contour: '#a0703f', contourIndex: '#7f5225', contourLabel: '#7a4e24',
    casing: '#7a5a3a', motorway: '#8f2f17', primary: '#9c3d1b', secondary: '#b0592b',
    tertiary: '#f3e6c8', minor: '#f6ecd6', track: '#5c3a1c', path: '#9c3d1b',
    boundary: '#7b5a7e', closed: '#c21d12', text: '#2a1f16', textMuted: '#5a4632', halo: '#efe2c4',
    peak: '#3d2814', hut: '#8a2c14', camp: '#4f5d2f', lookout: '#6b4a74', picnic: '#4a6470',
    walk: '#7a2e5c', drive: '#b5651d', ride: '#2f6e6a',
  },
};

const FONT = { regular: ['Noto Sans Regular'], bold: ['Noto Sans Bold'], italic: ['Noto Sans Italic'] };
// One shared credit for all Vicmap / Parks Victoria data; MapLibre shows identical credits once.
const VICMAP_CREDIT = 'Vicmap &amp; Parks Victoria data <a href="https://discover.data.vic.gov.au/">© State of Victoria (DEECA), CC BY 4.0</a>';
const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

// Zoom-interpolated line width helper.
const w = (...stops) => ['interpolate', ['exponential', 1.5], ['zoom'], ...stops];
const cls = (...values) => ['match', ['get', 'class'], values, true, false];

function buildStyle(themeName, demSource, visible, closures) {
  const t = THEMES[themeName];
  const vis = (group) => (visible[group] === false ? 'none' : 'visible');
  const L = (group, layer) => ({ ...layer, metadata: { group }, layout: { ...(layer.layout || {}), visibility: vis(group) } });

  const roadLine = (id, filter, color, width, extra = {}) => ({
    id, type: 'line', source: 'omt', 'source-layer': 'transportation', filter,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': color, 'line-width': width, ...extra },
  });

  const peakLayer = (id, minzoom, minEle) => ({
    id, type: 'symbol', source: 'places', minzoom,
    filter: ['all', ['==', ['get', 'k'], 'peak'], ['>=', ['coalesce', ['get', 'e'], 0], minEle]],
    layout: {
      'icon-image': 'peak', 'symbol-sort-key': ['-', 0, ['coalesce', ['get', 'e'], 0]],
      'text-field': ['format', ['get', 'n'], {}, ['case', ['has', 'e'], ['concat', '\n', ['to-string', ['get', 'e']], ' m'], ''], { 'font-scale': 0.85 }],
      'text-font': FONT.bold, 'text-size': ['interpolate', ['linear'], ['coalesce', ['get', 'e'], 800], 800, 10.5, 1900, 12.5],
      'text-anchor': 'top', 'text-offset': [0, 0.7], 'text-max-width': 8, 'text-optional': true,
    },
    paint: { 'text-color': t.peak, 'text-halo-color': t.halo, 'text-halo-width': 1.5 },
  });

  return {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
      dem: { type: 'raster-dem', tiles: [demSource.sharedDemProtocolUrl], encoding: 'terrarium', tileSize: 256, maxzoom: 13,
             attribution: 'Terrain: <a href="https://registry.opendata.aws/terrain-tiles/">Mapzen/AWS Terrain Tiles</a>' },
      terrain: { type: 'raster-dem', tiles: [TERRARIUM], encoding: 'terrarium', tileSize: 256, maxzoom: 13 },
      contours: {
        type: 'vector', maxzoom: 15,
        tiles: [demSource.contourProtocolUrl({
          thresholds: { 9: [200, 1000], 11: [100, 500], 12: [50, 250], 13: [20, 100], 14: [10, 50] },
          elevationKey: 'ele', levelKey: 'level', contourLayer: 'contours', overzoom: 1,
        })],
      },
      places: { type: 'geojson', data: '/data/places.geojson' },
      pv_sites: { type: 'geojson', data: '/data/pv_sites.geojson', attribution: VICMAP_CREDIT },
      pv_routes: { type: 'geojson', data: '/data/pv_routes.geojson' },
      closures: { type: 'geojson', data: closures,
                  attribution: VICMAP_CREDIT },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': t.bg } },

      // Land cover
      L('landcover', { id: 'landuse-urban', type: 'fill', source: 'omt', 'source-layer': 'landuse',
        filter: cls('residential', 'commercial', 'industrial', 'retail'), paint: { 'fill-color': t.urban, 'fill-opacity': 0.8 } }),
      L('landcover', { id: 'landcover-farm', type: 'fill', source: 'omt', 'source-layer': 'landcover',
        filter: cls('farmland'), paint: { 'fill-color': t.farm } }),
      L('landcover', { id: 'landcover-grass', type: 'fill', source: 'omt', 'source-layer': 'landcover',
        filter: cls('grass'), paint: { 'fill-color': t.grass } }),
      L('landcover', { id: 'landcover-scrub', type: 'fill', source: 'omt', 'source-layer': 'landcover',
        filter: ['==', ['get', 'subclass'], 'scrub'], paint: { 'fill-color': t.scrub } }),
      L('landcover', { id: 'landcover-wood', type: 'fill', source: 'omt', 'source-layer': 'landcover',
        filter: cls('wood'), paint: { 'fill-color': t.wood } }),
      L('landcover', { id: 'landcover-wetland', type: 'fill', source: 'omt', 'source-layer': 'landcover',
        filter: cls('wetland'), paint: { 'fill-color': t.wetland } }),
      L('landcover', { id: 'landcover-rock', type: 'fill', source: 'omt', 'source-layer': 'landcover',
        filter: cls('rock', 'sand'), paint: { 'fill-color': t.rock } }),
      L('landcover', { id: 'landcover-ice', type: 'fill', source: 'omt', 'source-layer': 'landcover',
        filter: cls('ice'), paint: { 'fill-color': t.ice } }),

      // Parks (fill under relief so shading shows through)
      L('parks', { id: 'park-fill', type: 'fill', source: 'omt', 'source-layer': 'park',
        paint: { 'fill-color': t.park, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.35, 12, 0.18] } }),

      // Relief
      L('relief', { id: 'hillshade', type: 'hillshade', source: 'dem',
        paint: {
          'hillshade-shadow-color': t.shadow, 'hillshade-highlight-color': t.highlight,
          'hillshade-accent-color': t.accentShade, 'hillshade-exaggeration': t.reliefOpacity,
          'hillshade-illumination-direction': 315,
        } }),

      // Water
      { id: 'waterway-river', type: 'line', source: 'omt', 'source-layer': 'waterway', filter: cls('river'),
        layout: { 'line-cap': 'round' }, paint: { 'line-color': t.waterLine, 'line-width': w(8, 0.8, 12, 2, 15, 5) } },
      { id: 'waterway-stream', type: 'line', source: 'omt', 'source-layer': 'waterway', minzoom: 11, filter: cls('stream', 'canal', 'ditch'),
        layout: { 'line-cap': 'round' }, paint: { 'line-color': t.waterLine, 'line-width': w(11, 0.4, 15, 1.5), 'line-opacity': 0.8 } },
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': t.water } },

      // Contours
      L('contours', { id: 'contour', type: 'line', source: 'contours', 'source-layer': 'contours', minzoom: 9,
        filter: ['==', ['get', 'level'], 0],
        paint: { 'line-color': t.contour, 'line-width': 0.5, 'line-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.25, 13, 0.55] } }),
      L('contours', { id: 'contour-index', type: 'line', source: 'contours', 'source-layer': 'contours', minzoom: 9,
        filter: ['>', ['get', 'level'], 0],
        paint: { 'line-color': t.contourIndex, 'line-width': 1, 'line-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.4, 13, 0.75] } }),
      L('contours', { id: 'contour-label', type: 'symbol', source: 'contours', 'source-layer': 'contours', minzoom: 11,
        filter: ['>', ['get', 'level'], 0],
        layout: { 'symbol-placement': 'line', 'text-field': ['concat', ['number-format', ['get', 'ele'], {}], ' m'],
                  'text-font': FONT.regular, 'text-size': 10, 'symbol-spacing': 400, 'text-max-angle': 25 },
        paint: { 'text-color': t.contourLabel, 'text-halo-color': t.halo, 'text-halo-width': 1.5 } }),

      // Park outline + boundaries
      L('parks', { id: 'park-outline', type: 'line', source: 'omt', 'source-layer': 'park',
        paint: { 'line-color': t.parkLine, 'line-width': w(7, 0.6, 12, 1.6), 'line-opacity': 0.55, 'line-dasharray': [3, 1.5] } }),
      { id: 'boundary-state', type: 'line', source: 'omt', 'source-layer': 'boundary',
        filter: ['all', ['<=', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]],
        paint: { 'line-color': t.boundary, 'line-width': w(5, 1, 12, 3), 'line-dasharray': [4, 2, 1, 2], 'line-opacity': 0.7 } },

      // Tracks & paths (important in the High Country)
      // Official Parks Victoria walks, drives and rides: a soft coloured band under the track itself.
      L('pv', { id: 'pv-route', type: 'line', source: 'pv_routes', minzoom: 9,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['match', ['get', 'k'], 'drive', t.drive, 'ride', t.ride, t.walk],
                 'line-width': w(9, 2.5, 16, 12), 'line-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.55, 14, 0.35] } }),
      L('pv', { id: 'pv-route-hit', type: 'line', source: 'pv_routes', minzoom: 9, paint: { 'line-color': '#000', 'line-width': 14, 'line-opacity': 0 } }),
      { ...roadLine('path', cls('path'), t.path, w(11, 0.9, 16, 2.4), { 'line-dasharray': [2, 1.4] }), minzoom: 11 },
      { ...roadLine('track-casing', cls('track'), t.halo, w(10, 1.6, 16, 5)), minzoom: 10 },
      { ...roadLine('track', cls('track'), t.track, w(10, 0.9, 16, 2.6), { 'line-dasharray': [3, 1.2] }), minzoom: 10 },

      // Roads: casings then fills
      roadLine('road-minor-casing', cls('minor', 'service'), t.casing, w(11, 1, 16, 9)),
      roadLine('road-tertiary-casing', cls('tertiary'), t.casing, w(9, 1.2, 16, 12)),
      roadLine('road-minor', cls('minor', 'service'), t.minor, w(11, 0.5, 16, 7)),
      roadLine('road-tertiary', cls('tertiary'), t.tertiary, w(9, 0.6, 16, 10)),
      roadLine('road-secondary', cls('secondary'), t.secondary, w(7, 0.8, 16, 12)),
      roadLine('road-primary', cls('primary'), t.primary, w(6, 1, 16, 13)),
      roadLine('road-motorway', cls('motorway', 'trunk'), t.motorway, w(5, 1.2, 16, 14)),

      // Live road & track closures (Vicmap). The hit layer is a wide invisible line for easier tapping.
      L('closures', { id: 'closure-casing', type: 'line', source: 'closures', layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': t.halo, 'line-width': w(8, 3, 16, 10), 'line-opacity': 0.9 } }),
      L('closures', { id: 'closure-line', type: 'line', source: 'closures', layout: { 'line-join': 'round' },
        paint: { 'line-color': t.closed, 'line-width': w(8, 1.6, 16, 5), 'line-dasharray': [1.2, 0.8] } }),
      L('closures', { id: 'closure-hit', type: 'line', source: 'closures', paint: { 'line-color': '#000', 'line-width': 16, 'line-opacity': 0 } }),

      { id: 'building', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 14,
        paint: { 'fill-color': t.urban, 'fill-outline-color': t.casing } },

      // Labels
      { id: 'waterway-label', type: 'symbol', source: 'omt', 'source-layer': 'waterway', minzoom: 10, filter: cls('river', 'stream'),
        layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': FONT.italic,
                  'text-size': ['match', ['get', 'class'], 'river', 12, 10.5], 'text-letter-spacing': 0.05, 'symbol-spacing': 350 },
        paint: { 'text-color': t.waterLabel, 'text-halo-color': t.halo, 'text-halo-width': 1.2 } },
      { id: 'water-label', type: 'symbol', source: 'omt', 'source-layer': 'water_name',
        layout: { 'text-field': ['get', 'name'], 'text-font': FONT.italic, 'text-size': 12, 'text-letter-spacing': 0.08, 'text-max-width': 7 },
        paint: { 'text-color': t.waterLabel, 'text-halo-color': t.halo, 'text-halo-width': 1.2 } },
      L('parks', { id: 'park-label', type: 'symbol', source: 'omt', 'source-layer': 'park', minzoom: 8,
        filter: ['has', 'name'],
        layout: { 'text-field': ['get', 'name'], 'text-font': FONT.italic, 'text-size': w(8, 11, 12, 13),
                  'text-max-width': 8, 'text-letter-spacing': 0.04, 'text-padding': 20 },
        paint: { 'text-color': t.parkLabel, 'text-halo-color': t.halo, 'text-halo-width': 1.4 } }),
      { id: 'road-label', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 11,
        filter: cls('motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'track', 'path'),
        layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': FONT.regular, 'text-size': 10.5, 'symbol-spacing': 300 },
        paint: { 'text-color': ['match', ['get', 'class'], 'path', t.path, 'track', t.track, t.textMuted], 'text-halo-color': t.halo, 'text-halo-width': 1.5 } },
      { id: 'road-ref', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 7,
        filter: ['all', ['has', 'ref'], cls('motorway', 'trunk', 'primary', 'secondary')],
        layout: { 'symbol-placement': 'line', 'text-field': ['get', 'ref'], 'text-font': FONT.bold, 'text-size': 10,
                  'text-rotation-alignment': 'viewport', 'symbol-spacing': 500 },
        paint: { 'text-color': '#ffffff', 'text-halo-color': t.motorway, 'text-halo-width': 3 } },

      L('closures', { id: 'closure-label', type: 'symbol', source: 'closures', minzoom: 12,
        layout: { 'symbol-placement': 'line', 'text-field': 'CLOSED', 'text-font': FONT.bold, 'text-size': 10,
                  'text-letter-spacing': 0.1, 'symbol-spacing': 250 },
        paint: { 'text-color': t.closed, 'text-halo-color': t.halo, 'text-halo-width': 2 } }),

      // Outdoor points from our own OSM extract (data/places.geojson)
      L('outdoor', { id: 'poi-outdoor', type: 'symbol', source: 'places', minzoom: 10,
        filter: ['match', ['get', 'k'], ['hut', 'campsite', 'lookout', 'cave', 'attraction'], true, false],
        layout: {
          'icon-image': ['get', 'k'], 'icon-size': 1, 'icon-allow-overlap': false,
          'text-field': ['step', ['zoom'], '', 12, ['get', 'n']], 'text-font': FONT.regular, 'text-size': 11,
          'text-anchor': 'top', 'text-offset': [0, 0.8], 'text-max-width': 8, 'text-optional': true,
          'symbol-sort-key': ['match', ['get', 'k'], 'hut', 0, 'lookout', 1, 'campsite', 2, 3],
        },
        paint: { 'text-color': ['match', ['get', 'k'], 'hut', t.hut, 'campsite', t.camp, 'lookout', t.lookout, t.textMuted],
                 'text-halo-color': t.halo, 'text-halo-width': 1.4 } }),
      L('pv', { id: 'pv-route-label', type: 'symbol', source: 'pv_routes', minzoom: 12,
        layout: { 'symbol-placement': 'line', 'text-field': ['get', 'n'], 'text-font': FONT.bold, 'text-size': 10.5, 'symbol-spacing': 400 },
        paint: { 'text-color': ['match', ['get', 'k'], 'drive', t.drive, 'ride', t.ride, t.walk], 'text-halo-color': t.halo, 'text-halo-width': 1.6 } }),
      L('pv', { id: 'pv-site', type: 'symbol', source: 'pv_sites', minzoom: 9.5,
        layout: {
          'icon-image': ['match', ['get', 'k'], 'pvcamp', 'campsite', 'pvpicnic', 'picnic', 'attraction'],
          'text-field': ['step', ['zoom'], '', 11.5, ['get', 'n']], 'text-font': FONT.regular, 'text-size': 11,
          'text-anchor': 'top', 'text-offset': [0, 0.8], 'text-max-width': 8, 'text-optional': true,
          'symbol-sort-key': ['match', ['get', 'k'], 'pvcamp', 0, 1],
        },
        paint: { 'text-color': ['match', ['get', 'k'], 'pvcamp', t.camp, t.picnic], 'text-halo-color': t.halo, 'text-halo-width': 1.4 } }),
      { id: 'saddle', type: 'symbol', source: 'places', minzoom: 12, filter: ['==', ['get', 'k'], 'saddle'],
        layout: { 'text-field': ['get', 'n'], 'text-font': FONT.italic, 'text-size': 10.5, 'text-max-width': 7 },
        paint: { 'text-color': t.peak, 'text-halo-color': t.halo, 'text-halo-width': 1.4 } },
      // Peaks in tiers so the map isn't cluttered at low zoom.
      ...[['peak-all', 11.5, 0], ['peak-mid', 9.5, 1200]].map(([id, minzoom, minEle]) => peakLayer(id, minzoom, minEle)),


      { id: 'place-minor', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 10,
        filter: cls('hamlet', 'isolated_dwelling', 'locality', 'neighbourhood', 'suburb'),
        layout: { 'text-field': ['get', 'name'], 'text-font': FONT.regular, 'text-size': 11, 'text-max-width': 8 },
        paint: { 'text-color': t.textMuted, 'text-halo-color': t.halo, 'text-halo-width': 1.5 } },
      { id: 'place-village', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 8, filter: cls('village'),
        layout: { 'text-field': ['get', 'name'], 'text-font': FONT.bold, 'text-size': w(8, 11, 13, 14), 'text-max-width': 8 },
        paint: { 'text-color': t.text, 'text-halo-color': t.halo, 'text-halo-width': 1.6 } },
      { id: 'place-town', type: 'symbol', source: 'omt', 'source-layer': 'place', filter: cls('town', 'city'),
        layout: { 'text-field': ['get', 'name'], 'text-font': FONT.bold, 'text-size': w(6, 12, 13, 18),
                  'text-transform': ['step', ['zoom'], 'none', 11, 'uppercase'], 'text-letter-spacing': 0.03, 'text-max-width': 8 },
        paint: { 'text-color': t.text, 'text-halo-color': t.halo, 'text-halo-width': 2 } },
      // Major peaks last so they win label collisions, even against towns.
      peakLayer('peak-major', 7.5, 1600),
    ],
  };
}
