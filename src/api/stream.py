import requests
from flask import Response


def handle_stream(url: str):
    def proxy():
        with requests.get(url, stream=True) as resp:
            resp.raise_for_status()
            for chunk in resp.iter_content(chunk_size=65536):
                if chunk:
                    yield chunk

    return Response(proxy(), content_type="video/mp4")
