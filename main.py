import os
import subprocess
import sys
import tomllib
from pathlib import Path

from src.api import create_app

PORT = 5000
UI_DIR = os.path.join(os.path.dirname(__file__), "src", "ui")

C = lambda code: f"\033[{code}m"
R = C("0")
B = C("1")
D = C("2")
CYAN = C("96")
GREEN = C("92")
YELLOW = C("93")
MAGENTA = C("95")
BLUE = C("94")


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


def show_version():
    ver = _get_version()
    commit = _run(["git", "log", "--oneline", "-1"], cwd=os.path.dirname(__file__))
    node_v = _run(["node", "--version"])
    npm_v = _run(["npm", "--version"])
    py_v = sys.version.split()[0]

    box = f"""
{B}{CYAN}╔══════════════════════════════════════╗{R}
{CYAN}║{B}         S I N G U L A R I T Y        {CYAN}║{R}
{CYAN}║{D}         Music + Video Player         {CYAN}║{R}
{CYAN}╚══════════════════════════════════════╝{R}

  {GREEN}Version{R}   :  {B}{YELLOW}{ver}{R}
  {GREEN}Python{R}    :  {py_v}
  {GREEN}Node{R}      :  {node_v}
  {GREEN}npm{R}       :  {npm_v}
  {GREEN}Commit{R}    :  {D}{commit}{R}
  {GREEN}Platform{R}  :  {sys.platform}
  {GREEN}Config{R}    :  {D}~/.singularity/{R}
  {GREEN}Mode{R}      :  {D}Web-only (browser → http://127.0.0.1:{PORT}){R}
"""
    print(box)


def build_frontend():
    ui = UI_DIR
    if not os.path.isdir(os.path.join(ui, "node_modules")):
        print("Installing frontend dependencies...")
        subprocess.run(["npm", "install"], cwd=ui, check=True)
    print("Building frontend...")
    subprocess.run(["npm", "run", "build"], cwd=ui, check=True)


def main():
    if "--cookies" in sys.argv:
        idx = sys.argv.index("--cookies")
        if idx + 1 < len(sys.argv):
            os.environ["YT_COOKIES_FILE"] = sys.argv[idx + 1]

    if "--version" in sys.argv:
        show_version()
        return

    build_frontend()
    app = create_app()
    app.run(
        host="127.0.0.1",
        port=PORT,
        debug=False,
        use_reloader=False,
        threaded=True,
    )


if __name__ == "__main__":
    main()
