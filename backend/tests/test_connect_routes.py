import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def connect_client(tmp_path, monkeypatch):
    config_file = tmp_path / "config.yaml"
    config_file.write_text(
        "models:\n  my-model:\n    cmd: llama-server -hf org/repo --hf-file f.gguf --ctx-size 4096\n"
    )
    monkeypatch.setattr("app.routes.config.CONFIG_PATH", str(config_file))
    monkeypatch.setattr("app.routes.connect.CACHE_DIR", None)
    monkeypatch.setattr("app.routes.settings.SETTINGS_PATH", str(tmp_path / "settings.json"))
    monkeypatch.setattr(
        "app.routes.connect.list_managed_models", lambda cache_dir=None: []
    )
    return TestClient(app)


def test_list_harnesses_returns_all_seven_in_order(connect_client):
    resp = connect_client.get("/api/connect/harnesses")
    assert resp.status_code == 200
    body = resp.json()
    assert [h["id"] for h in body] == [
        "opencode", "kilo", "pi", "oh-my-pi", "openclaw", "qwen-code", "hermes-agent",
    ]
    assert body[0]["config_path"] == "~/.config/opencode/opencode.json"


def test_get_harness_detail_uses_placeholder_base_url_when_settings_empty(connect_client):
    resp = connect_client.get("/api/connect/harnesses/opencode")
    assert resp.status_code == 200
    body = resp.json()
    assert body["base_url_source"] == "placeholder"
    assert "YOUR-LLAMA-SWAP-HOST" in body["config"]
    assert len(body["steps"]) >= 1


def test_get_harness_detail_uses_settings_base_url_when_configured(connect_client, monkeypatch):
    import json as _json

    from app.routes import settings as settings_routes

    with open(settings_routes.SETTINGS_PATH, "w") as f:
        _json.dump({"hardware": None, "llama_swap_url": "http://192.168.1.10:8080", "onboarded": True}, f)

    resp = connect_client.get("/api/connect/harnesses/opencode")
    assert resp.status_code == 200
    body = resp.json()
    assert body["base_url_source"] == "settings"
    assert "http://192.168.1.10:8080/v1" in body["config"]


def test_get_harness_detail_reflects_derived_model_context(connect_client):
    resp = connect_client.get("/api/connect/harnesses/opencode")
    body = resp.json()
    assert '"my-model"' in body["config"]
    assert "4096" in body["config"]


def test_get_unknown_harness_returns_404(connect_client):
    resp = connect_client.get("/api/connect/harnesses/does-not-exist")
    assert resp.status_code == 404
