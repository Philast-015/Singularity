import sys
import threading
import subprocess
import os
from src.api import create_app

PORT = 5000
UI_DIR = os.path.join(os.path.dirname(__file__), "src", "ui")


def build_frontend():
    has_modules = os.path.isdir(os.path.join(UI_DIR, "node_modules"))
    if not has_modules:
        print("Installing frontend dependencies...")
        subprocess.run(["npm", "install"], cwd=UI_DIR, check=True)
    print("Building frontend...")
    subprocess.run(["npm", "run", "build"], cwd=UI_DIR, check=True)


def run_web():
    build_frontend()
    app = create_app()
    app.run(host="127.0.0.1", port=PORT, debug=False, use_reloader=False)


def run_ui():
    import webview
    build_frontend()
    app = create_app()
    t = threading.Thread(target=lambda: app.run(
        host="127.0.0.1", port=PORT, debug=False, use_reloader=False
    ), daemon=True)
    t.start()
    webview.create_window("Singularity", f"http://127.0.0.1:{PORT}", width=1200, height=800)
    webview.start()


if __name__ == "__main__":
    if "--web" in sys.argv:
        run_web()
    else:
        run_ui()
