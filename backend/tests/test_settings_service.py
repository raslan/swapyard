from app.services.settings import Settings, read_settings, write_settings


def test_read_settings_defaults_to_none_when_file_missing(tmp_path):
    settings = read_settings(str(tmp_path / "settings.json"))
    assert settings == Settings(vram_budget_gb=None)


def test_write_then_read_settings_round_trips(tmp_path):
    path = str(tmp_path / "nested" / "settings.json")
    write_settings(path, Settings(vram_budget_gb=24.0))

    assert read_settings(path) == Settings(vram_budget_gb=24.0)
