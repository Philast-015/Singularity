import json
import os
import re
from typing import List

from src.ytdl import get_info, search

DATA_DIR = os.path.join(os.path.expanduser("~"), ".singularity")

STOP_TAGS = {
    "shorts", "video", "videos", "trending", "subscribe", "subscriber",
    "subscribers", "like", "comment", "share", "watch", "new", "music",
    "official", "channel", "youtube", "video", "vlog", "funny", "short",
    "status", "reels", "insta", "instagram", "facebook", "twitter", "tiktok",
    "follow", "love", "life", "day", "people", "world", "time", "home",
    "make", "know", "vs", "the", "and", "for", "are", "but", "not", "you",
    "all", "can", "had", "her", "was", "one", "our", "out", "has", "have",
    "been", "some", "them", "than", "that", "this", "very", "what", "when",
    "where", "which", "who", "will", "with", "your", "reaction", "video",
    "diy", "howto", "tutorial",
}


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


def extract_tags_from_text(text: str) -> List[str]:
    if not text:
        return []
    tags = set()

    for match in re.finditer(r"#(\w+)", text):
        tag = match.group(1).strip().lower()
        if tag and len(tag) >= 2 and tag not in STOP_TAGS and not tag.isdigit():
            tags.add(tag)

    for match in re.finditer(r"(?:\b([A-Z][a-z]+)\s([A-Z][a-z]+(?:\s[A-Z][a-z]+)*))", text):
        phrase = match.group(0).strip().lower()
        if phrase and len(phrase) >= 3 and phrase not in STOP_TAGS:
            tags.add(phrase)

    for match in re.finditer(r"(?:^|\n)([A-Z][A-Za-z0-9\s]{2,50})(?:\n|$)", text):
        line = match.group(1).strip().lower()
        words = line.split()
        if 2 <= len(words) <= 6 and not any(w in STOP_TAGS for w in words) and len(line) >= 5:
            tags.add(line)

    return list(tags)[:20]


def extract_tags_from_video(video_id: str) -> List[str]:
    url = f"https://www.youtube.com/watch?v={video_id}"
    try:
        info = get_info(url)
        desc = info.get("description", "") or ""
        title = info.get("title", "") or ""
        combined = f"{title}\n{desc}"
        tags = extract_tags_from_text(combined)
        existing = load_tags()
        all_tags = existing + tags
        save_tags(all_tags)
        return tags
    except Exception as e:
        return []


def get_recommendations(limit: int = 30) -> list:
    tags = load_tags()
    if not tags:
        return []
    seen_ids = set()
    results = []
    for tag in tags[:5]:
        try:
            videos = search(tag, limit=10)
            for v in videos:
                if v.get("id") and v["id"] not in seen_ids:
                    seen_ids.add(v["id"])
                    results.append(v)
                    if len(results) >= limit:
                        return results
        except Exception:
            continue
    return results[:limit]
