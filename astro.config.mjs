import { defineConfig } from 'astro/config';

export default defineConfig({
  // Pages are generated at build time from the data in public/data.
  // The live address — used for canonical links and share previews.
  site: 'https://www.explorehighcountry.com',
  output: 'static',
  trailingSlash: 'ignore',
});
