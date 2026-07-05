from flask import Flask


def create_app():
    import os
    dist = os.path.join(os.path.dirname(__file__), "..", "ui", "dist")
    ui = os.path.join(os.path.dirname(__file__), "..", "ui")
    static_folder = dist if os.path.isdir(dist) else ui
    app = Flask(__name__, static_folder=static_folder, static_url_path="")

    from .routes import api_bp
    app.register_blueprint(api_bp)

    @app.route("/")
    @app.route("/<path:filename>")
    def serve(filename="index.html"):
        return app.send_static_file(filename)

    return app
