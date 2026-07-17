import pytest
from fastapi.testclient import TestClient
from huggingface_hub import snapshot_download

from app.main import app


@pytest.fixture
def client_with_cache(tmp_path, monkeypatch):
    snapshot_download(
        repo_id="hf-internal-testing/tiny-random-gpt2",
        cache_dir=str(tmp_path),
        allow_patterns=["config.json"],
    )
    monkeypatch.setattr("app.routes.manage.CACHE_DIR", str(tmp_path))
    return TestClient(app)


def test_list_models_route(client_with_cache):
    resp = client_with_cache.get("/api/manage/models")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["repo_id"] == "hf-internal-testing/tiny-random-gpt2"


def test_delete_model_route(client_with_cache):
    resp = client_with_cache.delete("/api/manage/models/hf-internal-testing/tiny-random-gpt2")
    assert resp.status_code == 204
    assert client_with_cache.get("/api/manage/models").json() == []


def test_delete_missing_model_returns_404_shape(client_with_cache):
    resp = client_with_cache.delete("/api/manage/models/nope/nope")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "not_found"
