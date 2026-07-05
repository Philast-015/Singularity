from flask import jsonify
from src.ytdl import search as ytdl_search


def handle_search(query: str):
    try:
        results = ytdl_search(query)
        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
