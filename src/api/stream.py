import requests
from flask import Response


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.youtube.com/",
    "Origin": "https://www.youtube.com",
}


def handle_stream(url: str):
    def proxy():
        with requests.get(url, headers=HEADERS, stream=True) as resp:
            resp.raise_for_status()
            for chunk in resp.iter_content(chunk_size=65536):
                if chunk:
                    yield chunk

    return Response(proxy(), content_type="video/mp4")
