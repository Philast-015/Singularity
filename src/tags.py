import json
import os
import re
from typing import List

from src.ytdl import get_info, search

DATA_DIR = os.path.join(os.path.expanduser("~"), ".singularity")


def _exc_path():
    return os.path.join(DATA_DIR, "tags-exception.txt")


DEFAULT_EXCEPTIONS = [
    "song", "trending", "shorts", "youtubeshorts", "viralshorts",
    "subscribe", "subscribenow", "likeshare", "support",
    "video", "videos", "newvideo", "musicvideo",
    "fyp", "foryou", "foryoupage", "viral", "trend",
    "explore", "explorepage", "tiktok", "reels",
    "shortsfeed", "ytshorts", "shortsvideo",
]


def load_exceptions() -> set:
    path = _exc_path()
    try:
        with open(path) as f:
            return set(line.strip().lower() for line in f if line.strip())
    except FileNotFoundError:
        os.makedirs(DATA_DIR, exist_ok=True)
        save_exceptions(set(DEFAULT_EXCEPTIONS))
        return set(DEFAULT_EXCEPTIONS)


def save_exceptions(exc: set):
    path = _exc_path()
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(path, "w") as f:
        for tag in sorted(exc):
            f.write(tag + "\n")


def _tags_path():
    return os.path.join(DATA_DIR, "tags.json")


def load_tags() -> list:
    path = _tags_path()
    try:
        with open(path) as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def save_tags(tags: list):
    path = _tags_path()
    os.makedirs(DATA_DIR, exist_ok=True)
    unique = list(dict.fromkeys(tags))
    with open(path, "w") as f:
        json.dump(unique, f, indent=2)


STOP_TAGS = {
    "shorts", "video", "videos", "trending",
    "subscribe", "subscriber", "subscribers",
    "like", "comment", "share", "watch", "new",
    "music", "official", "channel", "youtube",
    "vlog", "funny", "short", "status",
    "reels", "insta", "instagram", "facebook",
    "twitter", "tiktok", "follow", "love", "life",
    "day", "people", "world", "time", "home",
    "make", "know", "vs", "the", "and", "for",
    "are", "but", "not", "you", "all", "can",
    "had", "her", "was", "one", "our", "out",
    "has", "have", "been", "some", "them",
    "than", "that", "this", "very", "what",
    "when", "where", "which", "who", "will",
    "with", "your", "reaction", "diy", "howto",
    "tutorial",
}


def extract_tags_from_text(text: str, count: int = 1) -> List[str]:
    """Extract up to `count` hashtags from text, skipping stop words and exceptions."""
    if not text:
        return []
    exceptions = load_exceptions()
    found = []
    for match in re.finditer(r"#(\w+)", text):
        tag = match.group(1).strip().lower()
        if (
            tag
            and len(tag) >= 3
            and tag not in STOP_TAGS
            and tag not in exceptions
            and not tag.isdigit()
        ):
            if tag not in found:
                found.append(tag)
        if len(found) >= count:
            break
    return found


def extract_tags_from_video(video_id: str, liked: bool = False) -> List[str]:
    """Extract 1 tag (2 if liked) from a video's title/description."""
    url = f"https://www.youtube.com/watch?v={video_id}"
    try:
        info = get_info(url)
        desc = info.get("description", "") or ""
        title = info.get("title", "") or ""
        combined = f"{title}\n{desc}"
        count = 2 if liked else 1
        tags = extract_tags_from_text(combined, count=count)
        if not tags:
            return []
        existing = load_tags()
        all_tags = existing + tags
        save_tags(all_tags)
        return tags
    except Exception:
        return []


def get_recommendations(limit: int = 60) -> list:
    tags = load_tags()
    if not tags:
        return []
    seen_ids = set()
    results = []
    for tag in tags[:5]:
        try:
            videos = search(tag, limit=50)
            for v in videos:
                if v.get("id") and v["id"] not in seen_ids:
                    seen_ids.add(v["id"])
                    results.append(v)
                    if len(results) >= limit:
                        return results
        except Exception:
            continue
    return results[:limit]
