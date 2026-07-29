#!/usr/bin/env python3

import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


DOCS_ROOT = Path(__file__).resolve().parents[1]


class CleanUrlHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DOCS_ROOT), **kwargs)

    def translate_path(self, path: str) -> str:
        translated = Path(super().translate_path(path))
        request_path = Path(urlsplit(path).path)
        if (
            request_path.suffix == ""
            and not translated.is_dir()
            and translated.with_suffix(".html").is_file()
        ):
            return str(translated.with_suffix(".html"))
        return str(translated)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "4173"))
    server = ThreadingHTTPServer(("127.0.0.1", port), CleanUrlHandler)
    print(f"Kolkhoz preview: http://127.0.0.1:{port}", flush=True)
    server.serve_forever()
