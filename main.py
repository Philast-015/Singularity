import argparse
import html
import json
import os
import signal
import subprocess
import sys
import time
import tomllib
from pathlib import Path

import requests
from rich import box
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.table import Table
from rich.text import Text

from src.api import create_app

PORT = 5000
PLAY_PORT = 5001
MUSIC_PORT = 5002
UI_DIR = os.path.join(os.path.dirname(__file__), "src", "ui")
MUSIC_STATIC_DIR = os.path.join(os.path.dirname(__file__), "src", "Music-static")
VIDEO_STATIC_DIR = os.path.join(os.path.dirname(__file__), "src", "Video-static")
SERVER_PID_FILE = os.path.expanduser("~/.singularity/server.pid")
PLAY_PID_FILE = os.path.expanduser("~/.singularity/play.pid")
MUSIC_PID_FILE = os.path.expanduser("~/.singularity/music.pid")
LOG_FILE = os.path.expanduser("~/.singularity/server.log")

_search_results = []
_search_query = ""

console = Console()


def _get_version():
    pyproject = Path(__file__).parent / "pyproject.toml"
    with open(pyproject, "rb") as f:
        return tomllib.load(f)["project"]["version"]


def _run(cmd, cwd=None):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)
        return r.stdout.strip()
    except Exception:
        return "N/A"


def show_banner():
    ver = _get_version()
    banner = Panel(
        Text("Singularity", style="bold cyan", justify="center"),
        subtitle=Text(f"v{ver} — Music + Video Player", style="dim"),
        box=box.HEAVY,
        border_style="cyan",
        padding=(1, 2),
    )
    console.print(banner)


def show_version():
    ver = _get_version()
    commit = _run(["git", "log", "--oneline", "-1"], cwd=os.path.dirname(__file__))
    node_v = _run(["node", "--version"])
    npm_v = _run(["npm", "--version"])
    py_v = sys.version.split()[0]

    table = Table.grid(padding=(0, 1))
    table.add_column(style="bold green", justify="right")
    table.add_column(style="bold yellow")
    table.add_column(style="dim")
    table.add_row("Version", ver, "")
    table.add_row("Python", py_v, "")
    table.add_row("Node", node_v, "")
    table.add_row("npm", npm_v, "")
    table.add_row("Commit", commit, "")

    panel = Panel(
        table,
        title="[bold cyan]Singularity[/]",
        subtitle="Music + Video Player",
        box=box.HEAVY,
    )
    console.print(panel)


def build_frontend():
    ui = UI_DIR
    if not os.path.isdir(os.path.join(ui, "node_modules")):
        console.print("[yellow]Installing frontend dependencies...[/]")
        subprocess.run(["npm", "install"], cwd=ui, check=True)
    console.print("[yellow]Building frontend...[/]")
    subprocess.run(["npm", "run", "build"], cwd=ui, check=True)


def run_api():
    try:
        app = create_app()
        app.run(
            host="127.0.0.1",
            port=PORT,
            debug=False,
            use_reloader=False,
            threaded=True,
        )
    except Exception as e:
        console.print(f"[red]An error occurred: {e}[/]")
        sys.exit(1)


def _is_running(pid):
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _read_pid(pid_file=None):
    if pid_file is None:
        pid_file = SERVER_PID_FILE
    if not os.path.exists(pid_file):
        return None
    with open(pid_file) as f:
        return int(f.read().strip())


def start_server(mode="web"):
    os.makedirs(os.path.dirname(SERVER_PID_FILE), exist_ok=True)

    pid = _read_pid()
    if pid and _is_running(pid):
        console.print("[yellow]Server is already running.[/]")
        return

    if pid:
        os.unlink(SERVER_PID_FILE)

    internal_flag = "--_api_serve" if mode == "api" else "--_serve"

    with open(LOG_FILE, "a") as log:
        proc = subprocess.Popen(
            [sys.executable, __file__, internal_flag],
            stdout=log,
            stderr=log,
            start_new_session=True,
        )

    with open(SERVER_PID_FILE, "w") as f:
        f.write(str(proc.pid))

    label = "API server" if mode == "api" else "Web interface"
    console.print(f"[green]{label} started on http://127.0.0.1:{PORT}[/]")
    time.sleep(0.7)
    console.print(
        "[dim]Use [bold]--logs[/] to see output or [bold]--quit[/] to stop.[/]"
    )


def stop_server():
    pid = _read_pid()
    if pid:
        try:
            os.killpg(os.getpgid(pid), signal.SIGTERM)
        except ProcessLookupError:
            pass
        if os.path.exists(SERVER_PID_FILE):
            os.unlink(SERVER_PID_FILE)

    _stop_static_player(PLAY_PID_FILE)
    _stop_static_player(MUSIC_PID_FILE)
    console.print("[green]All servers stopped.[/]")


