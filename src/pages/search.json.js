// Static search index for the header search box: one row per place page.
import { getPlaces, getCategory, whereText } from '../lib/places.js';

export function GET() {
  const rows = getPlaces().map((p) => ({ n: p.name, c: getCategory(p.category).one, u: p.url, w: whereText(p), e: p.ele }));
  return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
}
