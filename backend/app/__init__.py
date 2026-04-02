from __future__ import annotations

from flask import Flask

from app.api.admin_routes import admin_bp
from app.api.auth_routes import auth_bp
from app.api.file_routes import file_bp
from app.api.system_routes import system_bp
from app.api.user_routes import user_bp
from app.db import init_db


def create_app() -> Flask:
    app = Flask(__name__)

    app.register_blueprint(system_bp)
    app.register_blueprint(file_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(admin_bp)

    init_db()
    return app
