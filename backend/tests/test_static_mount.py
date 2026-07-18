from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import FRONTEND_DIST_DIR, SPAStaticFiles


def test_frontend_dist_dir_points_to_expected_path():
    expected = (Path(__file__).parent.parent.parent / "frontend" / "dist").resolve()
    assert FRONTEND_DIST_DIR == expected


def _build_spa_app(dist_dir: Path) -> FastAPI:
    app = FastAPI()

    @app.get("/api/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    app.mount("/", SPAStaticFiles(directory=str(dist_dir), html=True), name="frontend")
    return app


def test_spa_static_files_falls_back_to_index_html_for_deep_link(tmp_path):
    """A hard navigation/refresh to a client-side route (e.g. /browse/some-model)
    has no literal file on disk, so it must fall back to index.html (200) rather
    than 404ing, letting react-router take over client-side.
    """
    (tmp_path / "index.html").write_text("<html>SPA INDEX</html>")

    app = _build_spa_app(tmp_path)
    client = TestClient(app)

    response = client.get("/browse/some-model")

    assert response.status_code == 200
    assert response.text == "<html>SPA INDEX</html>"


def test_spa_static_files_serves_real_static_assets_unmodified(tmp_path):
    """Real built assets (JS/CSS bundles) must still be served as themselves,
    not swallowed by the index.html fallback.
    """
    (tmp_path / "index.html").write_text("<html>SPA INDEX</html>")
    assets_dir = tmp_path / "assets"
    assets_dir.mkdir()
    (assets_dir / "app.js").write_text("console.log('hi');")

    app = _build_spa_app(tmp_path)
    client = TestClient(app)

    response = client.get("/assets/app.js")

    assert response.status_code == 200
    assert response.text == "console.log('hi');"


def test_spa_static_files_does_not_shadow_api_routes(tmp_path):
    """API routes are registered before the static mount, so they must still
    win over the SPA fallback even though the mount matches every path.
    """
    (tmp_path / "index.html").write_text("<html>SPA INDEX</html>")

    app = _build_spa_app(tmp_path)
    client = TestClient(app)

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_spa_static_files_does_not_mask_non_404_errors(tmp_path):
    """A non-404 error raised internally by StaticFiles (e.g. 405 for a
    disallowed method) must propagate as-is, not be swallowed by the
    index.html fallback that's only meant to handle unmatched GETs.
    """
    (tmp_path / "index.html").write_text("<html>SPA INDEX</html>")
    assets_dir = tmp_path / "assets"
    assets_dir.mkdir()
    (assets_dir / "app.js").write_text("console.log('hi');")

    app = _build_spa_app(tmp_path)
    client = TestClient(app)

    response = client.post("/assets/app.js")

    assert response.status_code == 405
    assert response.text != "<html>SPA INDEX</html>"


def test_spa_static_files_returns_real_404_for_unknown_api_path(tmp_path):
    """A request to a genuinely nonexistent /api/* route must 404 for real,
    not fall back to the SPA's index.html with a 200.
    """
    (tmp_path / "index.html").write_text("<html>SPA INDEX</html>")

    app = _build_spa_app(tmp_path)
    client = TestClient(app)

    response = client.get("/api/does-not-exist")

    assert response.status_code == 404
    assert response.text != "<html>SPA INDEX</html>"