def _serve():
    build_frontend()
    run_api()


def _api_serve():
    run_api()


def show_logs():
    if not os.path.exists(LOG_FILE):
        console.print("[yellow]No logs yet. Start the server first.[/]")
        return

    pid = _read_pid()
    running = pid and _is_running(pid)

    if running:
        console.print("[dim]Following logs (Ctrl+C to stop)...[/]\n")
        try:
            subprocess.run(
                ["tail", "-f", LOG_FILE],
                stdin=sys.stdin,
                stderr=subprocess.STDOUT,
            )
        except KeyboardInterrupt:
            console.print()
    else:
        with open(LOG_FILE) as f:
            content = f.read().strip()
        if content:
            console.print(content)
        else:
            console.print("[yellow]Log file is empty.[/]")


def _ensure_api():
    pid = _read_pid()
    if pid and _is_running(pid):
        return
    console.print("[yellow]Starting API server...[/]")
    start_server("api")
    time.sleep(1)


def _api_url(path):
    return f"http://127.0.0.1:{PORT}{path}"


def interactive_mode():
    show_banner()
    console.print("[dim]Type [bold]help[/] for commands or [bold]exit[/] to quit.[/]\n")

    while True:
        try:
            cmd = Prompt.ask("[bold cyan]=>[/]").strip()
        except (EOFError, KeyboardInterrupt):
            console.print()
            break

        if not cmd:
            continue

        lower = cmd.lower()

        if lower in ("exit", "quit", "q"):
            _stop_static_player(PLAY_PID_FILE)
            _stop_static_player(MUSIC_PID_FILE)
            break
        elif lower in ("help", "h"):
            _show_help()
        elif lower == "version":
            show_version()
        elif lower.startswith("search "):
            query = cmd[7:].strip()
            if query:
                _do_search(query)
            else:
                console.print("[red]Usage: search <query>[/]")
        elif lower.startswith("download "):
            idx = cmd[9:].strip()
            if idx:
                _do_download_by_index(idx)
            else:
                console.print("[red]Usage: download <number>[/]")
        elif lower.startswith("play "):
            idx = cmd[5:].strip()
            if idx:
                _do_play(idx)
            else:
                console.print("[red]Usage: play <number>[/]")
        elif lower.startswith("music "):
            idx = cmd[6:].strip()
            if idx:
                _do_music(idx)
            else:
                console.print("[red]Usage: music <number>[/]")
        elif lower == "web":
            start_server("web")
        elif lower == "api":
            start_server("api")
        elif lower == "logs":
            show_logs()
        elif lower == "stop":
            stop_server()
            _stop_static_player(PLAY_PID_FILE)
            _stop_static_player(MUSIC_PID_FILE)
        else:
            console.print(f"[red]Unknown command:[/] {cmd}")
            console.print("[dim]Type [bold]help[/] to see available commands.[/]")


def _show_help():
    help_table = Table(box=box.SIMPLE, show_header=False)
    help_table.add_column(style="bold cyan", width=20)
    help_table.add_column(style="dim")
    help_table.add_row("help", "Show this help message")
    help_table.add_row("search <query>", "Search for music/videos")
    help_table.add_row("download <n>", "Download item #n from search results")
    help_table.add_row("play <n>", "Open video player for item #n")
    help_table.add_row("music <n>", "Open music player for item #n")
    help_table.add_row("web", "Start the web interface (build + API)")
    help_table.add_row("api", "Start the API server only")
    help_table.add_row("logs", "View/follow server logs")
    help_table.add_row("stop", "Stop all servers")
    help_table.add_row("version", "Show version details")
    help_table.add_row("exit / quit", "Quit this menu")
    help_table.add_row("Frontend Port", f"{PORT}")
    help_table.add_row("API Port", f"{PORT}")
    help_table.add_row("Video Port", f"{PLAY_PORT}")
    help_table.add_row("Music Port", f"{MUSIC_PORT}")
    console.print(help_table)


