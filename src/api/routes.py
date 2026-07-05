import json
import os

from flask import Blueprint, jsonify, request

from .info import handle_info
from .search import handle_search
from .stream import handle_stream
from src.tags import extract_tags_from_video, get_recommendations, load_tags, save_tags
from src.ytdl import fetch_radio

api_bp = Blueprint("api", __name__)

DATA_DIR = os.path.join(os.path.expanduser("~"), ".singularity")


def _data_path(name):
    return os.path.join(DATA_DIR, f"{name}.json")


@api_bp.route("/api/search")
def search():
    q = request.args.get("q", "")
    if not q:
        return jsonify({"error": "missing query"}), 400
    return handle_search(q)


@api_bp.route("/api/info")
def info():
    url = request.args.get("url", "")
    if not url:
        return jsonify({"error": "missing url"}), 400
    return handle_info(url)


@api_bp.route("/api/stream")
def stream():
    url = request.args.get("url", "")
    if not url:
        return jsonify({"error": "missing url"}), 400
    return handle_stream(url)


@api_bp.route("/api/settings", methods=["GET", "POST"])
def settings():
    path = _data_path("ui-settings")
    if request.method == "POST":
        data = request.get_json(force=True)
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
        return jsonify(data)
    try:
        with open(path) as f:
            return jsonify(json.load(f))
    except (FileNotFoundError, json.JSONDecodeError):
        return jsonify({})


@api_bp.route("/api/recommend")
def recommend():
    results = get_recommendations()
    return jsonify({"results": results})


@api_bp.route("/api/radio")
def radio():
    q = request.args.get("q", "")
    if not q:
        return jsonify({"error": "missing query"}), 400
    results = fetch_radio(q)
    return jsonify({"results": results})


@api_bp.route("/api/extract-tags", methods=["POST"])
def extract_tags():
    data = request.get_json(force=True)
    video_id = data.get("videoId", "")
    if not video_id:
        return jsonify({"error": "missing videoId"}), 400
    tags = extract_tags_from_video(video_id)
    return jsonify({"tags": tags})


@api_bp.route("/api/tags", methods=["GET", "POST"])
def tags():
    if request.method == "POST":
        data = request.get_json(force=True)
        new_tags = data.get("tags", [])
        existing = load_tags()
        all_tags = existing + new_tags
        save_tags(all_tags)
        return jsonify({"tags": all_tags})
    return jsonify({"tags": load_tags()})


@api_bp.route("/api/data/<name>", methods=["GET", "POST"])
def user_data(name):
    path = _data_path(name)
    if request.method == "POST":
        data = request.get_json(force=True)
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
        return jsonify(data)
    try:
        with open(path) as f:
            return jsonify(json.load(f))
    except (FileNotFoundError, json.JSONDecodeError):
        default = (
            [] if name in ("history", "watch-history", "bookmarks", "likes", "playlists") else {}
        )
        return jsonify(default)
