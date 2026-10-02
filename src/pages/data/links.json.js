// Lookup from atlas features to their website pages: { "<kind>|<name>": [[lng, lat, url], …] }.
// Map features carry only a kind and name, and names repeat, so the atlas picks the entry nearest the click.
import { getPlaces } from '../../lib/places.js';

export function GET() {
  const links = {};
  for (const p of getPlaces()) {
    const key = `${p.kind}|${p.name}`;
    (links[key] ??= []).push([+p.coords[0].toFixed(5), +p.coords[1].toFixed(5), p.url]);
  }
  return new Response(JSON.stringify(links), { headers: { 'Content-Type': 'application/json' } });
}
