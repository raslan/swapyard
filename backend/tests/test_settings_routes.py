import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def settings_client(tmp_path, monkeypatch):
    settings_file = tmp_path / "settings.json"
    monkeypatch.setattr("app.routes.settings.SETTINGS_PATH", str(settings_file))
    return TestClient(app)


def test_get_settings_defaults_to_null_budget(settings_client):
    resp = settings_client.get("/api/settings")
    assert resp.status_code == 200
    assert resp.json() == {"vram_budget_gb": None}


def test_put_settings_saves_and_returns_budget(settings_client):
    resp = settings_client.put("/api/settings", json={"vram_budget_gb": 24})
    assert resp.status_code == 200
    assert resp.json() == {"vram_budget_gb": 24}

    resp2 = settings_client.get("/api/settings")
    assert resp2.json() == {"vram_budget_gb": 24}


def test_put_settings_rejects_non_positive_budget(settings_client):
    resp = settings_client.put("/api/settings", json={"vram_budget_gb": 0})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "invalid_settings"
