// sitemap.xml for search engines: the homepage, atlas, every listing page and every place page.
import { CATEGORIES, getPlaces } from '../lib/places.js';

export function GET({ site }) {
  const urls = ['/', '/map/', ...CATEGORIES.map((c) => `/${c.id}/`), ...getPlaces().map((p) => p.url)];
  const priority = (u) => (u === '/' ? '1.0' : u === '/map/' || u.split('/').length === 3 ? '0.8' : u.startsWith('/favourites/') ? '0.7' : '0.5');
  const body = urls.map((u) => `  <url><loc>${new URL(u, site)}</loc><priority>${priority(u)}</priority></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml' } });
}
