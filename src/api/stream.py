import requests
from flask import Response, request


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.youtube.com/",
    "Origin": "https://www.youtube.com",
}


def handle_stream(url: str):
    req_headers = dict(HEADERS)
    resp_headers = {}
    status = 200

    range_header = request.headers.get("Range")
    if range_header:
        req_headers["Range"] = range_header

    resp = requests.get(url, headers=req_headers, stream=True)

    status = resp.status_code
    for key in ("Content-Range", "Content-Length", "Accept-Ranges"):
        val = resp.headers.get(key)
        if val:
            resp_headers[key] = val

    def proxy():
        with resp:
            resp.raise_for_status()
            for chunk in resp.iter_content(chunk_size=65536):
                if chunk:
                    yield chunk

    return Response(
        proxy(),
        status=status,
        content_type=resp.headers.get("Content-Type", "video/mp4"),
        headers=resp_headers,
    )
