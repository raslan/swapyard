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
    assert body[0]["config_entries"] == []


def test_delete_model_route(client_with_cache):
    resp = client_with_cache.delete("/api/manage/models/hf-internal-testing/tiny-random-gpt2")
    assert resp.status_code == 204
    assert client_with_cache.get("/api/manage/models").json() == []


def test_delete_missing_model_returns_404_shape(client_with_cache):
    resp = client_with_cache.delete("/api/manage/models/nope/nope")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "not_found"


@pytest.fixture
def client_with_multi_quant_cache(tmp_path, monkeypatch):
    snapshot_download(
        repo_id="mradermacher/TinyStories-656K-GGUF",
        cache_dir=str(tmp_path),
        allow_patterns=["*.Q2_K.gguf", "*.IQ4_XS.gguf"],
    )
    monkeypatch.setattr("app.routes.manage.CACHE_DIR", str(tmp_path))
    return TestClient(app)


def test_delete_model_file_route_removes_only_that_quant(client_with_multi_quant_cache):
    # Proves the file-scoped route isn't shadowed by the bare /models/{repo_id:path}
    # route below it - repo_id is a greedy path converter, so registration order matters.
    resp = client_with_multi_quant_cache.delete(
        "/api/manage/models/mradermacher/TinyStories-656K-GGUF/files/TinyStories-656K.Q2_K.gguf"
    )
    assert resp.status_code == 204

    remaining = client_with_multi_quant_cache.get("/api/manage/models").json()
    assert len(remaining) == 1
    assert remaining[0]["gguf_files"] == ["TinyStories-656K.IQ4_XS.gguf"]


def test_delete_model_file_route_missing_file_returns_404_shape(client_with_multi_quant_cache):
    resp = client_with_multi_quant_cache.delete(
        "/api/manage/models/mradermacher/TinyStories-656K-GGUF/files/does-not-exist.gguf"
    )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "not_found"


@pytest.fixture
def client_with_cache_and_config(client_with_cache, tmp_path, monkeypatch):
    config_file = tmp_path / "config.yaml"
    config_file.write_text(
        "# my config\n"
        "models:\n"
        "  my-model:\n"
        "    cmd: llama-server -hf hf-internal-testing/tiny-random-gpt2:Q4_K_M\n"
    )
    monkeypatch.setattr("app.routes.config.CONFIG_PATH", str(config_file))
    monkeypatch.setattr("app.routes.config.HISTORY_DIR", str(tmp_path / "history"))
    return client_with_cache, config_file


def test_list_models_route_reports_matching_config_entries(client_with_cache_and_config):
    client, _ = client_with_cache_and_config
    resp = client.get("/api/manage/models")
    assert resp.json()[0]["config_entries"] == ["my-model"]


def test_delete_model_without_flag_leaves_config_untouched(client_with_cache_and_config):
    client, config_file = client_with_cache_and_config
    before = config_file.read_text()

    resp = client.delete("/api/manage/models/hf-internal-testing/tiny-random-gpt2")

    assert resp.status_code == 204
    assert config_file.read_text() == before


def test_delete_model_with_flag_removes_matching_config_entries(client_with_cache_and_config):
    client, config_file = client_with_cache_and_config

    resp = client.delete(
        "/api/manage/models/hf-internal-testing/tiny-random-gpt2",
        params={"remove_config_entries": "true"},
    )

    assert resp.status_code == 204
    content = config_file.read_text()
    assert "my-model" not in content
    assert "# my config" in content  # formatting/comments preserved


def test_delete_model_with_flag_is_noop_when_nothing_matches(client_with_cache_and_config):
    client, config_file = client_with_cache_and_config
    config_file.write_text("models:\n  unrelated:\n    cmd: llama-server -hf other/repo\n")
    before = config_file.read_text()

    resp = client.delete(
        "/api/manage/models/hf-internal-testing/tiny-random-gpt2",
        params={"remove_config_entries": "true"},
    )

    assert resp.status_code == 204
    assert config_file.read_text() == before
