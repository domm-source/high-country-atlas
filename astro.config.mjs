import { defineConfig } from 'astro/config';

export default defineConfig({
  // Pages are generated at build time from the data in public/data.
  output: 'static',
  trailingSlash: 'ignore',
});