def _do_search(query):
    global _search_results, _search_query
    _ensure_api()

    with console.status(f"[cyan]Searching for [bold]{query}[/]...[/]"):
        try:
            r = requests.get(_api_url(f"/api/search?q={query}"), timeout=15)
            data = r.json()
            results = data.get("results", [])
        except Exception:
            console.print("[red]Search failed. Is the API running?[/]")
            return

    _search_results = results
    _search_query = query

    if not results:
        console.print("[yellow]No results found.[/]")
        return

    table = Table(title=f"Results for '[bold]{query}[/]'", box=box.ROUNDED)
    table.add_column("#", style="dim", width=3)
    table.add_column("Title", style="bold", no_wrap=True)
    table.add_column("Channel", style="cyan")
    table.add_column("Duration", style="yellow")
    table.add_column("Views", style="dim")

    for i, r in enumerate(results[:15], 1):
        table.add_row(
            str(i),
            (r.get("title") or "Untitled")[:45],
            (r.get("channel") or "")[:5],
            r.get("duration") or "",
            _fmt_views(r.get("views")),
        )
    console.print(table)


def _get_search_item(index_str):
    try:
        idx = int(index_str) - 1
        if idx < 0 or idx >= len(_search_results):
            console.print(
                f"[red]Invalid index. Use an index between 1 and {len(_search_results)}.[/]"
            )
            return None
        return _search_results[idx]
    except ValueError:
        console.print("[red]Usage: <command> <number>[/]")
        return None


def _do_download_by_index(index_str):
    item = _get_search_item(index_str)
    if not item:
        return

    _ensure_api()
    with console.status(f"[cyan]Fetching info for [bold]{item['title']}[/]...[/]"):
        try:
            r = requests.get(_api_url(f"/api/info?url={item['url']}"), timeout=15)
            info = r.json()
        except Exception:
            console.print("[red]Failed to fetch info.[/]")
            return

    console.print(f"\n[bold green]Title:[/]   {info.get('title', 'Unknown')}")
    console.print(f"[bold green]Channel:[/] {info.get('channel', 'Unknown')}")
    console.print(f"[bold green]Duration:[/] {info.get('duration', 'Unknown')}")

    all_fmts = []
    if info.get("audio_formats"):
        console.print("\n[bold yellow]Audio formats:[/]")
        audio_table = Table(box=box.SIMPLE, show_header=False)
        audio_table.add_column("#", style="dim", width=3)
        audio_table.add_column("ID", style="cyan")
        audio_table.add_column("Bitrate", style="yellow")
        audio_table.add_column("Size", style="dim")
        for i, f in enumerate(info["audio_formats"], 1):
            all_fmts.append(f)
            size = f.get("filesize")
            size_str = f"{size / 1024 / 1024:.1f} MB" if size else "?"
            audio_table.add_row(
                str(i), f.get("format_id", "?"), f"{f.get('abr', 0)} kbps", size_str
            )
        console.print(audio_table)

    if info.get("video_formats"):
        console.print("\n[bold yellow]Video formats:[/]")
        video_table = Table(box=box.SIMPLE, show_header=False)
        video_table.add_column("#", style="dim", width=3)
        video_table.add_column("ID", style="cyan")
        video_table.add_column("Resolution", style="yellow")
        video_table.add_column("Size", style="dim")
        for i, f in enumerate(info["video_formats"], 1):
            all_fmts.append(f)
            size = f.get("filesize")
            size_str = f"{size / 1024 / 1024:.1f} MB" if size else "?"
            video_table.add_row(
                str(i + len(info.get("audio_formats", []))),
                f.get("format_id", "?"),
                f.get("resolution", "?"),
                size_str,
            )
        console.print(video_table)

    if not all_fmts:
        console.print("[red]No downloadable formats found.[/]")
        return

    fmt_id = Prompt.ask("[bold yellow]Enter format ID to download[/]")
    chosen = next((f for f in all_fmts if f["format_id"] == fmt_id), None)
    if not chosen:
        console.print("[red]Invalid format ID.[/]")
        return

    stream_url = chosen.get("url")
    if not stream_url:
        console.print("[red]No URL for that format.[/]")
        return

    ext = chosen.get("ext", "mp4")
    title_slug = (info.get("title", "download") or "download")[:45]
    safe_name = "".join(
        c if c.isalnum() or c in " -_" else "_" for c in title_slug
    ).strip()
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    os.makedirs(data_dir, exist_ok=True)
    dest = os.path.join(data_dir, f"{safe_name}.{ext}")

    with console.status(f"[cyan]Downloading to [bold]{dest}[/]...[/]"):
        try:
            resp = requests.get(stream_url, stream=True, timeout=30)
            resp.raise_for_status()
            total = int(resp.headers.get("content-length", 0))
            downloaded = 0
            with open(dest, "wb") as f:
                for chunk in resp.iter_content(chunk_size=65536):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
            console.print(
                f"[green]Downloaded to {dest}[/]"
                + (f" ({downloaded / 1024 / 1024:.1f} MB)" if total else "")
            )
        except Exception as e:
            console.print(f"[red]Download failed: {e}[/]")


