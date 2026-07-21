from app.services.config import hash_content, read_config, validate_config


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
