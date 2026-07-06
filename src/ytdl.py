import json
import os
import time

_YTDL_ENABLED = True

if _YTDL_ENABLED:
    import yt_dlp

_cache = {}
_CACHE_TTL = 300  # 5 minutes
_RECENT_FILE = os.path.expanduser("~/.singularity/recent_searches.json")
_RECENT_MAX = 5
_recent_mtime = 0


def _load_recent():
    global _recent_mtime
    try:
        mtime = os.path.getmtime(_RECENT_FILE)
        if mtime == _recent_mtime:
            return None  # not changed
        _recent_mtime = mtime
        with open(_RECENT_FILE) as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (FileNotFoundError, json.JSONDecodeError):
        _recent_mtime = 0
        return []


def _save_recent(queries):
    global _recent_mtime
    os.makedirs(os.path.dirname(_RECENT_FILE), exist_ok=True)
    with open(_RECENT_FILE, "w") as f:
        json.dump(queries, f, indent=2)
    _recent_mtime = os.path.getmtime(_RECENT_FILE)


def _touch_recent(query):
    queries = _load_recent()
    if queries is None:
        try:
            with open(_RECENT_FILE) as f:
                queries = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            queries = []
    if not isinstance(queries, list):
        queries = []
    if query in queries:
        queries.remove(query)
    queries.insert(0, query)
    _save_recent(queries[:_RECENT_MAX])


def _get_cached(key, ttl=_CACHE_TTL):
    entry = _cache.get(key)
    if entry and time.time() - entry["time"] < ttl:
        return entry["data"]
    return None


def _set_cache(key, data):
    _cache[key] = {"data": data, "time": time.time()}


def search(query: str, limit: int = 50):
    if not _YTDL_ENABLED:
        return []

    cache_key = f"search:{query}:{limit}"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": "in_playlist",
        "skip_download": True,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        result = ydl.extract_info(f"ytsearch{limit}:{query}", download=False)

    videos = []
    for entry in result.get("entries") or []:
        if not entry.get("id"):
            continue
        video_id = entry["id"]
        videos.append(
            {
                "id": video_id,
                "title": entry.get("title"),
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "thumbnail": f"https://i.ytimg.com/vi/{video_id}/mqdefault.jpg",
                "duration": format_duration(entry.get("duration")),
                "duration_sec": entry.get("duration"),
                "channel": entry.get("channel") or entry.get("uploader"),
                "views": entry.get("view_count"),
            }
        )

    _set_cache(cache_key, videos)
    _touch_recent(query)
    return videos


def get_info(url: str):
    if not _YTDL_ENABLED:
        return {"video_formats": [], "audio_formats": [], "best_audio_url": None}

    cache_key = f"info:{url}"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": False,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        data = ydl.extract_info(url, download=False)

    video_formats = []
    audio_formats = []
    for f in data.get("formats") or []:
        if not f.get("url"):
            continue
        fmt = {
            "format_id": f["format_id"],
            "ext": f.get("ext"),
            "resolution": f.get("resolution") or f.get("format_note") or "",
            "filesize": f.get("filesize"),
            "url": f["url"],
            "vcodec": f.get("vcodec", "none"),
            "acodec": f.get("acodec", "none"),
            "has_video": f.get("vcodec") and f["vcodec"] != "none",
            "has_audio": f.get("acodec") and f["acodec"] != "none",
            "tbr": f.get("tbr") or f.get("vbr", 0) or 0,
            "abr": f.get("abr", 0) or 0,
            "height": f.get("height", 0) or 0,
        }
        if fmt["has_video"] and not fmt["has_audio"]:
            video_formats.append(fmt)
        elif fmt["has_audio"] and not fmt["has_video"]:
            audio_formats.append(fmt)
        elif fmt["has_video"] and fmt["has_audio"]:
            video_formats.append(fmt)

    video_formats.sort(key=lambda x: x["height"] or 0, reverse=True)
    audio_formats.sort(key=lambda x: x.get("abr") or 0, reverse=True)
    best_audio = audio_formats[0] if audio_formats else None

    info = {
        "title": data.get("fulltitle") or data.get("title"),
        "thumbnail": data.get("thumbnail")
        or f"https://i.ytimg.com/vi/{data.get('id')}/maxresdefault.jpg",
        "duration": format_duration(data.get("duration")),
        "duration_sec": data.get("duration"),
        "channel": data.get("channel") or data.get("uploader"),
        "views": data.get("view_count"),
        "description": data.get("description"),
        "video_formats": video_formats,
        "audio_formats": audio_formats,
        "best_audio_url": best_audio["url"] if best_audio else None,
    }

    _set_cache(cache_key, info)
    return info


def fetch_radio(seed_query: str, limit: int = 30):
    if not _YTDL_ENABLED:
        return []

    cache_key = f"radio:{seed_query}:{limit}"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True,
        "skip_download": True,
    }
    try:
        result = search(seed_query, limit=1)
        if not result:
            return []
        video_id = result[0]["id"]
        radio_url = f"https://www.youtube.com/watch?v={video_id}&list=RDMM{video_id}"
        with yt_dlp.YoutubeDL(opts) as ydl:
            data = ydl.extract_info(radio_url, download=False)
        entries = []
        for entry in data.get("entries") or []:
            if not entry.get("id"):
                continue
            eid = entry["id"]
            entries.append(
                {
                    "id": eid,
                    "title": entry.get("title"),
                    "url": f"https://www.youtube.com/watch?v={eid}",
                    "thumbnail": f"https://i.ytimg.com/vi/{eid}/mqdefault.jpg",
                    "duration": format_duration(entry.get("duration")),
                    "duration_sec": entry.get("duration"),
                    "channel": entry.get("channel") or entry.get("uploader"),
                    "views": entry.get("view_count"),
                }
            )
            if len(entries) >= limit:
                break
        _set_cache(cache_key, entries)
        return entries
    except Exception:
        return []


def format_duration(seconds):
    if not seconds:
        return None
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    if h:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"
