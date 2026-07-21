import httpx
import pytest

from app.services.config import (
    ConfigConflict,
    ConfigInvalid,
    apply_config,
    commit_revision,
    get_status,
    hash_content,
    list_revisions,
    read_config,
    validate_config,
)


def test_hash_content_is_deterministic():
    assert hash_content("a: 1\n") == hash_content("a: 1\n")
    assert hash_content("a: 1\n") != hash_content("a: 2\n")


def test_read_config_returns_content_and_matching_hash(tmp_path):
    config_file = tmp_path / "config.yaml"
    config_file.write_text("models: {}\n")

    content, digest = read_config(str(config_file))

    assert content == "models: {}\n"
    assert digest == hash_content("models: {}\n")


def test_validate_config_accepts_minimal_valid_yaml():
    errors = validate_config("models:\n  foo:\n    cmd: llama-server\n")
    assert errors == []


def test_validate_config_rejects_malformed_yaml_syntax():
    errors = validate_config("models: [unterminated\n")
    assert len(errors) == 1
    assert "yaml" in errors[0].lower()


def test_validate_config_rejects_missing_required_models_key():
    errors = validate_config("healthCheckTimeout: 900\n")
    assert len(errors) == 1
    assert "models" in errors[0]


def test_get_status_returns_none_when_no_history_exists(tmp_path):
    history_dir = str(tmp_path / "history")
    assert get_status(history_dir) is None


def test_commit_revision_then_list_revisions_roundtrips_content(tmp_path):
    history_dir = str(tmp_path / "history")

    commit_revision(history_dir, "models: {a: 1}\n", "ok")
    commit_revision(history_dir, "models: {a: 2}\n", "failed: llama-swap unreachable")

    revisions = list_revisions(history_dir)

    assert len(revisions) == 2
    # list_revisions returns newest-first
    assert revisions[0]["status"] == "failed: llama-swap unreachable"
    assert revisions[0]["content"] == "models: {a: 2}\n"
    assert revisions[1]["status"] == "ok"
    assert revisions[1]["content"] == "models: {a: 1}\n"
    assert isinstance(revisions[0]["timestamp"], float)
    assert isinstance(revisions[0]["sha"], str)


def test_get_status_reflects_latest_commit(tmp_path):
    history_dir = str(tmp_path / "history")
    commit_revision(history_dir, "models: {}\n", "ok")
    commit_revision(history_dir, "models: {}\n", "unverified")

    status = get_status(history_dir)

    assert status["status"] == "unverified"
    assert isinstance(status["timestamp"], float)


def test_apply_config_raises_conflict_when_base_hash_is_stale(tmp_path):
    config_file = tmp_path / "config.yaml"
    config_file.write_text("models: {}\n")
    history_dir = str(tmp_path / "history")

    with pytest.raises(ConfigConflict) as exc_info:
        apply_config(
            config_path=str(config_file),
            history_dir=history_dir,
            content="models: {a: 1}\n",
            base_hash="stale-hash",
            llama_swap_url=None,
        )
    assert exc_info.value.current_content == "models: {}\n"
    # file untouched
    assert config_file.read_text() == "models: {}\n"


def test_apply_config_raises_invalid_for_bad_schema(tmp_path):
    config_file = tmp_path / "config.yaml"
    config_file.write_text("models: {}\n")
    history_dir = str(tmp_path / "history")

    with pytest.raises(ConfigInvalid) as exc_info:
        apply_config(
            config_path=str(config_file),
            history_dir=history_dir,
            content="healthCheckTimeout: 900\n",
            base_hash=hash_content("models: {}\n"),
            llama_swap_url=None,
        )
    assert any("models" in e for e in exc_info.value.errors)
    assert config_file.read_text() == "models: {}\n"  # untouched


def test_apply_config_writes_and_returns_unverified_without_llama_swap_url(tmp_path):
    config_file = tmp_path / "config.yaml"
    config_file.write_text("models: {}\n")
    history_dir = str(tmp_path / "history")

    result = apply_config(
        config_path=str(config_file),
        history_dir=history_dir,
        content="models: {a: {cmd: llama-server}}\n",
        base_hash=hash_content("models: {}\n"),
        llama_swap_url=None,
    )

    assert result["status"] == "unverified"
    assert config_file.read_text() == "models: {a: {cmd: llama-server}}\n"


def test_apply_config_returns_ok_when_health_check_succeeds(tmp_path, monkeypatch):
    config_file = tmp_path / "config.yaml"
    config_file.write_text("models: {}\n")
    history_dir = str(tmp_path / "history")

    class FakeResponse:
        status_code = 200

    async def fake_get(self, url, **kwargs):  # noqa: ANN001, ARG001
        return FakeResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    result = apply_config(
        config_path=str(config_file),
        history_dir=history_dir,
        content="models: {a: {cmd: llama-server}}\n",
        base_hash=hash_content("models: {}\n"),
        llama_swap_url="http://fake-llama-swap:8080",
    )

    assert result["status"] == "ok"


def test_apply_config_returns_failed_status_when_health_check_never_succeeds(tmp_path, monkeypatch):
    config_file = tmp_path / "config.yaml"
    config_file.write_text("models: {}\n")
    history_dir = str(tmp_path / "history")

    class FakeErrorResponse:
        status_code = 500

    async def fake_get(self, url, **kwargs):  # noqa: ANN001, ARG001
        if url.endswith("/logs"):

            class LogsResponse:
                status_code = 200
                text = "panic: bad config"

            return LogsResponse()
        return FakeErrorResponse()

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    result = apply_config(
        config_path=str(config_file),
        history_dir=history_dir,
        content="models: {a: {cmd: llama-server}}\n",
        base_hash=hash_content("models: {}\n"),
        llama_swap_url="http://fake-llama-swap:8080",
        health_poll_interval=0.01,
        health_poll_attempts=2,
    )

    assert result["status"].startswith("failed")
    assert "panic: bad config" in result["logs"]
    # file IS written even though verification failed - no auto-revert
    assert config_file.read_text() == "models: {a: {cmd: llama-server}}\n"
