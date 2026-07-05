from flask import jsonify
from src.ytdl import get_info as ytdl_info


def handle_info(url: str):
    try:
        info = ytdl_info(url)
        return jsonify(info)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
