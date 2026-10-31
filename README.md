# WolOS Docs

Source of the WolOS documentation site, built with [Astro Starlight](https://starlight.astro.build) and published at https://wonderlandos.github.io/docs/.

```sh
npm ci
npm run dev     # local preview
npm run build   # static site in dist/
```

Pages are Markdown in `src/content/docs/`; the sidebar is in `astro.config.mjs`. Pushes to `main` deploy through `.github/workflows/deploy.yml`.

License: GPL-2.0-or-later (`LICENSE`).
