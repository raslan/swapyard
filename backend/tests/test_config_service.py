from app.services.config import (
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
