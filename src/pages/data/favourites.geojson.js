// Local favourites for the atlas: built from src/data/favourites.json (drafts excluded), with each page's URL.
import { getPlaces } from '../../lib/places.js';

export function GET() {
  const features = getPlaces().filter((p) => p.category === 'favourites').map((p) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: p.coords },
    properties: { n: p.name, k: 'favourite', town: p.town, blurb: p.blurb, tags: p.tags, url: p.url },
  }));
  return new Response(JSON.stringify({ type: 'FeatureCollection', features }), { headers: { 'Content-Type': 'application/geo+json' } });
}