def _do_play(index_str):
    item = _get_search_item(index_str)
    if not item:
        return

    _ensure_api()
    with console.status(f"[cyan]Getting video info for [bold]{item['title']}[/]...[/]"):
        try:
            r = requests.get(_api_url(f"/api/info?url={item['url']}"), timeout=15)
            info = r.json()
        except Exception:
            console.print("[red]Failed to fetch info.[/]")
            return

    video_fmts = info.get("video_formats", [])
    combined = [
        f
        for f in video_fmts
        if f.get("has_video") and f.get("acodec", "none") != "none"
    ]
    if not combined:
        combined = video_fmts
    if not combined:
        console.print("[red]No playable video formats found.[/]")
        return
    best = combined[0]
    stream_url = best.get("url")
    if not stream_url:
        console.print("[red]No stream URL available.[/]")
        return

    title = info.get("title", item.get("title", "Video"))
    channel = info.get("channel", item.get("channel", ""))

    _start_static_player(
        port=PLAY_PORT,
        pid_file=PLAY_PID_FILE,
        static_dir=VIDEO_STATIC_DIR,
        stream_url=stream_url,
        title=title,
        channel=channel,
    )


def _do_music(index_str):
    item = _get_search_item(index_str)
    if not item:
        return

    _ensure_api()

    video_id = item.get("id", "")
    if not video_id:
        console.print("[red]No video ID found for that item.[/]")
        return

    title = item.get("title", "Audio")
    title = title.split()
    title = title[:40]
    channel = item.get("channel", "")
    thumbnail = item.get("thumbnail", "")

    _start_static_player(
        port=MUSIC_PORT,
        pid_file=MUSIC_PID_FILE,
        static_dir=MUSIC_STATIC_DIR,
        video_id=video_id,
        title=title,
        channel=channel,
        thumbnail=thumbnail,
    )


def _stop_static_player(pid_file):
    pid = _read_pid(pid_file)
    if pid:
        try:
            os.killpg(os.getpgid(pid), signal.SIGTERM)
        except (ProcessLookupError, PermissionError, OSError):
            pass
        if os.path.exists(pid_file):
            os.unlink(pid_file)


