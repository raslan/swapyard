import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.config import hash_content


@pytest.fixture
def config_client(tmp_path, monkeypatch):
    config_file = tmp_path / "config.yaml"
    config_file.write_text("models: {}\n")
    history_dir = tmp_path / "history"

    monkeypatch.setattr("app.routes.config.CONFIG_PATH", str(config_file))
    monkeypatch.setattr("app.routes.config.HISTORY_DIR", str(history_dir))
    monkeypatch.setattr("app.routes.config.LLAMA_SWAP_URL", None)

    return TestClient(app), config_file


def test_get_config_returns_content_and_hash(config_client):
    client, _ = config_client
    resp = client.get("/api/config")
    assert resp.status_code == 200
    body = resp.json()
    assert body["content"] == "models: {}\n"
    assert body["hash"] == hash_content("models: {}\n")


def test_get_config_schema_returns_the_vendored_schema(config_client):
    client, _ = config_client
    resp = client.get("/api/config/schema")
    assert resp.status_code == 200
    assert resp.json()["title"] == "llama-swap configuration"


def test_get_config_status_is_null_with_no_history(config_client):
    client, _ = config_client
    resp = client.get("/api/config/status")
    assert resp.status_code == 200
    assert resp.json() == {"status": None, "timestamp": None}


def test_post_config_applies_and_returns_unverified(config_client):
    client, config_file = config_client
    base_hash = hash_content("models: {}\n")

    resp = client.post(
        "/api/config",
        json={"content": "models: {a: {cmd: llama-server}}\n", "base_hash": base_hash},
    )

    assert resp.status_code == 200
    assert resp.json()["status"] == "unverified"
    assert config_file.read_text() == "models: {a: {cmd: llama-server}}\n"


def test_post_config_conflict_returns_409_with_current_content(config_client):
    client, _ = config_client

    resp = client.post(
        "/api/config",
        json={"content": "models: {a: {}}\n", "base_hash": "stale-hash"},
    )

    assert resp.status_code == 409
    body = resp.json()
    assert body["current_content"] == "models: {}\n"
    assert "current_hash" in body


def test_post_config_invalid_schema_returns_422(config_client):
    client, _ = config_client
    base_hash = hash_content("models: {}\n")

    resp = client.post(
        "/api/config",
        json={"content": "healthCheckTimeout: 900\n", "base_hash": base_hash},
    )

    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "invalid_config"


def test_get_config_history_lists_applied_revisions(config_client):
    client, _ = config_client
    base_hash = hash_content("models: {}\n")
    client.post(
        "/api/config",
        json={"content": "models: {a: {cmd: llama-server}}\n", "base_hash": base_hash},
    )

    resp = client.get("/api/config/history")

    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["status"] == "unverified"


def test_get_config_flags_returns_the_vendored_flags_list(
    config_client, tmp_path, monkeypatch
):
    client, _ = config_client
    flags_file = tmp_path / "flags.json"
    flags_content = (
        '[{"flag": "--ngl", "aliases": ["-ngl"], "description": "layers", "default": "0"}]'
    )
    flags_file.write_text(flags_content)
    monkeypatch.setattr("app.routes.config.FLAGS_PATH", str(flags_file))

    resp = client.get("/api/config/flags")

    assert resp.status_code == 200
    expected = [
        {
            "flag": "--ngl",
            "aliases": ["-ngl"],
            "description": "layers",
            "default": "0",
        }
    ]
    assert resp.json() == expected


def test_get_config_flags_returns_empty_list_when_file_missing(config_client, monkeypatch):
    client, _ = config_client
    monkeypatch.setattr("app.routes.config.FLAGS_PATH", "/nonexistent/flags.json")

    resp = client.get("/api/config/flags")

    assert resp.status_code == 200
    assert resp.json() == []


def test_post_config_models_creates_minimal_entry_and_applies(config_client):
    client, config_file = config_client

    resp = client.post(
        "/api/config/models",
        json={"repo_id": "org/repo", "filename": "model-Q4_K_M.gguf", "model_id": "my-model"},
    )

    assert resp.status_code == 200
    assert resp.json()["status"] in ("unverified", "ok")

    config_content = config_file.read_text()
    assert "my-model:" in config_content
    assert "org/repo:model-Q4_K_M" in config_content


def test_post_config_models_rejects_duplicate_model_id(config_client):
    client, config_file = config_client
    config_file.write_text("models:\n  my-model:\n    cmd: llama-server\n")

    resp = client.post(
        "/api/config/models",
        json={"repo_id": "org/repo", "filename": "x.gguf", "model_id": "my-model"},
    )

    assert resp.status_code == 409
