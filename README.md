# Kolkhoz website

This repository contains the public website for [Kolkhoz](https://kolkhoz.online),
including the expanded rules and how-to-play walkthrough.

The site is intentionally static. GitHub Pages deploys the contents of this repository
whenever `main` changes.

## Preview locally

```bash
python3 tool/serve_preview.py
```

Then open <http://127.0.0.1:4173>.

## Regenerate rule card images

The exact card frames, suit art, face art, layout data, and font needed by the website
are vendored in `tool/card-source/`. To rebuild the optimized WebP examples:

```bash
node tool/render_rule_cards.mjs
```

This command requires ImageMagick, Python, Pillow, and fontTools.

## Deployment

`.github/workflows/pages.yml` publishes the static site to GitHub Pages. The custom
domain is declared in `CNAME`; DNS is managed separately at Namecheap.
