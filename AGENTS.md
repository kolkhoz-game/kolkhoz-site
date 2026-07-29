# Repository guidance

This repository owns the public static website at `kolkhoz.online`.

- Keep public HTML at the repository root.
- Keep shared browser assets in `assets/`.
- Keep local development and asset-generation scripts in `tool/`.
- Do not add Flutter, game-engine, server, account, lobby, or research code here.
- Treat the Kolkhoz app and C engine as the source of truth for gameplay rules.
- Run `python3 tool/serve_preview.py` for local review.
- Verify all internal links and referenced assets before publishing.
- Changes pushed to `main` deploy through `.github/workflows/pages.yml`.