def _start_static_player(
    port,
    pid_file,
    static_dir,
    stream_url="",
    video_id="",
    title="",
    channel="",
    thumbnail="",
):
    _stop_static_player(pid_file)
    os.makedirs(os.path.dirname(pid_file), exist_ok=True)

    esc = html.escape
    api_base = f"http://127.0.0.1:{PORT}"
    is_video = port == PLAY_PORT

    if is_video:
        body = f"""<div id="data"
data-stream-url="{esc(stream_url)}"
data-title="{esc(title)}"
data-channel="{esc(channel)}"
data-api-base="{esc(api_base)}">
</div>
<div id="app">
<div id="info-bar">
<h1 id="title"></h1>
<p id="channel"></p>
</div>
<div id="player-wrap">
<video id="player" autoplay playsinline></video>
<div id="controls">
<button id="play-btn"><i class="bi bi-play-fill"></i></button>
<span id="current-time">0:00</span>
<input type="range" id="seek" value="0" min="0" max="100" step="0.1">
<span id="duration">0:00</span>
<button id="fullscreen-btn"><i class="bi bi-arrows-fullscreen"></i></button>
</div>
</div>
</div>"""
    else:
        body = f"""<div id="data"
data-video-id="{esc(video_id)}"
data-title="{esc(title)}"
data-channel="{esc(channel)}"
data-thumbnail="{esc(thumbnail)}"
data-api-base="{esc(api_base)}">
</div>
<div id="app">
<div id="player-section">
<div class="art-wrap">
<img id="art" src="{esc(thumbnail)}" alt="album art">
</div>
<h1 id="title"></h1>
<p id="channel"></p>
<div id="player-wrap">
<audio id="player" autoplay muted playsinline></audio>
<div id="controls">
<button id="play-btn"><i class="bi bi-play-fill"></i></button>
<span id="current-time">0:00</span>
<input type="range" id="seek" value="0" min="0" max="100" step="0.1">
<span id="duration">0:00</span>
<button id="mute-btn"><i class="bi bi-volume-up-fill"></i></button>
<button id="repeat-btn"><i class="bi bi-repeat-1"></i></button>
</div>
</div>
</div>
<div id="suggestions-section">
<h2>Up next</h2>
<ul id="suggestions-list"></ul>
</div>
</div>"""

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Playing: {title}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
<link rel="stylesheet" href="style.css">
</head>
<body>
{body}
<script src="script.js"></script>
</body>
</html>"""

    os.makedirs(static_dir, exist_ok=True)
    idx_path = os.path.join(static_dir, "index.html")
    with open(idx_path, "w") as f:
        f.write(page)

    with open(LOG_FILE, "a") as log:
        proc = subprocess.Popen(
            [sys.executable, "-m", "http.server", str(port), "--directory", static_dir],
            stdout=log,
            stderr=log,
            start_new_session=True,
        )

    with open(pid_file, "w") as f:
        f.write(str(proc.pid))

    url = f"http://127.0.0.1:{port}"
    label = "Video" if is_video else "Music"
    console.print(f"[green]{label} player started on {url}[/]")
    time.sleep(0.5)

    import webbrowser

    webbrowser.open(url)


def _do_download(target):
    from src.ytdl import get_info, search

    with console.status(f"[cyan]Fetching [bold]{target}[/]...[/]"):
        is_url = target.startswith("http://") or target.startswith("https://")
        if is_url:
            info = get_info(target)
        else:
            results = search(target, limit=1)
            if not results:
                console.print("[red]No results found for that query.[/]")
                return
            info = get_info(results[0]["url"])

    console.print(f"\n[bold green]Title:[/]   {info.get('title', 'Unknown')}")
    console.print(f"[bold green]Channel:[/] {info.get('channel', 'Unknown')}")
    console.print(f"[bold green]Duration:[/] {info.get('duration', 'Unknown')}")

    if info.get("audio_formats"):
        console.print("\n[bold yellow]Audio formats:[/]")
        audio_table = Table(box=box.SIMPLE, show_header=False)
        audio_table.add_column("#", style="dim", width=3)
        audio_table.add_column("ID", style="cyan")
        audio_table.add_column("Bitrate", style="yellow")
        audio_table.add_column("Size", style="dim")
        for i, f in enumerate(info["audio_formats"][:5], 1):
            size = f.get("filesize")
            size_str = f"{size / 1024 / 1024:.1f} MB" if size else "?"
            audio_table.add_row(
                str(i), f.get("format_id", "?"), f"{f.get('abr', 0)} kbps", size_str
            )
        console.print(audio_table)

    if info.get("video_formats"):
        console.print("\n[bold yellow]Video formats:[/]")
        video_table = Table(box=box.SIMPLE, show_header=False)
        video_table.add_column("#", style="dim", width=3)
        video_table.add_column("ID", style="cyan")
        video_table.add_column("Resolution", style="yellow")
        video_table.add_column("Size", style="dim")
        for i, f in enumerate(info["video_formats"][:5], 1):
            size = f.get("filesize")
            size_str = f"{size / 1024 / 1024:.1f} MB" if size else "?"
            video_table.add_row(
                str(i),
                f.get("format_id", "?"),
                f.get("resolution", "?"),
                size_str,
            )
        console.print(video_table)


def _fmt_views(n):
    if not n:
        return ""
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n / 1_000:.1f}K"
    return str(n)


def main():
    parser = argparse.ArgumentParser(
        description="Singularity — Music + Video Player",
        add_help=False,
    )
    parser.add_argument("--help", action="store_true", help="Show this help message")
    parser.add_argument(
        "--version", action="store_true", help="Show version information"
    )
    parser.add_argument(
        "--web", action="store_true", help="Start the web interface (build + API)"
    )
    parser.add_argument("--api", action="store_true", help="Start the API server only")
    parser.add_argument("--logs", action="store_true", help="View/follow server logs")
    parser.add_argument(
        "--quit", action="store_true", help="Stop the background server"
    )
    parser.add_argument("--_serve", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--_api_serve", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument(
        "--download",
        nargs="?",
        const=True,
        metavar="URL",
        help="Fetch media info (URL or search query)",
    )
    parser.add_argument(
        "--cookies", metavar="FILE", help="Path to YouTube cookies file"
    )

    args, _ = parser.parse_known_args()

    if args._serve:
        _serve()
        return

    if args._api_serve:
        _api_serve()
        return

    if args.help:
        parser.print_help()
        return

    if args.cookies:
        os.environ["YT_COOKIES_FILE"] = args.cookies

    if args.version:
        show_version()
        return

    if args.quit:
        stop_server()
        return

    if args.logs:
        show_logs()
        return

    if args.web:
        start_server("web")
        return

    if args.api:
        start_server("api")
        return

    if args.download is not None:
        if isinstance(args.download, bool):
            console.print("[red]Usage: --download <URL or search query>[/]")
        else:
            _do_download(args.download)
        return

    interactive_mode()


if __name__ == "__main__":
    main()
