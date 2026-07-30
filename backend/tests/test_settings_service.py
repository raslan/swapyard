from app.services.settings import (
    GpuDevice,
    HardwareProfile,
    Settings,
    read_settings,
    write_settings,
)


def test_read_settings_returns_none_hardware_when_file_missing(tmp_path):
    settings = read_settings(str(tmp_path / "missing.json"))
    assert settings.hardware is None


def test_write_then_read_settings_roundtrips_gpu_profile(tmp_path):
    path = str(tmp_path / "settings.json")
    hardware = HardwareProfile(
        kind="gpus",
        gpus=[GpuDevice(name="GPU 0", vram_gb=24.0), GpuDevice(name=None, vram_gb=12.0)],
        system_ram_gb=64.0,
    )
    write_settings(path, Settings(hardware=hardware))

    loaded = read_settings(path)

    assert loaded.hardware.kind == "gpus"
    assert loaded.hardware.gpus == [
        GpuDevice(name="GPU 0", vram_gb=24.0),
        GpuDevice(name=None, vram_gb=12.0),
    ]
    assert loaded.hardware.system_ram_gb == 64.0


def test_write_then_read_settings_roundtrips_unified_profile(tmp_path):
    path = str(tmp_path / "settings.json")
    hardware = HardwareProfile(kind="unified", gpus=[], system_ram_gb=32.0)
    write_settings(path, Settings(hardware=hardware))

    loaded = read_settings(path)

    assert loaded.hardware.kind == "unified"
    assert loaded.hardware.gpus == []
    assert loaded.hardware.system_ram_gb == 32.0


def test_read_settings_migrates_old_flat_vram_budget_gb_format(tmp_path):
    path = tmp_path / "settings.json"
    path.write_text('{"vram_budget_gb": 24.0}')

    loaded = read_settings(str(path))

    assert loaded.hardware.kind == "gpus"
    assert loaded.hardware.gpus == [GpuDevice(name=None, vram_gb=24.0)]
    # migration is written back so the old key doesn't linger
    import json
    on_disk = json.loads(path.read_text())
    assert "vram_budget_gb" not in on_disk
    assert on_disk["hardware"]["kind"] == "gpus"
