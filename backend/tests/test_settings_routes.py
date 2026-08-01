import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    settings_file = tmp_path / "settings.json"
    monkeypatch.setattr("app.routes.settings.SETTINGS_PATH", str(settings_file))
    return TestClient(app)


def test_get_settings_returns_null_hardware_by_default(client):
    resp = client.get("/api/settings")
    assert resp.status_code == 200
    assert resp.json() == {"hardware": None, "llama_swap_url": None, "onboarded": False}


def test_put_settings_saves_gpu_profile(client):
    resp = client.put(
        "/api/settings",
        json={
            "hardware": {
                "kind": "gpus",
                "gpus": [{"name": "GPU 0", "vram_gb": 24.0}],
                "system_ram_gb": 64.0,
            }
        },
    )
    assert resp.status_code == 200
    assert resp.json()["hardware"]["kind"] == "gpus"
    assert resp.json()["hardware"]["gpus"] == [{"name": "GPU 0", "vram_gb": 24.0}]

    # persisted
    assert client.get("/api/settings").json()["hardware"]["kind"] == "gpus"


def test_put_settings_saves_unified_profile(client):
    resp = client.put(
        "/api/settings",
        json={"hardware": {"kind": "unified", "gpus": [], "system_ram_gb": 32.0}},
    )
    assert resp.status_code == 200
    assert resp.json()["hardware"]["kind"] == "unified"
    assert resp.json()["hardware"]["system_ram_gb"] == 32.0


def test_put_settings_saves_llama_swap_url(client):
    resp = client.put(
        "/api/settings",
        json={"hardware": None, "llama_swap_url": "http://llama-swap:8080"},
    )
    assert resp.status_code == 200
    assert resp.json()["llama_swap_url"] == "http://llama-swap:8080"

    # persisted
    assert client.get("/api/settings").json()["llama_swap_url"] == "http://llama-swap:8080"


def test_put_settings_marks_onboarded_true_on_any_save(client):
    resp = client.put("/api/settings", json={"hardware": None, "llama_swap_url": None})
    assert resp.status_code == 200
    assert resp.json()["onboarded"] is True

    # persisted
    assert client.get("/api/settings").json()["onboarded"] is True


def test_put_settings_rejects_gpus_kind_with_empty_gpu_list(client):
    resp = client.put(
        "/api/settings",
        json={"hardware": {"kind": "gpus", "gpus": [], "system_ram_gb": None}},
    )
    assert resp.status_code == 422


def test_put_settings_rejects_unified_kind_without_system_ram(client):
    resp = client.put(
        "/api/settings",
        json={"hardware": {"kind": "unified", "gpus": [], "system_ram_gb": None}},
    )
    assert resp.status_code == 422


def test_put_settings_rejects_non_positive_gpu_vram(client):
    payload = {
        "hardware": {
            "kind": "gpus",
            "gpus": [{"name": None, "vram_gb": 0}],
            "system_ram_gb": None,
        }
    }
    resp = client.put(
        "/api/settings",
        json=payload,
    )
    assert resp.status_code == 422
