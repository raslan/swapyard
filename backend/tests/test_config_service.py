from app.services.config import hash_content, read_config


def test_hash_content_is_deterministic():
    assert hash_content("a: 1\n") == hash_content("a: 1\n")
    assert hash_content("a: 1\n") != hash_content("a: 2\n")


def test_read_config_returns_content_and_matching_hash(tmp_path):
    config_file = tmp_path / "config.yaml"
    config_file.write_text("models: {}\n")

    content, digest = read_config(str(config_file))

    assert content == "models: {}\n"
    assert digest == hash_content("models: {}\n")
