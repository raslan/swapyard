import time
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.services import downloads as downloads_module

client = TestClient(app)


def fake_hf_hub_download(*, repo_id, filename, tqdm_class, **kwargs):
    bar = tqdm_class(total=10)
    bar.update(10)
    bar.close()
    return "/fake/path"


def test_start_download_route():
    downloads_module._downloads.clear()
    with patch("app.services.downloads.hf_hub_download", side_effect=fake_hf_hub_download):
        resp = client.post(
            "/api/downloads", json={"repo_id": "org/model", "filename": "model.gguf"}
        )
        assert resp.status_code == 202
        assert "id" in resp.json()


def test_list_downloads_route():
    downloads_module._downloads.clear()
    with patch("app.services.downloads.hf_hub_download", side_effect=fake_hf_hub_download):
        client.post("/api/downloads", json={"repo_id": "org/model", "filename": "model.gguf"})
        resp = client.get("/api/downloads")
        assert resp.status_code == 200
        assert len(resp.json()) == 1


def test_cancel_unknown_download_returns_404():
    downloads_module._downloads.clear()
    resp = client.delete("/api/downloads/unknown-id")
    assert resp.status_code == 404


def test_delete_finished_download_removes_the_record():
    # Uses a context-managed TestClient so the ASGI portal's event loop (and
    # thus the background download task scheduled on it) stays alive across
    # both requests below, instead of being torn down after each call.
    downloads_module._downloads.clear()
    with TestClient(app) as scoped_client:
        with patch("app.services.downloads.hf_hub_download", side_effect=fake_hf_hub_download):
            resp = scoped_client.post(
                "/api/downloads", json={"repo_id": "org/model", "filename": "model.gguf"}
            )
            download_id = resp.json()["id"]
            state = downloads_module.get_download(download_id)
            for _ in range(50):
                if state.status != "downloading":
                    break
                time.sleep(0.02)
            assert state.status == "complete"

            # A finished download can be dismissed - it's cleared, not 404'd,
            # so it stops coming back on the next GET /api/downloads.
            resp = scoped_client.delete(f"/api/downloads/{download_id}")
            assert resp.status_code == 204
            assert scoped_client.get("/api/downloads").json() == []

            # Second delete of the now-gone record does 404.
            resp = scoped_client.delete(f"/api/downloads/{download_id}")
            assert resp.status_code == 404


def test_delete_download_route_cancels_in_progress():
    downloads_module._downloads.clear()

    def slow_download(*, repo_id, filename, tqdm_class, **kwargs):
        bar = tqdm_class(total=100)
        for _ in range(100):
            time.sleep(0.05)
            bar.update(1)
        bar.close()
        return "/fake/path"

    with TestClient(app) as scoped_client:
        with patch("app.services.downloads.hf_hub_download", side_effect=slow_download):
            resp = scoped_client.post(
                "/api/downloads", json={"repo_id": "org/model", "filename": "model.gguf"}
            )
            download_id = resp.json()["id"]
            time.sleep(0.1)

            resp = scoped_client.delete(f"/api/downloads/{download_id}")
            assert resp.status_code == 204


def test_stream_download_events_route():
    downloads_module._downloads.clear()
    with TestClient(app) as scoped_client:
        with patch("app.services.downloads.hf_hub_download", side_effect=fake_hf_hub_download):
            resp = scoped_client.post(
                "/api/downloads", json={"repo_id": "org/model", "filename": "model.gguf"}
            )
            download_id = resp.json()["id"]

            resp = scoped_client.get(f"/api/downloads/{download_id}/events")
            assert resp.status_code == 200
            assert resp.headers["content-type"].startswith("text/event-stream")
            assert "event: done" in resp.text
            assert '"status":"complete"' in resp.text


def test_stream_download_events_unknown_id_returns_404():
    downloads_module._downloads.clear()
    resp = client.get("/api/downloads/unknown-id/events")
    assert resp.status_code == 404
